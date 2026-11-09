import { useState, type ReactNode } from "react"

type CommunityPost = {
  id: string
  category: string
  postType?: "Post" | "Discussion"
  text: string
  userId?: string
  location?: string
  interestTags?: string[]
  followingByMe?: boolean
}

export type CommunityMobileTab = "all" | "people" | "places" | "discussions"

type CommunityMobileProps<T extends CommunityPost> = {
  posts: T[]
  renderPost: (post: T, tab: CommunityMobileTab) => ReactNode
  loading: boolean
  error: string
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
  onBack: () => void
  onTabChange: (tab: CommunityMobileTab) => void
  selectedInterests: string[]
  selectedArea?: string
}

const tabs: { id: CommunityMobileTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "people", label: "People" },
  { id: "places", label: "Places" },
  { id: "discussions", label: "Discussions" },
]

function matchesPlace(post: CommunityPost, selectedInterests: string[], selectedArea?: string) {
  const placePattern = /place|explore|food|lifestyle|event|tourism|heritage|travel|restaurant|cafe/
  const postCategory = post.category.toLowerCase()
  const placeInterests = selectedInterests.filter((interest) => placePattern.test(interest.toLowerCase()))
  const matchesInterest = placeInterests.some((interest) => post.interestTags?.includes(interest))
  const area = selectedArea?.trim().toLowerCase()
  const matchesArea = Boolean(
    area &&
      post.location?.toLowerCase().includes(area),
  )
  const isUniversalPlacePost =
    !post.userId && placePattern.test(postCategory)

  return matchesInterest || matchesArea || isUniversalPlacePost
}

export default function CommunityMobile<T extends CommunityPost>({
  posts,
  renderPost,
  loading,
  error,
  hasMore,
  loadingMore,
  onLoadMore,
  onBack,
  onTabChange,
  selectedInterests,
  selectedArea,
}: CommunityMobileProps<T>) {
  const [activeTab, setActiveTab] = useState<CommunityMobileTab>("all")
  const visiblePosts = posts.filter((post) => {
    if (activeTab === "people") return Boolean(post.userId)
    if (activeTab === "places") return matchesPlace(post, selectedInterests, selectedArea)
    if (activeTab === "discussions") {
      return post.postType === "Discussion" || post.category.toLowerCase() === "discussion"
    }
    return true
  })

  const selectTab = (tab: CommunityMobileTab) => {
    setActiveTab(tab)
    onTabChange(tab)
  }

  return (
    <main className="community-mobile">
      <header className="community-mobile-header">
        <button type="button" onClick={onBack} aria-label="Go back" className="community-mobile-back">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h1>Community</h1>
      </header>
      <nav className="community-mobile-tabs" aria-label="Community categories">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.id}
            className={activeTab === tab.id ? "is-active" : ""}
            aria-pressed={activeTab === tab.id}
            onClick={() => selectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="community-mobile-feed">
        {error && <p role="alert" className="community-mobile-error">{error}</p>}
        {loading && posts.length === 0 ? (
          <p role="status" className="community-mobile-message">Loading community posts...</p>
        ) : visiblePosts.length ? (
          <div className="community-mobile-post-list">
            {visiblePosts.map((post) => (
              <div className="community-mobile-post" key={post.id}>
                {renderPost(post, activeTab)}
              </div>
            ))}
          </div>
        ) : (
          <p className="community-mobile-message">No posts in this category yet.</p>
        )}
        {hasMore && (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="community-mobile-load-more"
          >
            {loadingMore ? "Loading posts..." : "Load more posts"}
          </button>
        )}
      </div>
    </main>
  )
}
