import { FormEvent, ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import ProfilePage, { ProfileEditorPage } from "./profile"
import MessagingPage from "./messaging"
import CommunityMobile, { type CommunityMobileTab } from "./community-mobile"
import { JobDetail, JobHighlights, JobsPage, PostJobPage } from "./jobs"
import {
  addPostComment,
  createCommunityGroup,
  createUserPost,
  getCachedOwnProfile,
  getCommunityPost,
  getMyJoinedCommunityGroups,
  getPopularCommunityGroups,
  getPersonalizedCommunityPosts,
  getCurrentUser,
  getMarketplaceListings,
  getMarketplacePublicSeller,
  getMyMarketplaceFavoriteIds,
  getMyMarketplaceListings,
  getPostComments,
  getPostLikers,
  getOwnProfile,
  isSupabaseConfigured,
  CommunityPost,
  MarketplaceListing as MarketplaceListingRecord,
  MarketplaceSellerProfile,
  PopularCommunityGroup,
  PostComment,
  PostLiker,
  RecommendedCommunityGroup,
  TrendingTopic,
  getTrendingTopics,
  resetInterestFeedback,
  getRecommendedCommunityGroups,
  publishMarketplaceListing,
  startMarketplaceConversation,
  toggleCommentLike,
  toggleMarketplaceFavorite,
  setInterestFeedback,
  updateMarketplaceListingStatus,
  toggleCommunityGroupMembership,
  togglePostLike,
  toggleUserFollow,
  signInUser,
  signUpUser,
  supabase,
} from "./lib/supabase"
import { ALL_INTERESTS, INTEREST_CATEGORIES } from "./lib/interests"

type IconName = "bell" | "bookmark" | "briefcase" | "building" | "calendar" | "camera" | "chat" | "check" | "chevron" | "clock" | "close" | "comment" | "compass" | "edit" | "filter" | "heart" | "home" | "image" | "location" | "mail" | "menu" | "more" | "people" | "phone" | "plus" | "search" | "send" | "share" | "shop" | "star" | "tag" | "user" | "verified"

const iconPaths: Record<IconName, ReactNode> = {
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  bookmark: <path d="M6 3h12v18l-6-4-6 4Z" />,
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2" />
    </>
  ),
  building: (
    <>
      <path d="M3 21h18M6 21V7l6-4 6 4v14" />
      <path d="M9 10h.01M15 10h.01M9 14h.01M15 14h.01M10 21v-3h4v3" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  camera: (
    <>
      <path d="M14.5 5 13 3h-2L9.5 5H5a2 2 0 0 0-2 2v11h18V7a2 2 0 0 0-2-2Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  chat: (
    <>
      <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 21l1.9-5.1A8.5 8.5 0 1 1 21 11.5Z" />
      <path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  comment: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.7-5.1A8 8 0 1 1 21 15Z" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m16 8-2.5 5.5L8 16l2.5-5.5Z" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L8 20H4v-4Z" />
    </>
  ),
  filter: <path d="M4 5h16M7 12h10M10 19h4" />,
  heart: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
  ),
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v11h14V10M9 21v-7h6v7" />
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
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
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
  people: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
    </>
  ),
  phone: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 20 20 0 0 1-8.7-3.1 19.6 19.6 0 0 1-6-6A20 20 0 0 1 2 4.1 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.4 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2Z" />
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
      <path d="M4 10v11h16V10" />
      <path d="M3 4h18l-2 6H5ZM9 21v-6h6v6" />
    </>
  ),
  star: (
    <path d="m12 2 3.1 6.3 6.9 1-5 4.8 1.2 6.9-6.2-3.2L5.8 21 7 14.1l-5-4.8 6.9-1Z" />
  ),
  tag: <path d="M20.6 13.6 11 23l-9-9V4h10Z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  verified: (
    <>
      <path d="M12 2 15 4l4-.1.1 4L21 11l-2 3 .1 4-4-.1L12 20l-3-2.1-4 .1.1-4L3 11l2.1-3.1L5 4l4 .1Z" />
      <path d="m8.5 11 2.2 2.2 4.8-5" />
    </>
  ),
}

function Icon({
  name,
  size = 18,
  className = "",
}: {
  name: IconName
  size?: number
  className?: string
}) {
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
      {iconPaths[name]}
    </svg>
  )
}

const IMG = {
  fort: "https://images.unsplash.com/photo-1643269877099-ea5393b80320?auto=format&fit=crop&w=1800&q=85",
  palace:
    "https://images.unsplash.com/photo-1694796776411-7db66664b47e?auto=format&fit=crop&w=1200&q=80",
  garden:
    "https://images.unsplash.com/photo-1694796776423-96dba3575c57?auto=format&fit=crop&w=1200&q=80",
  food: "https://images.unsplash.com/photo-1728364283053-b1e2abe71611?auto=format&fit=crop&w=1200&q=80",
  cook: "https://images.unsplash.com/photo-1662101875545-0b0cb8b7795b?auto=format&fit=crop&w=1200&q=80",
  street:
    "https://images.unsplash.com/photo-1760782065773-d3189412c4f0?auto=format&fit=crop&w=1200&q=80",
  market:
    "https://images.unsplash.com/photo-1760782065868-8940ff63f8e8?auto=format&fit=crop&w=1200&q=80",
  snack:
    "https://images.unsplash.com/photo-1788620195664-bef14ea327a9?auto=format&fit=crop&w=1200&q=80",
}

function go(path: string, state: unknown = {}) {
  window.history.pushState(state, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
  window.scrollTo({ top: 0, behavior: "smooth" })
}

function Logo({
  compact = false,
  inverse = false,
}: {
  compact?: boolean
  inverse?: boolean
}) {
  return (
    <button
      onClick={() => go("/")}
      className="flex items-center gap-2.5 text-left"
    >
      <span className="logo-mark">
        <span></span>
        <span></span>
        <span></span>
      </span>
      <span>
        <strong
          className={`${
            compact ? "text-base" : "text-lg"
          } block font-extrabold leading-none tracking-[-.04em] ${
            inverse ? "text-white" : "text-[#142B49]"
          }`}
        >
          Gwalior<span className="text-blue-600">Wale</span>
        </strong>
        {!compact && (
          <small
            className={`mt-1 block text-[8px] font-bold uppercase tracking-[.14em] ${
              inverse ? "text-slate-500" : "text-slate-400"
            }`}
          >
            Apna Gwalior. Apne Log.
          </small>
        )}
      </span>
    </button>
  )
}

function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  disabled = false,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: "primary" | "secondary" | "outline" | "soft" | "white"
  className?: string
  type?: "button" | "submit"
  disabled?: boolean
}) {
  const styles = {
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/15",
    secondary: "bg-[#142B49] text-white hover:bg-[#1c3a61]",
    outline:
      "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700",
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

function AppSelect({
  value,
  options,
  onChange,
  disabled = false,
  placeholder,
  ariaLabel,
}: {
  value: string
  options: { label: string; value: string }[]
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  ariaLabel: string
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])
  const selectedOption = options.find((option) => option.value === value)
  const selectedIndex = options.findIndex((option) => option.value === value)
  const [activeIndex, setActiveIndex] = useState(Math.max(selectedIndex, 0))

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideClick)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [open])

  const openMenu = (index = Math.max(selectedIndex, 0)) => {
    setActiveIndex(index)
    setOpen(true)
    requestAnimationFrame(() => optionRefs.current[index]?.focus())
  }

  const moveActive = (index: number) => {
    const nextIndex = Math.max(0, Math.min(options.length - 1, index))
    setActiveIndex(nextIndex)
    optionRefs.current[nextIndex]?.focus()
  }

  return (
    <div className="app-select" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="input app-select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => open ? setOpen(false) : openMenu()}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault()
            if (!open) {
              const start = Math.max(selectedIndex, 0)
              openMenu(event.key === "ArrowDown" ? start : Math.max(start - 1, 0))
            }
          }
        }}
      >
        <span className={selectedOption ? "" : "app-select-placeholder"}>
          {selectedOption?.label || placeholder || "Select an option"}
        </span>
        <Icon name="chevron" size={16} className="app-select-chevron" />
      </button>
      {open && (
        <div className="app-select-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={(element) => { optionRefs.current[index] = element }}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className="app-select-option"
              tabIndex={activeIndex === index ? 0 : -1}
              onFocus={() => setActiveIndex(index)}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
                triggerRef.current?.focus()
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault()
                  moveActive((index + 1) % options.length)
                } else if (event.key === "ArrowUp") {
                  event.preventDefault()
                  moveActive((index - 1 + options.length) % options.length)
                } else if (event.key === "Home") {
                  event.preventDefault()
                  moveActive(0)
                } else if (event.key === "End") {
                  event.preventDefault()
                  moveActive(options.length - 1)
                }
              }}
            >
              <span>{option.label}</span>
              {option.value === value && <Icon name="check" size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const nav = [
  ["Home", "/"],
  ["Community", "/community"],
  ["Messages", "/messages"],
  ["Explore", "/explore"],
  ["Buy & Sell", "/buy-sell"],
  ["Businesses", "/businesses"],
  ["Jobs", "/jobs"],
  ["Events", "/events"],
  ["City notices", "/notifications"],
]

type UserIdentity = {
  full_name: string
  username: string
  avatar_url?: string | null
  city?: string
  interests?: string[]
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function formatPostTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr`
  return `${Math.floor(hours / 24)} day`
}

function Header({
  path,
  loggedIn,
  profile,
}: {
  path: string
  loggedIn: boolean
  profile: UserIdentity | null
}) {
  return (
    <header className="app-header sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-5 px-4 lg:h-[72px] lg:px-6">
        <Logo />
        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {nav.map(([label, href]) => (
            <button
              key={href}
              onClick={() => go(href)}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                path === href
                  || (href === "/buy-sell" && path.startsWith("/buy-sell"))
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="mobile-header-actions">
            <button
              onClick={() => go("/notifications")}
              className="icon-button relative"
              aria-label="Notifications"
              title="Notifications"
            >
              <Icon name="bell" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-orange-500"></span>
            </button>
          </div>
          <div className="header-actions hidden items-center gap-2 md:flex">
            <button
              onClick={() => go("/messages")}
              className={`icon-button ${path.startsWith("/messages") ? "bg-blue-50 text-blue-700" : ""}`}
              aria-label="Messages"
              title="Messages"
            >
              <Icon name="chat" size={20} />
            </button>
            <button
              onClick={() => go("/notifications")}
              className="icon-button relative"
              aria-label="Notifications"
            >
              <Icon name="bell" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-orange-500"></span>
            </button>
            {loggedIn ? (
              <button
                onClick={() => go("/profile")}
                className="flex items-center gap-2 rounded-xl bg-slate-100 p-1.5 pr-3 text-left text-slate-700 transition-colors hover:bg-slate-200"
                aria-label="Open profile"
              >
                <Avatar text={profile ? getInitials(profile.full_name) : "..."} imageUrl={profile?.avatar_url}/>
                <span className="hidden text-xs font-bold md:block">
                  {profile ? `@${profile.username}` : "Your profile"}
                </span>
              </button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => go("/login")}
                  className="inline-flex"
                >
                  Log in
                </Button>
                <Button onClick={() => go("/register")} className="inline-flex">
                  Join community
                </Button>
              </>
            )}
          </div>
          <button
            onClick={() => go("/messages")}
            className={`mobile-message-button icon-button lg:hidden ${path.startsWith("/messages") ? "bg-blue-50 text-blue-700" : ""}`}
            aria-label="Messages"
            title="Messages"
          >
            <Icon name="chat" />
          </button>
        </div>
      </div>
    </header>
  )
}

function MobileNav({ path }: { path: string }) {
  const items: [string, string, IconName][] = [
    ["Home", "/", "home"],
    ["Community", "/community", "people"],
    ["Create", "/create-post", "plus"],
    ["Explore", "/explore", "compass"],
    ["Profile", "/profile", "user"],
  ]
  return (
    <nav className="mobile-nav lg:hidden" aria-label="Main navigation">
      {items.map(([label, href, icon]) => {
        const active = href === "/"
          ? path === "/"
          : href === "/community"
            ? path === "/community" || path === "/trending" || path.startsWith("/post/")
            : href === "/messages"
              ? path.startsWith("/messages")
              : href === "/create-post"
                ? path === "/create-post"
              : href === "/explore"
                ? ["/explore", "/businesses", "/business", "/jobs", "/job", "/events", "/updates"]
                    .some((route) => path === route || path.startsWith(`${route}/`))
                : href === "/profile"
                  ? path === "/profile" || path === "/profile/edit" || path.startsWith("/profile/")
                  : path === href
        return (
          <button
            key={href}
            onClick={() => go(href)}
            className={active ? "is-active" : ""}
            aria-current={active ? "page" : undefined}
          >
            <Icon name={icon} size={20} />
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function Footer() {
  return (
    <footer className="mt-20 bg-[#0e2138] pb-24 text-slate-300 lg:pb-0">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-14 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-6">
        <div>
          <Logo inverse />
          <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">
            The digital home of Gwalior. Connect with people, discover the city
            and grow with your local community.
          </p>
          <p className="mt-6 text-xs font-bold text-orange-400">
            Made with love for Gwalior.
          </p>
        </div>
        <FooterLinks
          title="Platform"
          links={[
            ["About us", "/about"],
            ["Community", "/community"],
            ["Explore Gwalior", "/explore"],
            ["Contact", "/contact"],
          ]}
        />
        <FooterLinks
          title="For business"
          links={[
            ["List your business", "/list-business"],
            ["Post a job", "/post-job"],
            ["Advertise with us", "/advertise"],
            ["Events", "/events"],
          ]}
        />
        <FooterLinks
          title="Trust & social"
          links={[
            ["Community guidelines", "/guidelines"],
            ["Privacy policy", "/privacy"],
            ["Terms of service", "/terms"],
            ["Instagram", "/social/instagram"],
            ["Facebook", "/social/facebook"],
            ["YouTube", "/social/youtube"],
          ]}
        />
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-5 py-5 text-[11px] text-slate-500 sm:flex-row sm:justify-between lg:px-6">
          <span>© 2025 GwaliorWale.com</span>
          <span>Apna Gwalior. Apne Log.</span>
        </div>
      </div>
    </footer>
  )
}
function FooterLinks({ title, links }: { title: string; links: string[][] }) {
  return (
    <div>
      <h4 className="text-xs font-extrabold uppercase tracking-widest text-white">
        {title}
      </h4>
      <div className="mt-4 flex flex-col gap-3">
        {links.map(([l, h]) => (
          <button
            key={h}
            onClick={() => go(h)}
            className="text-left text-sm text-slate-400 hover:text-white"
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}

const categories: {
  title: string
  desc: string
  icon: IconName
  color: string
  href: string
}[] = [
  {
    title: "Community",
    desc: "Join local conversations",
    icon: "people",
    color: "bg-blue-50 text-blue-600",
    href: "/community",
  },
  {
    title: "Explore Gwalior",
    desc: "Places worth discovering",
    icon: "compass",
    color: "bg-orange-50 text-orange-600",
    href: "/explore",
  },
  {
    title: "Local Businesses",
    desc: "Shop and support local",
    icon: "shop",
    color: "bg-violet-50 text-violet-600",
    href: "/businesses",
  },
  {
    title: "Jobs & Careers",
    desc: "Find your next opportunity",
    icon: "briefcase",
    color: "bg-emerald-50 text-emerald-600",
    href: "/jobs",
  },
  {
    title: "Events & Meetups",
    desc: "See what's happening",
    icon: "calendar",
    color: "bg-pink-50 text-pink-600",
    href: "/events",
  },
  {
    title: "City Notices",
    desc: "Know your city better",
    icon: "bell",
    color: "bg-amber-50 text-amber-600",
    href: "/notifications",
  },
  {
    title: "Food & Lifestyle",
    desc: "Local favourites",
    icon: "heart",
    color: "bg-red-50 text-red-600",
    href: "/explore?category=food",
  },
  {
    title: "Education",
    desc: "Colleges and learning",
    icon: "building",
    color: "bg-cyan-50 text-cyan-600",
    href: "/community?topic=education",
  },
  {
    title: "Buy & Sell",
    desc: "Trusted local listings",
    icon: "tag",
    color: "bg-lime-50 text-lime-700",
    href: "/buy-sell",
  },
  {
    title: "Local Services",
    desc: "People who can help",
    icon: "verified",
    color: "bg-indigo-50 text-indigo-600",
    href: "/businesses?category=services",
  },
]

type Post = {
  id: string
  createdAt?: string
  name: string
  handle: string
  avatar: string
  avatarUrl?: string | null
  time: string
  category: string
  postType?: "Post" | "Discussion"
  location?: string
  text: string
  image?: string
  likes: number
  comments: number
  likedByMe?: boolean
  userId?: string
  interestTags?: string[]
  followingByMe?: boolean
  isOwnPost?: boolean
  groupId?: string | null
}

function mapCommunityPost(row: CommunityPost): Post {
  return {
    id: row.id,
    createdAt: row.created_at,
    name: row.full_name,
    handle: `@${row.username}`,
    avatar: getInitials(row.full_name),
    avatarUrl: row.avatar_url,
    time: formatPostTime(row.created_at),
    category: row.category,
    postType: row.category.toLowerCase() === "discussion" ? "Discussion" : row.category.toLowerCase() === "post" ? "Post" : undefined,
    location: row.location,
    text: row.content,
    image: row.image_url ?? undefined,
    likes: Number(row.likes_count),
    comments: Number(row.comments_count),
    likedByMe: row.liked_by_me,
    userId: row.user_id,
    interestTags: row.interest_tags ?? [],
    followingByMe: row.following_by_me,
    isOwnPost: row.is_own_post,
    groupId: row.group_id,
  }
}

function isPost(value: unknown): value is Post {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<Post>
  return typeof candidate.id === "string"
    && typeof candidate.name === "string"
    && typeof candidate.handle === "string"
    && typeof candidate.text === "string"
    && typeof candidate.likes === "number"
    && typeof candidate.comments === "number"
}

function getPostNavigationState(id: string) {
  const state: unknown = window.history.state
  if (!state || typeof state !== "object") return { post: null, feedPosts: [] as Post[] }
  const navigation = state as { post?: unknown; feedPosts?: unknown }
  const post = isPost(navigation.post) && navigation.post.id === id ? navigation.post : null
  const feedPosts = Array.isArray(navigation.feedPosts)
    ? navigation.feedPosts.filter(isPost)
    : []
  return { post, feedPosts }
}

function readStoredPosts(): Post[] {
  try {
    const saved = localStorage.getItem("gwaliorwale-posts")
    if (!saved) return []
    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStoredPosts(nextPosts: Post[]) {
  localStorage.setItem("gwaliorwale-posts", JSON.stringify(nextPosts))
}

const defaultPosts: Post[] = [
  {
    id: "best-poha",
    name: "Aayushi Sharma",
    handle: "@aayushi.gwl",
    avatar: "AS",
    time: "18 min",
    category: "Food & Lifestyle",
    postType: "Post",
    text: "Which is the best place for poha and kachori in Gwalior? Looking for proper local recommendations, not just the famous spots!",
    image: IMG.food,
    likes: 128,
    comments: 42,
  },
  {
    id: "weekend-places",
    name: "Rohan Tomar",
    handle: "@rohanexplores",
    avatar: "RT",
    time: "1 hr",
    category: "Explore Gwalior",
    postType: "Post",
    text: "Suggest some good places to visit in Gwalior with friends this weekend. Somewhere peaceful around sunset?",
    image: IMG.garden,
    likes: 84,
    comments: 31,
  },
  {
    id: "part-time-job",
    name: "Neha Gupta",
    handle: "@nehag",
    avatar: "NG",
    time: "3 hr",
    category: "Jobs & Careers",
    postType: "Discussion",
    text: "Looking for a part-time job in Gwalior alongside college. Content writing, social media or tutoring would be ideal. Any suggestions?",
    likes: 56,
    comments: 24,
  },
  {
    id: "local-business",
    name: "Gwalior Entrepreneurs",
    handle: "@gwlentrepreneurs",
    avatar: "GE",
    time: "5 hr",
    category: "Local Business",
    postType: "Discussion",
    text: "Local business owners, introduce your business to the community! Tell us what you make, where you're based and how Gwalior can support you.",
    likes: 191,
    comments: 67,
  },
]

function withUniversalPosts(universalPosts: Post[], fetchedPosts: Post[]): Post[] {
  const seenIds = new Set(universalPosts.map((post) => post.id))
  const seenText = new Set(universalPosts.map((post) => post.text.trim().toLowerCase()))
  const uniqueFetchedPosts = fetchedPosts.filter((post) => {
    const normalizedText = post.text.trim().toLowerCase()
    if (seenIds.has(post.id) || seenText.has(normalizedText)) return false
    seenIds.add(post.id)
    seenText.add(normalizedText)
    return true
  })

  return [...universalPosts, ...uniqueFetchedPosts]
}

let posts: Post[] = readStoredPosts().length ? readStoredPosts() : [...defaultPosts]

function Avatar({ text, imageUrl, large = false }: { text: string; imageUrl?: string | null; large?: boolean }) {
  return (
    <span
      className={`${
        large ? "h-20 w-20 text-xl" : "h-10 w-10 text-xs"
      } relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-blue-100 to-orange-100 font-extrabold text-[#142B49] ring-2 ring-white`}
    >
      {imageUrl ? <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : text}
    </span>
  )
}

function ShareMenu({ post, closing, onClose, onAnimationEnd }: {
  post: Post
  closing: boolean
  onClose: () => void
  onAnimationEnd: (event: React.AnimationEvent<HTMLElement>) => void
}) {
  const [message, setMessage] = useState("")
  const shareUrl = `${window.location.origin}/post/${encodeURIComponent(post.id)}`
  const shareText = `${post.text}\n\n${shareUrl}`
  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedText = encodeURIComponent(post.text)
  const imageUrl = post.image ? new URL(post.image, window.location.origin).toString() : ""
  const encodedImage = encodeURIComponent(imageUrl)

  const copyLink = async (label: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setMessage(`${label} link copied.`)
    } catch {
      setMessage("Could not copy the link. Copy it from your browser address bar.")
    }
  }

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "GwaliorWale post", text: post.text, url: shareUrl })
        onClose()
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setMessage("Could not open the share sheet.")
        }
      }
      return
    }
    try {
      await navigator.clipboard.writeText(shareText)
      setMessage("Post link copied. Paste it into a message.")
    } catch {
      setMessage("Could not copy the link. Copy it from your browser address bar.")
    }
  }

  return (
    createPortal(
      <div className={`post-detail-comments-backdrop${closing ? " is-closing" : ""}`} onClick={onClose}>
        <section
          className={`post-detail-comments post-share-sheet${closing ? " is-closing" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`share-title-${post.id}`}
          onClick={(event) => event.stopPropagation()}
          onAnimationEnd={onAnimationEnd}
        >
          <div className="post-detail-comments-heading">
            <h2 id={`share-title-${post.id}`}>Share post</h2>
            <button type="button" onClick={onClose} aria-label="Close share options"><Icon name="close" size={18} /></button>
          </div>
          <p className="share-sheet-preview">{post.text}</p>
          <div className="share-sheet-primary-actions">
            <button type="button" onClick={shareNative} className="share-sheet-primary">
              <span><Icon name="share" size={18} /></span>
              <strong>More sharing options</strong>
              <small>Open your device share sheet</small>
            </button>
            <button type="button" onClick={() => void copyLink("Post")} className="share-sheet-primary">
              <span><Icon name="bookmark" size={18} /></span>
              <strong>Copy link</strong>
              <small>Share it anywhere</small>
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareText)
                  setMessage("Post text and link copied.")
                } catch {
                  setMessage("Could not copy the post. Check your browser clipboard permission.")
                }
              }}
              className="share-sheet-primary"
            >
              <span><Icon name="edit" size={18} /></span>
              <strong>Copy text</strong>
              <small>Include the post and link</small>
            </button>
          </div>
          <div className="share-sheet-divider"><span>Share using</span></div>
          <div className="share-sheet-destinations">
            <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" onClick={onClose}>
              <span className="share-destination-badge share-whatsapp">WA</span><strong>WhatsApp</strong>
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noreferrer" onClick={onClose}>
              <span className="share-destination-badge share-facebook">f</span><strong>Facebook</strong>
            </a>
            <a href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`} target="_blank" rel="noreferrer" onClick={onClose}>
              <span className="share-destination-badge share-x">X</span><strong>X</strong>
            </a>
            <a href={`https://www.reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent(`GwaliorWale: ${post.category}`)}`} target="_blank" rel="noreferrer" onClick={onClose}>
              <span className="share-destination-badge share-reddit">r/</span><strong>Reddit</strong>
            </a>
            <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank" rel="noreferrer" onClick={onClose}>
              <span className="share-destination-badge share-linkedin">in</span><strong>LinkedIn</strong>
            </a>
            <a href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`} target="_blank" rel="noreferrer" onClick={onClose}>
              <span className="share-destination-badge share-telegram">TG</span><strong>Telegram</strong>
            </a>
            {imageUrl && (
              <a href={`https://www.pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedImage}&description=${encodedText}`} target="_blank" rel="noreferrer" onClick={onClose}>
                <span className="share-destination-badge share-pinterest">P</span><strong>Pinterest</strong>
              </a>
            )}
            <a href={`mailto:?subject=${encodeURIComponent("A post from GwaliorWale")}&body=${encodeURIComponent(shareText)}`} onClick={onClose}>
              <span className="share-destination-badge share-email"><Icon name="mail" size={17} /></span><strong>Email</strong>
            </a>
            <a href={`sms:?&body=${encodeURIComponent(shareText)}`} onClick={onClose}>
              <span className="share-destination-badge share-message"><Icon name="chat" size={17} /></span><strong>Messages</strong>
            </a>
          </div>
          {message && <p role="status" className="share-menu-message">{message}</p>}
        </section>
      </div>,
      document.body,
    )
  )
}

