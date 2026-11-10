import { createClient } from "@supabase/supabase-js"
import { ALL_INTERESTS } from "./interests"

const env = import.meta.env as Record<string, string | undefined>

const supabaseUrl =
  env.VITE_SUPABASE_URL ??
  env.NEXT_PUBLIC_SUPABASE_URL ??
  ""

const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY ??
  env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  ""

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: window.localStorage,
  },
})

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export type OwnProfile = {
  id: string
  email: string
  full_name: string
  username: string
  phone: string | null
  city: string
  bio: string
  interests: string[]
  avatar_url: string | null
  banner_url: string | null
  created_at: string
}

export type PublicProfile = Pick<
  OwnProfile,
  "id" | "full_name" | "username" | "city" | "bio" | "interests" | "avatar_url" | "banner_url" | "created_at"
> & {
  posts_count: number
  followers_count: number
  following_count: number
}

const ownProfileCacheKey = (userId: string) => `gwaliorwale-profile:${userId}`
const ownProfilePageCacheKey = (userId: string) => `gwaliorwale-profile-page:${userId}`
const ownProfilePageInvalidationKey = (userId: string) => `gwaliorwale-profile-page-invalidated:${userId}`

export function getCachedOwnProfile(userId: string): OwnProfile | null {
  try {
    const cached = sessionStorage.getItem(ownProfileCacheKey(userId))
    return cached ? JSON.parse(cached) as OwnProfile : null
  } catch {
    return null
  }
}

function cacheOwnProfile(profile: OwnProfile) {
  try {
    sessionStorage.setItem(ownProfileCacheKey(profile.id), JSON.stringify(profile))
  } catch {
    // The profile remains available in component state if browser storage is unavailable.
  }
}

function invalidateOwnProfilePageCache(userId: string) {
  try {
    sessionStorage.setItem(ownProfilePageInvalidationKey(userId), String(Date.now()))
  } catch {
    // Cache invalidation is best effort when browser storage is unavailable.
  }
}

export async function checkSupabaseConnection() {
  if (!isSupabaseConfigured) return false

  try {
    const { error } = await supabase.from("profiles").select("id").limit(1)

    if (error && error.code !== "42P01") {
      throw error
    }

    return true
  } catch {
    return false
  }
}

export async function signUpUser(payload: {
  email: string
  password: string
  fullName: string
  username: string
  city?: string
}) {
  const { email, password, fullName, username, city } = payload

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName.trim(),
        username: `${username.trim().replace(/\.gwl$/i, "").toLowerCase()}.gwl`,
        city: city || "City Centre",
      },
    },
  })

  if (error) throw error

  return data
}

export async function signInUser(username: string, password: string) {
  const { data, error } = await supabase.functions.invoke("login-with-username", {
    body: { username: username.trim(), password },
  })

  if (error) {
    if ("context" in error && error.context instanceof Response) {
      const responseBody: unknown = await error.context.clone().json().catch(() => null)
      if (
        typeof responseBody === "object" &&
        responseBody !== null &&
        "error" in responseBody &&
        typeof responseBody.error === "string"
      ) {
        throw new Error(responseBody.error)
      }
    }

    if (error.name === "FunctionsFetchError") {
      throw new Error("Could not reach username login. Check your connection and make sure the login-with-username function is deployed.")
    }
    throw new Error("Username login is not configured correctly. Deploy the login-with-username function and apply the Supabase schema.")
  }

  if (!data?.access_token || !data?.refresh_token) {
    throw new Error("Invalid username or password.")
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  })
  if (sessionError) throw sessionError
  if (!sessionData.user) throw new Error("Could not establish a login session.")

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", sessionData.user.id)
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile) {
    await supabase.auth.signOut()
    throw new Error("This account has no community profile. Apply the database schema and try again.")
  }

  return sessionData
}

export async function getOwnProfile(userId?: string) {
  const resolvedUserId = userId ?? (await getCurrentUser())?.id
  if (!resolvedUserId) throw new Error("Please log in to view your profile.")

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, username, phone, city, bio, interests, avatar_url, banner_url, created_at")
    .eq("id", resolvedUserId)
    .single()

  if (error) throw error
  cacheOwnProfile(data)
  return data
}

