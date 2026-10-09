"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, BookOpen, ChevronDown, Search, X } from "lucide-react"
import type { HelpSection, HelpTopic } from "@/lib/help"
import { cn } from "@/lib/utils"
import { HelpMarkdown } from "./help-markdown"

/*
 * The help pages: a table of contents down the left, a search that narrows both the contents and
 * the page to the matching topics, and the guide itself. Every topic has its own anchor, so a
 * heading can be linked to directly (/help#logging-a-contact).
 */

interface VisibleSection {
  section: HelpSection
  showIntro: boolean
  topics: HelpTopic[]
}

function termsOf(query: string): string[] {
  return [...new Set(query.toLowerCase().split(/\s+/).filter((t) => t.length >= 2))]
}

const matchesAll = (text: string, terms: string[]) => terms.every((t) => text.includes(t))

function filterSections(sections: HelpSection[], terms: string[]): VisibleSection[] {
  if (!terms.length) return sections.map((section) => ({ section, showIntro: true, topics: section.topics }))
  return sections.flatMap((section) => {
    if (matchesAll(section.title.toLowerCase(), terms)) return [{ section, showIntro: true, topics: section.topics }]
    const topics = section.topics.filter((t) => matchesAll(t.text, terms))
    const showIntro = Boolean(section.intro) && matchesAll(section.introText, terms)
    return topics.length || showIntro ? [{ section, showIntro, topics }] : []
  })
}

