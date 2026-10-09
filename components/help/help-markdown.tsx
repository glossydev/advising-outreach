"use client"

import Link from "next/link"
import ReactMarkdown, { type Components, type Options } from "react-markdown"
import remarkGfm from "remark-gfm"

/*
 * Markdown for the help pages, styled with the app's tokens. Images become captioned figures
 * (the "title" in ![alt](src "title") is the caption), and blockquotes become tip boxes.
 */

interface HastNode {
  type: string
  value?: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Wraps search terms in <mark>, so matches stand out in the text. */
function rehypeMark(terms: string[]) {
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi")
  const walk = (node: HastNode) => {
    if (!node.children) return
    node.children = node.children.flatMap((child): HastNode[] => {
      if (child.type === "text" && child.value) {
        const parts = child.value.split(pattern)
        if (parts.length === 1) return [child]
        return parts
          .map((part, i): HastNode =>
            i % 2 === 1
              ? { type: "element", tagName: "mark", properties: {}, children: [{ type: "text", value: part }] }
              : { type: "text", value: part },
          )
          .filter((n) => n.type === "element" || n.value)
      }
      walk(child)
      return [child]
    })
  }
  return (tree: HastNode) => {
    if (terms.length) walk(tree)
  }
}

const components: Components = {
  p({ node, children }) {
    // A paragraph holding only an image renders as a figure, which can't sit inside a <p>.
    const only = node?.children.length === 1 ? node.children[0] : null
    if (only?.type === "element" && only.tagName === "img") return <>{children}</>
    return <p className="my-3 leading-relaxed text-pretty">{children}</p>
  },
  a({ href = "", children }) {
    const className = "text-azurite underline underline-offset-2 hover:text-navy"
    if (href.startsWith("#")) {
      return (
        <a href={href} className={className}>
          {children}
        </a>
      )
    }
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    )
  },
  img({ src, alt, title }) {
    if (typeof src !== "string") return null
    return (
      <figure className="my-5">
        <a href={src} target="_blank" className="inline-block max-w-full rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50">
          {/* eslint-disable-next-line @next/next/no-img-element -- static screenshots, shown as they are */}
          <img src={src} alt={alt ?? ""} loading="lazy" className="max-w-full rounded-lg border border-border shadow-sm" />
          <span className="sr-only"> (opens the full-size image in a new tab)</span>
        </a>
        {title && <figcaption className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{title}</figcaption>}
      </figure>
    )
  },
  ul: ({ children }) => <ul className="my-3 ml-5 list-disc space-y-1.5 leading-relaxed marker:text-shade">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 ml-5 list-decimal space-y-1.5 leading-relaxed marker:text-shade">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold text-navy">{children}</strong>,
  code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-navy">{children}</code>,
  h4: ({ children }) => <h4 className="mt-5 mb-1 font-semibold text-navy">{children}</h4>,
  blockquote: ({ children }) => (
    <aside className="my-4 rounded-md border-l-4 border-azurite bg-cloud px-4 py-1 text-[15px] [&_p]:my-2">{children}</aside>
  ),
  table: ({ children }) => (
    <div className="relative my-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-[14px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-cloud text-left text-navy">{children}</thead>,
  th: ({ children }) => <th className="px-3 py-2 font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-t border-border px-3 py-2 align-top">{children}</td>,
  mark: ({ children }) => <mark className="rounded-sm bg-amber/25 px-0.5 text-inherit">{children}</mark>,
}

export function HelpMarkdown({ children, highlight = [] }: { children: string; highlight?: string[] }) {
  const rehypePlugins = (highlight.length ? [[rehypeMark, highlight]] : []) as Options["rehypePlugins"]
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={rehypePlugins} components={components}>
      {children}
    </ReactMarkdown>
  )
}
