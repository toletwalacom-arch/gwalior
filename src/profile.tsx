import { FormEvent, useEffect, useRef, useState } from "react"
import {
  CommunityPost,
  createConversation,
  addPostComment,
  FollowListMember,
  getCachedOwnProfile,
  getCommunityPost,
  getJoinedCommunityGroups,
  getMyJobListings,
  getMyMarketplaceListings,
  getOwnProfile,
  getPersonalizedCommunityPosts,
  getPostComments,
  getPostLikers,
  getProfileFollowList,
  getPublicProfile,
  getPublicProfileByUsername,
  getRecommendedCommunityGroups,
  JoinedCommunityGroup,
  JobListing,
  MarketplaceListing,
  OwnProfile,
  PostComment,
  PostLiker,
  RecommendedCommunityGroup,
  signOutUser,
  supabase,
  toggleCommunityGroupMembership,
  togglePostLike,
  toggleUserFollow,
  updateOwnProfile,
  uploadProfileImage,
} from "./lib/supabase"
import { INTEREST_CATEGORIES } from "./lib/interests"

function go(path: string, state: unknown = {}) {
  window.history.pushState(state, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
  window.scrollTo({ top: 0, behavior: "smooth" })
}

function Icon({ name, size = 18, className = "" }: { name: string; size?: number; className?: string }) {
  const paths: Record<string, React.JSX.Element> = {
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    bookmark: <path d="M6 3h12v18l-6-4-6 4Z" />,
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2" />
      </>
    ),
    building: (
      <>
        <path d="M4 21h16M6 21V5l6-2 6 2v16M9 9h.01M15 9h.01M9 13h.01M15 13h.01M10 21v-4h4v4" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    comment: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.7-5.1A8 8 0 1 1 21 15Z" />,
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="m16.5 3.5 4 4L8 20H4v-4Z" />
      </>
    ),
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9M9 20v-6h6v6" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9" r="1.5" />
        <path d="m21 15-5-5L5 20" />
      </>
    ),
    location: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    send: <path d="m22 2-7 20-4-9-9-4ZM22 2 11 13" />,
    share: (
      <>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
      </>
    ),
    shop: (
      <>
        <path d="M3 10h18l-1.5-6h-15Z" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    verified: (
      <>
        <path d="M12 2 15 4l4-.1.1 4L21 11l-2 3 .1 4-4-.1L12 20l-3-2.1-4 .1.1-4L3 11l2.1-3.1L5 4l4 .1Z" />
        <path d="m8.5 11 2.2 2.2 4.8-5" />
      </>
    ),
  }

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function Button({ children, onClick, variant = "primary", className = "", type = "button", disabled = false }: { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "outline" | "soft" | "white"; className?: string; type?: "button" | "submit"; disabled?: boolean }) {
  const styles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/15",
    secondary: "bg-[#142B49] text-white hover:bg-[#1c3a61]",
    outline: "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700",
    soft: "bg-blue-50 text-blue-700 hover:bg-blue-100",
    white: "bg-white text-[#142B49] hover:bg-slate-50",
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${styles[variant]} ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`}
    >
      {children}
    </button>
  )
}

function ProfilePostLikersList({ postId, active }: { postId: string; active: boolean }) {
  const [likers, setLikers] = useState<PostLiker[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState("")
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    if (!active) return
    let current = true
    setLikers([])
    setOffset(0)
    setError("")
    setLoading(true)
    getPostLikers(postId)
      .then((rows) => {
        if (!current) return
        setLikers(rows)
        setOffset(rows.length)
        setHasMore(rows.length === 50)
      })
      .catch((reason: unknown) => {
        if (current) setError(reason instanceof Error ? reason.message : "Could not load post likes.")
      })
      .finally(() => {
        if (current) setLoading(false)
      })
    return () => { current = false }
  }, [active, postId])

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    setError("")
    try {
      const rows = await getPostLikers(postId, 50, offset)
      setLikers((current) => [...current, ...rows])
      setOffset((current) => current + rows.length)
      setHasMore(rows.length === 50)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load more likes.")
    } finally {
      setLoadingMore(false)
    }
  }

  if (!active) return null
  if (loading) return <p role="status" className="profile-engagement-status">Loading likes…</p>
  if (error && !likers.length) return <p role="alert" className="profile-engagement-error">{error}</p>

  return (
    <div className="profile-engagement-list">
      {likers.map((liker) => (
        <button
          type="button"
          key={liker.id}
          onClick={() => go(`/profile/${encodeURIComponent(liker.username)}`)}
          className="profile-engagement-person"
        >
          <span className="profile-engagement-avatar">
            {liker.avatar_url ? <img src={liker.avatar_url} alt="" /> : initials(liker.full_name || "Community member")}
          </span>
          <span className="profile-engagement-person-copy">
            <strong>{liker.full_name || "Community member"}</strong>
            <small>@{liker.username}</small>
          </span>
          <Icon name="heart" size={18} className="profile-engagement-heart" />
        </button>
      ))}
      {!likers.length && <p className="profile-engagement-status">No one has liked this post yet.</p>}
      {error && <p role="alert" className="profile-engagement-error">{error}</p>}
      {hasMore && (
        <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="profile-engagement-more">
          {loadingMore ? "Loading…" : "Show more"}
        </button>
      )}
    </div>
  )
}

type ProfileData = NonNullable<ReturnType<typeof getCachedOwnProfile>>

type UserPost = {
  id: string
  content: string
  category: string
  location: string
  image_url: string | null
  created_at: string
  likes_count: number
  comments_count: number
  interest_tags: string[]
}

const isDatabasePostId = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

type ProfileActivity = {
  id: string
  type: "post" | "job" | "marketplace"
  title: string
  detail: string
  createdAt: string
  status?: string
  post?: UserPost
}

type ProfilePageCache = {
  userId: string
  updatedAt: number
  profile: ProfileData
  posts: UserPost[]
  communities: JoinedCommunityGroup[]
  stats: { posts: number; followers: number; following: number }
}

let memoryProfilePageCache: ProfilePageCache | null = null

function readProfilePageCache(userId: string): ProfilePageCache | null {
  if (memoryProfilePageCache?.userId === userId) return memoryProfilePageCache

  try {
    const cached = sessionStorage.getItem(`gwaliorwale-profile-page:${userId}`)
    if (!cached) return null
    const parsed = JSON.parse(cached) as ProfilePageCache
    if (parsed.userId !== userId || !parsed.profile || !Array.isArray(parsed.posts) || !parsed.stats) return null
    memoryProfilePageCache = parsed
    return parsed
  } catch {
    return null
  }
}

function isProfilePageCacheFresh(cache: ProfilePageCache) {
  if (!Array.isArray(cache.communities)) return false
  try {
    const invalidatedAt = Number(sessionStorage.getItem(`gwaliorwale-profile-page-invalidated:${cache.userId}`) ?? 0)
    return invalidatedAt <= cache.updatedAt && Date.now() - cache.updatedAt < 60_000
  } catch {
    return Date.now() - cache.updatedAt < 60_000
  }
}

function writeProfilePageCache(cache: ProfilePageCache) {
  const updatedCache = { ...cache, updatedAt: Date.now() }
  memoryProfilePageCache = updatedCache
  try {
    sessionStorage.setItem(`gwaliorwale-profile-page:${cache.userId}`, JSON.stringify(updatedCache))
    sessionStorage.removeItem(`gwaliorwale-profile-page-invalidated:${cache.userId}`)
  } catch {
    // Keep the in-memory cache even if browser storage is unavailable.
  }
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()
}

function normalizeProfileUsername(username: string) {
  return username.replace(/\.gwl$/i, "")
}

function postForDetail(post: UserPost, profile: Pick<OwnProfile, "id" | "full_name" | "username" | "avatar_url">) {
  return {
    id: post.id,
    createdAt: post.created_at,
    name: profile.full_name,
    handle: `@${normalizeProfileUsername(profile.username)}.gwl`,
    avatar: initials(profile.full_name),
    avatarUrl: profile.avatar_url,
    time: new Date(post.created_at).toLocaleDateString(),
    category: post.category,
    location: post.location,
    text: post.content,
    image: post.image_url ?? undefined,
    likes: post.likes_count,
    comments: post.comments_count,
    userId: profile.id,
    interestTags: post.interest_tags,
  }
}

function formatJoinDate(date: string) {
  return `Joined ${new Date(date).toLocaleDateString(undefined, { month: "long", year: "numeric" })}`
}

type ProfileViewData = Omit<OwnProfile, "email" | "phone"> & { phone?: string | null }

export default function ProfilePage({ onLogout, profileSlug }: { onLogout?: () => void; profileSlug?: string }) {
  const [profile, setProfile] = useState<ProfileViewData | null>(null)
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [posts, setPosts] = useState<UserPost[]>([])
  const [communities, setCommunities] = useState<JoinedCommunityGroup[]>([])
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [logoutError, setLogoutError] = useState("")
  const [loggingOut, setLoggingOut] = useState(false)
  const [followListProfile, setFollowListProfile] = useState<{ id: string; name: string } | null>(null)
  const [followListType, setFollowListType] = useState<"followers" | "following">("followers")
  const [followList, setFollowList] = useState<FollowListMember[]>([])
  const [followListLoading, setFollowListLoading] = useState(false)
  const [followListError, setFollowListError] = useState("")
  const [startingConversation, setStartingConversation] = useState(false)
  const [conversationError, setConversationError] = useState("")
  const [isFollowing, setIsFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [followError, setFollowError] = useState("")
  const [profileSection, setProfileSection] = useState<"overview" | "activity" | "listings" | "communities" | "about">("activity")
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [shareStatus, setShareStatus] = useState("")
  const [myJobs, setMyJobs] = useState<JobListing[]>([])
  const [myMarketplaceListings, setMyMarketplaceListings] = useState<MarketplaceListing[]>([])
  const [recommendedGroups, setRecommendedGroups] = useState<RecommendedCommunityGroup[]>([])
  const [suggestedPeople, setSuggestedPeople] = useState<CommunityPost[]>([])
  const [hubLoading, setHubLoading] = useState(false)
  const [hubError, setHubError] = useState("")
  const [joiningGroupId, setJoiningGroupId] = useState("")
  const [followingSuggestionId, setFollowingSuggestionId] = useState("")
  const [selectedPost, setSelectedPost] = useState<UserPost | null>(null)
  const [selectedPostComments, setSelectedPostComments] = useState<PostComment[]>([])
  const [selectedPostCommentsLoading, setSelectedPostCommentsLoading] = useState(false)
  const [selectedPostError, setSelectedPostError] = useState("")
  const [selectedPostLiked, setSelectedPostLiked] = useState(false)
  const [engagementDialog, setEngagementDialog] = useState<"likes" | "comments" | null>(null)
  const [postLikeBusy, setPostLikeBusy] = useState(false)
  const [commentDraft, setCommentDraft] = useState("")
  const [commentBusy, setCommentBusy] = useState(false)
  const [postShareStatus, setPostShareStatus] = useState("")
  const isOwnProfile = Boolean(profile && viewerId && profile.id === viewerId)

  useEffect(() => {
    if (!followListProfile) return
    let active = true
    setFollowListLoading(true)
    setFollowListError("")
    getProfileFollowList(followListProfile.id, followListType)
      .then((members) => {
        if (active) setFollowList(members)
      })
      .catch((reason: unknown) => {
        if (active) {
          setFollowList([])
          setFollowListError(reason instanceof Error ? reason.message : "Could not load this list.")
        }
      })
      .finally(() => {
        if (active) setFollowListLoading(false)
      })
    return () => { active = false }
  }, [followListProfile, followListType])

  const handleLogout = async () => {
    setAccountMenuOpen(false)
    setLoggingOut(true)
    setLogoutError("")
    try {
      await signOutUser()
      onLogout?.()
      go("/login")
    } catch (err) {
      setLogoutError(err instanceof Error ? err.message : "Could not log out.")
    } finally {
      setLoggingOut(false)
    }
  }

  const startConversation = async () => {
    if (!profile || startingConversation) return
    setStartingConversation(true)
    setConversationError("")
    try {
      const conversationId = await createConversation([profile.id])
      go(`/messages/${conversationId}`)
    } catch (reason) {
      setConversationError(reason instanceof Error ? reason.message : "Could not start this conversation.")
    } finally {
      setStartingConversation(false)
    }
  }

  const toggleFollow = async () => {
    if (!profile || isOwnProfile || followBusy) return
    setFollowBusy(true)
    setFollowError("")
    try {
      await toggleUserFollow(profile.id, isFollowing)
      setIsFollowing(!isFollowing)
      setStats((current) => ({
        ...current,
        followers: Math.max(0, current.followers + (isFollowing ? -1 : 1)),
      }))
      window.dispatchEvent(new Event("gwalior:feed-preferences-changed"))
    } catch (reason) {
      setFollowError(reason instanceof Error ? reason.message : "Could not update your follow.")
    } finally {
      setFollowBusy(false)
    }
  }

  const shareProfile = async () => {
    if (!profile) return
    setShareStatus("")
    const url = `${window.location.origin}/profile/${encodeURIComponent(normalizeProfileUsername(profile.username))}`
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: `${profile.full_name} on GwaliorWale`, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setShareStatus("Profile link copied")
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return
      setShareStatus(reason instanceof Error ? reason.message : "Could not share this profile.")
    }
  }

  useEffect(() => {
    let active = true
    async function loadProfile() {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        const user = sessionData.session?.user
        if (!user) throw new Error("Please log in to view your profile.")
        if (active) setViewerId(user.id)
        const isUuid = Boolean(profileSlug && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileSlug))
        const resolvedPublicProfile = profileSlug
          ? isUuid
            ? null
            : await getPublicProfileByUsername(profileSlug)
          : null
        const targetProfileId = isUuid ? profileSlug! : resolvedPublicProfile?.id ?? user.id
        const viewingOwnProfile = targetProfileId === user.id
        const cached = viewingOwnProfile ? readProfilePageCache(user.id) : null
        if (cached && active) {
          setProfile(cached.profile)
          setPosts(cached.posts)
          setCommunities(cached.communities ?? [])
          setStats(cached.stats)
          setLoading(false)
          if (isProfilePageCacheFresh(cached)) return
        }

        if (!viewingOwnProfile) {
          const publicProfile = resolvedPublicProfile ?? await getPublicProfile(targetProfileId)
          const [postsResult, followResult] = await Promise.all([
            supabase
              .from("posts")
              .select("id, content, category, location, image_url, created_at, likes_count, comments_count, interest_tags")
              .eq("user_id", publicProfile.id)
              .eq("visibility", "public")
              .is("group_id", null)
              .order("created_at", { ascending: false }),
            supabase
              .from("user_follows")
              .select("follower_id", { count: "exact", head: true })
              .eq("follower_id", user.id)
              .eq("following_id", publicProfile.id),
          ])
          if (postsResult.error) throw postsResult.error
          if (followResult.error) throw followResult.error
          if (!active) return
          setProfile(publicProfile as ProfileViewData)
          setPosts(postsResult.data as UserPost[])
          setIsFollowing((followResult.count ?? 0) > 0)
          setCommunities([])
          setStats({
            posts: publicProfile.posts_count,
            followers: publicProfile.followers_count,
            following: publicProfile.following_count,
          })
          return
        }

        const [profileResult, followersResult, followingResult, postsResult, communitiesResult] = await Promise.all([
          getOwnProfile(user.id),
          supabase.from("user_follows").select("follower_id", { count: "exact", head: true }).eq("following_id", user.id),
          supabase.from("user_follows").select("following_id", { count: "exact", head: true }).eq("follower_id", user.id),
          supabase.from("posts").select("id, content, category, location, image_url, created_at, likes_count, comments_count, interest_tags").eq("user_id", user.id).order("created_at", { ascending: false }),
          getJoinedCommunityGroups(user.id),
        ])
        const row = profileResult
        if (followersResult.error) throw followersResult.error
        if (followingResult.error) throw followingResult.error
        if (postsResult.error) throw postsResult.error
        if (!active) return

        const freshCache: ProfilePageCache = {
          userId: user.id,
          updatedAt: Date.now(),
          profile: row as ProfileData,
          posts: postsResult.data as UserPost[],
          communities: communitiesResult,
          stats: {
            posts: postsResult.data.length,
          followers: followersResult.count ?? 0,
          following: followingResult.count ?? 0,
          },
        }
        writeProfilePageCache(freshCache)
        setProfile(freshCache.profile)
        setPosts(freshCache.posts)
        setCommunities(freshCache.communities)
        setStats(freshCache.stats)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load this profile.")
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadProfile()
    return () => { active = false }
  }, [profileSlug])

  useEffect(() => {
    if (!isOwnProfile) return
    let active = true
    setHubLoading(true)
    setHubError("")

    Promise.allSettled([
      getMyJobListings(),
      getMyMarketplaceListings(),
      getRecommendedCommunityGroups(4),
      getPersonalizedCommunityPosts("for_you", 20),
    ]).then(([jobsResult, listingsResult, groupsResult, peopleResult]) => {
      if (!active) return
      const errors: string[] = []
      if (jobsResult.status === "fulfilled") setMyJobs(jobsResult.value)
      else errors.push("job listings")
      if (listingsResult.status === "fulfilled") setMyMarketplaceListings(listingsResult.value)
      else errors.push("marketplace listings")
      if (groupsResult.status === "fulfilled") setRecommendedGroups(groupsResult.value)
      else errors.push("suggested communities")
      if (peopleResult.status === "fulfilled") {
        const uniquePeople = new Map<string, CommunityPost>()
        for (const post of peopleResult.value) {
          if (post.user_id !== viewerId && !post.following_by_me && !uniquePeople.has(post.user_id)) {
            uniquePeople.set(post.user_id, post)
          }
        }
        setSuggestedPeople(Array.from(uniquePeople.values()).slice(0, 4))
      } else errors.push("suggested people")
      if (errors.length) setHubError(`Could not load ${errors.join(", ")}.`)
    }).finally(() => {
      if (active) setHubLoading(false)
    })

    return () => { active = false }
  }, [isOwnProfile, viewerId])

  useEffect(() => {
    if (!selectedPost) return
    const postId = selectedPost.id
    if (!isDatabasePostId(postId)) return

    let active = true
    setSelectedPostComments([])
    setSelectedPostCommentsLoading(true)
    setSelectedPostError("")
    Promise.allSettled([getCommunityPost(postId), getPostComments(postId)])
      .then(([postResult, commentsResult]) => {
        if (!active) return
        const errors: string[] = []
        if (postResult.status === "fulfilled" && postResult.value) {
          const freshPost = postResult.value
          setSelectedPost((current) => current?.id === postId ? {
            ...current,
            content: freshPost.content,
            category: freshPost.category,
            location: freshPost.location,
            image_url: freshPost.image_url,
            created_at: freshPost.created_at,
            likes_count: freshPost.likes_count,
            comments_count: freshPost.comments_count,
            interest_tags: freshPost.interest_tags ?? [],
          } : current)
          setSelectedPostLiked(freshPost.liked_by_me)
        } else if (postResult.status === "rejected") {
          errors.push(postResult.reason instanceof Error ? postResult.reason.message : "Could not refresh this post.")
        }
        if (commentsResult.status === "fulfilled") {
          setSelectedPostComments(commentsResult.value)
        } else {
          errors.push(commentsResult.reason instanceof Error ? commentsResult.reason.message : "Could not load comments.")
        }
        if (errors.length) setSelectedPostError(errors.join(" "))
      })
      .finally(() => {
        if (active) setSelectedPostCommentsLoading(false)
      })
    return () => { active = false }
  }, [selectedPost?.id])

  useEffect(() => {
    if (!selectedPost) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [selectedPost])

  useEffect(() => {
    if (!selectedPost) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      if (engagementDialog) setEngagementDialog(null)
      else setSelectedPost(null)
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [selectedPost, engagementDialog])

  const toggleSelectedPostLike = async () => {
    if (!selectedPost || postLikeBusy) return
    if (!isDatabasePostId(selectedPost.id)) {
      setSelectedPostError("Likes are available on published posts.")
      return
    }
    const wasLiked = selectedPostLiked
    setPostLikeBusy(true)
    setSelectedPostError("")
    try {
      await togglePostLike(selectedPost.id, wasLiked)
      const count = Math.max(0, selectedPost.likes_count + (wasLiked ? -1 : 1))
      setSelectedPostLiked(!wasLiked)
      setSelectedPost((current) => current?.id === selectedPost.id ? { ...current, likes_count: count } : current)
      setPosts((current) => current.map((post) => post.id === selectedPost.id ? { ...post, likes_count: count } : post))
    } catch (reason) {
      setSelectedPostError(reason instanceof Error ? reason.message : "Could not update your like.")
    } finally {
      setPostLikeBusy(false)
    }
  }

  const submitSelectedPostComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedPost || !commentDraft.trim() || commentBusy || selectedPostCommentsLoading) return
    if (!isDatabasePostId(selectedPost.id)) {
      setSelectedPostError("Comments are available on published posts.")
      return
    }
    setCommentBusy(true)
    setSelectedPostError("")
    try {
      await addPostComment(selectedPost.id, commentDraft)
      setCommentDraft("")
      const comments = await getPostComments(selectedPost.id)
      setSelectedPostComments(comments)
      setSelectedPost((current) => current?.id === selectedPost.id ? { ...current, comments_count: comments.length } : current)
      setPosts((current) => current.map((post) => post.id === selectedPost.id ? { ...post, comments_count: comments.length } : post))
    } catch (reason) {
      setSelectedPostError(reason instanceof Error ? reason.message : "Could not add your comment.")
    } finally {
      setCommentBusy(false)
    }
  }

  const joinRecommendedGroup = async (group: RecommendedCommunityGroup) => {
    if (joiningGroupId) return
    setJoiningGroupId(group.id)
    setHubError("")
    try {
      await toggleCommunityGroupMembership(group.id, group.joined_by_me)
      setRecommendedGroups((current) => current.map((item) => item.id === group.id
        ? { ...item, joined_by_me: !item.joined_by_me, member_count: Math.max(0, item.member_count + (item.joined_by_me ? -1 : 1)) }
        : item))
    } catch (reason) {
      setHubError(reason instanceof Error ? reason.message : "Could not update your community membership.")
    } finally {
      setJoiningGroupId("")
    }
  }

  const followSuggestedPerson = async (person: CommunityPost) => {
    if (followingSuggestionId) return
    setFollowingSuggestionId(person.user_id)
    setHubError("")
    try {
      await toggleUserFollow(person.user_id, false)
      setSuggestedPeople((current) => current.filter((item) => item.user_id !== person.user_id))
      setStats((current) => ({ ...current, following: current.following + 1 }))
      window.dispatchEvent(new Event("gwalior:feed-preferences-changed"))
    } catch (reason) {
      setHubError(reason instanceof Error ? reason.message : "Could not follow this member.")
    } finally {
      setFollowingSuggestionId("")
    }
  }

  const shareSelectedPost = async () => {
    if (!selectedPost) return
    const url = `${window.location.origin}/post/${encodeURIComponent(selectedPost.id)}`
    setPostShareStatus("")
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: `${profile?.full_name ?? "Community member"} on GwaliorWale`,
          text: selectedPost.content,
          url,
        })
        setPostShareStatus("Post shared")
        return
      }
      await navigator.clipboard.writeText(url)
      setPostShareStatus("Post link copied")
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return
      setPostShareStatus(reason instanceof Error ? reason.message : "Could not share this post.")
    }
  }

  if (loading) {
    return <main className="section min-h-[50vh]"><p className="text-sm text-slate-500">Loading profile...</p></main>
  }
  if (!profile) {
    return (
      <main className="section min-h-[50vh]">
        <p className="text-sm text-red-600">{error || (loading ? "Loading profile..." : "Profile not found.")}</p>
        <button onClick={() => go("/login")} className="mt-4 text-sm font-bold text-blue-600">Log in</button>
      </main>
    )
  }

  const location = profile.city ? `${profile.city}, Gwalior` : "Gwalior"
  const activeSection = isOwnProfile || !["overview", "listings", "communities"].includes(profileSection)
    ? profileSection
    : "activity"
  const visibleCommunities = activeSection === "activity" ? communities.slice(0, 3) : communities
  const profileTabs = isOwnProfile
    ? [
        { id: "activity" as const, label: "Posts", icon: "image" },
        { id: "listings" as const, label: "Listings", icon: "briefcase" },
        { id: "communities" as const, label: "Communities", icon: "users" },
        { id: "about" as const, label: "About", icon: "user" },
        { id: "overview" as const, label: "Local hub", icon: "home" },
      ]
    : [
        { id: "activity" as const, label: "Posts", icon: "image" },
        { id: "about" as const, label: "About", icon: "user" },
      ]
  const recentActivities: ProfileActivity[] = [
    ...posts.map((post) => ({
      id: post.id,
      type: "post" as const,
      title: post.content,
      detail: `${post.category} · ${post.location}`,
      createdAt: post.created_at,
      post,
    })),
    ...myJobs.map((job) => ({
      id: job.id,
      type: "job" as const,
      title: job.title,
      detail: `${job.company} · ${job.location}`,
      createdAt: job.created_at,
      status: job.status,
    })),
    ...myMarketplaceListings.map((listing) => ({
      id: listing.id,
      type: "marketplace" as const,
      title: listing.title,
      detail: `${listing.locality} · ${listing.listing_type === "sell" ? "For sale" : listing.listing_type}`,
      createdAt: listing.created_at,
      status: listing.status,
    })),
  ].sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
  const profileTopics = [...new Set(posts.flatMap((post) => post.interest_tags ?? []))].slice(0, 6)

  return (
    <div className={`profile-page bg-[#f4f6fb] pb-24 text-[#172033] ${activeSection === "about" ? "profile-about-active" : ""}`}>
      <main className="profile-main mx-auto max-w-[1280px] px-4 pb-10 pt-0 sm:px-6">
        {error && <p role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Showing saved profile data. Could not refresh it: {error}</p>}
        <div className="profile-intro">
          <div className="profile-intro-layout">
            <div className="profile-identity">
              <div className="profile-avatar relative grid place-items-center overflow-hidden bg-gradient-to-br from-blue-700 via-blue-500 to-sky-300 text-3xl font-black text-white">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={`${profile.full_name} profile`} className="absolute inset-0 h-full w-full object-cover" />
                ) : initials(profile.full_name)}
              </div>

              <div className="profile-name-block">
                <h1 className="profile-name">{profile.full_name}</h1>
                <p className="profile-handle">
                  @{normalizeProfileUsername(profile.username)}<span className="profile-handle-suffix">.gwl</span>
                </p>
                <div className="profile-header-meta">
                  <span><Icon name="location" size={14} />{location}</span>
                  <span><Icon name="calendar" size={14} />{formatJoinDate(profile.created_at)}</span>
                </div>

                <div className="profile-summary-row">
                  <div className="profile-stats">
                    <div className="profile-stat">
                      <div>{stats.posts}</div>
                      <div>posts</div>
                    </div>
                    <button type="button" onClick={() => { setFollowListProfile({ id: profile.id, name: profile.full_name }); setFollowListType("followers") }} className="profile-stat" aria-label={`View ${stats.followers} followers`}>
                      <div>{stats.followers}</div>
                      <div>followers</div>
                    </button>
                    <button type="button" onClick={() => { setFollowListProfile({ id: profile.id, name: profile.full_name }); setFollowListType("following") }} className="profile-stat" aria-label={`View ${stats.following} following`}>
                      <div>{stats.following}</div>
                      <div>following</div>
                    </button>
                  </div>
                  {profile.bio ? (
                    <p className="profile-bio">{profile.bio}</p>
                  ) : isOwnProfile ? (
                    <button type="button" onClick={() => go("/profile/edit")} className="profile-bio-empty">
                      Add a short introduction
                      <Icon name="edit" size={14} />
                    </button>
                  ) : null}
                </div>
                {logoutError && <p className="profile-logout-error" role="alert">{logoutError}</p>}
              </div>
            </div>

            {isOwnProfile && (
              <div className="profile-actions profile-actions-desktop">
                <Button variant="outline" onClick={() => go("/profile/edit")}>
                  <Icon name="edit" size={15} />
                  Edit profile
                </Button>
                <Button variant="outline" onClick={() => void shareProfile()}>
                  <Icon name="share" size={15} />
                  Share profile
                </Button>
                <div className="profile-menu-wrap">
                  <button
                    type="button"
                    className="profile-menu-trigger"
                    aria-label="More account options"
                    aria-haspopup="menu"
                    aria-expanded={accountMenuOpen}
                    onClick={() => setAccountMenuOpen((open) => !open)}
                  >
                    <Icon name="more" size={18} />
                  </button>
                  {accountMenuOpen && (
                    <div className="profile-menu" role="menu">
                      <button type="button" role="menuitem" onClick={() => void handleLogout()} disabled={loggingOut}>
                        {loggingOut ? "Logging out..." : "Log out"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            {!isOwnProfile && (
              <div className="profile-actions">
                <Button variant={isFollowing ? "outline" : "primary"} onClick={() => void toggleFollow()} disabled={followBusy}>
                  <Icon name={isFollowing ? "check" : "users"} size={15} />
                  {followBusy ? "Updating..." : isFollowing ? "Following" : "Follow"}
                </Button>
                <Button variant="outline" onClick={() => void shareProfile()}>
                  <Icon name="share" size={15} />
                  Share
                </Button>
                <button type="button" onClick={() => void startConversation()} disabled={startingConversation} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60">
                  <Icon name="comment" size={15} />
                  {startingConversation ? "Opening chat…" : "Message"}
                </button>
                {followError && <p role="alert" className="max-w-xs text-xs text-red-600">{followError}</p>}
                {conversationError && <p role="alert" className="max-w-xs text-xs text-red-600">{conversationError}</p>}
              </div>
            )}
          </div>
          {shareStatus && <p className="profile-share-status" role={shareStatus === "Profile link copied" ? "status" : "alert"}>{shareStatus}</p>}
        </div>

        <nav className="profile-section-nav" aria-label="Profile sections">
          {profileTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setProfileSection(tab.id)}
              className={activeSection === tab.id ? "is-active" : ""}
              aria-current={activeSection === tab.id ? "page" : undefined}
            >
              <Icon name={tab.icon} size={16} />
              {tab.label}
              {tab.id === "activity" && <span>{posts.length}</span>}
              {tab.id === "listings" && <span>{myJobs.length + myMarketplaceListings.length}</span>}
              {tab.id === "communities" && <span>{communities.length}</span>}
            </button>
          ))}
        </nav>

        {isOwnProfile && activeSection === "overview" && (
          <section className="profile-hub" aria-labelledby="profile-hub-title">
            <header className="profile-hub-heading">
              <div>
                <p className="profile-hub-eyebrow">YOUR LOCAL FOOTPRINT</p>
                <h2 id="profile-hub-title">Your GwaliorWale at a glance</h2>
                <p>A home for your contributions, opportunities, and local connections.</p>
              </div>
              <button type="button" onClick={() => go("/community")} className="profile-hub-community-link">
                Open community <Icon name="chevron" size={15} />
              </button>
            </header>

            <div className="profile-overview-stats" aria-label="Your activity summary">
              <button type="button" onClick={() => setProfileSection("activity")}>
                <span className="profile-overview-stat-icon profile-hub-action-blue"><Icon name="image" size={17} /></span>
                <span><strong>{posts.length}</strong><small>community posts</small></span>
              </button>
              <button type="button" onClick={() => setProfileSection("listings")}>
                <span className="profile-overview-stat-icon profile-hub-action-violet"><Icon name="briefcase" size={17} /></span>
                <span><strong>{myJobs.filter((job) => job.status === "active").length}</strong><small>active jobs</small></span>
              </button>
              <button type="button" onClick={() => setProfileSection("listings")}>
                <span className="profile-overview-stat-icon profile-hub-action-amber"><Icon name="shop" size={17} /></span>
                <span><strong>{myMarketplaceListings.filter((listing) => listing.status === "active").length}</strong><small>items available</small></span>
              </button>
              <button type="button" onClick={() => setProfileSection("communities")}>
                <span className="profile-overview-stat-icon profile-hub-action-green"><Icon name="users" size={17} /></span>
                <span><strong>{communities.length}</strong><small>communities</small></span>
              </button>
            </div>

            <div className="profile-hub-actions" aria-label="Community actions">
              <button type="button" onClick={() => go("/create-post")} className="profile-hub-action">
                <span className="profile-hub-action-icon profile-hub-action-blue"><Icon name="plus" size={19} /></span>
                <span><strong>Start a conversation</strong><small>Share an update with Gwalior</small></span>
                <Icon name="chevron" size={16} className="profile-hub-arrow" />
              </button>
              <button type="button" onClick={() => go("/post-job")} className="profile-hub-action">
                <span className="profile-hub-action-icon profile-hub-action-violet"><Icon name="briefcase" size={19} /></span>
                <span><strong>Post a job</strong><small>Help local talent find work</small></span>
                <Icon name="chevron" size={16} className="profile-hub-arrow" />
              </button>
              <button type="button" onClick={() => go("/buy-sell")} className="profile-hub-action">
                <span className="profile-hub-action-icon profile-hub-action-amber"><Icon name="shop" size={19} /></span>
                <span><strong>Buy &amp; sell locally</strong><small>List an item or browse nearby</small></span>
                <Icon name="chevron" size={16} className="profile-hub-arrow" />
              </button>
              <button type="button" onClick={() => go("/list-business")} className="profile-hub-action">
                <span className="profile-hub-action-icon profile-hub-action-green"><Icon name="building" size={19} /></span>
                <span><strong>Add your business</strong><small>Reach people across the city</small></span>
                <Icon name="chevron" size={16} className="profile-hub-arrow" />
              </button>
            </div>

            {hubError && <p className="profile-hub-error" role="alert">{hubError}</p>}

            <div className="profile-hub-content">
              <section className="profile-hub-panel profile-hub-listings" aria-labelledby="profile-listings-title">
                <header className="profile-hub-panel-heading">
                  <div>
                    <h3 id="profile-listings-title">Your local listings</h3>
                    <p>{myJobs.length} jobs · {myMarketplaceListings.length} marketplace items</p>
                  </div>
                  <button type="button" onClick={() => setProfileSection("listings")} aria-label="View all your listings"><Icon name="chevron" size={16} /></button>
                </header>
                {hubLoading ? (
                  <p className="profile-hub-empty" role="status">Loading your listings…</p>
                ) : myJobs.length || myMarketplaceListings.length ? (
                  <div className="profile-hub-list">
                    {myJobs.slice(0, 2).map((job) => (
                      <button type="button" key={job.id} onClick={() => go(`/job/${job.id}`)} className="profile-hub-listing">
                        <span className="profile-hub-listing-icon profile-hub-action-violet"><Icon name="briefcase" size={16} /></span>
                        <span className="profile-hub-listing-copy"><strong>{job.title}</strong><small>{job.company} · {job.location}</small>{job.salary && <small className="profile-listing-submeta">{job.salary}</small>}</span>
                        <span className={`profile-hub-status ${job.status === "active" ? "is-active" : ""}`}>{job.status}</span>
                      </button>
                    ))}
                    {myMarketplaceListings.slice(0, 2).map((listing) => (
                      <button type="button" key={listing.id} onClick={() => go("/buy-sell")} className="profile-hub-listing">
                        <span className="profile-hub-listing-icon profile-hub-action-amber"><Icon name="shop" size={16} /></span>
                        <span className="profile-hub-listing-copy"><strong>{listing.title}</strong><small>{listing.locality} · {listing.listing_type === "sell" ? "For sale" : listing.listing_type}</small><small className="profile-listing-price">₹{Number(listing.price).toLocaleString("en-IN")}</small></span>
                        <span className={`profile-hub-status ${listing.status === "active" ? "is-active" : ""}`}>{listing.status}</span>
                      </button>
                    ))}
                    <button type="button" onClick={() => go("/businesses")} className="profile-hub-directory-link">
                      Explore the Gwalior business directory <Icon name="chevron" size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="profile-hub-empty">
                    <p>No jobs or marketplace items posted yet.</p>
                    <div className="profile-hub-empty-actions">
                      <button type="button" onClick={() => go("/post-job")}>Post a job</button>
                      <button type="button" onClick={() => go("/buy-sell")}>List an item</button>
                    </div>
                  </div>
                )}
              </section>

              <div className="profile-hub-discovery-column">
              <section className="profile-hub-panel profile-hub-communities" aria-labelledby="profile-communities-title">
                <header className="profile-hub-panel-heading">
                  <div>
                    <h3 id="profile-communities-title">Your communities</h3>
                    <p>{communities.length} local circles you’re part of</p>
                  </div>
                  <button type="button" onClick={() => setProfileSection("communities")} aria-label="View all your communities"><Icon name="chevron" size={16} /></button>
                </header>
                {hubLoading ? (
                  <p className="profile-hub-empty" role="status">Finding communities…</p>
                ) : communities.length ? (
                  <div className="profile-hub-community-preview">
                    {communities.slice(0, 3).map((community) => (
                      <button type="button" key={community.id} onClick={() => go("/community")} className="profile-hub-community-card">
                        <span className="profile-hub-community-mark"><Icon name="users" size={16} /></span>
                        <span className="profile-hub-listing-copy"><strong>{community.name}</strong><small>{community.description}</small></span>
                        <Icon name="chevron" size={14} className="profile-hub-arrow" />
                      </button>
                    ))}
                    {communities.length > 3 && (
                      <button type="button" onClick={() => setProfileSection("communities")} className="profile-hub-panel-footer">
                        See all {communities.length} communities <Icon name="chevron" size={14} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="profile-hub-empty">
                    <p>You haven’t joined a local community yet.</p>
                    <button type="button" onClick={() => go("/community")}>Discover communities</button>
                  </div>
                )}
                <div className="profile-hub-suggested">
                  <div className="profile-hub-suggested-heading">
                    <h4>Suggested for you</h4>
                    <span>{recommendedGroups.length}</span>
                  </div>
                  {hubLoading ? (
                    <p className="profile-hub-suggested-empty">Finding groups that match your interests…</p>
                  ) : recommendedGroups.length ? (
                    <div className="profile-hub-list">
                      {recommendedGroups.slice(0, 2).map((group) => (
                        <div key={group.id} className="profile-hub-community">
                          <span className="profile-hub-community-mark"><Icon name="users" size={16} /></span>
                          <span className="profile-hub-listing-copy"><strong>{group.name}</strong><small>{group.member_count} members{group.matching_interests.length ? ` · ${group.matching_interests.slice(0, 2).join(", ")}` : ""}</small></span>
                          <button type="button" onClick={() => void joinRecommendedGroup(group)} disabled={joiningGroupId === group.id} className={`profile-hub-join ${group.joined_by_me ? "is-joined" : ""}`}>
                            {joiningGroupId === group.id ? "…" : group.joined_by_me ? "Joined" : "Join"}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="profile-hub-suggested-empty">
                      <span>New recommendations appear as you explore local communities.</span>
                      <button type="button" onClick={() => go("/community")}>Browse groups <Icon name="chevron" size={13} /></button>
                    </div>
                  )}
                </div>
              </section>

              <section className="profile-hub-panel profile-hub-people" aria-labelledby="profile-people-title">
                <header className="profile-hub-panel-heading">
                  <div>
                    <h3 id="profile-people-title">People to know</h3>
                    <p>Local voices from your community feed</p>
                  </div>
                  <button type="button" onClick={() => go("/community")} aria-label="Meet local people"><Icon name="chevron" size={16} /></button>
                </header>
                {hubLoading ? (
                  <p className="profile-hub-empty" role="status">Finding local people…</p>
                ) : suggestedPeople.length ? (
                  <div className="profile-hub-list">
                    {suggestedPeople.slice(0, 3).map((person) => (
                      <div key={person.user_id} className="profile-hub-person">
                        <button type="button" onClick={() => go(`/profile/${encodeURIComponent(normalizeProfileUsername(person.username))}`)} className="profile-hub-person-profile">
                          <span className="profile-hub-person-avatar">
                            {person.avatar_url ? <img src={person.avatar_url} alt="" /> : initials(person.full_name)}
                          </span>
                          <span className="profile-hub-listing-copy"><strong>{person.full_name}</strong><small>@{normalizeProfileUsername(person.username)} · {person.location}</small></span>
                        </button>
                        <button type="button" onClick={() => void followSuggestedPerson(person)} disabled={followingSuggestionId === person.user_id} className="profile-hub-join">
                          {followingSuggestionId === person.user_id ? "…" : "Follow"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="profile-hub-empty profile-hub-compact-empty">
                    <span className="profile-hub-empty-icon"><Icon name="users" size={17} /></span>
                    <div><p>Meet active members from around Gwalior.</p><button type="button" onClick={() => go("/community")}>Explore people <Icon name="chevron" size={13} /></button></div>
                  </div>
                )}
              </section>
              </div>
            </div>
            <section className="profile-overview-activity" aria-labelledby="profile-overview-activity-title">
              <header>
                <div>
                  <p className="profile-hub-eyebrow">YOUR CONTRIBUTIONS</p>
                  <h3 id="profile-overview-activity-title">Latest from you</h3>
                </div>
                <button type="button" onClick={() => setProfileSection("activity")}>View all <Icon name="chevron" size={14} /></button>
              </header>
              {hubLoading ? (
                <p className="profile-hub-empty" role="status">Loading your recent activity…</p>
              ) : recentActivities.length ? (
                <div className="profile-overview-activity-list">
                  {recentActivities.slice(0, 4).map((activity) => (
                    <button
                      type="button"
                      key={`${activity.type}-${activity.id}`}
                      onClick={() => {
                        if (activity.type === "post" && activity.post) {
                          go(`/post/${activity.id}?from=${encodeURIComponent(window.location.pathname)}`, {
                            post: postForDetail(activity.post, profile),
                            feedPosts: posts.map((item) => postForDetail(item, profile)),
                          })
                        } else {
                          go(activity.type === "job" ? `/job/${activity.id}` : "/buy-sell")
                        }
                      }}
                    >
                      <span className={`profile-overview-activity-icon profile-hub-action-${activity.type === "post" ? "blue" : activity.type === "job" ? "violet" : "amber"}`}>
                        <Icon name={activity.type === "post" ? "image" : activity.type === "job" ? "briefcase" : "shop"} size={16} />
                      </span>
                      <span className="profile-overview-activity-copy">
                        <strong>{activity.title}</strong>
                        <small>{activity.detail}</small>
                      </span>
                      <span className="profile-overview-activity-date">{new Date(activity.createdAt).toLocaleDateString()}</span>
                      <Icon name="chevron" size={15} className="profile-hub-arrow" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="profile-hub-empty">
                  <p>Your local story starts with a post, a job, or an item to share.</p>
                  <div className="profile-hub-empty-actions">
                    <button type="button" onClick={() => go("/create-post")}>Create a post</button>
                    <button type="button" onClick={() => go("/buy-sell")}>List an item</button>
                  </div>
                </div>
              )}
            </section>
          </section>
        )}

        {isOwnProfile && activeSection === "listings" && (
          <section className="profile-directory-section" aria-labelledby="profile-listings-page-title">
            <header className="profile-directory-heading">
              <div><p className="profile-hub-eyebrow">YOUR LOCAL COMMERCE</p><h2 id="profile-listings-page-title">Listings &amp; opportunities</h2><p>Keep track of the work and items you’ve shared with Gwalior.</p></div>
              <div className="profile-directory-actions">
                <Button variant="outline" onClick={() => go("/post-job")}><Icon name="briefcase" size={15} />Post a job</Button>
                <Button variant="outline" onClick={() => go("/buy-sell")}><Icon name="plus" size={15} />List an item</Button>
              </div>
            </header>
            {hubError && <p className="profile-hub-error" role="alert">{hubError}</p>}
            <div className="profile-directory-metrics" aria-label="Listing summary">
              <div><span className="profile-directory-metric-icon profile-hub-action-violet"><Icon name="briefcase" size={17} /></span><span><strong>{myJobs.length}</strong><small>jobs posted</small></span></div>
              <div><span className="profile-directory-metric-icon profile-hub-action-green"><Icon name="check" size={17} /></span><span><strong>{myJobs.filter((job) => job.status === "active").length}</strong><small>currently active</small></span></div>
              <div><span className="profile-directory-metric-icon profile-hub-action-amber"><Icon name="shop" size={17} /></span><span><strong>{myMarketplaceListings.length}</strong><small>marketplace items</small></span></div>
            </div>
            <div className="profile-directory-grid">
              <section className="profile-hub-panel">
                <header className="profile-hub-panel-heading"><div><h3>Jobs you’ve posted</h3><p>{myJobs.length} total</p></div><button type="button" onClick={() => go("/jobs")} aria-label="Browse jobs"><Icon name="chevron" size={16} /></button></header>
                {hubLoading ? <p className="profile-hub-empty" role="status">Loading your jobs…</p> : myJobs.length ? (
                  <div className="profile-hub-list">{myJobs.map((job) => (
                    <button type="button" key={job.id} onClick={() => go(`/job/${job.id}`)} className="profile-hub-listing">
                      <span className="profile-hub-listing-icon profile-hub-action-violet"><Icon name="briefcase" size={16} /></span>
                      <span className="profile-hub-listing-copy"><strong>{job.title}</strong><small>{job.company} · {job.location}</small><small className="profile-listing-submeta">{job.employment_type} · {job.workplace_type}{job.salary ? ` · ${job.salary}` : ""}</small></span>
                      <span className={`profile-hub-status ${job.status === "active" ? "is-active" : ""}`}>{job.status}</span>
                    </button>
                  ))}</div>
                ) : <div className="profile-hub-empty"><p>You haven’t posted a job yet.</p><button type="button" onClick={() => go("/post-job")}>Post a local job</button></div>}
              </section>
              <section className="profile-hub-panel">
                <header className="profile-hub-panel-heading"><div><h3>Buy &amp; sell listings</h3><p>{myMarketplaceListings.length} total</p></div><button type="button" onClick={() => go("/buy-sell")} aria-label="Browse marketplace"><Icon name="chevron" size={16} /></button></header>
                {hubLoading ? <p className="profile-hub-empty" role="status">Loading your marketplace items…</p> : myMarketplaceListings.length ? (
                  <div className="profile-hub-list">{myMarketplaceListings.map((listing) => (
                    <button type="button" key={listing.id} onClick={() => go("/buy-sell")} className="profile-hub-listing">
                      {listing.image_urls[0] ? <img src={listing.image_urls[0]} alt="" className="profile-listing-thumbnail" loading="lazy" /> : <span className="profile-hub-listing-icon profile-hub-action-amber"><Icon name="shop" size={16} /></span>}
                      <span className="profile-hub-listing-copy"><strong>{listing.title}</strong><small>{listing.locality} · {listing.listing_type === "sell" ? "For sale" : listing.listing_type}</small><small className="profile-listing-price">₹{Number(listing.price).toLocaleString("en-IN")}{listing.listing_type === "rent" ? " / month" : ""}</small></span>
                      <span className={`profile-hub-status ${listing.status === "active" ? "is-active" : ""}`}>{listing.status}</span>
                    </button>
                  ))}</div>
                ) : <div className="profile-hub-empty"><p>Give a useful item a new home nearby.</p><button type="button" onClick={() => go("/buy-sell")}>Create a listing</button></div>}
              </section>
              <section className="profile-business-prompt">
                <span className="profile-hub-action-icon profile-hub-action-green"><Icon name="building" size={19} /></span>
                <div><h3>Have a local business?</h3><p>Add it to the Gwalior directory so nearby people can discover it.</p></div>
                <Button variant="outline" onClick={() => go("/list-business")}>Add your business <Icon name="chevron" size={14} /></Button>
              </section>
            </div>
          </section>
        )}

        {isOwnProfile && activeSection === "communities" && (
          <section className="profile-directory-section" aria-labelledby="profile-communities-page-title">
            <header className="profile-directory-heading">
              <div><p className="profile-hub-eyebrow">PEOPLE &amp; INTERESTS</p><h2 id="profile-communities-page-title">Your communities</h2><p>Find your people, meet local voices, and make Gwalior feel smaller.</p></div>
              <Button variant="outline" onClick={() => go("/community")}><Icon name="users" size={15} />Explore community</Button>
            </header>
            {hubError && <p className="profile-hub-error" role="alert">{hubError}</p>}
            <div className="profile-directory-metrics" aria-label="Community summary">
              <div><span className="profile-directory-metric-icon profile-hub-action-green"><Icon name="users" size={17} /></span><span><strong>{communities.length}</strong><small>communities joined</small></span></div>
              <div><span className="profile-directory-metric-icon profile-hub-action-blue"><Icon name="users" size={17} /></span><span><strong>{recommendedGroups.length}</strong><small>groups suggested</small></span></div>
              <div><span className="profile-directory-metric-icon profile-hub-action-violet"><Icon name="user" size={17} /></span><span><strong>{suggestedPeople.length}</strong><small>people to discover</small></span></div>
            </div>
            {hubLoading ? <p className="profile-hub-empty" role="status">Loading your communities…</p> : (
              <div className="profile-communities-layout">
                <section className="profile-hub-panel profile-joined-groups" aria-labelledby="joined-groups-title">
                  <header className="profile-hub-panel-heading">
                    <div><h3 id="joined-groups-title">The circles you’re part of</h3><p>Your local interests, conversations, and people</p></div>
                    <span className="profile-community-count">{communities.length}</span>
                  </header>
                  {communities.length ? (
                    <div className="profile-community-card-grid">
                      {communities.map((community) => (
                        <button type="button" key={community.id} onClick={() => go("/community")} className="profile-community-detail-card">
                          <span className="profile-hub-community-mark"><Icon name="users" size={18} /></span>
                          <span className="profile-hub-listing-copy"><strong>{community.name}</strong><small>{community.description || "A local community on GwaliorWale."}</small></span>
                          <Icon name="chevron" size={15} className="profile-hub-arrow" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="profile-hub-empty profile-hub-compact-empty">
                      <span className="profile-hub-empty-icon"><Icon name="users" size={18} /></span>
                      <div><p>You haven’t joined a community yet.</p><button type="button" onClick={() => go("/community")}>Find your first community <Icon name="chevron" size={13} /></button></div>
                    </div>
                  )}
                </section>
                <aside className="profile-hub-discovery-column">
                  <section className="profile-hub-panel" aria-labelledby="recommended-groups-title">
                    <header className="profile-hub-panel-heading">
                      <div><h3 id="recommended-groups-title">Recommended for you</h3><p>Groups that match your interests</p></div>
                      <button type="button" onClick={() => go("/community")} aria-label="Browse communities"><Icon name="chevron" size={16} /></button>
                    </header>
                    {recommendedGroups.length ? (
                      <div className="profile-hub-list">{recommendedGroups.map((group) => (
                        <div key={group.id} className="profile-hub-community">
                          <span className="profile-hub-community-mark"><Icon name="users" size={17} /></span>
                          <span className="profile-hub-listing-copy"><strong>{group.name}</strong><small>{group.member_count} members{group.matching_interests.length ? ` · ${group.matching_interests.slice(0, 2).join(", ")}` : ""}</small></span>
                          <button type="button" onClick={() => void joinRecommendedGroup(group)} disabled={joiningGroupId === group.id} className={`profile-hub-join ${group.joined_by_me ? "is-joined" : ""}`}>
                            {joiningGroupId === group.id ? "…" : group.joined_by_me ? "Joined" : "Join"}
                          </button>
                        </div>
                      ))}</div>
                    ) : (
                      <div className="profile-hub-empty profile-hub-compact-empty">
                        <span className="profile-hub-empty-icon"><Icon name="users" size={17} /></span>
                        <div><p>No tailored recommendations yet.</p><button type="button" onClick={() => go("/community")}>Browse all groups <Icon name="chevron" size={13} /></button></div>
                      </div>
                    )}
                  </section>
                  <section className="profile-hub-panel" aria-labelledby="suggested-people-title">
                    <header className="profile-hub-panel-heading">
                      <div><h3 id="suggested-people-title">People to know</h3><p>Meet active local members</p></div>
                      <button type="button" onClick={() => go("/community")} aria-label="Explore community members"><Icon name="chevron" size={16} /></button>
                    </header>
                    {suggestedPeople.length ? (
                      <div className="profile-hub-list">{suggestedPeople.slice(0, 4).map((person) => (
                        <div key={person.user_id} className="profile-hub-person">
                          <button type="button" onClick={() => go(`/profile/${encodeURIComponent(normalizeProfileUsername(person.username))}`)} className="profile-hub-person-profile">
                            <span className="profile-hub-person-avatar">{person.avatar_url ? <img src={person.avatar_url} alt="" /> : initials(person.full_name)}</span>
                            <span className="profile-hub-listing-copy"><strong>{person.full_name}</strong><small>@{normalizeProfileUsername(person.username)} · {person.location}</small></span>
                          </button>
                          <button type="button" onClick={() => void followSuggestedPerson(person)} disabled={followingSuggestionId === person.user_id} className="profile-hub-join">
                            {followingSuggestionId === person.user_id ? "…" : "Follow"}
                          </button>
                        </div>
                      ))}</div>
                    ) : (
                      <div className="profile-hub-empty profile-hub-compact-empty">
                        <span className="profile-hub-empty-icon"><Icon name="user" size={17} /></span>
                        <div><p>Join conversations to meet the people behind them.</p><button type="button" onClick={() => go("/community")}>Meet the community <Icon name="chevron" size={13} /></button></div>
                      </div>
                    )}
                  </section>
                </aside>
              </div>
            )}
          </section>
        )}

        <div className={`profile-details profile-section-${activeSection} mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]`}>
          <aside className="profile-sidebar space-y-5">
            <div className="profile-about-card profile-about-card-summary rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <header className="profile-about-card-heading">
                <div><p className="profile-hub-eyebrow">MEMBER PROFILE</p><h2>About</h2></div>
                {isOwnProfile && <Button variant="outline" onClick={() => go("/profile/edit")}><Icon name="edit" size={14} />Edit profile</Button>}
              </header>
              {profile.bio ? (
                <p className="profile-about-copy mt-4 text-sm leading-7 text-slate-600">{profile.bio}</p>
              ) : isOwnProfile ? (
                <button type="button" onClick={() => go("/profile/edit")} className="profile-about-copy profile-bio-empty mt-4 text-left">
                  Add a short introduction
                  <Icon name="edit" size={14} />
                </button>
              ) : (
                <p className="profile-about-copy mt-4 text-sm leading-7 text-slate-500">No introduction yet.</p>
              )}

              <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center">
                <div>
                  <div className="text-lg font-extrabold text-[#172033]">{stats.posts}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Posts</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFollowListProfile({ id: profile.id, name: profile.full_name })
                    setFollowListType("followers")
                  }}
                  className="rounded-xl transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`View ${stats.followers} followers`}
                >
                  <div className="text-lg font-extrabold text-[#172033]">{stats.followers}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Followers</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFollowListProfile({ id: profile.id, name: profile.full_name })
                    setFollowListType("following")
                  }}
                  className="rounded-xl transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`View ${stats.following} following`}
                >
                  <div className="text-lg font-extrabold text-[#172033]">{stats.following}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Following</div>
                </button>
              </div>

              <div className="profile-about-facts">
                <div><Icon name="location" size={15} /><span><small>Based in</small><strong>{location}</strong></span></div>
                <div><Icon name="calendar" size={15} /><span><small>Member since</small><strong>{formatJoinDate(profile.created_at)}</strong></span></div>
                {isOwnProfile && <div><Icon name="bookmark" size={15} /><span><small>Phone</small><strong>{profile.phone || "Not added yet"}</strong></span></div>}
              </div>
            </div>

            {isOwnProfile && (
              <div className="profile-mobile-about-actions">
                <Button variant="outline" onClick={() => go("/profile/edit")} className="px-4 py-2.5">
                  <Icon name="edit" size={15} />
                  Edit profile
                </Button>
                <Button variant="outline" onClick={() => void shareProfile()} className="px-4 py-2.5">
                  <Icon name="share" size={15} />
                  Share profile
                </Button>
                <Button variant="outline" onClick={handleLogout} disabled={loggingOut} className="px-4 py-2.5">
                  {loggingOut ? "Logging out..." : "Log out"}
                </Button>
                {logoutError && <p role="alert" className="col-span-2 text-xs text-red-600">{logoutError}</p>}
              </div>
            )}

            <div className="profile-about-card profile-about-card-interests rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#172033]">Interests</h3>
                {isOwnProfile && (
                  <button onClick={() => go("/profile/edit")} className="text-[10px] font-extrabold uppercase tracking-wide text-blue-600 hover:text-blue-700">
                    Edit
                  </button>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.interests.map((item) => (
                  <span key={item} className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-700">
                    {item}
                  </span>
                ))}
                {profile.interests.length === 0 && <span className="text-xs text-slate-500">No interests added yet.</span>}
              </div>
            </div>

            {isOwnProfile && (
            <div className="profile-about-card profile-about-card-communities rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#172033]">Communities</h3>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold text-blue-700">
                  {communities.length}
                </span>
              </div>
              {communities.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {visibleCommunities.map((community) => (
                    <button type="button" key={community.id} onClick={() => go("/community")} className="profile-about-community flex items-start gap-3 rounded-2xl bg-slate-50 p-3 text-left">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700">
                        <Icon name="users" size={17} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-[#172033]">{community.name}</p>
                        <p className="mt-1 text-[10px] leading-5 text-slate-500">{community.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs leading-5 text-slate-500">You haven’t joined any communities yet.</p>
              )}
              <button onClick={() => isOwnProfile ? setProfileSection("communities") : go("/community")} className="mt-4 text-[10px] font-extrabold uppercase tracking-wide text-blue-600 hover:text-blue-700">
                {communities.length > visibleCommunities.length ? `View all ${communities.length} communities` : "Explore communities"}
              </button>
            </div>
            )}
          </aside>

          <section className="profile-posts space-y-5">
            <div className="profile-posts-panel rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="profile-post-grid mt-4" aria-label="Profile posts">
                {posts.map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => {
                      setSelectedPost(post)
                      setSelectedPostLiked(false)
                      setEngagementDialog(null)
                      setCommentDraft("")
                      setPostShareStatus("")
                      setSelectedPostComments([])
                      setSelectedPostCommentsLoading(true)
                      setSelectedPostError("")
                    }}
                    className="profile-grid-tile"
                    aria-label={`Open post: ${post.content.slice(0, 100)}`}
                    aria-haspopup="dialog"
                  >
                    {post.image_url ? (
                      <img src={post.image_url} alt="" loading="lazy" />
                    ) : (
                      <span className="profile-grid-text">{post.content}</span>
                    )}
                    <span className="profile-grid-meta">
                      <Icon name="heart" size={14} /> {post.likes_count}
                      <Icon name="comment" size={14} /> {post.comments_count}
                    </span>
                  </button>
                ))}
                {posts.length === 0 && (
                  <p className="profile-grid-empty">{isOwnProfile ? "Your posts will show up here." : "No public posts yet."}</p>
                )}
              </div>
            </div>
          </section>

          {activeSection === "activity" && (
          <aside className="profile-discovery-sidebar">
            <section className="profile-community-stats profile-hub-panel">
              <header className="profile-hub-panel-heading">
                <div><h3>{isOwnProfile ? "Your local presence" : "Community stats"}</h3><p>Your activity on GwaliorWale</p></div>
              </header>
              <div className="profile-community-stat-grid">
                <div><span className="profile-hub-action-blue"><Icon name="image" size={15} /></span><strong>{stats.posts}</strong><small>Posts</small></div>
                <button type="button" onClick={() => { setFollowListProfile({ id: profile.id, name: profile.full_name }); setFollowListType("followers") }}>
                  <span className="profile-hub-action-violet"><Icon name="users" size={15} /></span><strong>{stats.followers}</strong><small>Followers</small>
                </button>
                <button type="button" onClick={() => { setFollowListProfile({ id: profile.id, name: profile.full_name }); setFollowListType("following") }}>
                  <span className="profile-hub-action-amber"><Icon name="users" size={15} /></span><strong>{stats.following}</strong><small>Following</small>
                </button>
                <div><span className="profile-hub-action-green"><Icon name="heart" size={15} /></span><strong>{posts.reduce((total, post) => total + post.likes_count, 0)}</strong><small>Post likes</small></div>
              </div>
              {isOwnProfile && (
                <div className="profile-local-counts">
                  <span>{myJobs.filter((job) => job.status === "active").length} active jobs</span>
                  <span>{myMarketplaceListings.filter((listing) => listing.status === "active").length} live items</span>
                  <span>{communities.length} communities</span>
                </div>
              )}
            </section>

            {isOwnProfile && (
              <section className="profile-hub-panel profile-contribute-panel">
                <header className="profile-hub-panel-heading"><div><h3>Local business owner?</h3><p>Help neighbors discover what you do.</p></div></header>
                <button type="button" className="profile-business-rail-link" onClick={() => go("/list-business")}>
                  <span className="profile-hub-action-green"><Icon name="building" size={16} /></span>
                  <span>Add your business</span>
                  <Icon name="chevron" size={14} />
                </button>
              </section>
            )}

            {isOwnProfile && (
              <section className="profile-hub-panel profile-discovery-card">
                <header className="profile-hub-panel-heading">
                  <div><h3>Communities to explore</h3><p>Find a circle around your interests</p></div>
                  <button type="button" onClick={() => setProfileSection("communities")} aria-label="View all community suggestions"><Icon name="chevron" size={16} /></button>
                </header>
                {recommendedGroups.length ? (
                  <div className="profile-hub-list">{recommendedGroups.slice(0, 3).map((group) => (
                    <div key={group.id} className="profile-hub-community">
                      <span className="profile-hub-community-mark"><Icon name="users" size={16} /></span>
                      <span className="profile-hub-listing-copy"><strong>{group.name}</strong><small>{group.member_count} members</small></span>
                      <button type="button" onClick={() => void joinRecommendedGroup(group)} disabled={joiningGroupId === group.id} className={`profile-hub-join ${group.joined_by_me ? "is-joined" : ""}`}>
                        {joiningGroupId === group.id ? "…" : group.joined_by_me ? "Joined" : "Join"}
                      </button>
                    </div>
                  ))}</div>
                ) : (
                  <div className="profile-hub-empty profile-hub-compact-empty"><span className="profile-hub-empty-icon"><Icon name="users" size={17} /></span><div><p>Explore local circles and find people who share your interests.</p><button type="button" onClick={() => go("/community")}>Browse communities <Icon name="chevron" size={13} /></button></div></div>
                )}
              </section>
            )}

            {isOwnProfile && (
              <section className="profile-hub-panel profile-discovery-card">
                <header className="profile-hub-panel-heading">
                  <div><h3>People to know</h3><p>Local voices from your community</p></div>
                  <button type="button" onClick={() => go("/community")} aria-label="Explore the community"><Icon name="chevron" size={16} /></button>
                </header>
                {hubLoading ? <p className="profile-hub-empty" role="status">Finding local people…</p> : suggestedPeople.length ? (
                  <div className="profile-hub-list">{suggestedPeople.slice(0, 3).map((person) => (
                    <div key={person.user_id} className="profile-hub-person">
                      <button type="button" onClick={() => go(`/profile/${encodeURIComponent(normalizeProfileUsername(person.username))}`)} className="profile-hub-person-profile">
                        <span className="profile-hub-person-avatar">{person.avatar_url ? <img src={person.avatar_url} alt="" /> : initials(person.full_name)}</span>
                        <span className="profile-hub-listing-copy"><strong>{person.full_name}</strong><small>{person.location}</small></span>
                      </button>
                      <button type="button" onClick={() => void followSuggestedPerson(person)} disabled={followingSuggestionId === person.user_id} className="profile-hub-join">
                        {followingSuggestionId === person.user_id ? "…" : "Follow"}
                      </button>
                    </div>
                  ))}</div>
                ) : (
                  <div className="profile-hub-empty profile-hub-compact-empty"><span className="profile-hub-empty-icon"><Icon name="user" size={17} /></span><div><p>People active in your local circles will appear here.</p><button type="button" onClick={() => go("/community")}>Discover the community <Icon name="chevron" size={13} /></button></div></div>
                )}
              </section>
            )}

            <section className="profile-hub-panel profile-topic-panel">
              <header className="profile-hub-panel-heading"><div><h3>{isOwnProfile ? "Your local topics" : "Topics in their posts"}</h3><p>Interests from recent posts</p></div></header>
              {profileTopics.length ? (
                <div className="profile-topic-list">{profileTopics.map((topic) => <span key={topic}>#{topic}</span>)}</div>
              ) : (
                <div className="profile-hub-empty profile-hub-compact-empty"><span className="profile-hub-empty-icon"><Icon name="image" size={16} /></span><div><p>Topics will show here as posts are shared.</p>{isOwnProfile && <button type="button" onClick={() => go("/create-post")}>Share an update <Icon name="chevron" size={13} /></button>}</div></div>
              )}
            </section>
          </aside>
          )}
        </div>
      </main>
      {selectedPost && (
        <div
          className="profile-post-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedPost(null)
          }}
        >
          <section
            className="profile-post-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-post-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="profile-post-modal-media">
              {selectedPost.image_url ? (
                <img src={selectedPost.image_url} alt={`Post by ${profile.full_name}`} />
              ) : (
                <div className="profile-post-modal-no-image">
                  <p>{selectedPost.content}</p>
                </div>
              )}
            </div>
            <div className="profile-post-modal-panel">
              <header className="profile-post-modal-author">
                <span className="profile-post-modal-avatar">
                  {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : initials(profile.full_name)}
                </span>
                <span className="profile-post-modal-author-copy">
                  <strong id="profile-post-modal-title">{profile.full_name}</strong>
                  <small>@{normalizeProfileUsername(profile.username)}.gwl · {selectedPost.location || "Gwalior"}</small>
                </span>
                <button type="button" onClick={() => setSelectedPost(null)} aria-label="Close post" autoFocus>×</button>
              </header>
              <div className="profile-post-modal-copy">
                <span className="profile-post-modal-category">{selectedPost.category}</span>
                <p>{selectedPost.content}</p>
                {selectedPost.interest_tags?.length > 0 && (
                  <div className="profile-post-modal-tags">
                    {selectedPost.interest_tags.map((tag) => <span key={tag}>#{tag}</span>)}
                  </div>
                )}
              </div>
              <div className="profile-post-modal-comments" aria-label="Comments">
                {selectedPostError && <p role="alert" className="profile-post-modal-error">{selectedPostError}</p>}
                {selectedPostCommentsLoading ? (
                  <p role="status" className="profile-post-modal-status">Loading comments…</p>
                ) : selectedPostComments.slice(0, 3).map((comment) => (
                    <article key={comment.id} className="profile-post-modal-comment">
                      <span className="profile-post-modal-comment-avatar">
                        {comment.author_avatar_url
                          ? <img src={comment.author_avatar_url} alt="" />
                          : initials(comment.author_full_name)}
                      </span>
                      <div>
                        <p><strong>{comment.author_full_name}</strong> {comment.content}</p>
                        <time dateTime={comment.created_at}>{new Date(comment.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time>
                      </div>
                    </article>
                  ))}
                {!selectedPostCommentsLoading && selectedPostComments.length === 0 && (
                  <p className="profile-post-modal-status">No comments yet. Start the conversation.</p>
                )}
                {!selectedPostCommentsLoading && selectedPostComments.length > 3 && (
                  <button type="button" className="profile-post-modal-view-comments" onClick={() => setEngagementDialog("comments")}>
                    View all {selectedPostComments.length} comments
                  </button>
                )}
              </div>
              <footer className="profile-post-modal-footer">
                <div className="profile-post-modal-actions">
                  <div className="profile-post-modal-engagement-group">
                    <button
                      type="button"
                      onClick={() => void toggleSelectedPostLike()}
                      disabled={postLikeBusy || selectedPostCommentsLoading}
                      className={`profile-post-modal-like-button ${selectedPostLiked ? "is-liked" : ""}`}
                      aria-label={selectedPostLiked ? "Unlike post" : "Like post"}
                      aria-pressed={selectedPostLiked}
                    >
                      <Icon name="heart" size={19} />
                    </button>
                    <button
                      type="button"
                      className="profile-post-modal-count"
                      onClick={() => setEngagementDialog("likes")}
                      aria-label={`View ${selectedPost.likes_count} likes`}
                    >
                      {selectedPost.likes_count}
                    </button>
                    <button
                      type="button"
                      className="profile-post-modal-count profile-post-modal-action-comments"
                      onClick={() => setEngagementDialog("comments")}
                      aria-label={`View ${selectedPost.comments_count} comments`}
                    >
                      <Icon name="comment" size={17} />
                      <span>{selectedPost.comments_count}</span>
                    </button>
                    <button
                      type="button"
                      className="profile-post-modal-share-button"
                      onClick={() => void shareSelectedPost()}
                      aria-label="Share post"
                      title="Share post"
                    >
                      <Icon name="share" size={17} />
                    </button>
                  </div>
                </div>
                {postShareStatus && <p role="status" className="profile-post-modal-share-status">{postShareStatus}</p>}
                <time dateTime={selectedPost.created_at}>
                  {new Date(selectedPost.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                </time>
                <form onSubmit={(event) => void submitSelectedPostComment(event)} className="profile-post-modal-comment-form">
                  <input
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    aria-label="Add a comment"
                    placeholder="Add a comment..."
                  />
                  <button type="submit" disabled={!commentDraft.trim() || commentBusy || selectedPostCommentsLoading} aria-label="Post comment">
                    <Icon name="send" size={17} />
                  </button>
                </form>
              </footer>
            </div>
          </section>
        </div>
      )}
      {selectedPost && engagementDialog && (
        <div
          className="profile-engagement-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEngagementDialog(null)
          }}
        >
          <section
            className="profile-engagement-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-engagement-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="profile-engagement-heading">
              <h2 id="profile-engagement-title">
                {engagementDialog === "likes" ? "Likes" : "Comments"}
                <span>{engagementDialog === "likes" ? selectedPost.likes_count : selectedPost.comments_count}</span>
              </h2>
              <button type="button" onClick={() => setEngagementDialog(null)} aria-label={`Close ${engagementDialog}`}>
                ×
              </button>
            </header>
            {engagementDialog === "likes" ? (
              isDatabasePostId(selectedPost.id) ? (
                <ProfilePostLikersList postId={selectedPost.id} active />
              ) : (
                <p className="profile-engagement-status">Likes are available for published posts.</p>
              )
            ) : (
              <>
                <form onSubmit={(event) => void submitSelectedPostComment(event)} className="profile-engagement-comment-form">
                  <input
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    aria-label="Add a comment"
                    placeholder="Add a comment..."
                  />
                  <button type="submit" disabled={!commentDraft.trim() || commentBusy || selectedPostCommentsLoading} aria-label="Post comment">
                    <Icon name="send" size={17} />
                  </button>
                </form>
                <div className="profile-engagement-comments">
                  {selectedPostError && <p role="alert" className="profile-engagement-error">{selectedPostError}</p>}
                  {selectedPostCommentsLoading ? (
                    <p role="status" className="profile-engagement-status">Loading comments…</p>
                  ) : selectedPostComments.length ? (
                    selectedPostComments.map((comment) => (
                      <article key={comment.id} className={`profile-engagement-comment ${comment.parent_comment_id ? "is-reply" : ""}`}>
                        <span className="profile-engagement-avatar">
                          {comment.author_avatar_url
                            ? <img src={comment.author_avatar_url} alt="" />
                            : initials(comment.author_full_name)}
                        </span>
                        <div>
                          <p><strong>{comment.author_full_name}</strong> {comment.content}</p>
                          <time dateTime={comment.created_at}>{new Date(comment.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="profile-engagement-empty">
                      <span><Icon name="comment" size={19} /></span>
                      <div><strong>No comments yet</strong><p>Start a thoughtful conversation with the community.</p></div>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}
      {followListProfile && (
        <div
          className="follow-list-overlay fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setFollowListProfile(null)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="follow-list-title"
            className="follow-list-dialog w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between border-b border-slate-100 p-5">
              <div className="min-w-0">
                <p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-blue-600">Community connections</p>
                <h2 id="follow-list-title" className="mt-1 truncate text-base font-extrabold text-[#172033]">
                  {followListProfile.name}
                </h2>
                {followListProfile.id !== profile.id && (
                  <button
                    type="button"
                    onClick={() => setFollowListProfile({ id: profile.id, name: profile.full_name })}
                    className="mt-1 text-[10px] font-bold text-blue-700 hover:text-blue-800"
                  >
                    Back to your lists
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setFollowListProfile(null)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close follower lists"
              >
                ×
              </button>
            </header>
            <div className="grid grid-cols-2 gap-1 border-b border-slate-100 p-2">
              {(["followers", "following"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFollowListType(type)}
                  className={`rounded-lg py-2.5 text-xs font-bold capitalize transition ${
                    followListType === type ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="max-h-[min(60vh,480px)] overflow-y-auto p-3">
              {followListLoading ? (
                <p role="status" className="py-10 text-center text-xs text-slate-500">Loading {followListType}...</p>
              ) : followListError ? (
                <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-700">{followListError}</p>
              ) : followList.length ? (
                <ul className="space-y-1">
                  {followList.map((member) => (
                    <li key={member.id}>
                      <div className="flex items-center gap-2 rounded-xl p-2.5 transition hover:bg-slate-50">
                        <button type="button" onClick={() => go(`/profile/${encodeURIComponent(member.username)}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-blue-100 to-orange-100 text-xs font-extrabold text-[#142B49]">
                          {member.avatar_url ? (
                            <img src={member.avatar_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                          ) : initials(member.full_name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-extrabold text-slate-800">{member.full_name || "Community member"}</span>
                          <span className="mt-0.5 block truncate text-[10px] text-slate-500">@{normalizeProfileUsername(member.username)}.gwl</span>
                        </span>
                        </button>
                        <button type="button" onClick={() => {
                          setFollowListProfile({ id: member.id, name: member.full_name })
                          setFollowListType("followers")
                        }} className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-50">Lists</button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-10 text-center text-xs text-slate-500">
                  {followListProfile.id === profile.id
                    ? `No ${followListType} yet.`
                    : `No ${followListType} to show.`}
                </p>
              )}
            </div>
            <p className="border-t border-slate-100 px-5 py-3 text-[10px] leading-4 text-slate-400">
              You can view another person’s lists only if they follow you.
            </p>
          </section>
        </div>
      )}
    </div>
  )
}

export function ProfileEditorPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [interests, setInterests] = useState<string[]>([])
  const [interestSearch, setInterestSearch] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState("")
  const [bannerPreview, setBannerPreview] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const profileFormRef = useRef<HTMLFormElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  useEffect(() => {
    return () => {
      if (bannerPreview.startsWith("blob:")) URL.revokeObjectURL(bannerPreview)
    }
  }, [bannerPreview])

  useEffect(() => {
    let active = true
    async function loadEditorProfile() {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        const user = sessionData.session?.user
        if (!user) throw new Error("Please log in to edit your profile.")

        const cached = getCachedOwnProfile(user.id)
        if (cached && active) {
          setProfile({ ...cached, username: normalizeProfileUsername(cached.username) })
          setInterests(cached.interests ?? [])
          setLoading(false)
          return
        }

        const row = await getOwnProfile(user.id)
        if (!active) return
        setProfile({ ...row, username: normalizeProfileUsername(row.username) })
        setInterests(row.interests ?? [])
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load your profile.")
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadEditorProfile()
    return () => { active = false }
  }, [])

  const update = (key: "full_name" | "username" | "city" | "bio", value: string) => {
    setProfile((prev) => prev ? { ...prev, [key]: value } : prev)
  }

  const toggleInterest = (interest: string) => {
    setInterests((current) => {
      if (current.includes(interest)) return current.filter((item) => item !== interest)
      if (current.length >= 10) return current
      return [...current, interest]
    })
  }

  const normalizedSearch = interestSearch.trim().toLowerCase()
  const visibleInterestCategories = INTEREST_CATEGORIES
    .map((category) => ({
      ...category,
      visibleInterests: category.interests.filter((interest) =>
        !normalizedSearch ||
        category.name.toLowerCase().includes(normalizedSearch) ||
        interest.toLowerCase().includes(normalizedSearch),
      ),
    }))
    .filter((category) => category.visibleInterests.length > 0)

  const profileChecklist = profile ? [
    { label: "Your name", complete: Boolean(profile.full_name.trim()) },
    { label: "A username", complete: Boolean(profile.username.trim()) },
    { label: "Your area", complete: Boolean(profile.city.trim()) },
    { label: "A short intro", complete: Boolean(profile.bio.trim()) },
    { label: "At least one interest", complete: interests.length > 0 },
  ] : []
  const profileProgress = profileChecklist.filter((item) => item.complete).length

  const saveProfile = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (!profile) return
    if (interests.length > 10) {
      setError("Choose up to 10 interests.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const [avatarUrl, bannerUrl] = await Promise.all([
        avatarFile ? uploadProfileImage(avatarFile, "avatar") : Promise.resolve(profile.avatar_url ?? null),
        bannerFile ? uploadProfileImage(bannerFile, "banner") : Promise.resolve(profile.banner_url ?? null),
      ])
      const updatedProfile = await updateOwnProfile({
        full_name: profile.full_name.trim(),
        username: profile.username.replace(/^@/, "").trim(),
        city: profile.city.trim(),
        bio: profile.bio.trim(),
        interests,
        phone: profile.phone ?? "",
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
      })
      const cachedPage = readProfilePageCache(updatedProfile.id)
      if (cachedPage) writeProfilePageCache({ ...cachedPage, profile: updatedProfile })
      window.dispatchEvent(new Event("gwalior:profile-updated"))
      go("/profile")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="profile-editor-page min-h-screen bg-slate-50 px-4 py-10 sm:py-14">
      <div className="profile-editor-container mx-auto max-w-6xl">
        <header className="profile-editor-header mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-blue-600">Your account</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-.04em] text-[#172033]">Edit your profile</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Add a few details so people in Gwalior can recognize you and find conversations that match your interests.
            </p>
          </div>
          <div className="profile-editor-header-actions flex items-center gap-2">
            <button
              type="button"
              onClick={() => go("/profile")}
              className="profile-editor-cancel rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Cancel
            </button>
            <Button
              type="button"
              onClick={() => profileFormRef.current?.requestSubmit()}
              disabled={loading || saving || !profile}
              className="profile-editor-header-save"
            >
              <Icon name="check" size={16} />
              {saving ? "Saving..." : "Save profile"}
            </Button>
          </div>
        </header>

        {loading ? (
          <section className="card p-6 text-sm text-slate-500">Loading your profile...</section>
        ) : profile ? (
          <form ref={profileFormRef} onSubmit={(event) => void saveProfile(event)} className="profile-editor-form grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="profile-editor-main space-y-5">
            <section className="profile-editor-section card overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
                <h2 className="text-base font-extrabold text-[#172033]">Profile images</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Add a clear profile photo and a banner that feels like you. JPG, PNG, or WebP, up to 5 MB each.
                </p>
              </div>
              <div className="p-5 sm:p-7">
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  aria-label="Choose profile banner image"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) {
                      setBannerFile(file)
                      setBannerPreview(URL.createObjectURL(file))
                      setError("")
                    }
                    event.currentTarget.value = ""
                  }}
                />
                <div className="relative h-36 overflow-hidden rounded-2xl bg-gradient-to-r from-[#142B49] via-blue-800 to-sky-500 sm:h-44">
                  {(bannerPreview || profile.banner_url) && (
                    <img src={bannerPreview || profile.banner_url || ""} alt="Banner preview" className="h-full w-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-xl border border-white/50 bg-white/95 px-3 py-2 text-[10px] font-bold text-slate-800 shadow-sm transition hover:bg-white"
                  >
                    <Icon name="image" size={14} />
                    {profile.banner_url || bannerPreview ? "Change banner" : "Add banner"}
                  </button>
                </div>
                {(profile.banner_url || bannerPreview) && (
                  <button
                    type="button"
                    onClick={() => {
                      setBannerFile(null)
                      setBannerPreview("")
                      setProfile((current) => current ? { ...current, banner_url: null } : current)
                    }}
                    className="mt-2 text-[10px] font-bold text-slate-500 hover:text-red-600"
                  >
                    Remove banner
                  </button>
                )}

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  aria-label="Choose profile photo"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) {
                      setAvatarFile(file)
                      setAvatarPreview(URL.createObjectURL(file))
                      setError("")
                    }
                    event.currentTarget.value = ""
                  }}
                />
                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-gradient-to-br from-blue-600 to-sky-400 text-xl font-extrabold text-white shadow-md">
                    {(avatarPreview || profile.avatar_url) ? (
                      <img src={avatarPreview || profile.avatar_url || ""} alt="Profile photo preview" className="absolute inset-0 h-full w-full object-cover" />
                    ) : initials(profile.full_name || "Your Name")}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Profile photo</p>
                    <p className="mt-1 max-w-xs text-[10px] leading-4 text-slate-500">
                      Use a clear photo so neighbours can recognize you. Square images work best.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="text-[10px] font-extrabold text-blue-700 hover:text-blue-800"
                      >
                        {profile.avatar_url || avatarPreview ? "Change photo" : "Upload photo"}
                      </button>
                      {(profile.avatar_url || avatarPreview) && (
                        <button
                          type="button"
                          onClick={() => {
                            setAvatarFile(null)
                            setAvatarPreview("")
                            setProfile((current) => current ? { ...current, avatar_url: null } : current)
                          }}
                          className="text-[10px] font-bold text-slate-500 hover:text-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="profile-editor-section card overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                    <Icon name="user" size={20} />
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-[#172033]">Personal details</h2>
                    <p className="mt-1 text-xs text-slate-500">Use the name and location you want your community to know.</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-x-6 gap-y-5 px-5 py-6 sm:grid-cols-2 sm:px-7">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-slate-700">Full name <span className="text-red-500">*</span></span>
                  <input
                    required
                    maxLength={80}
                    autoComplete="name"
                    value={profile.full_name}
                    onChange={(event) => update("full_name", event.target.value)}
                    className="input"
                    placeholder="How people know you"
                  />
                </label>

                <div className="block">
                  <span className="mb-2 block text-xs font-bold text-slate-700">Account email</span>
                  <div className="flex min-h-[42px] items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-600">
                    {profile.email || "No email available"}
                  </div>
                  <span className="mt-1.5 block text-[10px] leading-4 text-slate-500">Your sign-in email can’t be changed here.</span>
                </div>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-slate-700">Username <span className="text-red-500">*</span></span>
                  <div className="flex items-center overflow-hidden rounded-xl border border-[#d9dee7] bg-white focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/10">
                    <span className="pl-3 text-sm text-slate-400" aria-hidden="true">@</span>
                    <input
                      required
                      value={profile.username}
                      onChange={(event) => update("username", event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                      className="min-w-0 flex-1 border-0 bg-transparent px-2 py-3 text-xs outline-none"
                      minLength={3}
                      maxLength={24}
                      pattern="[a-z0-9_-]{3,24}"
                      autoComplete="username"
                      aria-describedby="profile-username-help"
                    />
                    <span className="bg-slate-50 px-3 py-3 text-xs font-bold text-slate-500">.gwl</span>
                  </div>
                  <span id="profile-username-help" className="mt-1.5 block text-[10px] leading-4 text-slate-500">
                    3–24 letters, numbers, underscores, or hyphens.
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-slate-700">City or neighbourhood <span className="text-red-500">*</span></span>
                  <input
                    required
                    maxLength={80}
                    autoComplete="address-level2"
                    value={profile.city}
                    onChange={(event) => update("city", event.target.value)}
                    className="input"
                    placeholder="e.g. Thatipur, Gwalior"
                  />
                  <span className="mt-1.5 block text-[10px] leading-4 text-slate-500">A general area is enough; don’t enter a street address.</span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-slate-700">Phone number <span className="font-medium text-slate-400">(optional)</span></span>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={profile.phone ?? ""}
                    onChange={(event) => setProfile((prev) => prev ? { ...prev, phone: event.target.value } : prev)}
                    className="input"
                    placeholder="+91 98765 43210"
                  />
                  <span className="mt-1.5 block text-[10px] leading-4 text-slate-500">Only add a number you’re comfortable associating with your account.</span>
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-xs font-bold text-slate-700">About you <span className="font-medium text-slate-400">(optional)</span></span>
                  <textarea
                    value={profile.bio ?? ""}
                    onChange={(event) => update("bio", event.target.value.slice(0, 240))}
                    rows={4}
                    maxLength={240}
                    className="input resize-y leading-6"
                    placeholder="What brings you to GwaliorWale? Share what you do, what you enjoy, or what you’d like to connect about."
                    aria-describedby="profile-bio-help"
                  />
                  <span id="profile-bio-help" className="mt-1.5 flex justify-between text-[10px] text-slate-500">
                    <span>A short, genuine introduction works best.</span>
                    <span>{(profile.bio ?? "").length}/240</span>
                  </span>
                </label>
              </div>
            </section>

            <section className="profile-editor-section profile-editor-interests card overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-orange-600">
                      <Icon name="users" size={20} />
                    </span>
                    <div>
                      <h2 className="text-base font-extrabold text-[#172033]">Your interests</h2>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Choose topics you genuinely enjoy to personalize what you see.</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-700">{interests.length}/10</span>
                </div>
              </div>
              <div className="px-5 py-6 sm:px-7">
                {interests.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Selected</p>
                    <div className="flex flex-wrap gap-2" aria-label="Selected interests">
                      {interests.map((interest) => (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => toggleInterest(interest)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700 transition hover:border-blue-200 hover:bg-blue-100"
                          aria-label={`Remove ${interest}`}
                        >
                          {interest}<span aria-hidden="true">×</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <label className="search-field">
                  <Icon name="search" size={16} />
                  <input
                    type="search"
                    value={interestSearch}
                    onChange={(event) => setInterestSearch(event.target.value)}
                    placeholder="Search interests or categories..."
                    aria-label="Search interests"
                  />
                </label>

                <div className="mt-3 max-h-80 space-y-4 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  {visibleInterestCategories.length ? visibleInterestCategories.map((category) => (
                    <fieldset key={category.name}>
                      <legend className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{category.name}</legend>
                      <div className="flex flex-wrap gap-2">
                        {category.visibleInterests.map((interest) => {
                          const selected = interests.includes(interest)
                          const limitReached = interests.length >= 10
                          return (
                            <label
                              key={`${category.name}-${interest}`}
                              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-[10px] font-bold transition-colors ${
                                selected
                                  ? "border-blue-200 bg-blue-50 text-blue-700"
                                  : "border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50"
                              } ${limitReached && !selected ? "cursor-not-allowed opacity-50" : ""}`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                disabled={limitReached && !selected}
                                onChange={() => toggleInterest(interest)}
                                className="accent-blue-600"
                              />
                              {interest}
                            </label>
                          )
                        })}
                      </div>
                    </fieldset>
                  )) : (
                    <p className="py-4 text-center text-xs text-slate-500">No matching interests. Try another search.</p>
                  )}
                </div>
              </div>
            </section>
            </div>

            <aside className="profile-editor-sidebar space-y-5">
              <div className="profile-editor-tip rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <p className="text-xs font-extrabold text-blue-900">Keep it personal</p>
                <p className="mt-1.5 text-[10px] leading-5 text-blue-800/80">
                  Share only what you’re comfortable with. Your phone number is optional, and a neighbourhood is enough for location.
                </p>
              </div>

              <section className="profile-editor-preview overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="relative h-20 bg-gradient-to-r from-[#142B49] via-blue-800 to-sky-500">
                  {(bannerPreview || profile.banner_url) && (
                    <img src={bannerPreview || profile.banner_url || ""} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  )}
                </div>
                <div className="px-5 pb-5">
                  <div className="-mt-8 grid h-16 w-16 place-items-center rounded-2xl border-4 border-white bg-gradient-to-br from-blue-600 to-sky-400 text-lg font-extrabold text-white shadow-sm">
                    <span className="relative grid h-full w-full place-items-center overflow-hidden rounded-xl">
                      {(avatarPreview || profile.avatar_url) ? (
                        <img src={avatarPreview || profile.avatar_url || ""} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      ) : initials(profile.full_name || "Your Name")}
                    </span>
                  </div>
                  <p className="mt-3 text-[9px] font-extrabold uppercase tracking-[.14em] text-blue-600">Live preview</p>
                  <h2 className="mt-1 truncate text-base font-extrabold text-[#172033]">
                    {profile.full_name.trim() || "Your name"}
                  </h2>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    @{profile.username.trim() || "username"}.gwl
                  </p>
                  <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Icon name="location" size={13} className="shrink-0 text-blue-600" />
                    {profile.city.trim() || "Your city or neighbourhood"}, Gwalior
                  </p>
                  <p className="mt-3 min-h-10 text-xs leading-5 text-slate-600">
                    {profile.bio.trim() || "Your introduction will appear here. Share a little about yourself."}
                  </p>
                  {interests.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {interests.slice(0, 4).map((interest) => (
                        <span key={interest} className="rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-bold text-blue-700">
                          {interest}
                        </span>
                      ))}
                      {interests.length > 4 && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold text-slate-500">
                          +{interests.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </section>

              <section className="profile-editor-checklist card p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-extrabold text-[#172033]">Profile basics</h2>
                    <p className="mt-1 text-[10px] text-slate-500">A few details help people connect.</p>
                  </div>
                  <span className="text-xs font-extrabold text-blue-700">{profileProgress}/{profileChecklist.length}</span>
                </div>
                <div
                  className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-label="Profile basics completed"
                  aria-valuemin={0}
                  aria-valuemax={profileChecklist.length}
                  aria-valuenow={profileProgress}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all"
                    style={{ width: `${(profileProgress / profileChecklist.length) * 100}%` }}
                  />
                </div>
                <ul className="mt-4 space-y-3">
                  {profileChecklist.map((item) => (
                    <li key={item.label} className="flex items-center gap-2.5 text-[11px]">
                      <span className={`grid h-4 w-4 place-items-center rounded-full ${item.complete ? "bg-emerald-100 text-emerald-700" : "border border-slate-300 text-transparent"}`}>
                        <Icon name="check" size={10} />
                      </span>
                      <span className={item.complete ? "text-slate-700" : "text-slate-500"}>{item.label}</span>
                    </li>
                  ))}
                </ul>
              </section>

            </aside>

            {error && <p role="alert" className="profile-editor-error rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700 lg:col-span-2">{error}</p>}

            <div className="profile-editor-submit-bar card flex flex-col-reverse justify-end gap-3 p-3 pb-24 sm:flex-row sm:pb-3 lg:col-span-2">
              <Button variant="outline" onClick={() => go("/profile")}>Discard changes</Button>
              <Button type="submit" disabled={saving}>
                <Icon name="check" size={16} />
                {saving ? "Saving profile..." : "Save profile"}
              </Button>
            </div>
          </form>
        ) : (
          <section className="card p-6">
            <p className="text-sm font-bold text-slate-800">We couldn’t load your profile.</p>
            {error && <p role="alert" className="mt-2 text-xs leading-5 text-red-600">{error}</p>}
            <Button variant="outline" onClick={() => go("/profile")} className="mt-5">Back to profile</Button>
          </section>
        )}
      </div>
    </main>
  )
}