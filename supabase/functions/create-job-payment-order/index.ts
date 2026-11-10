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

function cleanText(value: unknown, min: number, max: number) {
  if (typeof value !== "string") return null
  const text = value.trim()
  return text.length >= min && text.length <= max ? text : null
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (request.method !== "POST") return respond({ error: "Method not allowed." }, 405)

  const authorization = request.headers.get("Authorization")
  if (!authorization) return respond({ error: "Sign in to post a job." }, 401)

  let body: { job?: Record<string, unknown>; days?: unknown }
  try {
    body = await request.json()
  } catch {
    return respond({ error: "Invalid job details." }, 400)
  }

  const days = body.days
  const source = body.job
  if (!source || typeof source !== "object" || !Number.isInteger(days) || Number(days) < 1 || Number(days) > 365) {
    return respond({ error: "Choose a listing duration from 1 to 365 days." }, 400)
  }

  const title = cleanText(source.title, 3, 100)
  const company = cleanText(source.company, 2, 100)
  const location = cleanText(source.location, 2, 100)
  const salary = cleanText(source.salary ?? "", 0, 100)
  const description = cleanText(source.description, 20, 5000)
  const requirements = cleanText(source.requirements ?? "", 0, 3000)
  const employmentTypes = ["Full-time", "Part-time", "Contract", "Internship", "Freelance"]
  const workplaceTypes = ["On-site", "Hybrid", "Remote"]
  if (
    !title || !company || !location || salary === null || !description || requirements === null ||
    typeof source.employment_type !== "string" || !employmentTypes.includes(source.employment_type) ||
    typeof source.workplace_type !== "string" || !workplaceTypes.includes(source.workplace_type)
  ) {
    return respond({ error: "Please check the job details and try again." }, 400)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID")
  const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET")
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !razorpayKeyId || !razorpayKeySecret) {
    console.error("Job payment creation is missing required environment variables.")
    return respond({ error: "Job payments are not configured yet." }, 500)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) return respond({ error: "Your session has expired. Sign in again." }, 401)

  const amount = Number(days) * 1000
  const receipt = crypto.randomUUID()
  let razorpayOrder: { id?: string; amount?: number; currency?: string }
  try {
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt,
        notes: { user_id: userData.user.id, listing_days: String(days) },
      }),
    })
    if (!razorpayResponse.ok) {
      console.error("Razorpay order creation failed with status:", razorpayResponse.status)
      return respond({ error: "Could not create a Razorpay order. Please try again." }, 502)
    }
    razorpayOrder = await razorpayResponse.json()
  } catch (error) {
    console.error("Razorpay order request failed:", error)
    return respond({ error: "Could not connect to Razorpay. Please try again." }, 502)
  }

  if (razorpayOrder.id !== undefined && razorpayOrder.amount !== amount) {
    console.error("Razorpay returned an unexpected order amount.")
    return respond({ error: "Could not confirm the payment amount." }, 502)
  }
  if (!razorpayOrder.id) return respond({ error: "Razorpay did not return a valid order." }, 502)

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: saveError } = await adminClient.from("job_payment_orders").insert({
    order_id: razorpayOrder.id,
    user_id: userData.user.id,
    title,
    company,
    location,
    employment_type: source.employment_type,
    workplace_type: source.workplace_type,
    salary,
    description,
    requirements,
    days,
    amount_paise: amount,
  })
  if (saveError) {
    console.error("Could not save pending job payment:", saveError.message)
    return respond({ error: "Could not save this payment. Please try again." }, 500)
  }

  return respond({
    order_id: razorpayOrder.id,
    key_id: razorpayKeyId,
    amount,
    currency: "INR",
  }, 200)
})
