import { FormEvent, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import {
  applyForJob,
  createJobPaymentOrder,
  getCurrentUser,
  getJobApplications,
  getJobListing,
  getJobListings,
  getMyJobListings,
  hasAppliedToJob,
  JobApplication,
  JobListing,
  updateJobStatus,
  verifyJobPayment,
} from "./lib/supabase"

type JobsPageProps = { loggedIn: boolean }

const employmentTypes: JobListing["employment_type"][] = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Freelance",
]
const workplaceTypes: JobListing["workplace_type"][] = ["On-site", "Hybrid", "Remote"]

const sampleJobs: JobListing[] = [
  {
    id: "sample-social-media-executive",
    owner_id: "",
    title: "Social Media Executive",
    company: "BlueKite Digital",
    location: "City Centre, Gwalior",
    employment_type: "Full-time",
    workplace_type: "Hybrid",
    salary: "₹18,000–₹28,000 / month",
    description: "Help local businesses build an engaging presence across social platforms. Plan content calendars, create campaign ideas, coordinate with designers, and track what resonates with the community.",
    requirements: "1+ year of social media experience, strong writing skills, and familiarity with Instagram and Facebook.",
    status: "active",
    created_at: "2026-11-08T09:00:00.000Z",
    expires_at: null,
  },
  {
    id: "sample-mathematics-faculty",
    owner_id: "",
    title: "Mathematics Faculty",
    company: "Achievers Academy",
    location: "Thatipur, Gwalior",
    employment_type: "Full-time",
    workplace_type: "On-site",
    salary: "₹30,000–₹45,000 / month",
    description: "Teach mathematics to senior secondary students in a supportive classroom environment. Prepare lessons, explain challenging concepts clearly, and help students build confidence for their exams.",
    requirements: "A degree in Mathematics or a related subject. Teaching or tutoring experience is preferred.",
    status: "active",
    created_at: "2026-11-07T09:00:00.000Z",
    expires_at: null,
  },
  {
    id: "sample-junior-graphic-designer",
    owner_id: "",
    title: "Junior Graphic Designer",
    company: "Studio Gwalior",
    location: "Remote · Gwalior",
    employment_type: "Full-time",
    workplace_type: "Remote",
    salary: "₹15,000–₹22,000 / month",
    description: "Create thoughtful visual content for local brands, digital campaigns, and community projects. Work with a small creative team and grow your portfolio across a variety of briefs.",
    requirements: "A portfolio showcasing design fundamentals. Familiarity with Figma, Canva, or Adobe tools is a plus.",
    status: "active",
    created_at: "2026-11-06T09:00:00.000Z",
    expires_at: null,
  },
  {
    id: "sample-content-community-intern",
    owner_id: "",
    title: "Content & Community Intern",
    company: "Local Loop",
    location: "Lashkar, Gwalior",
    employment_type: "Internship",
    workplace_type: "Hybrid",
    salary: "₹8,000–₹12,000 / month",
    description: "Support local stories and community events through short-form writing, research, and social content. This is a hands-on opportunity to learn how a city-focused digital community is built.",
    requirements: "Curiosity about Gwalior, clear communication, and an interest in storytelling or digital media.",
    status: "active",
    created_at: "2026-11-05T09:00:00.000Z",
    expires_at: null,
  },
]

const isSampleJob = (job: JobListing) => job.id.startsWith("sample-")

function go(path: string) {
  window.history.pushState({}, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
  window.scrollTo({ top: 0, behavior: "smooth" })
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function getListingState(job: JobListing) {
  const expiresAt = job.expires_at ? Date.parse(job.expires_at) : Number.NaN
  const expired = Number.isFinite(expiresAt) && expiresAt <= Date.now()
  if (expired) return { state: "expired" as const, label: "Expired", detail: `Expired ${formatDate(job.expires_at!)}` }
  if (job.status === "closed") return {
    state: "closed" as const,
    label: "Closed",
    detail: job.expires_at ? `Closed · expires ${formatDate(job.expires_at)}` : "Closed by you",
  }
  return {
    state: "active" as const,
    label: "Active",
    detail: job.expires_at ? `Expires ${formatDate(job.expires_at)}` : "Accepting applications",
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message
  }
  return fallback
}

type RazorpayPaymentResponse = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

type RazorpayCheckoutOptions = {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  prefill: { email?: string }
  theme: { color: string }
  handler: (response: RazorpayPaymentResponse) => void
  modal: { ondismiss: () => void }
}

type RazorpayCheckout = {
  open: () => void
  on: (event: "payment.failed", callback: (response: { error?: { description?: string } }) => void) => void
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckout
  }
}

let razorpayScriptPromise: Promise<void> | null = null

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve()
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script")
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => {
        razorpayScriptPromise = null
        reject(new Error("Could not load Razorpay checkout. Check your connection and try again."))
      }
      document.head.appendChild(script)
    })
  }
  return razorpayScriptPromise
}

function BriefcaseIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2" />
    </svg>
  )
}

function JobCard({ job, owner = false }: { job: JobListing; owner?: boolean }) {
  const listingState = getListingState(job)
  return (
    <button
      type="button"
      onClick={() => go(`/job/${job.id}`)}
      className="job-listing-card group w-full text-left"
    >
      <span className="job-company-mark"><BriefcaseIcon /></span>
      <span className="job-listing-copy">
        <span className="job-listing-title">{job.title}</span>
        <span className="job-listing-company">{job.company} <i /> {job.location}</span>
        {owner && <span className="job-owner-status">
          <span className={`job-status ${listingState.state}`}>{listingState.label}</span>
          <span>{listingState.detail}</span>
        </span>}
        <span className="job-listing-tags">
          <span>{job.employment_type}</span>
          <span>{job.workplace_type}</span>
          {job.salary && <span>{job.salary}</span>}
        </span>
      </span>
      <span className="job-listing-end">
        {isSampleJob(job) && <span className="job-status sample">Sample</span>}
        <span className="job-listing-date">{formatDate(job.created_at)}</span>
        <span className="job-listing-arrow" aria-hidden="true">→</span>
      </span>
    </button>
  )
}

function LoadingNote() {
  return <div className="job-feedback">Loading opportunities…</div>
}

function ErrorNote({ children }: { children: string }) {
  return <p role="alert" className="job-feedback job-feedback-error">{children}</p>
}

function EmptyJobs({ mine, onPost }: { mine?: boolean; onPost: () => void }) {
  return (
    <div className="job-empty-state">
      <span className="job-empty-icon"><BriefcaseIcon /></span>
      <h2>{mine ? "No job listings yet" : "Your next opportunity starts here"}</h2>
      <p>{mine ? "Post your first opening and connect with people looking to work in Gwalior." : "There are no active listings at the moment. Check back soon or share an opportunity with the community."}</p>
      <button type="button" className="job-button job-button-primary" onClick={onPost}>Post a job</button>
    </div>
  )
}