function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>
  const pattern = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi")
  return (
    <>
      {text.split(pattern).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-sm bg-amber/25 px-0.5 text-inherit">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}

export function HelpCenter({ sections }: { sections: HelpSection[] }) {
  const [query, setQuery] = useState("")
  const [tocOpen, setTocOpen] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const asideRef = useRef<HTMLElement>(null)

  const terms = useMemo(() => termsOf(query), [query])
  const visible = useMemo(() => filterSections(sections, terms), [sections, terms])
  const topicCount = visible.reduce((n, v) => n + v.topics.length + (v.showIntro && v.section.intro && terms.length ? 1 : 0), 0)

  // "/" jumps to the search box, as on most documentation sites.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return
      if ((event.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable='true']")) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Highlight the contents entry for the heading nearest the top of the screen.
  useEffect(() => {
    const headings = Array.from(document.querySelectorAll<HTMLElement>("[data-toc-id]"))
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (top) setActive(top.target.id)
      },
      { rootMargin: "-72px 0px -65% 0px" },
    )
    headings.forEach((h) => observer.observe(h))
    return () => observer.disconnect()
  }, [visible])

  // Keep that entry in view when the contents are taller than the screen.
  useEffect(() => {
    const box = asideRef.current
    const link = active ? box?.querySelector<HTMLElement>(`a[href="#${CSS.escape(active)}"]`) : null
    if (!box || !link || box.scrollHeight <= box.clientHeight) return
    const top = link.offsetTop
    const bottom = top + link.offsetHeight
    if (top < box.scrollTop + 160) box.scrollTop = Math.max(0, top - 160)
    else if (bottom > box.scrollTop + box.clientHeight - 48) box.scrollTop = bottom - box.clientHeight + 48
  }, [active])

  const tocLink = (id: string, title: string, level: 2 | 3) => (
    <a
      href={`#${id}`}
      onClick={() => setTocOpen(false)}
      aria-current={active === id ? "location" : undefined}
      className={cn(
        "block rounded-md border-l-2 py-1 pr-2 text-[14px] leading-snug transition-colors outline-none hover:bg-muted hover:text-navy focus-visible:ring-3 focus-visible:ring-ring/50",
        level === 2 ? "pl-3 font-semibold text-navy" : "pl-6 text-muted-foreground",
        active === id ? "border-signal bg-cloud text-navy" : "border-transparent",
      )}
    >
      <Highlighted text={title} terms={terms} />
    </a>
  )

  return (
    <div className="min-h-dvh bg-card">
      <a
        href="#help-content"
        className="sr-only z-[60] rounded-md bg-card px-3 py-2 font-medium text-navy focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <header className="on-navy sticky top-0 z-20 flex h-14 items-center gap-3 bg-navy px-4 text-white sm:px-6">
        <BookOpen className="size-5 shrink-0" aria-hidden="true" />
        <p className="truncate font-semibold">
          Advising Outreach <span className="font-normal text-white/75 max-sm:hidden">· Help &amp; documentation</span>
          <span className="font-normal text-white/75 sm:hidden">help</span>
        </p>
        <Link
          href="/"
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-white/85 transition-colors hover:bg-arroyo/40 hover:text-white"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to the app
        </Link>
      </header>

      <div className="mx-auto flex max-w-[90rem] flex-col lg:flex-row">
        <aside
          ref={asideRef}
          className="border-b border-border bg-background lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-b-0">
          <div className="flex flex-col gap-3 p-4">
            <div role="search" className="flex flex-col gap-1.5">
              <label htmlFor="help-search" className="text-[13px] font-medium text-muted-foreground">
                Search the help
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  ref={inputRef}
                  id="help-search"
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setActive(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setQuery("")
                  }}
                  placeholder="Try “sensitive” or “import”"
                  autoComplete="off"
                  aria-describedby="help-search-hint help-search-status"
                  className="h-9 w-full rounded-md border border-input bg-card pr-8 pl-8 text-[14px] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-search-cancel-button]:hidden"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("")
                      inputRef.current?.focus()
                    }}
                    className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-navy"
                    aria-label="Clear the search"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                )}
              </div>
              <p id="help-search-hint" className="text-[12px] text-muted-foreground max-lg:hidden">
                Press <kbd className="rounded border border-border bg-card px-1 font-mono text-[11px]">/</kbd> to search from anywhere on this page.
              </p>
              <p id="help-search-status" aria-live="polite" className="text-[13px] font-medium text-navy empty:hidden">
                {terms.length ? (topicCount ? `${topicCount} ${topicCount === 1 ? "topic matches" : "topics match"}` : "No topics match") : ""}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setTocOpen((o) => !o)}
              aria-expanded={tocOpen}
              aria-controls="help-toc"
              className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-navy lg:hidden"
            >
              Contents
              <ChevronDown className={cn("size-4 transition-transform", tocOpen && "rotate-180")} aria-hidden="true" />
            </button>

            <nav id="help-toc" aria-label="Help contents" className={cn(!tocOpen && "hidden", "lg:block")}>
              <ul className="flex flex-col gap-0.5">
                {visible.map(({ section, topics }) => (
                  <li key={section.id}>
                    {tocLink(section.id, section.title, 2)}
                    {topics.length > 0 && (
                      <ul className="mt-0.5 mb-2 flex flex-col gap-0.5">
                        {topics.map((t) => (
                          <li key={t.id}>{tocLink(t.id, t.title, 3)}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>

        <main id="help-content" tabIndex={-1} className="min-w-0 flex-1 px-4 py-8 focus:outline-none sm:px-8 lg:px-12">
          <div className="max-w-[52rem]">
            <h1 className="text-3xl font-semibold tracking-tight text-navy">Advising Outreach help</h1>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              How to use each screen, what the numbers mean, and how the import decides what to flag. Screenshots use the
              sample data, with &ldquo;today&rdquo; fixed at Oct 5, 2026.
            </p>

            {visible.length === 0 && (
              <div className="mt-10 rounded-lg border border-dashed border-border px-6 py-10 text-center">
                <p className="font-semibold text-navy">Nothing in the help matches &ldquo;{query.trim()}&rdquo;</p>
                <p className="mt-1 text-muted-foreground">Try a shorter or different word, such as &ldquo;queue&rdquo;, &ldquo;note&rdquo; or &ldquo;date&rdquo;.</p>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="mt-4 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-navy hover:bg-muted"
                >
                  Clear the search
                </button>
              </div>
            )}

            {visible.map(({ section, showIntro, topics }) => (
              <section
                key={section.id}
                aria-labelledby={section.id}
                className="mt-12 border-t border-border pt-8 first-of-type:mt-8 first-of-type:border-t-0 first-of-type:pt-0"
              >
                <h2 id={section.id} data-toc-id className="scroll-mt-20 text-2xl font-semibold tracking-tight text-navy">
                  <Highlighted text={section.title} terms={terms} />
                </h2>
                {showIntro && section.intro && <HelpMarkdown highlight={terms}>{section.intro}</HelpMarkdown>}
                {topics.map((t) => (
                  <div key={t.id} className="mt-8">
                    <h3 id={t.id} data-toc-id className="scroll-mt-20 text-lg font-semibold text-navy">
                      <Highlighted text={t.title} terms={terms} />
                    </h3>
                    <HelpMarkdown highlight={terms}>{t.markdown}</HelpMarkdown>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
