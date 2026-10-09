import { readFileSync } from "node:fs"
import path from "node:path"

/*
 * The help pages live in content/help.md. It is split here into sections (## headings) and topics
 * (### headings), so the page can build its table of contents and search topic by topic.
 */

export interface HelpTopic {
  id: string
  title: string
  markdown: string
  /** Lower-case plain text of the title and body, for search. */
  text: string
}

export interface HelpSection {
  id: string
  title: string
  /** Text between the ## heading and the first ### heading. */
  intro: string
  introText: string
  topics: HelpTopic[]
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/** Markdown to rough plain text: enough for matching search terms, not for display. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

export function parseHelp(source: string): HelpSection[] {
  const sections: HelpSection[] = []
  const used = new Set<string>()
  const uniqueId = (title: string) => {
    const base = slugify(title)
    let id = base
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`
    used.add(id)
    return id
  }

  let section: HelpSection | null = null
  let topic: HelpTopic | null = null
  let buffer: string[] = []
  let inFence = false

  const flush = () => {
    const body = buffer.join("\n").trim()
    buffer = []
    if (topic) {
      topic.markdown = body
      topic.text = plainText(`${topic.title}\n${body}`)
    } else if (section) {
      section.intro = body
      section.introText = plainText(`${section.title}\n${body}`)
    }
  }

  for (const line of source.replace(/\r\n?/g, "\n").split("\n")) {
    if (line.startsWith("```")) inFence = !inFence
    const h2 = !inFence && /^## (.+)$/.exec(line)
    const h3 = !inFence && /^### (.+)$/.exec(line)
    if (h2) {
      flush()
      topic = null
      section = { id: uniqueId(h2[1]), title: h2[1].trim(), intro: "", introText: "", topics: [] }
      sections.push(section)
    } else if (h3 && section) {
      flush()
      topic = { id: uniqueId(h3[1]), title: h3[1].trim(), markdown: "", text: "" }
      section.topics.push(topic)
    } else if (section && !/^# /.test(line)) {
      buffer.push(line)
    }
  }
  flush()
  return sections
}

export function getHelpSections(): HelpSection[] {
  const file = path.join(/* turbopackIgnore: true */ process.cwd(), "content", "help.md")
  return parseHelp(readFileSync(file, "utf8"))
}