export function JobsPage({ loggedIn }: JobsPageProps) {
  const [listings, setListings] = useState<JobListing[]>([])
  const [myListings, setMyListings] = useState<JobListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"browse" | "manage">("browse")
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("All job types")
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError("")
      try {
        const [publicJobs, ownJobs] = await Promise.all([
          getJobListings(),
          loggedIn ? getMyJobListings() : Promise.resolve([]),
        ])
        if (active) {
          setListings(publicJobs)
          setMyListings(ownJobs)
        }
      } catch (loadError) {
        console.error("Could not load job listings:", loadError)
        if (active) {
          setListings([])
          setError(getErrorMessage(loadError, "Could not load job listings."))
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [loggedIn, reloadKey])

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase()
    return listings.filter((job) => {
      const matchesQuery = !query || [job.title, job.company, job.location, job.description]
        .some((value) => value.toLowerCase().includes(query))
      return matchesQuery && (typeFilter === "All job types" || job.employment_type === typeFilter)
    })
  }, [listings, search, typeFilter])

  function startPosting() {
    go(loggedIn ? "/post-job" : "/login?next=%2Fpost-job")
  }

  return (
    <main className="jobs-page">
      <section className="jobs-hero">
        <div className="jobs-hero-inner">
          <div className="jobs-hero-copy">
            <p className="jobs-eyebrow">GwaliorWale · Jobs & Careers</p>
            <h1>Good work starts <span>close to home.</span></h1>
            <p>Find your next role, meet local employers, and help Gwalior grow—one opportunity at a time.</p>
            <div className="jobs-hero-actions">
              <button type="button" onClick={() => document.getElementById("open-roles")?.scrollIntoView({ behavior: "smooth" })} className="job-button job-button-light">Explore open roles <span aria-hidden="true">↓</span></button>
              <button type="button" onClick={startPosting} className="job-button job-button-hero-outline">Post an opportunity</button>
            </div>
          </div>
          <div className="jobs-hero-note">
            <span className="jobs-hero-note-icon"><BriefcaseIcon /></span>
            <div><strong>Made for Gwalior</strong><span>Local roles, real connections.</span></div>
            <span className="jobs-hero-note-mark">GW</span>
          </div>
        </div>
      </section>

      <section className="jobs-content" id="open-roles">
        <div className="jobs-content-heading">
          <div>
            <p className="jobs-section-kicker">Find your fit</p>
            <h2>Opportunities in Gwalior</h2>
            <p className="jobs-section-subtitle">A growing list of roles shared by local employers.</p>
          </div>
          <div className="jobs-heading-actions">
            {loggedIn && <button type="button" onClick={() => {
              setActiveTab("manage")
              document.getElementById("job-list-results")?.scrollIntoView({ behavior: "smooth", block: "start" })
            }} className="job-button job-button-outline">My job listings{myListings.length > 0 && <span className="jobs-heading-count">{myListings.length}</span>}</button>}
            <button type="button" onClick={startPosting} className="job-button job-button-primary">
              <span aria-hidden="true">+</span> Post a job
            </button>
          </div>
        </div>

        <div className="jobs-toolbar">
          {loggedIn && (
            <div className="jobs-tabs" role="tablist" aria-label="Job listings">
              <button type="button" role="tab" aria-selected={activeTab === "browse"} onClick={() => setActiveTab("browse")}>Browse jobs</button>
              <button type="button" role="tab" aria-selected={activeTab === "manage"} onClick={() => setActiveTab("manage")}>My job listings{myListings.length > 0 && <span>{myListings.length}</span>}</button>
            </div>
          )}
          <div className="jobs-filters">
            <label className="jobs-search">
              <span aria-hidden="true">⌕</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title, company, or location" aria-label="Search jobs" />
            </label>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter by job type">
              <option>All job types</option>
              {employmentTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="job-load-error">
          <ErrorNote>{`${error}. Check that your active job listings are in the connected Supabase project and that its public-read policy is applied.`}</ErrorNote>
          <button type="button" className="job-back-link" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>
        </div>}
        <div id="job-list-results" className="job-list-results">
        {!loading && activeTab === "manage" && !error && myListings.length > 0 && (
          <div className="job-owner-list-heading">
            <div><h3>Your job listings</h3><p>Check each listing’s status and renewal date here.</p></div>
            <div className="job-owner-status-legend">
              <span><i className="active" />Active</span>
              <span><i className="expired" />Expired</span>
              <span><i className="closed" />Closed</span>
            </div>
          </div>
        )}
        {loading ? <LoadingNote /> : activeTab === "manage" ? (
          myListings.length ? (
            <div className="jobs-results">
              {myListings.map((job) => <ManagedJob key={job.id} job={job} onUpdate={(updated) => setMyListings((items) => items.map((item) => item.id === updated.id ? updated : item))} />)}
            </div>
          ) : <EmptyJobs mine onPost={startPosting} />
        ) : filteredJobs.length ? (
          <div className="jobs-results">
            <p className="jobs-result-count">{filteredJobs.length} {filteredJobs.length === 1 ? "opportunity" : "opportunities"}</p>
            {filteredJobs.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        ) : listings.length ? (
          <div className="job-empty-state">
            <span className="job-empty-icon"><BriefcaseIcon /></span>
            <h2>No matching opportunities</h2>
            <p>Try a different title, company, location, or job type.</p>
            <button type="button" className="job-button job-button-primary" onClick={() => { setSearch(""); setTypeFilter("All job types") }}>Clear filters</button>
          </div>
        ) : (
          <div className="job-empty-state">
            <span className="job-empty-icon"><BriefcaseIcon /></span>
            <h2>No public active job listings found</h2>
            <p>Jobs can be browsed without signing in. If active listings already exist, check that they are in the connected Supabase project and its public-read policy is applied.</p>
            <button type="button" className="job-button job-button-primary" onClick={startPosting}>Post a job</button>
          </div>
        )}
        </div>
      </section>
      <div className="jobs-mobile-post">
        <button type="button" onClick={startPosting} className="job-button job-button-primary job-button-full">
          <span aria-hidden="true">＋</span> Post an opportunity
        </button>
      </div>
    </main>
  )
}