export async function updateOwnProfile(payload: {
  full_name: string
  username: string
  city: string
  bio: string
  interests: string[]
  phone: string
  avatar_url: string | null
  banner_url: string | null
}) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Please log in to update your profile.")
  const username = payload.username.replace(/^@/, "").trim().replace(/\.gwl$/i, "").toLowerCase()
  if (!/^[a-z0-9_-]{3,24}$/.test(username)) {
    throw new Error("Username must be 3–24 characters using letters, numbers, underscores, or hyphens.")
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...payload,
      username: `${username}.gwl`,
      phone: payload.phone.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select("id, email, full_name, username, phone, city, bio, interests, avatar_url, banner_url, created_at")
    .single()

  if (error) throw error
  cacheOwnProfile(data)
  invalidateOwnProfilePageCache(user.id)
  return data
}

export async function uploadProfileImage(file: File, kind: "avatar" | "banner") {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Choose a JPG, PNG, or WebP image.")
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Profile images must be 5 MB or smaller.")
  }

  const user = await getCurrentUser()
  if (!user) throw new Error("Please log in to update your profile images.")

  const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp"
  const path = `${user.id}/${kind}-${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage
    .from("profile-media")
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error

  const { data } = supabase.storage.from("profile-media").getPublicUrl(path)
  return `${data.publicUrl}?v=${Date.now()}`
}

export async function signOutUser() {
  const { data } = await supabase.auth.getSession()
  if (data.session?.user.id) {
    try {
      sessionStorage.removeItem(ownProfileCacheKey(data.session.user.id))
      sessionStorage.removeItem(ownProfilePageCacheKey(data.session.user.id))
      sessionStorage.removeItem(ownProfilePageInvalidationKey(data.session.user.id))
    } catch {
      // Cache cleanup is best effort; signing out must still proceed.
    }
  }
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user
}

export type CommunityPost = {
  id: string
  user_id: string
  full_name: string
  username: string
  avatar_url: string | null
  content: string
  category: string
  location: string
  image_url: string | null
  created_at: string
  likes_count: number
  comments_count: number
  liked_by_me: boolean
  interest_tags?: string[]
  following_by_me?: boolean
  is_own_post?: boolean
  group_id?: string | null
}

export type PostComment = {
  id: string
  post_id: string
  user_id: string
  parent_comment_id: string | null
  content: string
  author_full_name: string
  author_username: string
  author_avatar_url: string | null
  created_at: string
  likes_count: number
  liked_by_me: boolean
}

export type PostLiker = {
  id: string
  full_name: string
  username: string
  avatar_url: string | null
  liked_at: string
}

export type RecommendedCommunityGroup = {
  id: string
  name: string
  description: string
  interest_tags: string[]
  matching_interests: string[]
  member_count: number
  joined_by_me: boolean
}

export type PopularCommunityGroup = {
  id: string
  name: string
  member_count: number
  joined_by_me: boolean
}

export type JoinedCommunityGroup = {
  id: string
  name: string
  description: string
}

export type FollowListMember = {
  id: string
  full_name: string
  username: string
  avatar_url: string | null
}

export type ConversationParticipant = FollowListMember & {
  last_read_at: string | null
}

export type ConversationSummary = {
  conversation_id: string
  conversation_type: "direct" | "group"
  title: string | null
  created_at: string
  updated_at: string
  participants: ConversationParticipant[]
  last_message_id: string | null
  last_message_body: string | null
  last_message_attachment_path: string | null
  last_message_sender_id: string | null
  last_message_at: string | null
  unread_count: number
}

export type ConversationMessage = {
  id: string
  conversation_id: string
  sender_id: string
  sender_full_name: string
  sender_username: string
  sender_avatar_url: string | null
  body: string
  attachment_path: string | null
  created_at: string
  reply_to_id: string | null
  reply_body: string | null
  reply_sender_name: string | null
  edited_at: string | null
  deleted_at: string | null
  attachment_url?: string | null
}

export type TrendingTopic = {
  topic: string
  category: string
  discussion_count: number
  contributor_count: number
  interaction_count: number
  growth_percent: number
  last_activity_at: string
  trend_score: number
}

export async function getCommunityPosts(limit = 20, offset = 0) {
  const { data, error } = await supabase
    .rpc("get_community_posts")
    .range(offset, offset + limit - 1)
  if (error) throw error
  return data as CommunityPost[]
}

export async function getPersonalizedCommunityPosts(
  feed: "for_you" | "following" | "latest" | "trending",
  limit = 20,
  offset = 0,
) {
  const { data, error } = await supabase.rpc("get_personalized_community_posts", {
    p_feed: feed,
    p_limit: limit,
    p_offset: offset,
  })
  if (error) throw error
  return data as CommunityPost[]
}

export async function getRecommendedCommunityGroups(limit = 5) {
  const { data, error } = await supabase.rpc("get_recommended_community_groups", {
    p_limit: limit,
  })
  if (error) throw error
  return data as RecommendedCommunityGroup[]
}

export async function getPopularCommunityGroups(limit = 10) {
  const { data, error } = await supabase.rpc("get_popular_community_groups", {
    p_limit: limit,
  })
  if (error) throw error
  return data as PopularCommunityGroup[]
}

export async function createCommunityGroup(payload: {
  name: string
  description: string
  interestTags: string[]
}) {
  const { data, error } = await supabase.rpc("create_community_group", {
    p_name: payload.name.trim(),
    p_description: payload.description.trim(),
    p_interest_tags: payload.interestTags,
  })
  if (error?.code === "PGRST202" || error?.code === "42883") {
    throw new Error("Community creation is not enabled in Supabase yet. Apply the latest supabase/schema.sql, then try again.")
  }
  if (error) throw error
  return data as string
}

export async function toggleCommunityGroupMembership(groupId: string, joined: boolean) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Log in to join community groups.")

  const result = joined
    ? await supabase.from("community_group_members").delete().eq("group_id", groupId).eq("user_id", user.id)
    : await supabase.from("community_group_members").insert({ group_id: groupId, user_id: user.id })
  if (result.error) throw result.error
  invalidateOwnProfilePageCache(user.id)
}

export async function getJoinedCommunityGroups(userId: string) {
  const { data: memberships, error: membershipError } = await supabase
    .from("community_group_members")
    .select("group_id")
    .eq("user_id", userId)
  if (membershipError) throw membershipError
  const groupIds = memberships.map((membership) => membership.group_id)
  if (!groupIds.length) return [] as JoinedCommunityGroup[]

  const { data, error } = await supabase
    .from("community_groups")
    .select("id, name, description")
    .in("id", groupIds)
    .eq("is_active", true)
  if (error) throw error
  return data as JoinedCommunityGroup[]
}

export async function getMyJoinedCommunityGroups() {
  const user = await getCurrentUser()
  if (!user) throw new Error("Log in to view your joined groups.")
  return getJoinedCommunityGroups(user.id)
}

export async function getTrendingTopics(
  period: "2h" | "24h" | "7d" = "24h",
  category?: string,
  limit = 10,
) {
  const { data, error } = await supabase.rpc("get_trending_topics", {
    p_period: period,
    p_category: category || null,
    p_limit: limit,
  })
  if (error) throw error
  return data as TrendingTopic[]
}

export async function getCommunityPost(postId: string) {
  const { data, error } = await supabase
    .rpc("get_community_posts")
    .eq("id", postId)
    .maybeSingle()
  if (error) throw error
  return data as CommunityPost | null
}

export async function getPostComments(postId: string) {
  const { data, error } = await supabase.rpc("get_post_comments", { p_post_id: postId })
  if (error) throw error
  return data as PostComment[]
}

export async function getPostLikers(postId: string, limit = 50, offset = 0) {
  const { data, error } = await supabase.rpc("get_post_likers", {
    p_post_id: postId,
    p_limit: limit,
    p_offset: offset,
  })
  if (error) throw error
  return data as PostLiker[]
}

export async function togglePostLike(postId: string, liked: boolean) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Log in to like posts.")

  if (liked) {
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from("post_likes").insert({
      post_id: postId,
      user_id: user.id,
    })
    if (error) throw error
  }
  invalidateOwnProfilePageCache(user.id)
}

export async function toggleUserFollow(followingId: string, isFollowing: boolean) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Log in to follow community members.")
  if (user.id === followingId) throw new Error("You cannot follow your own account.")

  const query = supabase.from("user_follows")
  const result = isFollowing
    ? await query.delete().eq("follower_id", user.id).eq("following_id", followingId)
    : await query.insert({ follower_id: user.id, following_id: followingId })
  if (result.error) throw result.error
  invalidateOwnProfilePageCache(user.id)
}

export async function getProfileFollowList(
  profileId: string,
  listType: "followers" | "following",
) {
  const { data, error } = await supabase.rpc("get_profile_follow_list", {
    p_profile_id: profileId,
    p_list_type: listType,
  })
  if (error) throw error
  return data as FollowListMember[]
}

export async function getMyConversations() {
  const { data, error } = await supabase.rpc("get_my_conversations")
  if (error) throw error
  return (data ?? []) as ConversationSummary[]
}

export async function createConversation(participantIds: string[], title?: string) {
  const { data, error } = await supabase.rpc("create_conversation", {
    p_participant_ids: [...new Set(participantIds)],
    p_title: title?.trim() || null,
  })
  if (error) throw error
  return data as string
}

export type MarketplaceListing = {
  id: string
  owner_id: string
  category: string
  listing_type: "sell" | "rent" | "exchange" | "service"
  title: string
  description: string
  price: number
  is_negotiable: boolean
  condition: string | null
  locality: string
  image_urls: string[]
  show_seller_profile: boolean
  status: "active" | "sold" | "removed"
  created_at: string
}

export type MarketplaceSellerProfile = {
  id: string
  full_name: string
  username: string
  avatar_url: string | null
}

const marketplaceListingFields =
  "id, owner_id, category, listing_type, title, description, price, is_negotiable, condition, locality, image_urls, show_seller_profile, status, created_at"

export async function getMarketplaceListings() {
  const { data, error } = await supabase
    .from("marketplace_listings")
    .select(marketplaceListingFields)
    .eq("status", "active")
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as MarketplaceListing[]
}

export async function getMyMarketplaceListings() {
  const user = await getCurrentUser()
  if (!user) throw new Error("Log in to view your listings.")
  const { data, error } = await supabase
    .from("marketplace_listings")
    .select(marketplaceListingFields)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as MarketplaceListing[]
}

export async function getMyMarketplaceFavoriteIds() {
  const user = await getCurrentUser()
  if (!user) throw new Error("Log in to view saved listings.")
  const { data, error } = await supabase
    .from("marketplace_favorites")
    .select("listing_id")
    .eq("user_id", user.id)
  if (error) throw error
  return (data ?? []).map((favorite) => favorite.listing_id as string)
}

export async function toggleMarketplaceFavorite(listingId: string, isSaved: boolean) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Log in to save marketplace listings.")
  const result = isSaved
    ? await supabase.from("marketplace_favorites").delete()
      .eq("user_id", user.id).eq("listing_id", listingId)
    : await supabase.from("marketplace_favorites").insert({
      user_id: user.id,
      listing_id: listingId,
    })
  if (result.error) throw result.error
}

export async function publishMarketplaceListing(payload: {
  category: string
  listing_type: MarketplaceListing["listing_type"]
  title: string
  description: string
  price: number
  is_negotiable: boolean
  condition: string | null
  locality: string
  show_seller_profile: boolean
}, images: File[]) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Log in to publish a marketplace listing.")
  if (images.length < 1 || images.length > 8) {
    throw new Error("Add between 1 and 8 listing photos.")
  }
  for (const image of images) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(image.type)) {
      throw new Error("Choose JPG, PNG, or WebP photos.")
    }
    if (image.size > 5 * 1024 * 1024) {
      throw new Error("Each listing photo must be 5 MB or smaller.")
    }
  }

  const uploadedPaths: string[] = []
  try {
    const imageUrls: string[] = []
    for (const image of images) {
      const extension = image.type === "image/jpeg" ? "jpg" : image.type === "image/png" ? "png" : "webp"
      const path = `${user.id}/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage
        .from("marketplace-images")
        .upload(path, image, { contentType: image.type, upsert: false })
      if (uploadError) throw uploadError
      uploadedPaths.push(path)
      const { data } = supabase.storage.from("marketplace-images").getPublicUrl(path)
      imageUrls.push(data.publicUrl)
    }

    const { data, error } = await supabase
      .from("marketplace_listings")
      .insert({
        ...payload,
        owner_id: user.id,
        title: payload.title.trim(),
        description: payload.description.trim(),
        image_urls: imageUrls,
        status: "active",
      })
      .select(marketplaceListingFields)
      .single()
    if (error) throw error
    return data as MarketplaceListing
  } catch (error) {
    if (uploadedPaths.length) {
      const { error: cleanupError } = await supabase.storage
        .from("marketplace-images")
        .remove(uploadedPaths)
      if (cleanupError) console.error("Could not clean up marketplace photos after listing failure:", cleanupError)
    }
    throw error
  }
}