function PostLikersList({ postId, active, available }: {
  postId: string
  active: boolean
  available: boolean
}) {
  const [likers, setLikers] = useState<PostLiker[]>([])
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(false)
  const [canView, setCanView] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState("")
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    if (!active || !available) return
    let current = true
    setLikers([])
    setOffset(0)
    setError("")
    setCheckingAuth(true)
    setLoading(false)
    getCurrentUser()
      .then((user) => {
        if (!current) return
        setCanView(Boolean(user))
        if (!user) return
        setLoading(true)
        return getPostLikers(postId)
      })
      .then((rows) => {
        if (!current || !rows) return
        setLikers(rows)
        setOffset(rows.length)
        setHasMore(rows.length === 50)
      })
      .catch((reason: unknown) => {
        if (current) setError(reason instanceof Error ? reason.message : "Could not load post likes.")
      })
      .finally(() => {
        if (current) {
          setLoading(false)
          setCheckingAuth(false)
        }
      })
    return () => { current = false }
  }, [active, available, postId])

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
  if (!available) return <p className="post-detail-comment-status">Likes are available for published community posts.</p>
  if (checkingAuth) return <p role="status" className="post-detail-comment-status">Loading likes...</p>
  if (!canView) return <button type="button" onClick={() => go("/login")} className="post-detail-login">Log in to see who liked this post</button>
  if (loading) return <p role="status" className="post-detail-comment-status">Loading people who liked this post...</p>
  if (error && !likers.length) return <p role="alert" className="post-detail-likers-error">{error}</p>

  return (
    <div className="post-detail-likers">
      {likers.map((liker) => (
        <button
          type="button"
          key={liker.id}
          onClick={() => go(`/profile/${encodeURIComponent(liker.username)}`)}
          className="post-detail-liker"
        >
          <Avatar text={getInitials(liker.full_name || "Community member")} imageUrl={liker.avatar_url} />
          <span className="min-w-0 flex-1">
            <strong>{liker.full_name || "Community member"}</strong>
            <small>@{liker.username}</small>
          </span>
          <Icon name="heart" size={16} className="text-rose-500" />
        </button>
      ))}
      {!likers.length && <p className="post-detail-comment-status">No one has liked this post yet.</p>}
      {error && <p role="alert" className="post-detail-likers-error">{error}</p>}
      {hasMore && (
        <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="post-detail-likers-more">
          {loadingMore ? "Loading..." : "Show more"}
        </button>
      )}
    </div>
  )
}