function ManagedJob({ job, onUpdate }: { job: JobListing; onUpdate: (job: JobListing) => void }) {
  const listingState = getListingState(job)
  const expired = listingState.state === "expired"
  const [open, setOpen] = useState(false)
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function toggleApplications() {
    setOpen((value) => !value)
    if (open || applications.length || loading) return
    setLoading(true)
    setError("")
    try {
      setApplications(await getJobApplications(job.id))
    } catch (loadError) {
      console.error("Could not load job applications:", loadError)
      setError(getErrorMessage(loadError, "Could not load applications."))
    } finally {
      setLoading(false)
    }
  }

  async function toggleStatus() {
    setSaving(true)
    setError("")
    try {
      const status = job.status === "active" ? "closed" : "active"
      await updateJobStatus(job.id, status)
      onUpdate({ ...job, status })
    } catch (updateError) {
      console.error("Could not update job status:", updateError)
      setError(getErrorMessage(updateError, "Could not update job status."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="job-managed-item">
      <JobCard job={job} owner />
      <div className="job-management-actions">
        <button type="button" onClick={() => void toggleApplications()}>{open ? "Hide applicants" : "View applicants"}</button>
        {!expired && <button type="button" disabled={saving} onClick={() => void toggleStatus()}>{saving ? "Saving…" : job.status === "active" ? "Close listing" : "Reopen listing"}</button>}
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      {expired && <RenewJobListing job={job} onRenewed={onUpdate} />}
      {open && (loading ? <LoadingNote /> : applications.length ? (
        <div className="job-applications">
          <h3>{applications.length} {applications.length === 1 ? "application" : "applications"}</h3>
          {applications.map((application) => (
            <article key={application.id} className="job-application">
              <div><strong>{application.applicant_name}</strong><time>{formatDate(application.created_at)}</time></div>
              <p><a href={`mailto:${application.applicant_email}`}>{application.applicant_email}</a>{application.applicant_phone && <> · <a href={`tel:${application.applicant_phone}`}>{application.applicant_phone}</a></>}</p>
              {application.cover_letter && <blockquote>{application.cover_letter}</blockquote>}
            </article>
          ))}
        </div>
      ) : <p className="job-applications-empty">No applications received yet.</p>)}
    </div>
  )
}

function RenewJobListing({ job, onRenewed }: { job: JobListing; onRenewed: (job: JobListing) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [modalClosing, setModalClosing] = useState(false)
  const [days, setDays] = useState(30)
  const [submitting, setSubmitting] = useState(false)
  const [pendingPayment, setPendingPayment] = useState<RazorpayPaymentResponse | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!expanded) return
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
  }, [expanded])

  async function confirmPayment(payment: RazorpayPaymentResponse) {
    setSubmitting(true)
    setError("")
    try {
      const renewedJobId = await verifyJobPayment({
        order_id: payment.razorpay_order_id,
        payment_id: payment.razorpay_payment_id,
        signature: payment.razorpay_signature,
      })
      if (renewedJobId !== job.id) throw new Error("The payment was confirmed, but the wrong job listing was returned. Retry verification.")
      setPendingPayment(null)
      onRenewed({
        ...job,
        status: "active",
        expires_at: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
      })
    } catch (verificationError) {
      console.error("Could not verify job renewal payment:", verificationError)
      setPendingPayment(payment)
      setError("Payment may have gone through, but we couldn't confirm it yet. Retry verification below; don't pay again.")
    } finally {
      setSubmitting(false)
    }
  }

  async function startRenewal() {
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      setError("Choose a renewal duration from 1 to 365 days.")
      return
    }
    if (pendingPayment) {
      setError("Verify the previous payment before starting another renewal.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const order = await createJobPaymentOrder(null, days, job.id)
      await loadRazorpayCheckout()
      if (!window.Razorpay) throw new Error("Razorpay checkout did not initialize. Please try again.")
      const currentUser = await getCurrentUser()
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Gwalior Connect",
        description: `Renew ${job.title} for ${days} day${days === 1 ? "" : "s"}`,
        order_id: order.orderId,
        prefill: currentUser?.email ? { email: currentUser.email } : {},
        theme: { color: "#2863bd" },
        handler: (payment) => void confirmPayment(payment),
        modal: { ondismiss: () => setSubmitting(false) },
      })
      checkout.on("payment.failed", (response) => {
        setError(response.error?.description || "Payment failed. Your listing remains expired.")
        setSubmitting(false)
      })
      checkout.open()
    } catch (paymentError) {
      console.error("Could not start job renewal payment:", paymentError)
      setError(getErrorMessage(paymentError, "Could not start this renewal payment."))
      setSubmitting(false)
    }
  }

  return (
    <div className="job-renewal">
      <div className="job-renewal-summary">
        <div className="job-renewal-summary-copy">
          <span className="job-renewal-summary-icon"><BriefcaseIcon /></span>
          <div>
            <span className="job-renewal-expired-label">Listing expired</span>
            <p>{job.expires_at ? `Expired ${formatDate(job.expires_at)}.` : "This listing has expired."} Renew it to make it visible to candidates again.</p>
          </div>
        </div>
        <button type="button" className="job-button job-button-primary" onClick={() => {
          setModalClosing(false)
          setExpanded(true)
        }}>Renew listing</button>
      </div>
      {expanded && createPortal(
        <div
          className={`post-detail-comments-backdrop job-renewal-modal-backdrop${modalClosing ? " is-closing" : ""}`}
          onClick={() => setModalClosing(true)}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget && modalClosing) {
              setExpanded(false)
              setModalClosing(false)
            }
          }}
        >
          <section
            className={`post-detail-comments job-renewal-dialog${modalClosing ? " is-closing" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`renew-job-title-${job.id}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="job-renewal-form job-renewal-modal-form">
              <div className="job-renewal-heading">
                <div className="job-renewal-heading-copy">
                  <span className="job-renewal-heading-icon"><BriefcaseIcon /></span>
                  <span><strong id={`renew-job-title-${job.id}`}>Renew this job</strong><span>Republish this listing for a new paid term.</span></span>
                </div>
                <button type="button" aria-label="Close renewal options" onClick={() => setModalClosing(true)}>×</button>
              </div>
              <div className="job-renewal-options">
                <label htmlFor={`renewal-days-${job.id}`}>Renewal duration
                  <select id={`renewal-days-${job.id}`} value={days} disabled={submitting || Boolean(pendingPayment)} onChange={(event) => {
                    const selectedDays = Number(event.currentTarget.value)
                    setDays(selectedDays)
                    setError("")
                  }}>
                    {[7, 14, 30, 60, 90, 180, 365].map((duration) => <option key={duration} value={duration}>{duration} days</option>)}
                  </select>
                </label>
                <div className="job-renewal-price-card">
                  <span>Total renewal fee</span>
                  <strong>₹{Number.isInteger(days) && days > 0 && days <= 365 ? days * 10 : 0}</strong>
                  <small>₹10 per day · Includes {days} days</small>
                </div>
              </div>
              <p className="job-renewal-visibility-note"><span aria-hidden="true">✓</span> Your job becomes visible again after payment is confirmed.</p>
              {error && <p role="alert" className="job-renewal-error">{error}</p>}
              {pendingPayment && <button type="button" disabled={submitting} className="job-payment-retry" onClick={() => void confirmPayment(pendingPayment)}>Retry payment verification</button>}
              <button type="button" disabled={submitting || Boolean(pendingPayment)} className="job-button job-button-primary" onClick={() => void startRenewal()}>
                {submitting ? "Waiting for payment…" : `Continue to payment · ₹${Number.isInteger(days) && days > 0 && days <= 365 ? days * 10 : 0}`}
              </button>
              <p className="job-renewal-secure-note">Secure payment powered by Razorpay</p>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </div>
  )
}