export async function updateMarketplaceListingStatus(
  listingId: string,
  status: "active" | "sold" | "removed",
) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Log in to manage your listings.")
  const { error } = await supabase
    .from("marketplace_listings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", listingId)
    .eq("owner_id", user.id)
  if (error) throw error
}

export async function getMarketplacePublicSeller(listingId: string) {
  const { data, error } = await supabase.rpc("get_marketplace_public_seller", {
    p_listing_id: listingId,
  })
  if (error) throw error
  return ((data ?? []) as MarketplaceSellerProfile[])[0] ?? null
}

export async function startMarketplaceConversation(listingId: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Log in to chat with the seller.")
  const { data, error } = await supabase.rpc("start_marketplace_conversation", {
    p_listing_id: listingId,
  })
  if (error) throw error
  return data as string
}

export async function getConversationMessages(conversationId: string, before?: string) {
  const { data, error } = await supabase.rpc("get_conversation_messages", {
    p_conversation_id: conversationId,
    p_before: before ?? null,
    p_limit: 100,
  })
  if (error) throw error

  const messages = (data ?? []) as ConversationMessage[]
  return Promise.all(messages.map(async (message) => {
    if (!message.attachment_path) return message
    const { data: signedUrl, error: signedUrlError } = await supabase.storage
      .from("chat-attachments")
      .createSignedUrl(message.attachment_path, 60 * 60)
    if (signedUrlError) throw signedUrlError
    return { ...message, attachment_url: signedUrl.signedUrl }
  }))
}