function PostCard({
  post,
  feedContext = [post],
  detailed = false,
  homeFeed = false,
  categoryLabel,
  onOpenComments,
}: {
  post: Post
  feedContext?: Post[]
  detailed?: boolean
  homeFeed?: boolean
  categoryLabel?: string
  onOpenComments?: () => void
}) {
  const [liked, setLiked] = useState(Boolean(post.likedByMe))
  const [following, setFollowing] = useState(Boolean(post.followingByMe))
  const [likeCount, setLikeCount] = useState(post.likes)
  const [commentCount, setCommentCount] = useState(post.comments)
  const [saved, setSaved] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareClosing, setShareClosing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState("")
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentsClosing, setCommentsClosing] = useState(false)
  const [likesOpen, setLikesOpen] = useState(false)
  const [likesClosing, setLikesClosing] = useState(false)
  const [inlineComments, setInlineComments] = useState<PostComment[]>([])
  const [commenter, setCommenter] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState("")
  const isDatabasePost = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(post.id)
  const openPost = () => go(`/post/${post.id}`, { post, feedPosts: feedContext })

  useEffect(() => {
    setLiked(Boolean(post.likedByMe))
    setFollowing(Boolean(post.followingByMe))
    setLikeCount(post.likes)
    setCommentCount(post.comments)
  }, [post.id, post.likes, post.comments, post.likedByMe, post.followingByMe])

  const handleFollow = async () => {
    if (!post.userId) return
    setBusy(true)
    setActionError("")
    try {
      await toggleUserFollow(post.userId, following)
      setFollowing(!following)
      window.dispatchEvent(new Event("gwalior:feed-preferences-changed"))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not update your follow.")
    } finally {
      setBusy(false)
    }
  }

  const handleInterestFeedback = async (interestTag: string, adjustment: -2 | -1 | 1) => {
    setBusy(true)
    setActionError("")
    setFeedbackMessage("")
    try {
      await setInterestFeedback(interestTag, adjustment)
      setFeedbackMessage(
        adjustment === 1
          ? `Showing you more ${interestTag}.`
          : adjustment === -1
            ? `Showing you less ${interestTag}.`
            : `Hiding ${interestTag} from your feed.`,
      )
      window.dispatchEvent(new Event("gwalior:feed-preferences-changed"))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not update your feed preference.")
    } finally {
      setBusy(false)
    }
  }

  const handleLike = async () => {
    if (!isDatabasePost) {
      setActionError("Likes are available on published community posts.")
      return
    }
    setBusy(true)
    setActionError("")
    try {
      await togglePostLike(post.id, liked)
      setLiked(!liked)
      setLikeCount((count) => count + (liked ? -1 : 1))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not update your like.")
    } finally {
      setBusy(false)
    }
  }

  const closeComments = () => {
    if (commentsClosing) return
    setCommentsClosing(true)
  }

  const finishClosingComments = (event: React.AnimationEvent<HTMLElement>) => {
    if (commentsClosing && event.target === event.currentTarget) {
      setCommentsOpen(false)
      setCommentsClosing(false)
    }
  }

  const closeLikes = () => {
    if (likesClosing) return
    setLikesClosing(true)
  }

  const finishClosingLikes = (event: React.AnimationEvent<HTMLElement>) => {
    if (likesClosing && event.target === event.currentTarget) {
      setLikesOpen(false)
      setLikesClosing(false)
    }
  }

  const closeShare = () => {
    if (shareClosing) return
    setShareClosing(true)
  }

  const finishClosingShare = (event: React.AnimationEvent<HTMLElement>) => {
    if (shareClosing && event.target === event.currentTarget) {
      setSharing(false)
      setShareClosing(false)
    }
  }

  const openShare = () => {
    setShareClosing(false)
    setSharing(true)
  }

  const openLikes = () => {
    setLikesClosing(false)
    setLikesOpen(true)
  }

  const toggleComments = async () => {
    if (commentsOpen) {
      closeComments()
      return
    }
    setCommentsClosing(false)
    setCommentsOpen(true)

    if (!isDatabasePost) return
    setCommentsLoading(true)
    setActionError("")
    const [commentsResult, userResult] = await Promise.allSettled([getPostComments(post.id), getCurrentUser()])
    if (commentsResult.status === "fulfilled") {
      setInlineComments(commentsResult.value)
      setCommentCount(commentsResult.value.length)
    } else {
      setActionError(commentsResult.reason instanceof Error ? commentsResult.reason.message : "Could not load comments.")
    }
    if (userResult.status === "fulfilled") setCommenter(Boolean(userResult.value))
    else setActionError(userResult.reason instanceof Error ? userResult.reason.message : "Could not check your login status.")
    setCommentsLoading(false)
  }

  useEffect(() => {
    if (!commentsOpen && !likesOpen && !sharing) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (commentsOpen) closeComments()
        if (likesOpen) closeLikes()
        if (sharing) closeShare()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [commentsOpen, likesOpen, sharing])

  const refreshInlineComments = async () => {
    const nextComments = await getPostComments(post.id)
    setInlineComments(nextComments)
    setCommentCount(nextComments.length)
  }

  const submitInlineComment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!commentText.trim()) return
    if (!commenter) {
      go("/login")
      return
    }
    setCommentSubmitting(true)
    setActionError("")
    try {
      await addPostComment(post.id, commentText)
      setCommentText("")
      await refreshInlineComments()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not add your comment.")
    } finally {
      setCommentSubmitting(false)
    }
  }

  return (
    <article className={`card overflow-hidden ${homeFeed ? "home-post-card" : ""}`}>
      <div className="post-card-content p-4 sm:p-5">
        <div className="post-author-row flex items-start gap-3">
          {post.userId ? (
            <button type="button" className="post-author-avatar" onClick={() => go(`/profile/${encodeURIComponent(post.handle.replace(/^@/, ""))}`)}>
              <Avatar text={post.avatar} imageUrl={post.avatarUrl} />
            </button>
          ) : (
            <span className="post-author-avatar"><Avatar text={post.avatar} imageUrl={post.avatarUrl} /></span>
          )}
          <div className="post-author-details min-w-0 flex-1">
            {post.userId ? (
              <button
                type="button"
                onClick={() => go(`/profile/${encodeURIComponent(post.handle.replace(/^@/, ""))}`)}
                className="post-author-name flex items-center gap-1 text-sm font-extrabold text-slate-900"
              >
                {post.name}
                <Icon name="verified" size={14} className="text-blue-500" />
              </button>
            ) : (
              <div className="post-author-name flex items-center gap-1 text-sm font-extrabold text-slate-900">
                {post.name}
                <Icon name="verified" size={14} className="text-blue-500" />
              </div>
            )}
            <div className="post-meta-line mt-0.5 text-[11px] text-slate-400">
              {post.userId ? (
                <button type="button" onClick={() => go(`/profile/${encodeURIComponent(post.handle.replace(/^@/, ""))}`)} className="hover:text-blue-700">
                  {post.handle}
                </button>
              ) : post.handle}
              <span className="post-time"> · {post.time} ago</span>
            </div>
            <span className={detailed ? "post-detail-category" : homeFeed || categoryLabel ? "post-category" : "text-blue-600"}>
              {homeFeed || categoryLabel ? categoryLabel ?? post.category : ` · ${post.category}`}
            </span>
          </div>
          {post.userId && !post.isOwnPost && (
            <button
              type="button"
              onClick={() => void handleFollow()}
              disabled={busy}
              className="post-follow-button rounded-full border border-blue-100 px-3 py-1.5 text-[10px] font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            >
              {following ? "Following" : "Follow"}
            </button>
          )}
          <button className="post-more-button text-slate-400" aria-label="More post options">
            <Icon name="more" />
          </button>
        </div>
        {detailed ? (
          <div className="post-body-button mt-4 block w-full text-left">
            <p className="post-body-copy text-base leading-7 text-slate-700">{post.text}</p>
          </div>
        ) : <button
          onClick={openPost}
          className="post-body-button mt-4 block w-full text-left"
        >
          <p
            className={`${
              detailed ? "text-base sm:text-lg" : "text-sm"
            } post-body-copy leading-7 text-slate-700`}
          >
            {post.text}
          </p>
        </button>}
        {post.interestTags && post.interestTags.length > 0 && (
          <div className="post-tags-wrap mt-3">
            <div className="post-tags flex flex-wrap gap-1.5" aria-label="Post topics">
              {post.interestTags.map((tag) => (
                <span key={tag} className="rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-bold text-blue-700">{tag}</span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setFeedbackOpen(!feedbackOpen)}
              className="mt-2 text-[10px] font-bold text-slate-500 hover:text-blue-700"
              aria-expanded={feedbackOpen}
            >
              Personalize this topic
            </button>
            {feedbackOpen && (
              <div className="mt-2 space-y-2 rounded-xl bg-slate-50 p-3">
                {post.interestTags.map((tag) => (
                  <div key={tag} className="flex flex-wrap items-center gap-2">
                    <span className="mr-auto text-[10px] font-bold text-slate-600">{tag}</span>
                    <button type="button" disabled={busy} onClick={() => void handleInterestFeedback(tag, 1)} className="text-[9px] font-bold text-blue-700 disabled:opacity-50">More</button>
                    <button type="button" disabled={busy} onClick={() => void handleInterestFeedback(tag, -1)} className="text-[9px] font-bold text-slate-600 disabled:opacity-50">Less</button>
                    <button type="button" disabled={busy} onClick={() => void handleInterestFeedback(tag, -2)} className="text-[9px] font-bold text-red-600 disabled:opacity-50">Hide</button>
                  </div>
                ))}
                {feedbackMessage && <p role="status" className="text-[10px] text-green-700">{feedbackMessage}</p>}
              </div>
            )}
          </div>
        )}
      </div>
      {post.image && (detailed ? (
          <div className="post-image-button block w-full overflow-hidden bg-slate-100">
            <img
              src={post.image}
              alt="Shared by the GwaliorWale community"
              className="post-image w-full object-cover"
            />
          </div>
        ) : <button
          onClick={openPost}
          className="post-image-button block w-full overflow-hidden bg-slate-100"
        >
          <img
            src={post.image}
            alt="Shared by the GwaliorWale community"
            className={`post-image w-full object-cover transition-transform duration-500 hover:scale-[1.02] ${
              detailed ? "max-h-[520px]" : "h-64 sm:h-80"
            }`}
          />
        </button>
      )}
      <div className="post-action-row flex items-center border-t border-slate-100 px-3 py-2">
        <div className="post-action-group">
          <button
            type="button"
            onClick={() => void handleLike()}
            disabled={busy}
            aria-label={liked ? "Unlike post" : "Like post"}
            className={`post-action post-like-button social-action ${liked ? "is-liked" : ""}`}
          >
            <Icon name="heart" size={17} className={liked ? "fill-red-500" : ""} />
          </button>
          <button type="button" onClick={openLikes} className="post-action post-like-count" aria-label={`View ${likeCount} likes`} title="See who liked this post">
            {likeCount}
          </button>
        </div>
        <button
          type="button"
          onClick={() => onOpenComments ? onOpenComments() : void toggleComments()}
          aria-label={`View ${commentCount} comments`}
          className="post-action post-comment-button social-action"
        >
          <Icon name="comment" size={17} />
          <span>{commentCount}</span>
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={openShare}
            aria-label="Share post"
            title="Share post"
            aria-expanded={sharing}
            className="post-action post-share-button social-action"
          >
            <Icon name="share" size={17} />
          </button>
        </div>
        <button
          onClick={() => setSaved(!saved)}
          className={`post-action post-save-action social-action ml-auto ${saved ? "text-blue-600" : ""}`}
        >
          <Icon
            name="bookmark"
            size={17}
            className={saved ? "fill-blue-600" : ""}
          />
        </button>
      </div>
      {actionError && <p role="alert" className="border-t border-red-100 px-4 py-2 text-xs text-red-600">{actionError}</p>}
      {commentsOpen && createPortal(
        <div className={`post-detail-comments-backdrop${commentsClosing ? " is-closing" : ""}`} onClick={closeComments}>
          <section
            className={`post-detail-comments${commentsClosing ? " is-closing" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`comments-title-${post.id}`}
            onClick={(event) => event.stopPropagation()}
            onAnimationEnd={finishClosingComments}
          >
            <div className="post-detail-comments-heading">
              <h2 id={`comments-title-${post.id}`}>Comments <span>{commentCount}</span></h2>
              <button type="button" onClick={closeComments} aria-label="Close comments"><Icon name="close" size={18} /></button>
            </div>
            {commentsLoading && <p role="status" className="post-detail-comment-status">Loading comments...</p>}
            {commenter ? (
              <form onSubmit={(event) => void submitInlineComment(event)} className="post-detail-comment-form">
                <div className="post-detail-comment-input">
                  <input value={commentText} onChange={(event) => setCommentText(event.target.value)} aria-label="Add a comment" placeholder="Add a comment..." />
                  <button disabled={commentSubmitting || !commentText.trim()} aria-label="Send comment" className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-white disabled:opacity-50">
                    <Icon name="send" size={16} />
                  </button>
                </div>
              </form>
            ) : !commentsLoading ? (
              <button onClick={() => go("/login")} className="post-detail-login">Log in to comment</button>
            ) : null}
            <div className="post-detail-comment-list">
              {inlineComments.filter((item) => !item.parent_comment_id).map((item) => (
                <CommentThread key={item.id} comment={item} allComments={inlineComments} canComment={commenter} onRefresh={refreshInlineComments} />
              ))}
              {!commentsLoading && inlineComments.length === 0 && (
                <div className="post-detail-empty-comments">
                  <span><Icon name="chat" size={18} /></span>
                  <div>
                    <strong>{isDatabasePost ? "No comments yet" : "Join the conversation"}</strong>
                    <p>{isDatabasePost ? "Start a thoughtful conversation with the community." : "Comments will be available when this post is published."}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>,
        document.body,
      )}
      {likesOpen && createPortal(
        <div className={`post-detail-comments-backdrop${likesClosing ? " is-closing" : ""}`} onClick={closeLikes}>
          <section
            className={`post-detail-comments${likesClosing ? " is-closing" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`likes-title-${post.id}`}
            onClick={(event) => event.stopPropagation()}
            onAnimationEnd={finishClosingLikes}
          >
            <div className="post-detail-comments-heading">
              <h2 id={`likes-title-${post.id}`}>Likes <span>{likeCount}</span></h2>
              <button type="button" onClick={closeLikes} aria-label="Close likes"><Icon name="close" size={18} /></button>
            </div>
            <PostLikersList postId={post.id} active={likesOpen && !likesClosing} available={isDatabasePost} />
          </section>
        </div>,
        document.body,
      )}
      {sharing && (
        <ShareMenu
          post={post}
          closing={shareClosing}
          onClose={closeShare}
          onAnimationEnd={finishClosingShare}
        />
      )}
    </article>
  )
}

const places = [
  {
    id: "gwalior-fort",
    name: "Gwalior Fort",
    type: "History & Heritage",
    area: "Fort Road",
    image: IMG.fort,
    rating: "4.7",
  },
  {
    id: "jai-vilas",
    name: "Jai Vilas Palace",
    type: "Museum & Palace",
    area: "Lashkar",
    image: IMG.palace,
    rating: "4.6",
  },
  {
    id: "baija-taal",
    name: "Baija Taal",
    type: "Hidden Gem",
    area: "Moti Mahal",
    image: IMG.garden,
    rating: "4.4",
  },
  {
    id: "street-food",
    name: "Lashkar Food Trail",
    type: "Street Food",
    area: "Maharaj Bada",
    image: IMG.snack,
    rating: "4.8",
  },
]
const businesses = [
  {
    id: "indian-coffee-house",
    name: "Indian Coffee House",
    type: "Restaurant",
    area: "Maharaj Bada",
    rating: "4.5",
    reviews: 328,
    image: IMG.cook,
    desc: "A beloved Gwalior meeting place serving classic South Indian fare and coffee.",
  },
  {
    id: "bahadura-sweets",
    name: "Bahadura Sweets",
    type: "Sweets & Snacks",
    area: "Naya Bazaar",
    rating: "4.7",
    reviews: 512,
    image: IMG.food,
    desc: "Known across the city for hot jalebi, boondi laddoo and traditional sweets.",
  },
  {
    id: "fort-view-cafe",
    name: "Fort View Café",
    type: "Café",
    area: "Hazira",
    rating: "4.4",
    reviews: 186,
    image: IMG.fort,
    desc: "Casual café with good coffee, local bites and a relaxed rooftop setting.",
  },
]
const events = [
  {
    id: "heritage-walk",
    title: "Sunrise Heritage Walk at Gwalior Fort",
    date: "SUN, 24 NOV",
    time: "6:30 AM",
    venue: "Urwai Gate",
    type: "Culture",
    interested: 184,
    image: IMG.fort,
  },
  {
    id: "creator-meet",
    title: "Gwalior Creators & Founders Meetup",
    date: "SAT, 30 NOV",
    time: "4:00 PM",
    venue: "City Centre",
    type: "Meetup",
    interested: 96,
    image: IMG.street,
  },
  {
    id: "food-fest",
    title: "Gwalior Street Food Weekend",
    date: "7–8 DEC",
    time: "5:00 PM",
    venue: "Mela Ground",
    type: "Food",
    interested: 421,
    image: IMG.market,
  },
]

function SectionTitle({
  eyebrow,
  title,
  description,
  action,
  onAction,
  createPostAction = false,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: string
  onAction?: () => void
  createPostAction?: boolean
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2 className="mt-1 text-2xl font-extrabold tracking-[-.035em] text-[#172033] sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="section-title-actions flex shrink-0 flex-col items-end gap-2">
          {createPostAction && (
            <Button
              onClick={() => go("/create-post")}
              className="home-create-post-button !hidden !rounded-xl !px-6 !py-3 !text-sm lg:!inline-flex"
            >
              <Icon name="plus" size={17} />
              Create Post
            </Button>
          )}
          <button
            onClick={onAction}
            className="home-open-community-link hidden shrink-0 items-center gap-1 text-xs font-extrabold text-blue-600 sm:flex"
          >
            {action}
            <Icon name="chevron" size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

function HomePage({ profile, loggedIn }: { profile: UserIdentity | null; loggedIn: boolean }) {
  const [search, setSearch] = useState("")
  const [createPostOpen, setCreatePostOpen] = useState(false)
  const [homePosts, setHomePosts] = useState<Post[]>(defaultPosts.slice(2))
  const [homePostsLoading, setHomePostsLoading] = useState(true)
  const [homePostsError, setHomePostsError] = useState("")
  const [recommendedPosts, setRecommendedPosts] = useState<Post[]>(defaultPosts.slice(0, 2))
  const [recommendedPostsLoading, setRecommendedPostsLoading] = useState(true)
  const [recommendedPostsError, setRecommendedPostsError] = useState("")
  const [popularGroups, setPopularGroups] = useState<PopularCommunityGroup[]>([])
  const [popularGroupsLoading, setPopularGroupsLoading] = useState(true)
  const [popularGroupsError, setPopularGroupsError] = useState("")
  const [busyGroup, setBusyGroup] = useState("")

  useEffect(() => {
    let active = true
    async function loadHomePosts() {
      try {
        if (!profile) {
          setRecommendedPosts(defaultPosts.slice(0, 2))
          setHomePosts(defaultPosts.slice(2))
          return
        }

        const user = await getCurrentUser()
        if (!active) return
        if (!user) {
          setRecommendedPosts(defaultPosts.slice(0, 2))
          setHomePosts(defaultPosts.slice(2))
          return
        }

        const [recommendedResult, latestResult] = await Promise.allSettled([
          getPersonalizedCommunityPosts("for_you", 2),
          getPersonalizedCommunityPosts("latest", 3),
        ])
        if (!active) return

        if (recommendedResult.status === "fulfilled") {
          const nextPosts = recommendedResult.value.map(mapCommunityPost)
          setRecommendedPosts(withUniversalPosts(defaultPosts.slice(0, 2), nextPosts))
        } else {
          setRecommendedPosts(defaultPosts.slice(0, 2))
          setRecommendedPostsError(recommendedResult.reason instanceof Error ? recommendedResult.reason.message : "Could not load suggested posts.")
        }
        if (latestResult.status === "fulfilled") {
          const nextPosts = latestResult.value.map(mapCommunityPost)
          setHomePosts(withUniversalPosts(defaultPosts.slice(2), nextPosts))
        } else {
          setHomePosts(defaultPosts.slice(2))
          setHomePostsError(latestResult.reason instanceof Error ? latestResult.reason.message : "Could not load community posts.")
        }
      } catch (error) {
        if (active) {
          const message = error instanceof Error ? error.message : "Could not load community posts."
          setRecommendedPostsError(message)
          setHomePostsError(message)
        }
      } finally {
        if (active) {
          setRecommendedPostsLoading(false)
          setHomePostsLoading(false)
        }
      }
    }

    void loadHomePosts()
    return () => { active = false }
  }, [profile?.username])

  useEffect(() => {
    let active = true

    async function loadPopularGroups() {
      try {
        const groups = await getPopularCommunityGroups(10)
        if (active) setPopularGroups(groups)
      } catch (error) {
        if (active) {
          setPopularGroupsError(error instanceof Error ? error.message : "Could not load popular communities.")
        }
      } finally {
        if (active) setPopularGroupsLoading(false)
      }
    }

    void loadPopularGroups()
    return () => { active = false }
  }, [])

  async function joinPopularGroup(group: PopularCommunityGroup) {
    setBusyGroup(group.id)
    setPopularGroupsError("")
    try {
      const user = await getCurrentUser()
      if (!user) {
        go("/login")
        return
      }

      await toggleCommunityGroupMembership(group.id, false)
      setPopularGroups((groups) => groups.map((item) =>
        item.id === group.id
          ? { ...item, joined_by_me: true, member_count: item.member_count + 1 }
          : item,
      ))
    } catch (error) {
      setPopularGroupsError(error instanceof Error ? error.message : "Could not join this community.")
    } finally {
      setBusyGroup("")
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    go(`/explore?q=${encodeURIComponent(search)}`)
  }
  const openCreatePost = () => setCreatePostOpen(true)

  return (
    <div className="home-page">
      <section className="home-hero relative min-h-[590px] overflow-hidden bg-[#142B49] text-white">
        <img
          src={IMG.fort}
          alt="Gwalior Fort overlooking the city"
          className="home-hero-image absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="home-hero-overlay absolute inset-0 bg-gradient-to-r from-[#0b203a]/95 via-[#142B49]/78 to-[#142B49]/20"></div>
        <div className="hero-pattern absolute inset-0 opacity-20"></div>
        <div className="home-hero-inner relative mx-auto flex min-h-[590px] max-w-[1280px] items-center px-5 py-16 lg:px-6">
          <div className="home-hero-copy max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.14em] backdrop-blur">
              <Icon name="location" size={13} className="text-orange-400" />
              Gwalior’s own digital community
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-[-.05em] sm:text-6xl lg:text-7xl">
              Gwalior ki har baat,
              <br />
              <span className="text-orange-400">ab ek jagah!</span>
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-blue-50/85 sm:text-lg">
              Connect with Gwalior people, discover local places, explore
              opportunities and become part of your city’s growing community.
            </p>
            <form
              onSubmit={submit}
              className="mt-8 flex max-w-2xl rounded-2xl bg-white p-2 shadow-2xl shadow-black/20"
            >
              <Icon
                name="search"
                className="ml-3 mt-3 shrink-0 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-900 outline-none"
                placeholder="Search people, places, businesses, events..."
              />
              <Button type="submit" className="hidden sm:inline-flex">
                Search Gwalior
              </Button>
              <button
                type="submit"
                className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 sm:hidden"
              >
                <Icon name="search" />
              </button>
            </form>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => go(profile ? "/community" : "/register")} className="px-6">
                {profile ? "Open community" : "Join GwaliorWale"}
              </Button>
              <Button
                variant="white"
                onClick={() => go("/explore")}
                className="px-6"
              >
                Explore Gwalior
              </Button>
            </div>
            <div className="home-hero-stats mt-8 flex flex-wrap gap-x-7 gap-y-3 text-xs text-blue-100/80">
              {[
                ["12K+", "Community members"],
                ["840+", "Local businesses"],
                ["2.4K", "Helpful conversations"],
              ].map(([n, l]) => (
                <div key={l}>
                  <strong className="block text-lg text-white">{n}</strong>
                  <span>
                    {l} <i className="font-normal">(illustrative)</i>
                  </span>
                </div>
              ))}
            </div>
            <div className="home-hero-highlights" aria-label="What you can do on GwaliorWale">
              <span><Icon name="verified" size={15} /> Made for Gwalior</span>
              <span><Icon name="people" size={15} /> Meet your local community</span>
              <span><Icon name="compass" size={15} /> Find places and opportunities</span>
            </div>
          </div>
        </div>
        <span className="home-hero-credit absolute bottom-4 right-5 rounded bg-black/35 px-2 py-1 text-[9px] text-white/70 backdrop-blur">
          Gwalior Fort · Photo by Chirag Vashist / Unsplash
        </span>
      </section>

      <section className="home-mobile-shortcuts" aria-label="Quick links">
        {[
          { title: "People", icon: "people" as const, color: "bg-blue-600", href: "/community" },
          { title: "Places", icon: "location" as const, color: "bg-orange-500", href: "/explore" },
          { title: "Businesses", icon: "shop" as const, color: "bg-violet-600", href: "/businesses" },
          { title: "Events", icon: "calendar" as const, color: "bg-orange-500", href: "/events" },
        ].map((item) => (
          <button key={item.title} onClick={() => go(item.href)} className="home-mobile-shortcut">
            <span className={item.color}><Icon name={item.icon} size={20} /></span>
            <strong>{item.title}</strong>
          </button>
        ))}
      </section>

      <section className="home-mobile-categories" aria-label="Explore Gwalior categories">
        <div className="home-mobile-category-rail">
          {categories.map((category) => (
            <button key={category.title} onClick={() => go(category.href)} className="home-mobile-category">
              <span className={category.color}><Icon name={category.icon} size={18} /></span>
              <span className="home-mobile-category-copy">
                <strong>{category.title}</strong>
                <small>{category.desc}</small>
              </span>
              <Icon name="chevron" size={15} className="home-mobile-category-chevron" />
            </button>
          ))}
        </div>
      </section>

      <section className="home-mobile-trending" aria-label="Trending in Gwalior">
        <div className="home-mobile-section-heading">
          <h2>Trending in Gwalior <span aria-hidden="true">🔥</span></h2>
          <button onClick={() => go("/trending")}>See all <Icon name="chevron" size={14} /></button>
        </div>
        <div className="home-mobile-trending-rail">
          {[places[0], places[1], places[3]].map((place) => (
            <button key={place.id} onClick={() => go(`/explore/${place.id}`)} className="home-mobile-trending-card">
              <img src={place.image} alt="" loading="lazy" />
              <span className="home-mobile-trending-shade" />
              <span className="home-mobile-trending-copy">
                <strong>{place.name}</strong>
                <small>{place.type}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="home-discovery section">
        <SectionTitle
          eyebrow="Everything local"
          title="One city. Endless possibilities."
          description="Find your people, your next favourite place and your next opportunity."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => (
            <button
              key={c.title}
              onClick={() => go(c.href)}
              className="category-card"
            >
              <span
                className={`grid h-11 w-11 place-items-center rounded-xl ${c.color}`}
              >
                <Icon name={c.icon} />
              </span>
              <h3 className="mt-4 text-sm font-extrabold text-slate-900">
                {c.title}
              </h3>
              <p className="mt-1 text-[11px] text-slate-500">{c.desc}</p>
              <Icon
                name="chevron"
                size={14}
                className="absolute right-3 top-3 text-slate-300"
              />
            </button>
          ))}
        </div>
      </section>

      <section className="home-feed bg-[#f7f8fa] py-16">
        <div className="section py-0">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_330px]">
            <div>
              <SectionTitle
                eyebrow="Community feed"
                title="Gwalior is talking"
                action="View community"
                onAction={() => go("/community")}
              />
              <button
                onClick={openCreatePost}
                className="card mb-4 flex w-full items-center gap-3 p-4 text-left"
              >
                <Avatar text={profile ? getInitials(profile.full_name) : "YOU"} imageUrl={profile?.avatar_url} />
                <span className="flex-1 rounded-full bg-slate-50 px-4 py-3 text-xs text-slate-400">
                  {profile ? `Share something, ${profile.full_name.split(" ")[0]}...` : "Share something with Gwalior..."}
                </span>
                <span className="hidden items-center gap-1 text-xs font-bold text-blue-600 sm:flex">
                  <Icon name="image" size={16} />
                  Photo
                </span>
              </button>
              <div className="space-y-4">
                {homePostsError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{homePostsError}</p>}
                {homePostsLoading && !homePosts.length ? (
                  <p className="py-8 text-center text-sm text-slate-500">Loading community posts...</p>
                ) : homePosts.length ? (
                  homePosts.map((p) => <PostCard key={p.id} post={p} feedContext={homePosts} homeFeed categoryLabel="Discussion" />)
                ) : (
                  <p className="py-8 text-center text-sm text-slate-500">No posts yet. Start the conversation in your community.</p>
                )}
              </div>
            </div>
            <aside className="space-y-5">
              <TrendingCard />
              <div className="card p-5">
                <h3 className="text-sm font-extrabold">Popular communities</h3>
                <div className="mt-4 space-y-4">
                  {popularGroupsLoading ? (
                    <p className="py-2 text-xs text-slate-500">Loading communities...</p>
                  ) : popularGroupsError ? (
                    <p role="alert" className="py-2 text-xs text-red-600">{popularGroupsError}</p>
                  ) : popularGroups.length ? (
                    popularGroups.map((group) => (
                      <div key={group.id} className="flex items-center gap-3">
                        <Avatar text={getInitials(group.name)} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-bold">{group.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(group.member_count)} {group.member_count === 1 ? "member" : "members"}
                          </div>
                        </div>
                        <button
                          disabled={group.joined_by_me || busyGroup === group.id}
                          onClick={() => void joinPopularGroup(group)}
                          className="text-[10px] font-extrabold text-blue-600 disabled:cursor-default disabled:text-slate-400"
                        >
                          {group.joined_by_me ? "Joined" : busyGroup === group.id ? "Joining..." : "Join"}
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="py-2 text-xs text-slate-500">No active communities yet.</p>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {createPostOpen && (
        <CreatePostPage
          loggedIn={loggedIn}
          profile={profile}
          modal
          onClose={() => setCreatePostOpen(false)}
          onPublished={() => setHomePosts((posts) => posts.slice(0, 4))}
        />
      )}
      <section className="home-guides section">
        <SectionTitle
          eyebrow="City guide"
          title="Discover Gwalior"
          description="Landmarks, local flavours and experiences worth stepping out for."
          action="View all places"
          onAction={() => go("/explore")}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {places.map((p) => (
            <PlaceCard key={p.id} place={p} />
          ))}
        </div>
      </section>
      <section className="home-business bg-[#f7f8fa] py-16">
        <div className="section py-0">
          <SectionTitle
            eyebrow="Support local"
            title="Businesses Gwalior loves"
            description="Discover trusted neighbourhood businesses and homegrown brands."
            action="Browse directory"
            onAction={() => go("/businesses")}
          />
          <div className="grid gap-4 md:grid-cols-3">
            {businesses.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-5 rounded-2xl bg-[#142B49] p-7 text-white sm:flex-row">
            <div>
              <h3 className="text-xl font-extrabold">
                Own a business in Gwalior?
              </h3>
              <p className="mt-1 text-sm text-blue-100/70">
                Get discovered by thousands of local customers.
              </p>
            </div>
            <Button variant="white" onClick={() => go("/list-business")}>
              List your business
            </Button>
          </div>
        </div>
      </section>
      <section className="home-opportunities section">
        <div className="grid gap-14 lg:grid-cols-2">
          <div>
            <SectionTitle
              eyebrow="Jobs & opportunities"
              title="Build your career in Gwalior"
              action="All jobs"
              onAction={() => go("/jobs")}
            />
            <JobHighlights />
          </div>
          <div>
            <SectionTitle
              eyebrow="What’s on"
              title="Upcoming events"
              action="All events"
              onAction={() => go("/events")}
            />
            <div className="space-y-3">
              {events.slice(0, 3).map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="home-callout section">
        <div className="relative overflow-hidden rounded-3xl bg-blue-600 px-6 py-14 text-center text-white sm:px-12">
          <div className="hero-pattern absolute inset-0 opacity-20"></div>
          <div className="relative">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
              <Icon name="people" size={24} />
            </div>
            <h2 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Your City. Your People. Your Community.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-blue-100">
              Join thousands of people building a stronger and more connected
              Gwalior.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button variant="white" onClick={() => go("/register")}>
                Join GwaliorWale
              </Button>
              <Button
                onClick={() => go("/community")}
                className="border border-white/30 bg-transparent shadow-none hover:bg-white/10"
              >
                Explore community
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function TrendingCard() {
  const [topics, setTopics] = useState<TrendingTopic[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    getTrendingTopics("24h", undefined, 5)
      .then((rows) => {
        if (active) setTopics(rows)
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load trending topics.")
      })
    return () => { active = false }
  }, [])

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold">Trending in Gwalior</h3>
        <span className="rounded-full bg-orange-50 px-2 py-1 text-[8px] font-extrabold uppercase text-orange-600">
          24 hours
        </span>
      </div>
      <div className="mt-3 divide-y divide-slate-100">
        {topics.map((topic, i) => (
          <button
            key={topic.topic}
            onClick={() => go(`/trending?category=${encodeURIComponent(topic.category)}`)}
            className="flex w-full items-start gap-3 py-3 text-left"
          >
            <span className="text-xs font-black text-slate-300">0{i + 1}</span>
            <span className="flex-1 text-xs font-bold leading-5 text-slate-700">
              {topic.topic}
              <small className="mt-1 block font-medium text-slate-400">
                {topic.discussion_count} discussions · {topic.growth_percent > 0 ? `↑ ${topic.growth_percent}%` : "steady"}
              </small>
            </span>
            <Icon name="chevron" size={13} className="mt-1 text-slate-300" />
          </button>
        ))}
        {!topics.length && !error && (
          <p className="py-4 text-xs leading-5 text-slate-500">Not enough recent activity to show reliable trends yet.</p>
        )}
        {error && <p role="alert" className="py-3 text-xs text-red-600">{error}</p>}
      </div>
      <button onClick={() => go("/trending")} className="mt-3 text-[10px] font-extrabold text-blue-600">View trending topics</button>
    </div>
  )
}

function TrendingPage() {
  const searchParams = new URLSearchParams(window.location.search)
  const [period, setPeriod] = useState<"2h" | "24h" | "7d">("24h")
  const [category, setCategory] = useState(searchParams.get("category") ?? "")
  const [topics, setTopics] = useState<TrendingTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    setLoading(true)
    setError("")
    getTrendingTopics(period, category || undefined, 30)
      .then((rows) => {
        if (active) setTopics(rows)
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load trending topics.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [period, category])

  return (
    <>
      <PageHero
        eyebrow="Live discovery"
        title="Trending in Gwalior"
        description="Topics ranked by recent discussions, interaction growth, unique contributors, engagement and freshness. Trends appear only when there is enough real activity."
      >
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="search-field">
            <Icon name="filter" size={16} />
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none">
              <option value="">All categories</option>
              <option>Community</option>
              <option>Food & Lifestyle</option>
              <option>Jobs & Careers</option>
              <option>Explore Gwalior</option>
              <option>Local Business</option>
            </select>
          </label>
          <div className="flex rounded-xl border border-slate-200 bg-white p-1">
            {([
              ["2h", "2 hours"],
              ["24h", "24 hours"],
              ["7d", "7 days"],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPeriod(id)}
                className={`rounded-lg px-3 py-2 text-[10px] font-bold ${period === id ? "bg-[#142B49] text-white" : "text-slate-500"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </PageHero>
      <main className="section max-w-[900px]">
        {error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
        ) : loading ? (
          <p className="py-12 text-center text-sm text-slate-500">Calculating current Gwalior trends...</p>
        ) : topics.length ? (
          <div className="space-y-3">
            {topics.map((topic, index) => (
              <article key={topic.topic} className="card flex items-start gap-4 p-4 sm:p-5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-50 text-sm font-black text-orange-600">#{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="eyebrow">{topic.category}</p>
                  <h2 className="mt-1 text-sm font-extrabold text-slate-900">{topic.topic}</h2>
                  <p className="mt-2 text-[10px] text-slate-500">
                    {topic.discussion_count} discussions · {topic.contributor_count} contributors · {topic.interaction_count} interactions
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`text-xs font-extrabold ${topic.growth_percent > 0 ? "text-emerald-600" : "text-slate-500"}`}>
                    {topic.growth_percent > 0 ? `↑ ${topic.growth_percent}%` : "Steady"}
                  </span>
                  <p className="mt-1 text-[9px] text-slate-400">{formatPostTime(topic.last_activity_at)} ago</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Not enough activity yet"
            text="Trends appear after several different people start discussing the same topic. No sample trends or made-up counts are shown."
            action="Explore community"
            onAction={() => go("/community")}
          />
        )}
      </main>
    </>
  )
}
function PlaceCard({ place }: { place: typeof places[0] }) {
  return (
    <button
      onClick={() => go(`/explore/${place.id}`)}
      className="group overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-slate-200"
    >
      <div className="relative h-52 overflow-hidden">
        <img
          src={place.image}
          alt={place.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-extrabold backdrop-blur">
          <Icon
            name="star"
            size={11}
            className="fill-orange-400 text-orange-400"
          />
          {place.rating}
        </span>
      </div>
      <div className="p-4">
        <div className="text-[9px] font-extrabold uppercase tracking-wider text-blue-600">
          {place.type}
        </div>
        <h3 className="mt-1 text-base font-extrabold">{place.name}</h3>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
          <Icon name="location" size={12} />
          {place.area}
        </p>
      </div>
    </button>
  )
}
function BusinessCard({ business }: { business: typeof businesses[0] }) {
  return (
    <article className="card overflow-hidden">
      <button
        onClick={() => go(`/business/${business.id}`)}
        className="block h-44 w-full overflow-hidden"
      >
        <img
          src={business.image}
          alt={business.name}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
        />
      </button>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-600">
              {business.type}
            </span>
            <button
              onClick={() => go(`/business/${business.id}`)}
              className="mt-1 block text-left text-lg font-extrabold"
            >
              {business.name}
            </button>
          </div>
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
            <Icon name="star" size={10} className="fill-emerald-600" />
            {business.rating}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
          {business.desc}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <Icon name="location" size={12} />
            {business.area}
          </span>
          <button
            onClick={() => go(`/business/${business.id}`)}
            className="text-xs font-extrabold text-blue-600"
          >
            View profile
          </button>
        </div>
      </div>
    </article>
  )
}
function EventRow({ event }: { event: typeof events[0] }) {
  return (
    <button
      onClick={() => go(`/events/${event.id}`)}
      className="card flex w-full gap-4 p-3 text-left"
    >
      <img
        src={event.image}
        alt=""
        className="h-20 w-20 shrink-0 rounded-xl object-cover"
      />
      <div className="min-w-0 flex-1 py-1">
        <span className="text-[9px] font-extrabold tracking-wider text-orange-600">
          {event.date}
        </span>
        <h3 className="mt-1 line-clamp-2 text-sm font-extrabold leading-5">
          {event.title}
        </h3>
        <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
          <Icon name="location" size={11} />
          {event.venue} · {event.time}
        </p>
      </div>
      <Icon name="chevron" size={15} className="my-auto text-slate-300" />
    </button>
  )
}
function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <section className="page-hero border-b border-slate-200 bg-[#f7f8fa]">
      <div className="page-hero-inner mx-auto max-w-[1280px] px-5 py-10 lg:px-6 lg:py-14">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-.04em] text-[#172033] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          {description}
        </p>
        {children}
      </div>
    </section>
  )
}

function RecommendedGroups() {
  const [groups, setGroups] = useState<RecommendedCommunityGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [busyGroup, setBusyGroup] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    getRecommendedCommunityGroups()
      .then((rows) => {
        if (active) setGroups(rows)
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load recommended groups.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const toggleMembership = async (group: RecommendedCommunityGroup) => {
    setBusyGroup(group.id)
    setError("")
    try {
      await toggleCommunityGroupMembership(group.id, group.joined_by_me)
      setGroups((current) => current.map((item) => item.id === group.id
        ? {
            ...item,
            joined_by_me: !item.joined_by_me,
            member_count: item.member_count + (item.joined_by_me ? -1 : 1),
          }
        : item))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update group membership.")
    } finally {
      setBusyGroup("")
    }
  }

  return (
    <section className="community-recommended-groups card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow">Find your people</div>
          <h2 className="mt-1 text-sm font-extrabold">Recommended groups</h2>
        </div>
        <Icon name="people" size={18} className="text-blue-600" />
      </div>
      {loading ? (
        <p className="mt-4 text-xs text-slate-500">Finding groups for your interests...</p>
      ) : groups.length ? (
        <div className="mt-4 space-y-3">
          {groups.map((group) => (
            <article key={group.id} className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-xs font-extrabold text-slate-800">{group.name}</h3>
                  <p className="mt-1 text-[10px] leading-5 text-slate-500">{group.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void toggleMembership(group)}
                  disabled={busyGroup === group.id}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[9px] font-bold disabled:opacity-50 ${
                    group.joined_by_me ? "bg-slate-100 text-slate-600" : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {busyGroup === group.id ? "..." : group.joined_by_me ? "Joined" : "Join"}
                </button>
              </div>
              {group.matching_interests.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {group.matching_interests.map((interest) => (
                    <span key={interest} className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-700">{interest}</span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-[9px] text-slate-400">{group.member_count} {group.member_count === 1 ? "member" : "members"}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-xs text-slate-500">No groups to recommend yet.</p>
      )}
      {error && <p role="alert" className="mt-3 text-[10px] text-red-600">{error}</p>}
    </section>
  )
}

function CreateCommunityForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void
  onCreated: (name: string) => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [interestTags, setInterestTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError("")
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!sessionData.session) {
        go("/login")
        return
      }

      await createCommunityGroup({ name, description, interestTags })
      onCreated(name.trim())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create the community.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="card mb-6 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold">Create a community</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Start a group for people in Gwalior to connect and share.
          </p>
        </div>
        <button type="button" onClick={onCancel} className="text-xs font-bold text-slate-500 hover:text-slate-800">
          Cancel
        </button>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">Community name</span>
          <input
            required
            minLength={3}
            maxLength={60}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="input"
            placeholder="e.g. Gwalior Cycling Club"
          />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">Description</span>
          <textarea
            required
            minLength={10}
            maxLength={300}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="input min-h-24 resize-y"
            placeholder="What is this community about?"
          />
          <span className="mt-1 block text-right text-[10px] text-slate-400">{description.length}/300</span>
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">Topics (optional, up to 3)</span>
          <select
            value=""
            disabled={interestTags.length >= 3}
            onChange={(event) => {
              const tag = event.target.value
              if (tag && !interestTags.includes(tag)) setInterestTags((current) => [...current, tag])
            }}
            className="input"
          >
            <option value="">Choose a topic</option>
            {ALL_INTERESTS.filter((tag) => !interestTags.includes(tag)).map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
          {interestTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {interestTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setInterestTags((current) => current.filter((item) => item !== tag))}
                  className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold text-blue-700"
                  aria-label={`Remove ${tag} topic`}
                >
                  {tag} ×
                </button>
              ))}
            </div>
          )}
        </label>
      </div>
      {error && <p role="alert" className="mt-3 text-xs text-red-600">{error}</p>}
      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? "Creating..." : "Create community"}
        </Button>
      </div>
    </form>
  )
}

function CommunityPage({ profile, loggedIn }: { profile: UserIdentity | null; loggedIn: boolean }) {
  const pageSize = 20
  const [filter, setFilter] = useState<"for_you" | "following" | "latest" | "trending">("for_you"),
    [query, setQuery] = useState("")
  const [createPostOpen, setCreatePostOpen] = useState(false)
  const [creatingCommunity, setCreatingCommunity] = useState(false)
  const [communityMessage, setCommunityMessage] = useState("")
  const [feedPosts, setFeedPosts] = useState<Post[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [feedError, setFeedError] = useState("")
  const [feedRevision, setFeedRevision] = useState(0)
  const [resettingPreferences, setResettingPreferences] = useState(false)
  const [preferenceMessage, setPreferenceMessage] = useState("")
  const requestId = useRef(0)
  const openCreatePost = () => setCreatePostOpen(true)

  useEffect(() => {
    const refreshFeed = () => setFeedRevision((revision) => revision + 1)
    window.addEventListener("gwalior:feed-preferences-changed", refreshFeed)
    return () => window.removeEventListener("gwalior:feed-preferences-changed", refreshFeed)
  }, [])

  useEffect(() => {
    let active = true
    const currentRequestId = ++requestId.current
    setLoadingPosts(true)
    setLoadingMore(false)
    setFeedError("")
    setFeedPosts([])
    setHasMore(false)
    getPersonalizedCommunityPosts(filter, pageSize, 0)
      .then((rows) => {
        if (!active || currentRequestId !== requestId.current) return
        setHasMore(rows.length === pageSize)
        setFeedPosts(rows.map(mapCommunityPost))
      })
      .catch((error: unknown) => {
        if (active && currentRequestId === requestId.current) setFeedError(error instanceof Error ? error.message : "Could not load community posts.")
      })
      .finally(() => {
        if (active && currentRequestId === requestId.current) setLoadingPosts(false)
      })

    return () => { active = false }
  }, [filter, feedRevision])

  const loadMorePosts = async () => {
    const currentRequestId = requestId.current
    setLoadingMore(true)
    setFeedError("")
    try {
      const rows = await getPersonalizedCommunityPosts(filter, pageSize, feedPosts.length)
      if (currentRequestId !== requestId.current) return
      setFeedPosts((current) => [...current, ...rows.map(mapCommunityPost)])
      setHasMore(rows.length === pageSize)
    } catch (error) {
      if (currentRequestId === requestId.current) setFeedError(error instanceof Error ? error.message : "Could not load more community posts.")
    } finally {
      if (currentRequestId === requestId.current) setLoadingMore(false)
    }
  }

  const resetFeedPreferences = async () => {
    setResettingPreferences(true)
    setPreferenceMessage("")
    try {
      await resetInterestFeedback()
      setPreferenceMessage("Feed feedback reset. Your selected profile interests are unchanged.")
      window.dispatchEvent(new Event("gwalior:feed-preferences-changed"))
    } catch (error) {
      setPreferenceMessage(error instanceof Error ? error.message : "Could not reset feed preferences.")
    } finally {
      setResettingPreferences(false)
    }
  }

  const shown = feedPosts.filter((p) => p.text.toLowerCase().includes(query.toLowerCase()))
  const feedTabs = [
    { id: "for_you", label: "For You" },
    { id: "following", label: "Following" },
    { id: "latest", label: "Latest" },
    { id: "trending", label: "Trending" },
  ] as const
  return (
    <>
      <div className="community-desktop">
      <PageHero
        eyebrow="The local conversation"
        title="Community"
        description="Ask questions, share recommendations and connect with people across Gwalior."
      >
        <div className="community-hero-actions mt-6 flex max-w-xl flex-wrap gap-2">
          <label className="community-search search-field min-w-[180px] flex-1">
            <Icon name="search" size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search community posts..."
            />
          </label>
          <Button onClick={openCreatePost}>
            <Icon name="plus" size={16} />
            Create post
          </Button>
          <Button
            variant="white"
            onClick={() => {
              setCommunityMessage("")
              setCreatingCommunity((open) => !open)
            }}
          >
            <Icon name="people" size={16} />
            Create community
          </Button>
        </div>
      </PageHero>
      <main className="community-main section">
        {creatingCommunity && (
          <CreateCommunityForm
            onCancel={() => setCreatingCommunity(false)}
            onCreated={(name) => {
              setCreatingCommunity(false)
              setCommunityMessage(`${name} created. You’ve joined the community and can now post in it.`)
            }}
          />
        )}
        {communityMessage && (
          <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {communityMessage}
          </p>
        )}
        <div className="community-layout grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
          <aside className="community-topics-sidebar hidden lg:block">
            <div className="card sticky top-24 p-3">
              <div className="px-3 py-2 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                Browse topics
              </div>
              {categories.slice(0, 8).map((c) => (
                <button
                  key={c.title}
                  onClick={() => setQuery(c.title)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  <Icon name={c.icon} size={16} />
                  {c.title}
                </button>
              ))}
            </div>
          </aside>
          <div className="community-feed-column">
            <button
              onClick={openCreatePost}
              className="community-composer card mb-4 flex w-full items-center gap-3 p-4 text-left"
            >
              <Avatar text={profile ? getInitials(profile.full_name) : "YOU"} imageUrl={profile?.avatar_url} />
              <span className="flex-1 rounded-full bg-slate-50 px-4 py-3 text-xs text-slate-400">
                {profile ? `Share something, ${profile.full_name.split(" ")[0]}...` : "What’s happening in Gwalior?"}
              </span>
            </button>
            <div className="community-feed-tabs mb-4 grid grid-cols-4 gap-1 rounded-xl border border-slate-200 bg-white p-1">
              {feedTabs.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold ${
                    filter === id ? "bg-[#142B49] text-white" : "text-slate-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mb-4 flex items-center justify-between gap-2">
              <span role="status" className="text-[10px] text-slate-500">{preferenceMessage}</span>
              <button
                type="button"
                onClick={() => void resetFeedPreferences()}
                disabled={resettingPreferences}
                className="shrink-0 text-[10px] font-bold text-slate-500 hover:text-blue-700 disabled:opacity-50"
              >
                {resettingPreferences ? "Resetting..." : "Reset feed feedback"}
              </button>
            </div>
            <div className="mb-5">
              <RecommendedGroups />
            </div>
            <div className="space-y-4">
              {feedError ? (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{feedError}</p>
              ) : loadingPosts ? (
                <p className="py-8 text-center text-sm text-slate-500">Loading community posts...</p>
              ) : shown.length ? (
                shown.map((p) => <PostCard key={p.id} post={p} feedContext={shown} />)
              ) : (
                <EmptyState
                  title={query ? "No conversations found" : filter === "following" ? "No posts from followed people yet" : "No community posts yet"}
                  text={query ? "Try a different search or start the first discussion." : filter === "following" ? "Follow local people and creators to see their posts here." : "Be the first to share something with Gwalior."}
                  action="Create post"
                  onAction={openCreatePost}
                />
              )}
              {!feedError && !loadingPosts && hasMore && (
                <button
                  type="button"
                  onClick={() => void loadMorePosts()}
                  disabled={loadingMore}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  {loadingMore ? "Loading posts..." : "Load more posts"}
                </button>
              )}
            </div>
          </div>
          <aside className="community-context-sidebar hidden space-y-5 lg:block">
            <TrendingCard />
            <div className="card p-5">
              <h3 className="text-sm font-extrabold">Coming up</h3>
              <div className="mt-3">
                <EventRow event={events[0]} />
              </div>
            </div>
          </aside>
        </div>
      </main>
      </div>
      <CommunityMobile
        posts={withUniversalPosts(defaultPosts, feedPosts)}
        loading={loadingPosts}
        error={feedError}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={() => void loadMorePosts()}
        onBack={() => window.history.back()}
        onTabChange={(tab: CommunityMobileTab) => setFilter(tab === "people" ? "following" : "for_you")}
        selectedInterests={profile?.interests ?? []}
        selectedArea={profile?.city}
        renderPost={(post, tab) => (
          <PostCard
            post={post}
            feedContext={withUniversalPosts(defaultPosts, feedPosts)}
            categoryLabel={tab === "discussions" && post.postType === "Discussion" ? "Discussion" : undefined}
          />
        )}
      />
      {createPostOpen && (
        <CreatePostPage
          loggedIn={loggedIn}
          profile={profile}
          modal
          onClose={() => setCreatePostOpen(false)}
          onPublished={() => setFeedRevision((revision) => revision + 1)}
        />
      )}
    </>
  )
}

function CommentThread({
  comment,
  allComments,
  canComment,
  onRefresh,
  depth = 0,
}: {
  comment: PostComment
  allComments: PostComment[]
  canComment: boolean
  onRefresh: () => Promise<void>
  depth?: number
}) {
  const [reply, setReply] = useState("")
  const [replying, setReplying] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [liked, setLiked] = useState(comment.liked_by_me)
  const [likes, setLikes] = useState(Number(comment.likes_count))

  useEffect(() => {
    setLiked(comment.liked_by_me)
    setLikes(Number(comment.likes_count))
  }, [comment.liked_by_me, comment.likes_count])

  const submitReply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!reply.trim()) return
    setBusy(true)
    setError("")
    try {
      await addPostComment(comment.post_id, reply, comment.id)
      setReply("")
      setReplying(false)
      await onRefresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add your reply.")
    } finally {
      setBusy(false)
    }
  }

  const handleLike = async () => {
    if (!canComment) {
      go("/login")
      return
    }
    setBusy(true)
    setError("")
    try {
      await toggleCommentLike(comment.id, liked)
      setLiked(!liked)
      setLikes((count) => count + (liked ? -1 : 1))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update comment like.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4" style={{ marginLeft: `${Math.min(depth, 4) * 18}px` }}>
      <div className="flex gap-3">
        <button type="button" onClick={() => go(`/profile/${encodeURIComponent(comment.author_username)}`)}>
          <Avatar text={getInitials(comment.author_full_name || "Community member")} imageUrl={comment.author_avatar_url} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-extrabold">
            <button type="button" onClick={() => go(`/profile/${encodeURIComponent(comment.author_username)}`)} className="hover:text-blue-700">
              {comment.author_full_name || "Community member"}
            </button>
            <span className="ml-2 font-medium text-slate-400">
              <button type="button" onClick={() => go(`/profile/${encodeURIComponent(comment.author_username)}`)} className="hover:text-blue-700">
                @{comment.author_username}
              </button> · {formatPostTime(comment.created_at)} ago
            </span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{comment.content}</p>
          <div className="mt-2 flex items-center gap-4">
            <button disabled={busy} onClick={() => void handleLike()} className={`text-[10px] font-bold ${liked ? "text-red-500" : "text-slate-500"}`}>
              {liked ? "Liked" : "Like"} · {likes}
            </button>
            <button onClick={() => canComment ? setReplying(!replying) : go("/login")} className="text-[10px] font-bold text-slate-500">
              Reply
            </button>
          </div>
          {replying && (
            <form onSubmit={(event) => void submitReply(event)} className="mt-3 flex gap-2">
              <input autoFocus value={reply} onChange={(event) => setReply(event.target.value)} className="input py-2" placeholder="Write a reply..." />
              <button disabled={busy || !reply.trim()} className="rounded-lg bg-blue-600 px-3 text-xs font-bold text-white disabled:opacity-50">
                Reply
              </button>
            </form>
          )}
          {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      </div>
      {allComments
        .filter((child) => child.parent_comment_id === comment.id)
        .map((child) => (
          <CommentThread
            key={child.id}
            comment={child}
            allComments={allComments}
            canComment={canComment}
            onRefresh={onRefresh}
            depth={depth + 1}
          />
        ))}
    </div>
  )
}

function PostDetail({ id, returnTo }: { id: string; returnTo?: string }) {
  const [navigation] = useState(() => getPostNavigationState(id))
  const initialPost = navigation.post ?? posts.find((item) => item.id === id) ?? null
  const initialContext = navigation.feedPosts.length ? navigation.feedPosts : initialPost ? [initialPost] : []
  const initialIndex = initialContext.findIndex((item) => item.id === id)
  const initialWindow = initialIndex >= 0
    ? initialContext.slice(Math.max(0, initialIndex - 1), initialIndex + 2)
    : initialPost ? [initialPost] : []
  const [post, setPost] = useState<Post | null>(initialPost)
  const [feedPosts, setFeedPosts] = useState<Post[]>(initialWindow)
  const [comments, setComments] = useState<PostComment[]>([])
  const [commentsPost, setCommentsPost] = useState<Post | null>(null)
  const [comment, setComment] = useState("")
  const [commenter, setCommenter] = useState<UserIdentity | null>(null)
  const [loading, setLoading] = useState(!initialPost)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [feedOffset, setFeedOffset] = useState(0)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentsClosing, setCommentsClosing] = useState(false)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [error, setError] = useState("")
  const selectedPostRef = useRef<HTMLDivElement>(null)
  const selectedPostCentered = useRef(false)
  const isDatabasePost = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

  const refreshComments = async (targetPost = commentsPost) => {
    if (!targetPost || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetPost.id)) return
    const nextComments = await getPostComments(targetPost.id)
    setComments(nextComments)
    setCommentsPost((current) => current?.id === targetPost.id ? { ...current, comments: nextComments.length } : current)
    setFeedPosts((current) => current.map((item) => item.id === targetPost.id ? { ...item, comments: nextComments.length } : item))
    setPost((current) => current?.id === targetPost.id ? { ...current, comments: nextComments.length } : current)
  }

  useEffect(() => {
    let active = true
    const selectedFromNavigation = navigation.post
    const navigationContext = navigation.feedPosts
    if (selectedFromNavigation) {
      setPost(selectedFromNavigation)
      setFeedPosts(initialWindow)
      setLoading(false)
    }

    const loadFeed = async (selected = initialPost) => {
      try {
        const rows = await getPersonalizedCommunityPosts("latest", 12, 0)
        if (!active) return
        const fetched = rows.map(mapCommunityPost)
        const pinned = initialWindow.length
          ? initialWindow.map((item) => item.id === id && selected ? selected : item)
          : selected ? [selected] : []
        const merged = [...pinned, ...navigationContext, ...fetched]
        const seen = new Set<string>()
        const unique = merged.filter((item) => {
          if (seen.has(item.id)) return false
          seen.add(item.id)
          return true
        })
        setFeedPosts(unique)
        setFeedOffset(rows.length)
        setHasMore(rows.length === 12)
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load more community posts.")
      }
    }

    const loadSelectedPost = async (): Promise<Post | null> => {
      if (!isDatabasePost) return initialPost
      try {
        const row = await getCommunityPost(id)
        if (!active) return null
        if (row) {
          const freshPost = mapCommunityPost(row)
          setPost(freshPost)
          setFeedPosts((current) => current.map((item) => item.id === id ? freshPost : item))
          return freshPost
        } else if (!initialPost) {
          setError("This post could not be found.")
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load this post.")
      } finally {
        if (active) setLoading(false)
      }
      return initialPost
    }

    const loadCommenter = async () => {
      try {
        const user = await getCurrentUser()
        if (!active || !user) return
        const profile = await getOwnProfile(user.id)
        if (active) setCommenter({ full_name: profile.full_name, username: profile.username, avatar_url: profile.avatar_url })
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load your profile.")
      }
    }

    if (initialPost) {
      setLoading(false)
      void loadSelectedPost()
      void loadFeed()
    } else {
      void (async () => {
        const selected = await loadSelectedPost()
        if (active) void loadFeed(selected ?? undefined)
      })()
    }
    void loadCommenter()
    return () => { active = false }
  }, [id, isDatabasePost])

  useLayoutEffect(() => {
    if (selectedPostCentered.current || !feedPosts.some((item) => item.id === id)) return
    const selectedElement = selectedPostRef.current
    const scrollContainer = selectedElement?.closest<HTMLElement>(".app-content")
    if (!selectedElement || !scrollContainer) return
    const selectedRect = selectedElement.getBoundingClientRect()
    const containerRect = scrollContainer.getBoundingClientRect()
    const selectedCenter = selectedRect.top + selectedRect.height / 2
    const containerCenter = containerRect.top + scrollContainer.clientHeight / 2
    scrollContainer.scrollTop += selectedCenter - containerCenter
    selectedPostCentered.current = true
  }, [feedPosts, id])

  useEffect(() => {
    if (!commentsOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeComments()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [commentsOpen])

  const closeComments = () => {
    if (commentsClosing) return
    setCommentsClosing(true)
  }

  const finishClosingComments = (event: React.AnimationEvent<HTMLElement>) => {
    if (commentsClosing && event.target === event.currentTarget) {
      setCommentsOpen(false)
      setCommentsClosing(false)
    }
  }

  const loadMorePosts = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    setError("")
    try {
      const rows = await getPersonalizedCommunityPosts("latest", 12, feedOffset)
      const nextPosts = rows.map(mapCommunityPost)
      setFeedPosts((current) => {
        const merged = [...current]
        for (const next of nextPosts) {
          if (!merged.some((item) => item.id === next.id)) merged.push(next)
        }
        return merged
      })
      setFeedOffset((current) => current + rows.length)
      setHasMore(rows.length === 12)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load more community posts.")
    } finally {
      setLoadingMore(false)
    }
  }

  const openComments = async (targetPost: Post) => {
    setCommentsPost(targetPost)
    setComments([])
    setCommentsClosing(false)
    setCommentsOpen(true)
    const targetIsDatabasePost = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetPost.id)
    if (!targetIsDatabasePost) return
    setCommentsLoading(true)
    setError("")
    try {
      await refreshComments(targetPost)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load comments.")
    } finally {
      setCommentsLoading(false)
    }
  }

  const submitComment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!comment.trim()) return
    if (!commenter) {
      go("/login")
      return
    }
    try {
      const targetPost = commentsPost
      if (!targetPost || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetPost.id)) return
      await addPostComment(targetPost.id, comment)
      setComment("")
      await refreshComments(targetPost)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add your comment.")
    }
  }

  const p = post || posts.find((item) => item.id === id) || posts[0]
  return (
    <main className="post-detail-page">
      <header className="post-detail-header">
        <button type="button" onClick={() => go(returnTo || "/community")} aria-label="Back to posts" className="post-detail-back">
          <Icon name="chevron" size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1>Post</h1>
          <p>{p.category}</p>
        </div>
        <button type="button" onClick={() => go("/community")} className="post-detail-community-link">Community</button>
      </header>
      <div className="post-detail-content">
        {loading && <p role="status" className="post-detail-state">Loading post...</p>}
        {error && <p role="alert" className="post-detail-error">{error}</p>}
        <div className="post-detail-feed">
          {!feedPosts.some((item) => item.id === id) && (
            <div className="post-detail-card">
              <PostCard post={p} detailed onOpenComments={() => void openComments(p)} />
            </div>
          )}
          {feedPosts.map((item) => (
            <div
              key={item.id}
              ref={item.id === id ? selectedPostRef : undefined}
              className="post-detail-card"
            >
              <PostCard post={item} detailed={item.id === id} onOpenComments={() => void openComments(item)} />
            </div>
          ))}
          {hasMore && (
            <button type="button" onClick={() => void loadMorePosts()} disabled={loadingMore} className="post-detail-load-more">
              {loadingMore ? "Loading posts..." : "Load older posts"}
            </button>
          )}
        </div>
      </div>
      {commentsOpen && (
        <div className={`post-detail-comments-backdrop${commentsClosing ? " is-closing" : ""}`} onClick={closeComments}>
          <section
            className={`post-detail-comments${commentsClosing ? " is-closing" : ""}`}
            id="post-comments"
            role="dialog"
            aria-modal="true"
            aria-labelledby="post-detail-comments-title"
            onClick={(event) => event.stopPropagation()}
            onAnimationEnd={finishClosingComments}
          >
            <div className="post-detail-comments-heading">
              <h2 id="post-detail-comments-title">Comments <span>{commentsPost?.comments ?? comments.length}</span></h2>
              <button type="button" onClick={closeComments} aria-label="Close comments"><Icon name="close" size={18} /></button>
            </div>
            {commentsLoading ? <p role="status" className="post-detail-comment-status">Loading comments...</p> : null}
            {commenter ? (
              <form onSubmit={(event) => void submitComment(event)} className="post-detail-comment-form">
                <Avatar text={getInitials(commenter.full_name)} imageUrl={commenter.avatar_url} />
                <div className="post-detail-comment-input">
                  <input
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    aria-label="Add a comment"
                    placeholder="Add a comment..."
                  />
                  <button disabled={!comment.trim()} aria-label="Send comment" className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-white disabled:opacity-50">
                    <Icon name="send" size={16} />
                  </button>
                </div>
              </form>
            ) : <button onClick={() => go("/login")} className="post-detail-login">Log in to comment</button>}
            <div className="post-detail-comment-list">
              {comments.filter((item) => !item.parent_comment_id).map((item) => (
                <CommentThread key={item.id} comment={item} allComments={comments} canComment={Boolean(commenter)} onRefresh={() => refreshComments()} />
              ))}
              {!commentsLoading && !comments.length && (
                <div className="post-detail-empty-comments">
                  <span><Icon name="chat" size={18} /></span>
                  <div>
                    <strong>No comments yet</strong>
                    <p>Start a thoughtful conversation with the community.</p>
                  </div>
                </div>
              )}
              {commentsPost && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(commentsPost.id) && <p className="text-xs text-slate-400">This is a sample post. Likes and comments are enabled on published community posts.</p>}
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

function FilterBar({ placeholder }: { placeholder: string }) {
  return (
    <div className="mt-6 flex flex-col gap-2 sm:flex-row">
      <label className="search-field flex-1">
        <Icon name="search" size={17} />
        <input placeholder={placeholder} />
      </label>
      <Button variant="outline">
        <Icon name="filter" size={16} />
        Filters
      </Button>
    </div>
  )
}
function ExplorePage({ detail }: { detail?: string }) {
  if (detail) {
    const p = places.find((x) => x.id === detail) || places[0]
    return (
      <DetailHero
        image={p.image}
        title={p.name}
        kicker={p.type}
        meta={`${p.area} · ★ ${p.rating}`}
      >
        <p>
          One of Gwalior’s most loved destinations, rich with local history,
          architecture and memorable city views.
        </p>
      </DetailHero>
    )
  }
  return (
    <>
      <PageHero
        eyebrow="The city, curated"
        title="Explore Gwalior"
        description="Discover iconic landmarks, favourite cafés, lively markets and hidden corners recommended by locals."
      >
        <FilterBar placeholder="Search places, food, shopping..." />
      </PageHero>
      <main className="section">
        <div className="scrollbar-none mb-8 flex gap-2 overflow-x-auto">
          {[
            "All places",
            "Famous places",
            "Cafés",
            "Street food",
            "Shopping",
            "Parks",
            "Hidden gems",
          ].map((x, i) => (
            <button
              key={x}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${
                i === 0
                  ? "bg-[#142B49] text-white"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              {x}
            </button>
          ))}
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...places, ...places].map((p, i) => (
            <PlaceCard key={p.id + i} place={p} />
          ))}
        </div>
      </main>
    </>
  )
}

function BusinessDirectory() {
  return (
    <>
      <PageHero
        eyebrow="Shop local. Grow local."
        title="Gwalior business directory"
        description="Find trusted restaurants, stores, coaching institutes and professional services near you."
      >
        <FilterBar placeholder="Search businesses or services..." />
      </PageHero>
      <main className="section">
        <div className="mb-8 flex flex-wrap gap-2">
          {[
            "All",
            "Restaurants",
            "Cafés",
            "Shopping",
            "Education",
            "Fitness",
            "Services",
          ].map((x, i) => (
            <button
              key={x}
              className={`rounded-full px-4 py-2 text-xs font-bold ${
                i === 0
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              {x}
            </button>
          ))}
        </div>
        <SectionTitle
          title="Featured local businesses"
          action="List your business"
          onAction={() => go("/list-business")}
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[...businesses, ...businesses].map((b, i) => (
            <BusinessCard key={b.id + i} business={b} />
          ))}
        </div>
      </main>
    </>
  )
}

type MarketplaceListing = MarketplaceListingRecord

const sampleMarketplaceListings: MarketplaceListing[] = [
  {
    id: "sample-phone",
    owner_id: "",
    category: "Mobiles & Electronics",
    listing_type: "sell",
    title: "Smartphone · 128 GB",
    description: "A sample marketplace listing for a smartphone in great condition.",
    price: 12000,
    is_negotiable: true,
    condition: "Good",
    locality: "City Centre",
    image_urls: ["https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=900&q=85"],
    show_seller_profile: false,
    status: "active",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "sample-study-table",
    owner_id: "",
    category: "Furniture & Home",
    listing_type: "sell",
    title: "Solid wood study table",
    description: "A sample listing for a sturdy study table in good condition.",
    price: 2500,
    is_negotiable: true,
    condition: "Good",
    locality: "Thatipur",
    image_urls: ["https://images.unsplash.com/photo-1499933374294-4584851497cc?auto=format&fit=crop&w=900&q=85"],
    show_seller_profile: false,
    status: "active",
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "sample-bicycle",
    owner_id: "",
    category: "Sports & Hobbies",
    listing_type: "sell",
    title: "Mountain bicycle",
    description: "A sample listing for a well-maintained geared bicycle.",
    price: 4500,
    is_negotiable: false,
    condition: "Good",
    locality: "DD Nagar",
    image_urls: ["https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=900&q=85"],
    show_seller_profile: false,
    status: "active",
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "sample-room",
    owner_id: "",
    category: "Property & Rentals",
    listing_type: "rent",
    title: "Bright 1 BHK near University Road",
    description: "A sample rental listing with a convenient Gwalior location.",
    price: 8000,
    is_negotiable: false,
    condition: null,
    locality: "University Road",
    image_urls: ["https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85"],
    show_seller_profile: false,
    status: "active",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "sample-laptop",
    owner_id: "",
    category: "Mobiles & Electronics",
    listing_type: "sell",
    title: "Work laptop · 8 GB RAM",
    description: "Sample listing for a reliable laptop suited to study and everyday work.",
    price: 22000,
    is_negotiable: true,
    condition: "Good",
    locality: "Morar",
    image_urls: ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=85"],
    show_seller_profile: false,
    status: "active",
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "sample-headphones",
    owner_id: "",
    category: "Mobiles & Electronics",
    listing_type: "sell",
    title: "Wireless headphones",
    description: "Sample listing for wireless over-ear headphones in very good condition.",
    price: 1800,
    is_negotiable: false,
    condition: "Like new",
    locality: "Lashkar",
    image_urls: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85"],
    show_seller_profile: false,
    status: "active",
    created_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "sample-sofa",
    owner_id: "",
    category: "Furniture & Home",
    listing_type: "sell",
    title: "Three-seater sofa",
    description: "Sample listing for a comfortable sofa in good condition.",
    price: 12000,
    is_negotiable: true,
    condition: "Good",
    locality: "Phool Bagh",
    image_urls: ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=85"],
    show_seller_profile: false,
    status: "active",
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "sample-dining-table",
    owner_id: "",
    category: "Furniture & Home",
    listing_type: "sell",
    title: "Compact dining table set",
    description: "Sample listing for a dining table set that fits smaller homes.",
    price: 6500,
    is_negotiable: true,
    condition: "Good",
    locality: "Gole Ka Mandir",
    image_urls: ["https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=900&q=85"],
    show_seller_profile: false,
    status: "active",
    created_at: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "sample-scooter",
    owner_id: "",
    category: "Vehicles",
    listing_type: "sell",
    title: "City scooter · 2022",
    description: "Sample listing for a regularly maintained scooter. Please inspect before purchase.",
    price: 62000,
    is_negotiable: true,
    condition: "Good",
    locality: "Thatipur",
    image_urls: ["https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=85"],
    show_seller_profile: false,
    status: "active",
    created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "sample-books",
    owner_id: "",
    category: "Books & Education",
    listing_type: "sell",
    title: "Engineering textbooks bundle",
    description: "Sample listing for a bundle of used engineering textbooks in readable condition.",
    price: 900,
    is_negotiable: false,
    condition: "Good",
    locality: "City Centre",
    image_urls: ["https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=900&q=85"],
    show_seller_profile: false,
    status: "active",
    created_at: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "sample-washing-machine",
    owner_id: "",
    category: "Home Appliances",
    listing_type: "sell",
    title: "Top-load washing machine",
    description: "Sample listing for a working top-load washing machine.",
    price: 7500,
    is_negotiable: true,
    condition: "Good",
    locality: "Govindpuri",
    image_urls: ["https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=900&q=85"],
    show_seller_profile: false,
    status: "active",
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "sample-camera",
    owner_id: "",
    category: "Mobiles & Electronics",
    listing_type: "sell",
    title: "Mirrorless camera with kit lens",
    description: "Sample listing for a compact mirrorless camera with a standard kit lens.",
    price: 34000,
    is_negotiable: true,
    condition: "Like new",
    locality: "Sirol",
    image_urls: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=85"],
    show_seller_profile: false,
    status: "active",
    created_at: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "sample-desk-lamp",
    owner_id: "",
    category: "Furniture & Home",
    listing_type: "sell",
    title: "Adjustable study desk lamp",
    description: "Sample listing for an adjustable desk lamp, ideal for a study table.",
    price: 700,
    is_negotiable: false,
    condition: "New",
    locality: "DD Nagar",
    image_urls: ["https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85"],
    show_seller_profile: false,
    status: "active",
    created_at: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "sample-ac-service",
    owner_id: "",
    category: "Services",
    listing_type: "service",
    title: "AC repair and seasonal servicing",
    description: "Sample listing for local AC repair and routine servicing in Gwalior.",
    price: 500,
    is_negotiable: false,
    condition: null,
    locality: "City Centre",
    image_urls: ["https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=900&q=85"],
    show_seller_profile: false,
    status: "active",
    created_at: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(),
  },
]

const marketplaceCategories = [
  "All",
  "Mobiles & Electronics",
  "Furniture & Home",
  "Vehicles",
  "Property & Rentals",
  "Fashion",
  "Books & Education",
  "Home Appliances",
  "Services",
  "Jobs & Gigs",
  "Sports & Hobbies",
]

function MarketplacePage({ loggedIn }: { loggedIn: boolean }) {
  const [listings, setListings] = useState<MarketplaceListing[]>([])
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All")
  const [favorites, setFavorites] = useState<string[]>([])
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0)
  const [sellerProfile, setSellerProfile] = useState<MarketplaceSellerProfile | null>(null)
  const [sellerProfileLoading, setSellerProfileLoading] = useState(false)
  const [sellerProfileError, setSellerProfileError] = useState("")
  const [postOpen, setPostOpen] = useState(false)
  const [postedMessage, setPostedMessage] = useState("")
  const [myListingsMode, setMyListingsMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState("")
  const [listingsError, setListingsError] = useState("")
  const [viewerId, setViewerId] = useState("")

  const refreshListings = async () => {
    setListingsError("")
    try {
      const rows = myListingsMode
        ? await getMyMarketplaceListings()
        : await getMarketplaceListings()
      setListings(rows)
    } catch (reason) {
      console.error("Could not load marketplace listings:", reason)
      setListings([])
      setListingsError(reason instanceof Error ? reason.message : "Could not load marketplace listings.")
      return
    }
    if (loggedIn) {
      try {
        setFavorites(await getMyMarketplaceFavoriteIds())
      } catch (reason) {
        console.error("Could not load saved marketplace listings:", reason)
        setActionError(reason instanceof Error ? reason.message : "Could not load your saved listings.")
      }
    }
  }

  useEffect(() => {
    void refreshListings()
  }, [loggedIn, myListingsMode])

  useEffect(() => {
    let active = true
    if (!loggedIn) {
      setViewerId("")
      return
    }
    getCurrentUser()
      .then((user) => { if (active) setViewerId(user?.id ?? "") })
      .catch((reason: unknown) => {
        console.error("Could not identify the signed-in marketplace user:", reason)
        if (active) setActionError("Could not verify your account. Please sign in again.")
      })
    return () => { active = false }
  }, [loggedIn])

  useEffect(() => {
    let active = true
    if (!selectedListing?.show_seller_profile) {
      setSellerProfile(null)
      setSellerProfileLoading(false)
      setSellerProfileError("")
      return
    }
    setSellerProfile(null)
    setSellerProfileLoading(true)
    setSellerProfileError("")
    getMarketplacePublicSeller(selectedListing.id)
      .then((profile) => { if (active) setSellerProfile(profile) })
      .catch((reason: unknown) => {
        console.error("Could not load the seller profile they chose to expose:", reason)
        if (active) setSellerProfileError(reason instanceof Error ? reason.message : "Could not load the seller's shared profile.")
      })
      .finally(() => { if (active) setSellerProfileLoading(false) })
    return () => { active = false }
  }, [selectedListing])

  const filteredListings = useMemo(() => {
    const query = search.trim().toLowerCase()
    const matching = listings.filter((listing) => {
      const matchesCategory = category === "All" || listing.category === category
      const matchesSearch = !query || `${listing.title} ${listing.category} ${listing.locality} ${listing.description}`.toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
    return matching
  }, [category, listings, search])

  async function addListing(payload: {
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
    setBusy(true)
    setActionError("")
    try {
      const listing = await publishMarketplaceListing(payload, images)
      setMyListingsMode(false)
      setListings((current) => [listing, ...current])
      setCategory("All")
      setSearch("")
      setPostedMessage("Your ad has been published and is now visible in Gwalior.")
      setPostOpen(false)
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Could not publish your listing."
      console.error("Could not publish marketplace listing:", reason)
      setActionError(message)
    } finally {
      setBusy(false)
    }
  }

  async function toggleSaved(listingId: string) {
    if (!loggedIn) {
      go("/login?next=/buy-sell")
      return
    }
    const saved = favorites.includes(listingId)
    setActionError("")
    try {
      await toggleMarketplaceFavorite(listingId, saved)
      setFavorites((current) => saved
        ? current.filter((id) => id !== listingId)
        : [...current, listingId])
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Could not save this listing."
      console.error("Could not update marketplace favorite:", reason)
      setActionError(message)
    }
  }

  async function chatWithSeller(listing: MarketplaceListing) {
    if (!loggedIn) {
      go("/login?next=/buy-sell")
      return
    }
    setBusy(true)
    setActionError("")
    try {
      const conversationId = await startMarketplaceConversation(listing.id)
      go(`/messages/${conversationId}`)
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Could not start a chat with this seller."
      console.error("Could not start marketplace conversation:", reason)
      setActionError(message)
    } finally {
      setBusy(false)
    }
  }

  async function markAsSold(listing: MarketplaceListing) {
    setActionError("")
    try {
      await updateMarketplaceListingStatus(listing.id, "sold")
      await refreshListings()
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Could not update this listing."
      console.error("Could not mark marketplace listing as sold:", reason)
      setActionError(message)
    }
  }

  function startPostingListing() {
    setPostedMessage("")
    setActionError("")
    if (!loggedIn) go("/login?next=/buy-sell")
    else setPostOpen(true)
  }

  return (
    <div className="marketplace-page">
      <section className="marketplace-hero relative overflow-hidden bg-[#142b49] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(59,130,246,.35),transparent_38%),radial-gradient(circle_at_0%_100%,rgba(245,158,11,.16),transparent_35%)]" />
        <div className="marketplace-hero-inner relative mx-auto max-w-[1280px] px-5 py-10 sm:py-14 lg:px-6 lg:py-16">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="marketplace-hero-copy max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.14em] text-blue-100">
                <Icon name="location" size={14} className="text-orange-400" />
                Gwalior marketplace
              </div>
              <h1 className="mt-4 text-3xl font-extrabold tracking-[-.045em] sm:text-5xl">Buy locally. Sell easily.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100/80">Find great local deals on things you need, or help your pre-loved items find a new home.</p>
            </div>
            <Button onClick={startPostingListing} className="marketplace-hero-post min-h-12 shrink-0 !bg-orange-500 !text-white hover:!bg-orange-600">
              <Icon name="plus" size={17} />
              {loggedIn ? "Post your ad" : "Log in to sell"}
            </Button>
          </div>
          <label className="marketplace-search mt-7 flex min-h-14 max-w-3xl items-center gap-3 rounded-2xl bg-white px-4 text-slate-400 shadow-xl shadow-black/10 focus-within:ring-4 focus-within:ring-blue-300/30">
            <Icon name="search" size={20} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="Search mobiles, furniture, property..."
              aria-label="Search marketplace listings"
            />
            {search && <button type="button" onClick={() => setSearch("")} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Clear search"><Icon name="close" size={17} /></button>}
          </label>
          <div className="marketplace-trust-note mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-blue-100/80">
            <Icon name="verified" size={15} className="text-emerald-300" />
            Local listings, right here in Gwalior
          </div>
        </div>
      </section>

      <main className="marketplace-content mx-auto max-w-[1280px] px-5 py-8 lg:px-6 lg:py-10">
        {postedMessage && <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"><Icon name="check" size={17} />{postedMessage}</div>}
        {actionError && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}
        {listingsError && (
          <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p>Could not load marketplace listings: {listingsError}. Check that the listings are in the connected Supabase project and that its public-read policy is applied.</p>
            <button type="button" onClick={() => void refreshListings()} className="mt-2 font-bold underline">Try again</button>
          </div>
        )}
        <div className="marketplace-private-note mb-6 flex items-center justify-between gap-3">
          <p className="text-xs leading-5 text-slate-500">Seller identity stays private unless the lister chooses to share their profile.</p>
          <button
            onClick={() => {
              if (!loggedIn) go("/login?next=/buy-sell")
              else setMyListingsMode((current) => !current)
            }}
            className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-bold ${myListingsMode ? "border-[#142b49] bg-[#142b49] text-white" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"}`}
          >
            {myListingsMode ? "Browse all listings" : "My listings"}
          </button>
        </div>
        <section className="marketplace-categories" aria-label="Browse marketplace categories">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="eyebrow">Explore the marketplace</div>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[#172033]">Browse categories</h2>
            </div>
            <button onClick={() => setCategory("All")} className="text-xs font-bold text-blue-700 hover:text-blue-900">View all</button>
          </div>
          <div className="marketplace-category-rail scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            {marketplaceCategories.map((item, index) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
                className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-bold transition-colors ${category === item ? "border-[#142b49] bg-[#142b49] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"}`}
              >
                {index === 0 ? "All items" : item}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5" aria-label="Marketplace listings">
          {filteredListings.length ? (
            <div className="marketplace-listing-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredListings.map((listing) => (
                <article key={listing.id} className="marketplace-listing-card group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-900/5">
                  <button onClick={() => { setSelectedPhotoIndex(0); setSelectedListing(listing) }} className="block w-full text-left" aria-label={`View ${listing.title}`}>
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                      <img src={listing.image_urls[0]} alt={listing.title} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                      {listing.condition && <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-extrabold text-slate-700">{listing.condition}</span>}
                      {listing.id.startsWith("sample-") && <span className="absolute right-3 top-3 rounded-full bg-[#142b49]/90 px-2.5 py-1 text-[10px] font-extrabold text-white">Sample</span>}
                      {myListingsMode && <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${listing.status === "sold" ? "bg-slate-800 text-white" : "bg-emerald-100 text-emerald-800"}`}>{listing.status === "sold" ? "Sold" : "Active"}</span>}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-slate-800">{listing.title}</h3>
                        <span className="shrink-0 text-[10px] text-slate-400">{formatPostTime(listing.created_at)}</span>
                      </div>
                      <p className="mt-2 text-xl font-extrabold tracking-tight text-[#142b49]">₹{Number(listing.price).toLocaleString("en-IN")}{listing.listing_type === "rent" && <span className="text-xs font-semibold text-slate-500"> / month</span>}</p>
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500"><Icon name="location" size={14} />{listing.locality}, Gwalior</div>
                    </div>
                  </button>
                  <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                    <span className="truncate text-[11px] font-semibold text-slate-500">{listing.is_negotiable ? "Negotiable" : "Seller prefers fixed price"}</span>
                    {myListingsMode ? listing.status === "active" && <button onClick={() => void markAsSold(listing)} className="rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-200">Mark sold</button> : <button onClick={() => {
                      if (listing.id.startsWith("sample-")) {
                        setFavorites((current) => current.includes(listing.id) ? current.filter((id) => id !== listing.id) : [...current, listing.id])
                      } else {
                        void toggleSaved(listing.id)
                      }
                    }} aria-label={favorites.includes(listing.id) ? "Remove from saved listings" : "Save listing"} aria-pressed={favorites.includes(listing.id)} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition ${favorites.includes(listing.id) ? "bg-rose-50 text-rose-600" : "text-slate-400 hover:bg-slate-100 hover:text-rose-500"}`}>
                      <Icon name="heart" size={17} />
                    </button>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-14 text-center">
              <Icon name="search" size={26} className="mx-auto text-slate-400" />
              <h3 className="mt-3 font-extrabold text-slate-800">{myListingsMode ? "You have not posted any listings yet" : listings.length ? "No listings found" : "No public active listings found"}</h3>
              <p className="mt-1 text-sm text-slate-500">{myListingsMode ? "Post an item to start your local marketplace activity." : listings.length ? "Try another search or choose a different category." : "Items can be browsed without signing in. If active listings already exist, check that they are in the connected Supabase project and its public-read policy is applied."}</p>
              {(search || category !== "All") && <button onClick={() => { setSearch(""); setCategory("All") }} className="mt-4 text-sm font-bold text-blue-700">Clear search</button>}
            </div>
          )}
        </section>

        <aside className="mt-8 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 sm:p-5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><Icon name="verified" size={18} /></span>
          <div><h3 className="text-sm font-extrabold">Buy safely, meet locally</h3><p className="mt-1 text-xs leading-5 text-amber-900/80">Meet in a public place and inspect an item before paying. Never share OTPs or banking credentials, or send an advance to an unknown seller.</p></div>
        </aside>
      </main>

      <div className="marketplace-mobile-sell">
        <Button onClick={startPostingListing} className="w-full !rounded-2xl !bg-orange-500 !py-3 !text-sm !text-white shadow-lg shadow-orange-900/20 hover:!bg-orange-600">
          <Icon name="plus" size={18} />
          {loggedIn ? "Sell an item" : "Log in to sell"}
        </Button>
      </div>

      {selectedListing && (
        <div className="marketplace-detail-backdrop fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedListing(null) }}>
          <section role="dialog" aria-modal="true" aria-labelledby="market-listing-title" className="marketplace-detail-dialog relative my-auto grid w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-2">
            <button onClick={() => setSelectedListing(null)} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-slate-600 shadow" aria-label="Close listing"><Icon name="close" /></button>
            <div className="bg-slate-100">
              <img src={selectedListing.image_urls[selectedPhotoIndex] ?? selectedListing.image_urls[0]} alt={selectedListing.title} className="h-64 w-full object-cover md:h-full md:min-h-[420px]" />
              {selectedListing.image_urls.length > 1 && <div className="flex gap-2 overflow-x-auto bg-white p-3">{selectedListing.image_urls.map((imageUrl, index) => <button key={imageUrl} onClick={() => setSelectedPhotoIndex(index)} aria-label={`Show listing photo ${index + 1}`} aria-pressed={selectedPhotoIndex === index} className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${selectedPhotoIndex === index ? "border-blue-600" : "border-transparent"}`}><img src={imageUrl} alt="" className="h-full w-full object-cover" /></button>)}</div>}
            </div>
            <div className="p-5 sm:p-7">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">{selectedListing.category}</span>
              <h2 id="market-listing-title" className="mt-2 pr-7 text-xl font-extrabold leading-snug text-[#172033]">{selectedListing.title}</h2>
              {selectedListing.id.startsWith("sample-") && <p className="mt-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">Example listing for preview</p>}
              <p className="mt-3 text-2xl font-extrabold text-[#142b49]">₹{Number(selectedListing.price).toLocaleString("en-IN")}{selectedListing.listing_type === "rent" && <span className="text-sm font-semibold text-slate-500"> / month</span>}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">{selectedListing.condition ? `${selectedListing.condition} · ` : ""}{selectedListing.is_negotiable ? "Price negotiable" : "Fixed price"} · {selectedListing.listing_type}</p>
              <p className="mt-5 text-sm leading-6 text-slate-600">{selectedListing.description}</p>
              <div className="mt-5 flex items-center gap-2 text-xs text-slate-600"><Icon name="location" size={16} />{selectedListing.locality}, Gwalior</div>
              <div className="mt-6 rounded-xl bg-slate-50 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Seller</span>
                {selectedListing.show_seller_profile ? sellerProfile ? (
                  <button onClick={() => go(`/profile/${encodeURIComponent(sellerProfile.username.replace(/^@/, ""))}`)} className="mt-2 flex items-center gap-3 text-left">
                    <Avatar text={getInitials(sellerProfile.full_name)} imageUrl={sellerProfile.avatar_url} />
                    <span><span className="block text-sm font-extrabold text-slate-800">{sellerProfile.full_name}</span><span className="text-xs text-blue-700">View profile · @{sellerProfile.username}</span></span>
                  </button>
                ) : sellerProfileLoading ? <p className="mt-1 text-xs text-slate-500">Loading the profile shared by this lister…</p> : (
                  <p className="mt-1 text-xs text-slate-500">{sellerProfileError ? "The seller's shared profile is unavailable." : "This lister has no public profile details to show."}</p>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-slate-700">Seller profile is private</p>
                )}
                <p className="mt-2 text-xs text-slate-500">Listing posted {formatPostTime(selectedListing.created_at)}</p>
              </div>
              {actionError && <p role="alert" className="mt-3 text-xs text-red-700">{actionError}</p>}
              {selectedListing.id.startsWith("sample-") ? (
                <p className="mt-5 rounded-xl bg-slate-100 p-3 text-center text-xs font-semibold text-slate-600">Sample listing — chat is available on live listings.</p>
              ) : selectedListing.owner_id === viewerId ? (
                <p className="mt-5 rounded-xl bg-blue-50 p-3 text-center text-xs font-bold text-blue-800">This is your listing</p>
              ) : (
                <Button onClick={() => void chatWithSeller(selectedListing)} disabled={busy} className="mt-5 w-full"><Icon name="chat" size={16} />{loggedIn ? "Chat with seller" : "Log in to chat"}</Button>
              )}
              <p className="mt-3 text-center text-[10px] leading-4 text-slate-400">Keep conversations in the app and never share OTPs or banking details.</p>
            </div>
          </section>
        </div>
      )}
      {postOpen && <MarketplacePostDialog onClose={() => setPostOpen(false)} onSubmit={addListing} busy={busy} error={actionError} />}
    </div>
  )
}

function MarketplacePostDialog({
  onClose,
  onSubmit,
  busy,
  error,
}: {
  onClose: () => void
  onSubmit: (payload: {
    category: string
    listing_type: MarketplaceListing["listing_type"]
    title: string
    description: string
    price: number
    is_negotiable: boolean
    condition: string | null
    locality: string
    show_seller_profile: boolean
  }, images: File[]) => Promise<void>
  busy: boolean
  error: string
}) {
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState(marketplaceCategories[1])
  const [listingType, setListingType] = useState<MarketplaceListing["listing_type"]>("sell")
  const [price, setPrice] = useState("")
  const [location, setLocation] = useState("City Centre")
  const [condition, setCondition] = useState("Good")
  const [description, setDescription] = useState("")
  const [negotiable, setNegotiable] = useState(true)
  const [showSellerProfile, setShowSellerProfile] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [formError, setFormError] = useState("")

  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file))
    setPreviewUrls(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [images])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!images.length) {
      setFormError("Add at least one photo so buyers can see your item.")
      return
    }
    if (images.length > 8) {
      setFormError("Choose no more than 8 photos.")
      return
    }
    const amount = Number(price)
    if (!Number.isFinite(amount) || amount < 0) {
      setFormError("Enter a valid price.")
      return
    }
    await onSubmit({
      category,
      listing_type: listingType,
      title: title.trim(),
      description: description.trim(),
      price: amount,
      is_negotiable: negotiable,
      condition: listingType === "service" ? null : condition,
      locality: location,
      show_seller_profile: showSellerProfile,
    }, images)
  }

  return (
    <div className="marketplace-post-backdrop fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/55 p-3 sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="post-market-ad-title" className="marketplace-post-dialog my-auto max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-7">
          <div><div className="eyebrow">Sell in Gwalior</div><h2 id="post-market-ad-title" className="mt-1 text-xl font-extrabold text-[#172033]">Post your ad</h2><p className="mt-1 text-[11px] text-slate-500">This listing will belong to your signed-in account.</p></div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100" aria-label="Close form"><Icon name="close" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5 sm:p-7">
          {(formError || error) && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{formError || error}</p>}
          <label className="block text-xs font-bold text-slate-700">Ad title <span className="text-red-500">*</span><input required maxLength={90} value={title} onChange={(event) => setTitle(event.target.value)} className="input mt-2" placeholder="What are you selling?" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold text-slate-700">Category <select value={category} onChange={(event) => setCategory(event.target.value)} className="input mt-2">{marketplaceCategories.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="block text-xs font-bold text-slate-700">Listing type <select value={listingType} onChange={(event) => setListingType(event.target.value as MarketplaceListing["listing_type"])} className="input mt-2"><option value="sell">For sale</option><option value="rent">For rent</option><option value="exchange">Exchange</option><option value="service">Service</option></select></label>
            <label className="block text-xs font-bold text-slate-700">Price (₹) <input required min="0" type="number" value={price} onChange={(event) => setPrice(event.target.value)} className="input mt-2" placeholder="e.g. 2500" /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold text-slate-700">Gwalior locality <select value={location} onChange={(event) => setLocation(event.target.value)} className="input mt-2">{["City Centre", "Lashkar", "Thatipur", "Morar", "Phool Bagh", "DD Nagar", "Govindpuri", "Gole Ka Mandir", "Sirol", "University Road", "Other Gwalior"].map((item) => <option key={item}>{item}</option>)}</select></label>
            {listingType !== "service" && <label className="block text-xs font-bold text-slate-700">Condition <select value={condition} onChange={(event) => setCondition(event.target.value)} className="input mt-2">{["New", "Like new", "Good", "Fair"].map((item) => <option key={item}>{item}</option>)}</select></label>}
          </div>
          <label className="block text-xs font-bold text-slate-700">Description <textarea required maxLength={1200} value={description} onChange={(event) => setDescription(event.target.value)} className="input mt-2 min-h-24 resize-y" placeholder="Share useful details about your item..." /></label>
          <div>
            <span className="block text-xs font-bold text-slate-700">Photos <span className="text-red-500">*</span> <span className="font-normal text-slate-400">· 1–8 photos, max 5 MB each</span></span>
            <label className="mt-2 flex min-h-24 cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-xs font-semibold text-slate-600 hover:border-blue-400 hover:bg-blue-50/50">
              <Icon name="image" size={20} /><span>{images.length ? `${images.length} photo${images.length === 1 ? "" : "s"} selected · choose photos` : "Choose photos (JPG, PNG or WebP)"}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => {
                const files = Array.from(event.target.files ?? [])
                if (files.length > 8) {
                  setFormError("Choose no more than 8 photos.")
                  return
                }
                setImages(files)
                setFormError("")
              }} />
            </label>
            {previewUrls.length > 0 && <div className="mt-2 flex gap-2 overflow-x-auto">{previewUrls.map((url, index) => <img key={`${url.slice(0, 20)}-${index}`} src={url} alt={`Listing photo ${index + 1} preview`} className="h-16 w-16 shrink-0 rounded-lg object-cover" />)}</div>}
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={negotiable} onChange={(event) => setNegotiable(event.target.checked)} className="h-4 w-4 accent-blue-600" />Price is negotiable</label>
          <label className="flex items-start gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" checked={showSellerProfile} onChange={(event) => setShowSellerProfile(event.target.checked)} className="mt-0.5 h-4 w-4 accent-blue-600" /><span><strong>Share my profile on this listing</strong><br />Off by default. Buyers can only chat with you unless you choose to show your profile here.</span></label>
          <p className="rounded-xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">Meet buyers in a public place. Never share OTPs or ask buyers to pay outside a safe, verified transaction.</p>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" disabled={busy} className="w-full sm:w-auto"><Icon name="plus" size={16} />{busy ? "Publishing…" : "Publish ad"}</Button>
          </div>
        </form>
      </section>
    </div>
  )
}

function BusinessProfile({ id }: { id: string }) {
  const b = businesses.find((x) => x.id === id) || businesses[0]
  return (
    <>
      <div className="h-64 bg-slate-900 sm:h-80">
        <img
          src={b.image}
          alt={b.name}
          className="h-full w-full object-cover opacity-80"
        />
      </div>
      <main className="section pt-0">
        <div className="-mt-12 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <span className="grid h-20 w-20 place-items-center rounded-2xl bg-[#142B49] text-2xl font-extrabold text-white ring-4 ring-white">
              {b.name
                .split(" ")
                .map((x) => x[0])
                .join("")
                .slice(0, 2)}
            </span>
            <div className="flex-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">
                {b.type}
              </span>
              <h1 className="mt-1 text-3xl font-extrabold">
                {b.name}{" "}
                <Icon
                  name="verified"
                  size={20}
                  className="inline text-blue-500"
                />
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                {b.area}, Gwalior · ★ {b.rating} ({b.reviews} reviews)
              </p>
            </div>
            <Button
              onClick={() => (window.location.href = "tel:+917514002400")}
            >
              <Icon name="phone" size={16} />
              Contact business
            </Button>
          </div>
        </div>
        <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="card p-6">
            <h2 className="text-xl font-extrabold">About {b.name}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {b.desc} A trusted local destination serving the Gwalior community
              with quality, warmth and consistent service.
            </p>
            <h3 className="mt-8 font-extrabold">Photos</h3>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[b.image, IMG.food, IMG.street].map((x, i) => (
                <img
                  key={i}
                  src={x}
                  alt=""
                  className="h-28 w-full rounded-xl object-cover"
                />
              ))}
            </div>
            <h3 className="mt-8 font-extrabold">Services</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Dine-in", "Takeaway", "Group bookings", "Local delivery"].map(
                (x) => (
                  <span
                    key={x}
                    className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600"
                  >
                    {x}
                  </span>
                ),
              )}
            </div>
          </div>
          <aside className="space-y-4">
            <div className="card p-5">
              <h3 className="font-extrabold">Business information</h3>
              <div className="mt-4 space-y-4 text-xs text-slate-600">
                <p className="flex gap-3">
                  <Icon name="location" size={16} /> {b.area}, Gwalior, MP
                </p>
                <p className="flex gap-3">
                  <Icon name="phone" size={16} /> +91 751 400 2400
                </p>
                <p className="flex gap-3">
                  <Icon name="clock" size={16} /> Open · Closes 10:30 PM
                </p>
              </div>
            </div>
            <div className="map-placeholder">
              <Icon name="location" size={30} />
              <span>Map preview</span>
            </div>
          </aside>
        </div>
      </main>
    </>
  )
}

function EventsPage({ detail }: { detail?: string }) {
  const [interested, setInterested] = useState(false)
  if (detail) {
    const e = events.find((x) => x.id === detail) || events[0]
    return (
      <DetailHero
        image={e.image}
        kicker={`${e.type} · ${e.date}`}
        title={e.title}
        meta={`${e.time} · ${e.venue}`}
      >
        <p>
          Meet Gwalior people, discover a shared interest and enjoy a memorable
          local experience.
        </p>
        <Button
          variant={interested ? "secondary" : "primary"}
          onClick={() => setInterested(!interested)}
          className="mt-5"
        >
          {interested ? "Interested" : "I’m interested"} ·{" "}
          {e.interested + (interested ? 1 : 0)}
        </Button>
      </DetailHero>
    )
  }
  return (
    <>
      <PageHero
        eyebrow="Meet. Learn. Celebrate."
        title="Events in Gwalior"
        description="Discover workshops, college festivals, exhibitions, meetups and cultural experiences happening around the city."
      >
        <FilterBar placeholder="Search events or venues..." />
      </PageHero>
      <main className="section">
        <div className="mb-8 flex gap-2 overflow-x-auto">
          {[
            "All events",
            "This weekend",
            "Culture",
            "Workshops",
            "Meetups",
            "Sports",
            "College",
          ].map((x, i) => (
            <button
              key={x}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${
                i === 0 ? "bg-[#142B49] text-white" : "border border-slate-200"
              }`}
            >
              {x}
            </button>
          ))}
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[...events, ...events].map((e, i) => (
            <button
              key={e.id + i}
              onClick={() => go(`/events/${e.id}`)}
              className="card overflow-hidden text-left"
            >
              <img
                src={e.image}
                alt={e.title}
                className="h-52 w-full object-cover"
              />
              <div className="p-5">
                <span className="text-[10px] font-extrabold text-orange-600">
                  {e.date} · {e.time}
                </span>
                <h3 className="mt-2 text-lg font-extrabold leading-6">
                  {e.title}
                </h3>
                <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                  <Icon name="location" size={13} />
                  {e.venue}
                </p>
                <p className="mt-4 text-[10px] font-bold text-blue-600">
                  {e.interested} people interested
                </p>
              </div>
            </button>
          ))}
        </div>
      </main>
    </>
  )
}
function DetailHero({
  image,
  kicker,
  title,
  meta,
  children,
}: {
  image: string
  kicker: string
  title: string
  meta: string
  children: ReactNode
}) {
  return (
    <>
      <section className="relative h-80 overflow-hidden bg-slate-900 sm:h-[430px]">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/20 to-transparent"></div>
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[1100px] px-5 pb-10 text-white">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-400">
            {kicker}
          </span>
          <h1 className="mt-2 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-5xl">
            {title}
          </h1>
          <p className="mt-3 text-sm text-white/70">{meta}</p>
        </div>
      </section>
      <main className="section max-w-[1100px]">
        <div className="card p-6 sm:p-8">
          <h2 className="text-xl font-extrabold">About</h2>
          <div className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            {children}
          </div>
        </div>
      </main>
    </>
  )
}

function AuthPage({
  register = false,
  onSuccess,
}: {
  register?: boolean
  onSuccess?: () => void
}) {
  const requestedPath = new URLSearchParams(window.location.search).get("next")
  const successPath = requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
    ? requestedPath
    : "/community"
  const [done, setDone] = useState(false)
  const [confirmationRequired, setConfirmationRequired] = useState(false)
  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [identifier, setIdentifier] = useState("")
  const [city, setCity] = useState("City Centre")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")

    if (!isSupabaseConfigured) {
      setError("Supabase env variables are missing. Add the project URL and key first.")
      return
    }

    setLoading(true)

    try {
      if (register) {
        if (!fullName.trim()) {
          throw new Error("Full name is required.")
        }
        if (!/^[a-z0-9_-]{3,24}$/.test(username)) {
          throw new Error("Username must be 3–24 characters using letters, numbers, underscores, or hyphens.")
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters.")
        }

        const result = await signUpUser({
          email: identifier.trim(),
          password,
          fullName: fullName.trim(),
          username,
          city,
        })

        if (!result.session) {
          setConfirmationRequired(true)
          setDone(true)
          return
        }
        onSuccess?.()
        setDone(true)
      } else {
        await signInUser(identifier.trim(), password)

        onSuccess?.()
        setDone(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  if (done)
    return (
      <main className="auth-shell">
        <div className="auth-card text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <Icon name="check" size={26} />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold">
            {confirmationRequired
              ? "Check your email"
              : register
                ? "Welcome to GwaliorWale!"
                : "Welcome back!"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {confirmationRequired
              ? "Your profile has been saved. Confirm your email address, then log in to continue."
              : "Your account is connected to Supabase and ready to use."}
          </p>
          <Button
            onClick={() => {
              if (confirmationRequired) {
                go(`/login?next=${encodeURIComponent(successPath)}`)
              } else {
                onSuccess?.()
                go(successPath)
              }
            }}
            className="mt-6"
          >
            {confirmationRequired ? "Go to log in" : successPath === "/buy-sell" ? "Continue to Buy & Sell" : "Explore community"}
          </Button>
        </div>
      </main>
    )

  return (
    <main className="auth-shell">
      <div className="auth-layout">
        <section className="auth-visual">
          <div className="auth-visual-inner">
            <div className="auth-badge">
              <Icon name="location" size={14} className="text-orange-400" />
              Your city, connected
            </div>
            <Logo inverse />
            <h1>
              {register ? "Build your place in Gwalior" : "Welcome back to your local network"}
            </h1>
            <p>
              {register
                ? "Create your profile, discover trusted people, and stay plugged into the things that matter in your city."
                : "Log in to join conversations, support local businesses, and keep up with what’s happening around you."}
            </p>
            <div className="auth-feature-list">
              {[
                "Local updates, people and opportunities in one place",
                "Trusted community conversations from your city",
                "Fast access to businesses, events and neighbourhood groups",
              ].map((item) => (
                <div key={item} className="auth-feature-item">
                  <span className="auth-feature-check">
                    <Icon name="check" size={14} />
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="auth-metrics">
              <div>
                <strong>12K+</strong>
                <span>members</span>
              </div>
              <div>
                <strong>840+</strong>
                <span>businesses</span>
              </div>
              <div>
                <strong>2.4K</strong>
                <span>conversations</span>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-card">
          <div className="flex justify-center">
            <Logo compact />
          </div>
          <div className="auth-form-header">
            <h2>{register ? "Create your account" : "Log in to continue"}</h2>
            <p>
              {register
                ? "Start discovering and contributing to Gwalior in minutes."
                : "Access your community profile and local updates."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            {register && (
              <Field label="Full name">
                <input
                  required
                  className="input"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </Field>
            )}
            {register && (
              <Field label="Username">
                <div className="auth-username-shell">
                  <input
                    required
                    minLength={3}
                    maxLength={24}
                    pattern="[a-zA-Z0-9_-]{3,24}"
                    className="auth-username-input"
                    placeholder="yourname"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                  />
                  <span>.gwl</span>
                </div>
                <span className="mt-1 block text-[10px] text-slate-500">
                  3–24 letters, numbers, underscores, or hyphens.
                </span>
              </Field>
            )}
            <Field label={register ? "Email address" : "Username or email"}>
              <input
                required
                type={register ? "email" : "text"}
                className="input"
                placeholder={register ? "you@example.com" : "yourname.gwl"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </Field>
            {register && (
              <Field label="City / area">
                <select
                  className="input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  <option>City Centre</option>
                  <option>Lashkar</option>
                  <option>Thatipur</option>
                  <option>Morar</option>
                  <option>Hazira</option>
                  <option>Outside Gwalior</option>
                </select>
              </Field>
            )}
            <Field label="Password">
              <input
                required
                type="password"
                className="input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full py-3" disabled={loading}>
              {loading ? "Please wait..." : register ? "Create account" : "Log in"}
            </Button>
          </form>

          <div className="auth-footer">
            <span></span>
            <p>{register ? "Already a member?" : "New to GwaliorWale?"}</p>
            <button
              onClick={() => go(register ? "/login" : "/register")}
              className="font-extrabold text-blue-600"
            >
              {register ? "Log in" : "Join now"}
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-extrabold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  )
}

function NotificationsPage() {
  const [read, setRead] = useState<string[]>([])
  const ns = [
    ["heart", "Rohan liked your post about street food.", "2 min"],
    ["comment", "Neha commented on your recommendation.", "18 min"],
    ["people", "Vikas started following you.", "1 hr"],
    ["calendar", "Heritage Walk starts tomorrow morning.", "3 hr"],
    ["bell", "Welcome to the GwaliorWale community!", "1 day"],
  ] as const
  const cityAlerts: { icon: IconName; title: string; description: string; source: string; time: string }[] = [
    {
      icon: "location",
      title: "Traffic notice",
      description: "Diversion near Phool Bagh between 4–7 PM due to an official movement.",
      source: "Gwalior Traffic Police",
      time: "24 min",
    },
    {
      icon: "bell",
      title: "Public notice",
      description: "Scheduled water supply maintenance in parts of Thatipur tomorrow morning.",
      source: "Municipal Corporation",
      time: "1 hr",
    },
    {
      icon: "calendar",
      title: "Community",
      description: "Weekend heritage walk registrations are now open for Sunday.",
      source: "GwaliorWale Community",
      time: "3 hr",
    },
    {
      icon: "star",
      title: "Local happening",
      description: "New craft exhibition opens at Baija Taal this Friday.",
      source: "Event organizer",
      time: "5 hr",
    },
  ]
  return (
    <>
      <PageHero
        eyebrow="Stay connected"
        title="Notifications"
        description="Activity from your community, plus useful traffic, civic and event notices."
      />
      <main className="section max-w-[780px]">
        <section>
          <h2 className="mb-3 text-sm font-extrabold text-[#172033]">Your activity</h2>
          <div className="card divide-y divide-slate-100">
          {ns.map(([icon, text, time], i) => (
            <button
              key={text}
              onClick={() => setRead((current) => current.includes(`activity-${i}`) ? current : [...current, `activity-${i}`])}
              className={`flex w-full gap-4 p-4 text-left sm:p-5 ${
                read.includes(`activity-${i}`) ? "bg-white" : "bg-blue-50/40"
              }`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-blue-600 shadow-sm">
                <Icon name={icon} size={17} />
              </span>
              <div className="flex-1">
                <p className="text-sm text-slate-700">{text}</p>
                <span className="mt-1 block text-[10px] text-slate-400">
                  {time} ago
                </span>
              </div>
              {!read.includes(`activity-${i}`) && (
                <span className="mt-2 h-2 w-2 rounded-full bg-blue-600" />
              )}
            </button>
          ))}
          </div>
        </section>
        <section className="mt-8">
          <h2 className="mb-1 text-sm font-extrabold text-[#172033]">City alerts</h2>
          <p className="mb-3 text-xs leading-5 text-slate-500">Timely notices from local authorities, organizers and the community.</p>
          <div className="space-y-3">
            {cityAlerts.map((alert, i) => (
              <button
                key={alert.title}
                onClick={() => setRead((current) => current.includes(`city-${i}`) ? current : [...current, `city-${i}`])}
                className={`card flex w-full items-start gap-3 p-4 text-left sm:p-5 ${read.includes(`city-${i}`) ? "bg-white" : "bg-blue-50/40"}`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-orange-600 shadow-sm">
                  <Icon name={alert.icon} size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <strong className="text-sm text-slate-800">{alert.title}</strong>
                    <span className="text-[10px] text-slate-400">{alert.time} ago</span>
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">{alert.description}</span>
                  <span className="mt-2 block text-[10px] font-bold text-slate-400">Source: {alert.source}</span>
                </span>
                {!read.includes(`city-${i}`) && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
              </button>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}

function CreatePostPage({
  loggedIn,
  profile,
  modal = false,
  onClose,
  onPublished,
}: {
  loggedIn: boolean
  profile: UserIdentity | null
  modal?: boolean
  onClose?: () => void
  onPublished?: () => void
}) {
  const [type, setType] = useState("Text")
  const [postKind, setPostKind] = useState<"Post" | "Discussion">("Post")
  const [text, setText] = useState("")
  const [joinedGroups, setJoinedGroups] = useState<{ id: string; name: string }[]>([])
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [groupId, setGroupId] = useState("")
  const [groupLoadError, setGroupLoadError] = useState("")
  const [interestTags, setInterestTags] = useState<string[]>([])
  const [interestSearch, setInterestSearch] = useState("")
  const [location, setLocation] = useState(profile?.city || "All Gwalior")
  const [visibility, setVisibility] = useState("Public")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [published, setPublished] = useState(false)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [modalClosing, setModalClosing] = useState(false)
  const requestClose = () => {
    if (!modal) {
      go("/community")
      return
    }
    if (!modalClosing) setModalClosing(true)
  }
  const wrapContent = (content: ReactNode): ReactNode => {
    if (!modal) return content
    return createPortal(
      <div
        className={`post-detail-comments-backdrop create-post-modal-backdrop${modalClosing ? " is-closing" : ""}`}
        onClick={requestClose}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && modalClosing) onClose?.()
        }}
      >
        <section
          className={`post-detail-comments create-post-modal${modalClosing ? " is-closing" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-post-modal-title"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="post-detail-comments-heading">
            <h2 id="create-post-modal-title">Create a post</h2>
            <button type="button" onClick={requestClose} aria-label="Close create post"><Icon name="close" size={18} /></button>
          </div>
          <div className="create-post-modal-body">{content}</div>
        </section>
      </div>,
      document.body,
    )
  }

  useEffect(() => {
    if (!modal) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModalClosing(true)
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [modal])

  const locationOptions = [...new Set([
    "All Gwalior",
    profile?.city?.trim(),
    "City Centre",
    "Lashkar",
    "Phool Bagh",
    "Thatipur",
    "Morar",
    "Gwalior Fort",
    "Maharaj Bada",
    "Dabra",
  ].filter((area): area is string => Boolean(area)))]

  useEffect(() => {
    let active = true
    getMyJoinedCommunityGroups()
      .then((groups) => {
        if (active) setJoinedGroups(groups)
      })
      .catch((reason: unknown) => {
        if (active) setGroupLoadError(reason instanceof Error ? reason.message : "Could not load your groups.")
      })
      .finally(() => {
        if (active) setGroupsLoading(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (profile?.city && location === "All Gwalior") setLocation(profile.city)
  }, [profile?.city])

  const toggleInterestTag = (tag: string) => {
    setInterestTags((current) => {
      if (current.includes(tag)) return current.filter((item) => item !== tag)
      if (current.length >= 3) return current
      return [...current, tag]
    })
  }

  const normalizedInterestSearch = interestSearch.trim().toLowerCase()
  const visibleInterestCategories = INTEREST_CATEGORIES
    .map((group) => ({
      ...group,
      visibleInterests: group.interests.filter((interest) =>
        !normalizedInterestSearch ||
        group.name.toLowerCase().includes(normalizedInterestSearch) ||
        interest.toLowerCase().includes(normalizedInterestSearch),
      ),
    }))
    .filter((group) => group.visibleInterests.length)

  const publishPost = async () => {
    if (!loggedIn) {
      setError("You must log in before creating a post.")
      return
    }

    if (!text.trim()) {
      setError("Write something before publishing.")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const savedPost = await createUserPost({
        content: text.trim(),
        category: postKind,
        location,
        visibility,
        imageUrl: imagePreview || undefined,
        interestTags,
        groupId: groupId || undefined,
      })

      const newPost: Post = {
        id: savedPost.id,
        name: profile?.full_name || "Community member",
        handle: profile ? `@${profile.username}` : "@community-member",
        avatar: profile ? getInitials(profile.full_name) : "CM",
        avatarUrl: profile?.avatar_url,
        time: formatPostTime(savedPost.created_at),
        category: postKind,
        postType: postKind,
        location,
        text: text.trim(),
        image: imagePreview || undefined,
        likes: 0,
        comments: 0,
        userId: savedPost.user_id,
        interestTags: savedPost.interest_tags,
        isOwnPost: true,
        groupId: savedPost.group_id,
      }

      const nextPosts = [newPost, ...posts]
      posts = nextPosts
      writeStoredPosts(nextPosts)
      onPublished?.()
      setPublished(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to publish this post right now.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!loggedIn) {
    return wrapContent(
      <main className="section max-w-[700px]">
        <EmptyState
          title="Login required"
          text="Only registered users can create and publish posts in GwaliorWale."
          action="Log in"
          onAction={() => go("/login")}
        />
      </main>
    )
  }

  if (!profile) {
    return wrapContent(
      <main className="section max-w-[700px]">
        <p className="text-sm text-slate-500">Loading your account profile...</p>
      </main>
    )
  }

  if (published)
    return wrapContent(
      <main className="section max-w-[700px]">
        <EmptyState
          title="Your post is live!"
          text="The GwaliorWale community can now join your conversation."
          action="View community"
          onAction={requestClose}
          success
        />
      </main>
    )

  return wrapContent(
    <div className="create-post-page">
      {!modal && <PageHero
        eyebrow="Start a conversation"
        title="Create a post"
        description="Ask, recommend, share or start something useful for Gwalior."
      />}
      {!modal && <div className="create-post-mobile-heading">
        <h1>Create a post</h1>
        <p>Share something useful with Gwalior.</p>
      </div>}
      <main className="create-post-main section max-w-[760px]">
        <div className="create-post-card card p-5 sm:p-7">
          <div className="create-post-author flex gap-3">
            <Avatar text={getInitials(profile.full_name)} imageUrl={profile.avatar_url} />
            <div className="min-w-0">
              <div className="text-sm font-extrabold">{profile.full_name}</div>
              <div className="text-[10px] text-slate-400">@{profile.username} · Posting to Gwalior community</div>
            </div>
          </div>
          <div className="create-post-media-type mt-6 flex gap-2" aria-label="Post content format">
            {["Text", "Images"].map((x) => (
              <button
                type="button"
                key={x}
                onClick={() => setType(x)}
                aria-pressed={type === x}
                className={`rounded-lg px-4 py-2 text-xs font-bold ${
                  type === x
                    ? "bg-blue-50 text-blue-600"
                    : "bg-slate-50 text-slate-500"
                }`}
              >
                <Icon
                  name={x === "Text" ? "edit" : "image"}
                  size={14}
                  className="mr-1 inline"
                />
                {x}
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label={postKind === "Discussion" ? "Discussion text" : "Post text"}
            className="mt-4 min-h-48 w-full resize-y rounded-xl border border-slate-200 p-4 text-sm leading-6 outline-none focus:border-blue-400"
            placeholder={postKind === "Discussion" ? "What would you like to discuss with Gwalior?" : "What would you like to share with Gwalior?"}
          />
          {type === "Images" && (
            <label className="mt-3 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
              <Icon name="camera" className="text-blue-600" />
              <strong className="mt-2 text-xs">Add photos</strong>
              <span className="mt-1 text-[10px] text-slate-400">
                JPG or PNG · Up to 10MB
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => setImagePreview(String(reader.result))
                  reader.readAsDataURL(file)
                }}
              />
            </label>
          )}
          {imagePreview && (
            <img src={imagePreview} alt="Selected upload preview" className="mt-4 h-52 w-full rounded-2xl object-cover" />
          )}
          <section className="create-post-settings mt-5" aria-label="Post settings">
            <fieldset className="create-post-kind-field">
              <legend className="create-post-field-label">Share as</legend>
              <div className="create-post-kind-options" role="group" aria-label="Choose post type">
                {(["Post", "Discussion"] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    aria-pressed={postKind === kind}
                    onClick={() => setPostKind(kind)}
                    className={postKind === kind ? "is-selected" : ""}
                  >
                    <Icon name={kind === "Post" ? "image" : "chat"} size={16} />
                    <span>{kind}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="create-post-field">
              <span className="create-post-field-label">Place in Gwalior</span>
              <AppSelect
                value={location}
                onChange={setLocation}
                ariaLabel="Place in Gwalior"
                options={locationOptions.map((area) => ({ label: area, value: area }))}
              />
            </div>
            <div className="create-post-field">
              <span className="create-post-field-label">Visibility</span>
              <AppSelect
                value={visibility}
                onChange={setVisibility}
                ariaLabel="Post visibility"
                options={["Public", "Followers"].map((item) => ({ label: item, value: item }))}
              />
            </div>
          </section>
          <section className="create-post-community-field mt-5" aria-labelledby="post-community-heading">
            <div className="create-post-field">
              <span id="post-community-heading" className="create-post-field-label">Communities <span className="font-medium normal-case tracking-normal text-slate-400">(optional)</span></span>
              <AppSelect
                value={groupId}
                onChange={setGroupId}
                disabled={groupsLoading}
                ariaLabel="Share with a community"
                placeholder={groupsLoading ? "Loading your communities..." : "All Gwalior (public)"}
                options={[
                  { label: "All Gwalior (public)", value: "" },
                  ...joinedGroups.map((group) => ({ label: group.name, value: group.id })),
                ]}
              />
            </div>
            {!groupsLoading && !groupLoadError && joinedGroups.length === 0 && (
              <p className="mt-2 text-[10px] text-slate-500">Join a community to share a post directly with its members.</p>
            )}
            {groupLoadError && <p role="alert" className="mt-2 text-[10px] text-amber-700">{groupLoadError}</p>}
          </section>
          <section className="create-post-interests mt-5" aria-labelledby="post-topics-heading">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 id="post-topics-heading" className="text-xs font-bold uppercase tracking-wide text-slate-600">Topics</h2>
                <p className="mt-1 text-[10px] text-slate-500">Add up to 3 interests to help people find this {postKind.toLowerCase()}.</p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">{interestTags.length}/3</span>
            </div>
            <label className="search-field mt-3">
              <Icon name="search" size={16} />
              <input
                type="search"
                value={interestSearch}
                onChange={(event) => setInterestSearch(event.target.value)}
                placeholder="Search post topics..."
                aria-label="Search post topics"
              />
            </label>
            <div className="mt-3 max-h-56 space-y-3 overflow-y-auto rounded-xl border border-slate-200 p-3">
              {visibleInterestCategories.length ? visibleInterestCategories.map((group) => (
                <fieldset key={group.name}>
                  <legend className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{group.name}</legend>
                  <div className="flex flex-wrap gap-2">
                    {group.visibleInterests.map((interest) => {
                      const selected = interestTags.includes(interest)
                      const limitReached = interestTags.length >= 3
                      return (
                        <label
                          key={`${group.name}-${interest}`}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold ${
                            selected ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"
                          } ${limitReached && !selected ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={limitReached && !selected}
                            onChange={() => toggleInterestTag(interest)}
                            className="accent-blue-600"
                          />
                          {interest}
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              )) : <p className="py-3 text-center text-xs text-slate-500">No matching topics.</p>}
            </div>
          </section>
          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
          <div className="create-post-submit-bar mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={requestClose}>
              Cancel
            </Button>
            <Button
              onClick={publishPost}
              className={!text.trim() ? "opacity-50" : ""}
              disabled={submitting || !text.trim()}
            >
              {submitting ? "Publishing..." : "Publish post"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

function InfoPage({ slug }: { slug: string }) {
  const forms = ["contact", "advertise", "list-business", "post-job"].includes(
    slug,
  )
  const titles: Record<string, [string, string]> = {
    about: [
      "About GwaliorWale",
      "We are building the digital home of Gwalior — useful, welcoming and proudly local.",
    ],
    contact: [
      "Contact us",
      "Have a question, suggestion or partnership idea? We’d love to hear from you.",
    ],
    guidelines: [
      "Community guidelines",
      "Simple principles that keep GwaliorWale helpful, respectful and safe.",
    ],
    privacy: [
      "Privacy policy",
      "How we handle information and protect the people in our community.",
    ],
    terms: [
      "Terms of service",
      "The terms that govern responsible use of the GwaliorWale platform.",
    ],
    advertise: [
      "Advertise with GwaliorWale",
      "Reach an engaged local audience with thoughtful city-first campaigns.",
    ],
    "list-business": [
      "List your business",
      "Help Gwalior discover and support your local business.",
    ],
    "post-job": [
      "Post a job",
      "Find talented people from Gwalior for your next opportunity.",
    ],
  }
  const [title, desc] = titles[slug] || [
    "GwaliorWale on social",
    "This social profile will be connected when the platform launches.",
  ]
  const [sent, setSent] = useState(false)
  return (
    <>
      <PageHero eyebrow="GwaliorWale" title={title} description={desc} />
      <main className="section max-w-[800px]">
        {forms ? (
          <div className="card p-6 sm:p-8">
            {sent ? (
              <EmptyState
                success
                title="Thank you!"
                text="Your request has been received in this prototype."
                action="Back to home"
                onAction={() => go("/")}
              />
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setSent(true)
                }}
                className="space-y-5"
              >
                <Field label="Your name">
                  <input required className="input" placeholder="Full name" />
                </Field>
                <Field label="Email or phone">
                  <input
                    required
                    className="input"
                    placeholder="How can we reach you?"
                  />
                </Field>
                <Field
                  label={
                    slug === "post-job"
                      ? "Job / company details"
                      : slug === "list-business"
                        ? "Business details"
                        : "Tell us more"
                  }
                >
                  <textarea
                    required
                    className="input min-h-32"
                    placeholder="Share the relevant details..."
                  />
                </Field>
                <Button type="submit">Submit request</Button>
              </form>
            )}
          </div>
        ) : (
          <article className="card p-7 sm:p-10">
            <p className="text-base leading-8 text-slate-600">{desc}</p>
            {[1, 2, 3].map((x) => (
              <section key={x} className="mt-8">
                <h2 className="text-lg font-extrabold">
                  {slug === "about"
                    ? [
                        "Local by design",
                        "Built for participation",
                        "A platform Gwalior can trust",
                      ][x - 1]
                    : [
                        "Our commitment",
                        "Your responsibility",
                        "Questions and updates",
                      ][x - 1]}
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  GwaliorWale is designed to make local information easier to
                  discover and community participation more meaningful. We
                  prioritize respectful interactions, clear information and a
                  safe experience for everyone.
                </p>
              </section>
            ))}
          </article>
        )}
      </main>
    </>
  )
}

function EmptyState({
  title,
  text,
  action,
  onAction,
  success = false,
}: {
  title: string
  text: string
  action: string
  onAction: () => void
  success?: boolean
}) {
  return (
    <div className="py-14 text-center">
      <span
        className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${
          success
            ? "bg-emerald-50 text-emerald-600"
            : "bg-blue-50 text-blue-600"
        }`}
      >
        <Icon name={success ? "check" : "search"} size={25} />
      </span>
      <h2 className="mt-5 text-xl font-extrabold">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">{text}</p>
      <Button onClick={onAction} className="mt-6">
        {action}
      </Button>
    </div>
  )
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [loggedIn, setLoggedIn] = useState(false)
  const [currentProfile, setCurrentProfile] = useState<UserIdentity | null>(null)
  const [profileError, setProfileError] = useState("")
  const appContentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (active) setLoggedIn(Boolean(data.session))
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    if (!loggedIn) {
      setCurrentProfile(null)
      setProfileError("")
      return () => { active = false }
    }

    setProfileError("")
    async function loadCurrentProfile() {
      let hasCachedProfile = false
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        const user = sessionData.session?.user
        if (!user) throw new Error("Please log in to view your profile.")

        const cached = getCachedOwnProfile(user.id)
        if (active && cached) {
          hasCachedProfile = true
          setCurrentProfile({
            full_name: cached.full_name,
            username: cached.username,
            avatar_url: cached.avatar_url,
            city: cached.city,
            interests: cached.interests,
          })
        }

        const profile = await getOwnProfile(user.id)
        if (active) {
          setCurrentProfile({
            full_name: profile.full_name,
            username: profile.username,
            avatar_url: profile.avatar_url,
            city: profile.city,
            interests: profile.interests,
          })
        }
      } catch (err) {
        if (active && !hasCachedProfile) {
          const message = err instanceof Error ? err.message : "Could not load your account profile."
          console.error("Could not load signed-in profile:", err)
          setProfileError(message)
          setCurrentProfile(null)
        }
      }
    }

    void loadCurrentProfile()

    return () => { active = false }
  }, [loggedIn])

  useEffect(() => {
    let active = true
    async function refreshHeaderProfile() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        const user = data.session?.user
        if (!user) return
        const profile = await getOwnProfile(user.id)
        if (active) {
          setCurrentProfile({
            full_name: profile.full_name,
            username: profile.username,
            avatar_url: profile.avatar_url,
            city: profile.city,
            interests: profile.interests,
          })
        }
      } catch (error) {
        if (active) console.error("Could not refresh the profile image:", error)
      }
    }

    window.addEventListener("gwalior:profile-updated", refreshHeaderProfile)
    return () => {
      active = false
      window.removeEventListener("gwalior:profile-updated", refreshHeaderProfile)
    }
  }, [])

  useEffect(() => {
    const h = () => setPath(window.location.pathname)
    window.addEventListener("popstate", h)
    return () => window.removeEventListener("popstate", h)
  }, [])
  useEffect(() => {
    if (!path.startsWith("/post/") && appContentRef.current) appContentRef.current.scrollTop = 0
  }, [path])
  let page: ReactNode
  if (path === "/") page = <HomePage profile={currentProfile} loggedIn={loggedIn} />
  else if (path === "/community") page = <CommunityPage profile={currentProfile} loggedIn={loggedIn} />
  else if (path === "/trending") page = <TrendingPage key={window.location.search} />
  else if (path.startsWith("/post/")) {
    const requestedReturnPath = new URLSearchParams(window.location.search).get("from")
    const returnTo = requestedReturnPath?.startsWith("/profile") && !requestedReturnPath.startsWith("//")
      ? requestedReturnPath
      : undefined
    page = <PostDetail key={path} id={path.split("/")[2]} returnTo={returnTo} />
  }
  else if (path === "/profile")
    page = <ProfilePage key={path} onLogout={() => setLoggedIn(false)} />
  else if (path === "/profile/edit") page = <ProfileEditorPage />
  else if (path.startsWith("/profile/"))
    page = <ProfilePage key={path} profileSlug={path.split("/")[2]} onLogout={() => setLoggedIn(false)} />
  else if (path === "/messages" || path.startsWith("/messages/"))
    page = <MessagingPage conversationId={path.split("/")[2]} />
  else if (path === "/explore") page = <ExplorePage />
  else if (path.startsWith("/explore/"))
    page = <ExplorePage detail={path.split("/")[2]} />
  else if (path === "/buy-sell") page = <MarketplacePage loggedIn={loggedIn} />
  else if (path === "/businesses") page = <BusinessDirectory />
  else if (path.startsWith("/business/"))
    page = <BusinessProfile id={path.split("/")[2]} />
  else if (path === "/jobs") page = <JobsPage loggedIn={loggedIn} />
  else if (path.startsWith("/job/"))
    page = <JobDetail id={path.split("/")[2]} loggedIn={loggedIn} />
  else if (path === "/post-job") page = <PostJobPage loggedIn={loggedIn} />
  else if (path === "/events") page = <EventsPage />
  else if (path.startsWith("/events/"))
    page = <EventsPage detail={path.split("/")[2]} />
  else if (path === "/login")
    page = <AuthPage onSuccess={() => setLoggedIn(true)} />
  else if (path === "/register")
    page = <AuthPage register onSuccess={() => setLoggedIn(true)} />
  else if (path === "/notifications") page = <NotificationsPage />
  else if (path === "/create-post")
    page = <CreatePostPage loggedIn={loggedIn} profile={currentProfile} />
  else if (path === "/updates") page = <NotificationsPage />
  else page = <InfoPage slug={path.replace("/", "")} />
  return (
    <div className={`app-shell min-h-screen bg-white text-[#172033] ${path === "/community" ? "community-app" : ""} ${path === "/buy-sell" ? "marketplace-app-shell" : ""} ${path === "/messages" || path.startsWith("/messages/") ? "messages-app-shell" : ""}`}>
      <Header path={path} loggedIn={loggedIn} profile={currentProfile} />
      <div ref={appContentRef} className={`app-content ${path === "/messages" || path.startsWith("/messages/") ? "app-content-chat" : ""}`}>
        {profileError && (
          <div role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-xs text-red-700">
            Could not load your profile: {profileError}
          </div>
        )}
        {page}
        <Footer />
      </div>
      <MobileNav path={path} />
    </div>
  )
}