export function JobDetail({ id, loggedIn }: { id: string; loggedIn: boolean }) {
  const [job, setJob] = useState<JobListing | null>(null)
  const [sample, setSample] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [applied, setApplied] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [applicationError, setApplicationError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError("")
      setIsOwner(false)
      setApplied(false)
      setSample(false)
      try {
        const demoJob = sampleJobs.find((sampleJob) => sampleJob.id === id)
        if (demoJob) {
          if (active) {
            setJob(demoJob)
            setSample(true)
          }
          return
        }
        const listing = await getJobListing(id)
        if (!listing) {
          if (active) setError("This job listing could not be found or is no longer available.")
          return
        }
        if (active) setJob(listing)
        if (loggedIn) {
          const user = await getCurrentUser()
          if (active) setIsOwner(user?.id === listing.owner_id)
          const alreadyApplied = await hasAppliedToJob(id)
          if (active) setApplied(alreadyApplied)
        }
      } catch (loadError) {
        console.error("Could not load job details:", loadError)
        if (active)         setError(getErrorMessage(loadError, "Could not load job details."))
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [id, loggedIn])

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!job) return
    if (!loggedIn) {
      go(`/login?next=${encodeURIComponent(`/job/${job.id}`)}`)
      return
    }
    const formData = new FormData(event.currentTarget)
    setSubmitting(true)
    setApplicationError("")
    try {
      await applyForJob({
        job_id: job.id,
        applicant_name: String(formData.get("applicant_name") ?? ""),
        applicant_email: String(formData.get("applicant_email") ?? ""),
        applicant_phone: String(formData.get("applicant_phone") ?? ""),
        cover_letter: String(formData.get("cover_letter") ?? ""),
      })
      setApplied(true)
    } catch (submitError) {
      console.error("Could not submit job application:", submitError)
      setApplicationError(getErrorMessage(submitError, "Could not submit your application."))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <main className="jobs-page"><div className="job-detail-container"><LoadingNote /></div></main>
  if (error || !job) return <main className="jobs-page"><div className="job-detail-container"><ErrorNote>{error || "Job not found."}</ErrorNote><button className="job-back-link" onClick={() => go("/jobs")}>← Back to jobs</button></div></main>

  return (
    <main className="jobs-page">
      <div className="job-detail-container">
        <button type="button" className="job-back-link" onClick={() => go("/jobs")}>← All opportunities</button>
        <div className="job-detail-layout">
          <article className="job-detail-main">
            <header className="job-detail-heading">
              <span className="job-company-mark job-company-mark-large"><BriefcaseIcon /></span>
              <div>
                <p className="jobs-section-kicker">{job.company} · Gwalior</p>
                <h1>{job.title}</h1>
                <p className="job-detail-location">{job.location} <i /> Posted {formatDate(job.created_at)}</p>
              </div>
            </header>
            <div className="job-detail-tags">
              <span>{job.employment_type}</span><span>{job.workplace_type}</span>{job.salary && <span>{job.salary}</span>}
            </div>
            <section className="job-description">
              <h2>About the role</h2>
              <p>{job.description}</p>
            </section>
            {job.requirements && <section className="job-description">
              <h2>What you’ll bring</h2>
              <p>{job.requirements}</p>
            </section>}
          </article>
          <aside className="job-apply-panel" id="job-apply-panel">
            <p className="jobs-section-kicker">{sample ? "Preview listing" : "Interested?"}</p>
            <h2>{sample ? "Sample opportunity" : "Apply for this role"}</h2>
            <p className="job-apply-intro">{sample ? "This example shows how an employer’s job details will appear." : "Send your details directly to the employer. Your application is shared only with the person who posted this job."}</p>
            {sample ? <div className="job-apply-notice">This is a sample listing for preview only. It isn’t a live vacancy, and applications aren’t available.</div> : isOwner ? <div className="job-apply-notice">You posted this job. View and manage applications from My listings.</div> : job.status !== "active" ? <div className="job-apply-notice">This listing is closed and no longer accepting applications.</div> : applied ? (
              <div className="job-apply-success"><strong>Application submitted</strong><span>Your details have been sent to the job poster.</span></div>
            ) : !loggedIn ? (
              <>
                <div className="job-apply-notice">Sign in to apply. Your application details will only be visible to the employer.</div>
                <button type="button" className="job-button job-button-primary job-button-full" onClick={() => go(`/login?next=${encodeURIComponent(`/job/${job.id}`)}`)}>Sign in to apply</button>
              </>
            ) : (
              <form className="job-application-form" onSubmit={(event) => void submitApplication(event)}>
                <label>Your name<input name="applicant_name" required minLength={2} maxLength={100} /></label>
                <label>Email<input name="applicant_email" type="email" required maxLength={254} /></label>
                <label>Phone<input name="applicant_phone" type="tel" required minLength={5} maxLength={30} /></label>
                <label>Note to the employer <span>(optional)</span><textarea name="cover_letter" rows={4} maxLength={3000} placeholder="Share a little about why you’re a good fit." /></label>
                {applicationError && <ErrorNote>{applicationError}</ErrorNote>}
                <button type="submit" disabled={submitting} className="job-button job-button-primary job-button-full">{submitting ? "Sending application…" : "Submit application"}</button>
              </form>
            )}
          </aside>
        </div>
      </div>
      {!sample && !isOwner && job.status === "active" && !applied && (
        <div className="job-mobile-apply">
          <button type="button" className="job-button job-button-primary job-button-full" onClick={() => {
            if (!loggedIn) {
              go(`/login?next=${encodeURIComponent(`/job/${job.id}`)}`)
              return
            }
            document.getElementById("job-apply-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })
          }}>
            {loggedIn ? "Apply for this role" : "Sign in to apply"}
          </button>
        </div>
      )}
    </main>
  )
}

export function PostJobPage({ loggedIn }: JobsPageProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [days, setDays] = useState(1)
  const [pendingPayment, setPendingPayment] = useState<RazorpayPaymentResponse | null>(null)

  useEffect(() => {
    if (!loggedIn) go("/login?next=%2Fpost-job")
  }, [loggedIn])

  async function confirmPayment(payment: RazorpayPaymentResponse) {
    setSubmitting(true)
    setError("")
    try {
      const jobId = await verifyJobPayment({
        order_id: payment.razorpay_order_id,
        payment_id: payment.razorpay_payment_id,
        signature: payment.razorpay_signature,
      })
      setPendingPayment(null)
      go(`/job/${jobId}`)
    } catch (verificationError) {
      console.error("Could not verify job payment:", verificationError)
      setPendingPayment(payment)
      setError("Payment may have gone through, but we couldn't confirm it yet. Retry verification below; don't pay again.")
    } finally {
      setSubmitting(false)
    }
  }

  async function submitJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!loggedIn) {
      go("/login?next=%2Fpost-job")
      return
    }
    if (pendingPayment) {
      setError("Verify the previous payment before starting another job payment.")
      return
    }
    const form = event.currentTarget
    const formData = new FormData(form)
    const selectedDays = Number(formData.get("days"))
    if (!Number.isInteger(selectedDays) || selectedDays < 1 || selectedDays > 365) {
      setError("Choose a listing duration from 1 to 365 days.")
      return
    }
    const job = {
      title: String(formData.get("title") ?? ""),
      company: String(formData.get("company") ?? ""),
      location: String(formData.get("location") ?? ""),
      employment_type: employmentTypes.find((type) => type === formData.get("employment_type")) ?? "Full-time",
      workplace_type: workplaceTypes.find((type) => type === formData.get("workplace_type")) ?? "On-site",
      salary: String(formData.get("salary") ?? ""),
      description: String(formData.get("description") ?? ""),
      requirements: String(formData.get("requirements") ?? ""),
    }
    setSubmitting(true)
    setError("")
    try {
      const order = await createJobPaymentOrder(job, selectedDays)
      await loadRazorpayCheckout()
      if (!window.Razorpay) throw new Error("Razorpay checkout did not initialize. Please try again.")
      const currentUser = await getCurrentUser()
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Gwalior Connect",
        description: `Job listing for ${selectedDays} day${selectedDays === 1 ? "" : "s"}`,
        order_id: order.orderId,
        prefill: currentUser?.email ? { email: currentUser.email } : {},
        theme: { color: "#2863bd" },
        handler: (payment) => void confirmPayment(payment),
        modal: { ondismiss: () => setSubmitting(false) },
      })
      checkout.on("payment.failed", (response) => {
        setError(response.error?.description || "Payment failed. Your job has not been published.")
        setSubmitting(false)
      })
      checkout.open()
    } catch (submitError) {
      console.error("Could not start job publication:", submitError)
      setError(getErrorMessage(submitError, "Could not start this job payment."))
      setSubmitting(false)
    }
  }

  return (
    <main className="jobs-page job-post-page">
      <div className="job-post-container">
        <button type="button" className="job-back-link" onClick={() => go("/jobs")}>← Back to opportunities</button>
        <div className="job-post-heading">
          <p className="jobs-section-kicker">For local employers</p>
          <h1>Post a job</h1>
          <p>Share a clear, useful listing and meet people ready to build their careers in Gwalior.</p>
        </div>
        {!loggedIn ? <div className="job-feedback">Taking you to sign in…</div> : (
          <form className="job-post-form" onSubmit={(event) => void submitJob(event)}>
            <div className="job-form-section">
              <h2>Role details</h2>
              <div className="job-form-grid">
                <label>Job title<input name="title" required minLength={3} maxLength={100} placeholder="e.g. Sales Executive" /></label>
                <label>Company or organization<input name="company" required minLength={2} maxLength={100} placeholder="Your business name" /></label>
                <label>Location<input name="location" required minLength={2} maxLength={100} placeholder="e.g. City Centre, Gwalior" /></label>
                <label>Employment type<select name="employment_type">{employmentTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
                <label>Work arrangement<select name="workplace_type">{workplaceTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
                <label>Salary or pay range <span>(optional)</span><input name="salary" maxLength={100} placeholder="e.g. ₹18,000–₹25,000 per month" /></label>
              </div>
            </div>
            <div className="job-form-section">
              <h2>Help applicants understand the role</h2>
              <label>Job description<textarea name="description" required minLength={20} maxLength={5000} rows={7} placeholder="Describe the role, responsibilities, and what a typical day looks like." /></label>
              <label>Qualifications and requirements <span>(optional)</span><textarea name="requirements" maxLength={3000} rows={5} placeholder="Experience, skills, qualifications, or anything else applicants should know." /></label>
            </div>
            <div className="job-form-section">
              <h2>Listing duration and payment</h2>
              <div className="job-form-grid job-payment-grid">
                <label>How long should this job stay listed?
                  <input name="days" type="number" min={1} max={365} step={1} value={days}
                    onChange={(event) => setDays(Number(event.currentTarget.value))} required />
                </label>
                <p className="job-payment-total">₹{Number.isInteger(days) && days > 0 && days <= 365 ? days * 10 : 0} <span>total · ₹10 per day · up to 365 days</span></p>
              </div>
              <p className="job-payment-note">Your listing will be published after Razorpay confirms payment and will automatically expire at the end of this period.</p>
            </div>
            {error && <ErrorNote>{error}</ErrorNote>}
            <div className="job-post-submit">
              <div>
                <p>Your signed-in account will own this listing and receive applications.</p>
                {pendingPayment && <button type="button" className="job-payment-retry" disabled={submitting} onClick={() => void confirmPayment(pendingPayment)}>Retry payment verification</button>}
              </div>
              <button type="submit" disabled={submitting || Boolean(pendingPayment)} className="job-button job-button-primary">{submitting ? "Waiting for payment…" : `Pay ₹${days * 10} and publish`}</button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}

export function JobHighlights() {
  const [listings, setListings] = useState<JobListing[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => {
    let active = true
    getJobListings()
      .then((jobs) => { if (active) setListings((jobs.length ? jobs : sampleJobs).slice(0, 3)) })
      .catch((loadError) => {
        console.error("Could not load home page job highlights:", loadError)
        if (active) {
          setError(getErrorMessage(loadError, "Job listings are temporarily unavailable."))
          setListings(sampleJobs.slice(0, 3))
        }
      })
      .finally(() => { if (active) setLoaded(true) })
    return () => { active = false }
  }, [])
  if (!loaded) return (
    <div className="job-highlights-empty">
      <p>Loading local opportunities…</p>
      <button type="button" onClick={() => go("/jobs")}>Explore jobs <span aria-hidden="true">→</span></button>
    </div>
  )
  return (
    <>
      {error && <p className="job-sample-notice">Showing sample jobs. Live listings are temporarily unavailable.</p>}
      {!listings.length && <div className="job-highlights-empty"><p>No active job listings just yet.</p><button type="button" onClick={() => go("/jobs")}>Explore jobs <span aria-hidden="true">→</span></button></div>}
      {listings.length > 0 && <div className="job-highlights-list">{listings.map((job) => <JobCard key={job.id} job={job} />)}</div>}
    </>
  )
}