export async function sendConversationMessage(
  conversationId: string,
  senderId: string,
  body: string,
  attachmentPath: string | null,
  replyToId?: string | null,
) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body: body.trim(),
      attachment_path: attachmentPath,
      reply_to_id: replyToId ?? null,
    })
    .select("id")
    .single()
  if (error) throw error
  return data.id as string
}

export type JobListing = {
  id: string
  owner_id: string
  title: string
  company: string
  location: string
  employment_type: "Full-time" | "Part-time" | "Contract" | "Internship" | "Freelance"
  workplace_type: "On-site" | "Hybrid" | "Remote"
  salary: string
  description: string
  requirements: string
  status: "active" | "closed"
  created_at: string
  expires_at: string | null
}

export type JobApplication = {
  id: string
  job_id: string
  applicant_id: string
  applicant_name: string
  applicant_email: string
  applicant_phone: string
  cover_letter: string
  created_at: string
}

const jobListingFields =
  "id, owner_id, title, company, location, employment_type, workplace_type, salary, description, requirements, status, created_at, expires_at"
const jobApplicationFields =
  "id, job_id, applicant_id, applicant_name, applicant_email, applicant_phone, cover_letter, created_at"

export async function getJobListings() {
  const { data, error } = await supabase
    .from("job_listings")
    .select(jobListingFields)
    .eq("status", "active")
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as JobListing[]
}

