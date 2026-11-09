import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function respond(body: Record<string, string>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (request.method !== "POST") {
    return respond({ error: "Method not allowed." }, 405)
  }

  let body: { username?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return respond({ error: "Invalid username or password." }, 400)
  }

  if (
    typeof body.username !== "string" ||
    typeof body.password !== "string" ||
    !body.username.trim() ||
    !body.password
  ) {
    return respond({ error: "Invalid username or password." }, 400)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("Username login is missing required Supabase environment variables.")
    return respond({ error: "Login is temporarily unavailable." }, 500)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const usernameBase = body.username
    .trim()
    .replace(/^@/, "")
    .replace(/\.gwl$/i, "")
    .toLowerCase()
  const { data: suffixedProfile, error: suffixedLookupError } = await adminClient
    .from("profiles")
    .select("email")
    .eq("username", `${usernameBase}.gwl`)
    .maybeSingle()

  if (suffixedLookupError) {
    console.error("Username lookup failed:", suffixedLookupError.message)
    return respond({ error: "Login is temporarily unavailable." }, 500)
  }

  let profile = suffixedProfile
  if (!profile) {
    const { data: legacyProfile, error: legacyLookupError } = await adminClient
      .from("profiles")
      .select("email")
      .eq("username", usernameBase)
      .maybeSingle()

    if (legacyLookupError) {
      console.error("Legacy username lookup failed:", legacyLookupError.message)
      return respond({ error: "Login is temporarily unavailable." }, 500)
    }
    profile = legacyProfile
  }

  if (!profile?.email) {
    return respond({ error: "Invalid username or password." }, 401)
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error: signInError } = await authClient.auth.signInWithPassword({
    email: profile.email,
    password: body.password,
  })

  if (signInError || !data.session) {
    return respond({ error: "Invalid username or password." }, 401)
  }

  return respond({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  }, 200)
})
