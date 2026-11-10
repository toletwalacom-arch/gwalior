import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function respond(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function hexToBytes(value: string) {
  if (!/^[\da-f]{64}$/i.test(value)) return null
  const bytes = new Uint8Array(32)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (request.method !== "POST") return respond({ error: "Method not allowed." }, 405)

  const authorization = request.headers.get("Authorization")
  if (!authorization) return respond({ error: "Sign in to confirm your payment." }, 401)

  let body: { order_id?: unknown; payment_id?: unknown; signature?: unknown }
  try {
    body = await request.json()
  } catch {
    return respond({ error: "Invalid payment confirmation." }, 400)
  }
  if (
    typeof body.order_id !== "string" || !body.order_id ||
    typeof body.payment_id !== "string" || !body.payment_id ||
    typeof body.signature !== "string"
  ) {
    return respond({ error: "Invalid payment confirmation." }, 400)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID")
  const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET")
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !razorpayKeyId || !razorpayKeySecret) {
    console.error("Job payment verification is missing required environment variables.")
    return respond({ error: "Job payments are not configured yet." }, 500)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) return respond({ error: "Your session has expired. Sign in again." }, 401)

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: order, error: orderError } = await adminClient
    .from("job_payment_orders")
    .select("order_id, user_id, amount_paise, status, payment_id, job_id")
    .eq("order_id", body.order_id)
    .eq("user_id", userData.user.id)
    .maybeSingle()
  if (orderError) {
    console.error("Could not load pending job payment:", orderError.message)
    return respond({ error: "Could not confirm this payment. Please retry." }, 500)
  }
  if (!order) return respond({ error: "Payment order was not found for your account." }, 404)
  if (order.status === "paid") {
    if (order.payment_id !== body.payment_id || !order.job_id) {
      return respond({ error: "This payment order has already been completed." }, 409)
    }
    return respond({ job_id: order.job_id }, 200)
  }

  const signature = hexToBytes(body.signature)
  if (!signature) return respond({ error: "Invalid Razorpay payment signature." }, 400)
  const signingKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(razorpayKeySecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  )
  const signatureIsValid = await crypto.subtle.verify(
    "HMAC",
    signingKey,
    signature,
    new TextEncoder().encode(`${body.order_id}|${body.payment_id}`),
  )
  if (!signatureIsValid) return respond({ error: "Razorpay payment signature is invalid." }, 400)

  let payment: { id?: string; order_id?: string; amount?: number; currency?: string; status?: string }
  try {
    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(body.payment_id)}`, {
      headers: {
        Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
      },
    })
    if (!paymentResponse.ok) {
      console.error("Razorpay payment lookup failed with status:", paymentResponse.status)
      return respond({ error: "Could not confirm payment with Razorpay. Please retry." }, 502)
    }
    payment = await paymentResponse.json()
  } catch (error) {
    console.error("Razorpay payment lookup failed:", error)
    return respond({ error: "Could not connect to Razorpay. Please retry verification." }, 502)
  }

  if (
    payment.id !== body.payment_id ||
    payment.order_id !== body.order_id ||
    payment.amount !== order.amount_paise ||
    payment.currency !== "INR" ||
    payment.status !== "captured"
  ) {
    return respond({ error: "Razorpay has not confirmed the full payment yet. Retry verification shortly." }, 402)
  }

  const { data: jobId, error: completionError } = await adminClient.rpc("complete_job_payment", {
    p_order_id: body.order_id,
    p_payment_id: body.payment_id,
  })
  if (completionError || typeof jobId !== "string") {
    console.error("Could not complete paid job listing:", completionError?.message ?? "No job ID returned.")
    return respond({ error: "Payment was received, but the job could not be published yet. Retry verification." }, 500)
  }

  return respond({ job_id: jobId }, 200)
})