export async function getJobListing(id: string) {
  const { data, error } = await supabase
    .from("job_listings")
    .select(jobListingFields)
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data as JobListing | null
}

export async function getMyJobListings() {
  const user = await getCurrentUser()
  if (!user) throw new Error("Log in to manage your job listings.")
  const { data, error } = await supabase
    .from("job_listings")
    .select(jobListingFields)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as JobListing[]
}

type JobListingPayload = {
  title: string
  company: string
  location: string
  employment_type: JobListing["employment_type"]
  workplace_type: JobListing["workplace_type"]
  salary: string
  description: string
  requirements: string
}

async function throwJobPaymentFunctionError(error: unknown): Promise<never> {
  if (typeof error === "object" && error !== null && "context" in error && error.context instanceof Response) {
    const body = await error.context.clone().json().catch(() => null) as { error?: unknown } | null
    if (typeof body?.error === "string") throw new Error(body.error)
  }
  if (error instanceof Error) throw error
  throw new Error("The job payment service is temporarily unavailable.")
}

export async function createJobPaymentOrder(payload: JobListingPayload, days: number) {
  const { data, error } = await supabase.functions.invoke("create-job-payment-order", {
    body: { job: payload, days },
  })
  if (error) await throwJobPaymentFunctionError(error)
  if (!data || typeof data.order_id !== "string" || typeof data.key_id !== "string" || typeof data.amount !== "number") {
    throw new Error("Could not start the job payment. Please try again.")
  }
  return {
    orderId: data.order_id,
    keyId: data.key_id,
    amount: data.amount,
    currency: typeof data.currency === "string" ? data.currency : "INR",
  }
}

