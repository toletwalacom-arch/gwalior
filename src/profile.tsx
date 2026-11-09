import { FormEvent, useEffect, useRef, useState } from "react"
import { createConversation, FollowListMember, getCachedOwnProfile, getJoinedCommunityGroups, getOwnProfile, getProfileFollowList, getPublicProfile, getPublicProfileByUsername, JoinedCommunityGroup, OwnProfile, signOutUser, supabase, updateOwnProfile, uploadProfileImage } from "./lib/supabase"
import { INTEREST_CATEGORIES } from "./lib/interests"

function go(path: string) {
  window.history.pushState({}, "", path)
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
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    share: (
      <>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
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

const COVER = "https://images.unsplash.com/photo-1643269877099-ea5393b80320?auto=format&fit=crop&w=1800&q=85"
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
  const [mobileProfileTab, setMobileProfileTab] = useState<"posts" | "about">("posts")
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
          const postsResult = await supabase
            .from("posts")
            .select("id, content, category, location, image_url, created_at, likes_count, comments_count, interest_tags")
            .eq("user_id", publicProfile.id)
            .eq("visibility", "public")
            .is("group_id", null)
            .order("created_at", { ascending: false })
          if (postsResult.error) throw postsResult.error
          if (!active) return
          setProfile(publicProfile as ProfileViewData)
          setPosts(postsResult.data as UserPost[])
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

  return (
    <div className={`profile-page bg-[#f4f6fb] pb-24 text-[#172033] ${mobileProfileTab === "about" ? "profile-about-active" : ""}`}>
      <div className="profile-cover relative border-b border-slate-200 bg-white">
        <div className="h-56 sm:h-72">
          <img src={profile.banner_url || COVER} alt="Profile cover" className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/55 via-[#0f172a]/10 to-transparent" />
      </div>

      <main className="profile-main mx-auto max-w-[1280px] px-4 pb-10 pt-0 sm:px-6">
        {error && <p role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Showing saved profile data. Could not refresh it: {error}</p>}
        <div className="profile-intro -mt-16 sm:-mt-12">
          <div className="profile-intro-layout flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="profile-identity flex items-end gap-4">
              <div className="profile-avatar relative grid h-24 w-24 place-items-center overflow-hidden rounded-[28px] border-4 border-white bg-gradient-to-br from-blue-700 via-blue-500 to-sky-300 text-3xl font-black text-white shadow-lg shadow-blue-500/20 sm:h-28 sm:w-28">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={`${profile.full_name} profile`} className="absolute inset-0 h-full w-full object-cover" />
                ) : initials(profile.full_name)}
              </div>

              <div className="profile-name-block pb-2">
                <div className="flex items-center gap-2">
                  <h1 className="profile-name text-2xl font-extrabold tracking-[-.04em] sm:text-3xl">{profile.full_name}</h1>
                  <span className="inline-flex items-center justify-center rounded-full bg-blue-100 p-1 text-blue-600">
                    <Icon name="verified" size={16} />
                  </span>
                </div>
                <p className="profile-handle mt-1 text-sm text-slate-500">
                  @{profile.username}<span className="profile-handle-suffix">.gwl</span><span className="profile-handle-location"> · {location}</span>
                </p>
              </div>
            </div>

            {isOwnProfile && (
              <div className="profile-actions profile-actions-desktop flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => go("/profile/edit")} className="px-4 py-2.5">
                  <Icon name="edit" size={15} />
                  Edit profile
                </Button>
                <Button variant="outline" onClick={handleLogout} disabled={loggingOut} className="px-4 py-2.5">
                  {loggingOut ? "Logging out..." : "Log out"}
                </Button>
              </div>
            )}
            {!isOwnProfile && (
              <div className="profile-actions flex flex-col items-start gap-2 lg:items-end">
                <button type="button" onClick={() => void startConversation()} disabled={startingConversation} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60">
                  <Icon name="comment" size={15} />
                  {startingConversation ? "Opening chat…" : "Message"}
                </button>
                {conversationError && <p role="alert" className="max-w-xs text-xs text-red-600 lg:text-right">{conversationError}</p>}
              </div>
            )}
          </div>
        </div>
        <p className="profile-bio mt-4 text-sm leading-6 text-slate-600">{profile.bio || (isOwnProfile ? "Add a short bio to tell your community about yourself." : "No bio added yet.")}</p>
        {logoutError && <p className="profile-logout-error mt-4 text-right text-xs text-red-600">{logoutError}</p>}

        <div className="profile-stats mt-5 grid grid-cols-3 gap-2 border-y border-slate-200 py-3 text-center">
          <div className="profile-stat">
            <div className="text-lg font-extrabold text-[#172033]">{stats.posts}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Posts</div>
          </div>
          <button type="button" onClick={() => { setFollowListProfile({ id: profile.id, name: profile.full_name }); setFollowListType("followers") }} className="profile-stat rounded-xl transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label={`View ${stats.followers} followers`}>
            <div className="text-lg font-extrabold text-[#172033]">{stats.followers}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Followers</div>
          </button>
          <button type="button" onClick={() => { setFollowListProfile({ id: profile.id, name: profile.full_name }); setFollowListType("following") }} className="profile-stat rounded-xl transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label={`View ${stats.following} following`}>
            <div className="text-lg font-extrabold text-[#172033]">{stats.following}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Following</div>
          </button>
        </div>

        <div className="profile-mobile-tabs" role="tablist" aria-label="Profile sections">
          <button type="button" role="tab" aria-selected={mobileProfileTab === "posts"} onClick={() => setMobileProfileTab("posts")}><Icon name="image" size={17} />Posts</button>
          <button type="button" role="tab" aria-selected={mobileProfileTab === "about"} onClick={() => setMobileProfileTab("about")}><Icon name="user" size={17} />About</button>
        </div>

        <div className="profile-details mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="profile-sidebar space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-extrabold uppercase tracking-[.14em] text-blue-600">About</p>
              <p className="profile-about-copy mt-4 text-sm leading-7 text-slate-600">{profile.bio || (isOwnProfile ? "Add a short bio to tell your community about yourself." : "No bio added yet.")}</p>

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

              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Icon name="location" size={14} className="text-blue-600" />
                  {location}
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="calendar" size={14} className="text-blue-600" />
                  {formatJoinDate(profile.created_at)}
                </div>
                {isOwnProfile && (
                  <div className="flex items-center gap-2">
                    <Icon name="bookmark" size={14} className="text-blue-600" />
                    {profile.phone || "No phone number added"}
                  </div>
                )}
              </div>
            </div>

            {isOwnProfile && (
              <div className="profile-mobile-about-actions">
                <Button variant="outline" onClick={() => go("/profile/edit")} className="px-4 py-2.5">
                  <Icon name="edit" size={15} />
                  Edit profile
                </Button>
                <Button variant="outline" onClick={handleLogout} disabled={loggingOut} className="px-4 py-2.5">
                  {loggingOut ? "Logging out..." : "Log out"}
                </Button>
                {logoutError && <p role="alert" className="col-span-2 text-xs text-red-600">{logoutError}</p>}
              </div>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#172033]">Interests</h3>
                <button className="text-[10px] font-extrabold uppercase tracking-wide text-blue-600">View all</button>
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
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#172033]">Communities</h3>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold text-blue-700">
                  {communities.length}
                </span>
              </div>
              {communities.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {communities.map((community) => (
                    <div key={community.id} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700">
                        <Icon name="users" size={17} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-[#172033]">{community.name}</p>
                        <p className="mt-1 text-[10px] leading-5 text-slate-500">{community.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs leading-5 text-slate-500">You haven’t joined any communities yet.</p>
              )}
              <button onClick={() => go("/community")} className="mt-4 text-[10px] font-extrabold uppercase tracking-wide text-blue-600 hover:text-blue-700">
                Explore communities
              </button>
            </div>
            )}
          </aside>

          <section className="profile-posts space-y-5">
            <div className="profile-posts-panel rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="profile-posts-heading flex items-center gap-2 pb-3 text-sm">
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 font-extrabold text-blue-700">
                  <Icon name="image" size={14} />
                  {isOwnProfile ? "Your posts" : "Posts"}
                </span>
                <span className="ml-auto text-xs font-bold text-slate-500">{posts.length} posts</span>
              </div>

              <div className="profile-post-list mt-5 space-y-5">
                <div className="profile-post-grid" aria-label="Profile posts">
                  {posts.map((post) => (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => go(`/post/${post.id}`)}
                      className="profile-grid-tile"
                      aria-label={`Open post: ${post.content.slice(0, 100)}`}
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
                {posts.map((post) => (
                  <article key={post.id} className="profile-post-card overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => go(`/profile/${encodeURIComponent(profile.username)}`)} className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-sky-200 to-blue-600 text-xs font-black text-white">
                          {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                          ) : initials(profile.full_name)}
                        </button>
                        <div>
                          <button type="button" onClick={() => go(`/profile/${encodeURIComponent(profile.username)}`)} className="block text-left text-sm font-extrabold hover:text-blue-700">{profile.full_name}</button>
                          <button type="button" onClick={() => go(`/profile/${encodeURIComponent(profile.username)}`)} className="text-left text-[11px] text-slate-500 hover:text-blue-700">@{profile.username}.gwl · {new Date(post.created_at).toLocaleDateString()}</button>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-500">{post.category}</span>
                    </div>

                    <div className="px-4 pb-4">
                      <p className="text-sm leading-7 text-slate-600">{post.content}</p>
                      {post.interest_tags?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {post.interest_tags.map((tag) => (
                            <span key={tag} className="rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-bold text-blue-700">{tag}</span>
                          ))}
                        </div>
                      )}
                      {post.image_url && <img src={post.image_url} alt="" className="mt-4 h-72 w-full rounded-2xl object-cover" />}
                    </div>
                    <div className="flex items-center gap-5 border-t border-slate-200 px-4 py-3 text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-2">
                        <Icon name="heart" size={15} />
                        {post.likes_count} {post.likes_count === 1 ? "like" : "likes"}
                      </span>
                      <button onClick={() => go(`/post/${post.id}`)} className="flex items-center gap-2 hover:text-blue-600">
                        <Icon name="comment" size={15} />
                        {post.comments_count} {post.comments_count === 1 ? "comment" : "comments"}
                      </button>
                    </div>
                  </article>
                ))}
                {posts.length === 0 && <p className="profile-post-empty py-8 text-center text-sm text-slate-500">{isOwnProfile ? "You haven’t shared a post yet." : "No public posts yet."}</p>}
              </div>
            </div>
          </section>
        </div>
      </main>
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
                          <span className="mt-0.5 block truncate text-[10px] text-slate-500">@{member.username.replace(/\.gwl$/i, "")}.gwl</span>
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
          setProfile({ ...cached, username: cached.username.replace(/\.gwl$/i, "") })
          setInterests(cached.interests ?? [])
          setLoading(false)
          return
        }

        const row = await getOwnProfile(user.id)
        if (!active) return
        setProfile({ ...row, username: row.username.replace(/\.gwl$/i, "") })
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