export async function verifyJobPayment(payment: {
  order_id: string
  payment_id: string
  signature: string
}) {
  const { data, error } = await supabase.functions.invoke("verify-job-payment", {
    body: payment,
  })
  if (error) await throwJobPaymentFunctionError(error)
  if (!data || typeof data.job_id !== "string") {
    throw new Error("Payment was received, but the job could not be confirmed. Retry verification.")
  }
  return data.job_id
}

export async function updateJobStatus(id: string, status: JobListing["status"]) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Log in to manage your job listings.")
  const { error } = await supabase
    .from("job_listings")
    .update({ status })
    .eq("id", id)
    .eq("owner_id", user.id)
  if (error) throw error
}

export async function hasAppliedToJob(jobId: string) {
  const user = await getCurrentUser()
  if (!user) return false
  const { data, error } = await supabase
    .from("job_applications")
    .select("id")
    .eq("job_id", jobId)
    .eq("applicant_id", user.id)
    .maybeSingle()
  if (error) throw error
  return Boolean(data)
}

export async function applyForJob(payload: {
  job_id: string
  applicant_name: string
  applicant_email: string
  applicant_phone: string
  cover_letter: string
}) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Log in to apply for this job.")
  const { error } = await supabase.from("job_applications").insert({
    ...payload,
    applicant_id: user.id,
    applicant_name: payload.applicant_name.trim(),
    applicant_email: payload.applicant_email.trim(),
    applicant_phone: payload.applicant_phone.trim(),
    cover_letter: payload.cover_letter.trim(),
  })
  if (error?.code === "23505") throw new Error("You have already applied for this job.")
  if (error) throw error
}

export async function getJobApplications(jobId: string) {
  const { data, error } = await supabase
    .from("job_applications")
    .select(jobApplicationFields)
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as JobApplication[]
}

export async function editConversationMessage(messageId: string, body: string) {
  const { error } = await supabase.rpc("edit_conversation_message", {
    p_message_id: messageId,
    p_body: body.trim(),
  })
  if (error) throw error
}

export async function deleteConversationMessage(messageId: string) {
  const { error } = await supabase.rpc("delete_conversation_message", {
    p_message_id: messageId,
  })
  if (error) throw error
}

export async function uploadChatImage(file: File, conversationId: string) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choose a JPG, PNG, or WebP image.")
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Chat images must be 5 MB or smaller.")
  }

  const user = await getCurrentUser()
  if (!user) throw new Error("Log in to attach an image.")
  const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp"
  const path = `${conversationId}/${user.id}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage
    .from("chat-attachments")
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return path
}

export async function markConversationRead(conversationId: string) {
  const { error } = await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
  })
  if (error) throw error
}

export async function setConversationTyping(conversationId: string, isTyping: boolean) {
  const { error } = await supabase.rpc("set_conversation_typing", {
    p_conversation_id: conversationId,
    p_is_typing: isTyping,
  })
  if (error) throw error
}

export async function getPublicProfile(profileId: string) {
  const { data, error } = await supabase.rpc("get_public_profile", {
    p_profile_id: profileId,
  })
  if (error) throw error
  const profile = Array.isArray(data) ? data[0] : data
  if (!profile) throw new Error("This profile could not be found.")
  const result = profile as PublicProfile
  return {
    ...result,
    posts_count: Number(result.posts_count),
    followers_count: Number(result.followers_count),
    following_count: Number(result.following_count),
  }
}

export async function getPublicProfileByUsername(username: string) {
  const { data, error } = await supabase.rpc("get_public_profile_by_username", {
    p_username: username,
  })
  if (error) throw error
  const profile = Array.isArray(data) ? data[0] : data
  if (!profile) throw new Error("This profile could not be found.")
  const result = profile as PublicProfile
  return {
    ...result,
    posts_count: Number(result.posts_count),
    followers_count: Number(result.followers_count),
    following_count: Number(result.following_count),
  }
}

export async function setInterestFeedback(interestTag: string, adjustment: -2 | -1 | 1) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Log in to personalize your feed.")

  const { error } = await supabase.from("user_interest_feedback").upsert(
    { user_id: user.id, interest_tag: interestTag, adjustment, updated_at: new Date().toISOString() },
    { onConflict: "user_id,interest_tag" },
  )
  if (error) throw error
}

export async function resetInterestFeedback() {
  const user = await getCurrentUser()
  if (!user) throw new Error("Log in to reset feed personalization.")

  const { error } = await supabase
    .from("user_interest_feedback")
    .delete()
    .eq("user_id", user.id)
  if (error) throw error
}

export async function toggleCommentLike(commentId: string, liked: boolean) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Log in to like comments.")

  if (liked) {
    const { error } = await supabase
      .from("comment_likes")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", user.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from("comment_likes").insert({
      comment_id: commentId,
      user_id: user.id,
    })
    if (error) throw error
  }
}

export async function addPostComment(postId: string, content: string, parentCommentId?: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error("Log in to comment.")

  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    user_id: user.id,
    parent_comment_id: parentCommentId ?? null,
    content: content.trim(),
  })
  if (error) throw error
  invalidateOwnProfilePageCache(user.id)
}

export async function createUserPost(payload: {
  content: string
  category: string
  location: string
  visibility: string
  imageUrl?: string
  interestTags: string[]
  groupId?: string
}) {
  const user = await getCurrentUser()
  if (!user) throw new Error("You must be logged in to create a post.")
  const interestTags = [...new Set(payload.interestTags)]
  if (interestTags.length > 3 || interestTags.some((tag) => !ALL_INTERESTS.includes(tag as typeof ALL_INTERESTS[number]))) {
    throw new Error("Choose up to 3 valid post topics.")
  }

  const { data, error } = await supabase.from("posts").insert({
    user_id: user.id,
    content: payload.content,
    category: payload.category,
    location: payload.location,
    visibility: payload.visibility,
    image_url: payload.imageUrl || null,
    interest_tags: interestTags,
    group_id: payload.groupId || null,
  }).select("id, user_id, created_at, interest_tags, group_id").single()

  if (error) throw error
  invalidateOwnProfilePageCache(user.id)
  return data
}
