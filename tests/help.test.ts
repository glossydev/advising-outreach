import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { getHelpSections, parseHelp, plainText } from "@/lib/help"

describe("parseHelp", () => {
  const source = [
    "# Title, ignored",
    "Text before the first section is ignored.",
    "## Getting started",
    "Intro text.",
    "### First topic",
    "Body with a [link](#somewhere).",
    "```",
    "## Not a heading inside a code fence",
    "```",
    "### First topic",
    "Same title again.",
    "## Q & A",
  ].join("\n")
  const sections = parseHelp(source)

  it("splits ## into sections and ### into topics", () => {
    expect(sections.map((s) => s.title)).toEqual(["Getting started", "Q & A"])
    expect(sections[0].intro).toBe("Intro text.")
    expect(sections[0].topics.map((t) => t.title)).toEqual(["First topic", "First topic"])
  })

  it("ignores headings inside code fences", () => {
    expect(sections[0].topics[0].markdown).toContain("## Not a heading inside a code fence")
  })

  it("gives every heading a unique id", () => {
    expect(sections[0].topics.map((t) => t.id)).toEqual(["first-topic", "first-topic-2"])
    expect(sections[1].id).toBe("q-and-a")
  })

  it("searches plain text, not markdown", () => {
    expect(plainText("**Bold** and [a link](/x) and ![a picture](/y.jpg)")).toBe("bold and a link and a picture")
    expect(sections[0].topics[0].text).toContain("first topic")
  })
})

describe("content/help.md", () => {
  const source = readFileSync(path.join("content", "help.md"), "utf8")
  const sections = getHelpSections()
  const ids = new Set(sections.flatMap((s) => [s.id, ...s.topics.map((t) => t.id)]))

  it("has sections with content", () => {
    expect(sections.length).toBeGreaterThan(5)
    for (const s of sections) expect(s.intro.length + s.topics.length, s.title).toBeGreaterThan(0)
  })

  it("links only to headings that exist", () => {
    const anchors = [...source.matchAll(/\]\(#([^)]+)\)/g)].map((m) => m[1])
    expect(anchors.length).toBeGreaterThan(0)
    expect(anchors.filter((a) => !ids.has(a))).toEqual([])
  })

  it("shows only screenshots that exist", () => {
    const images = [...source.matchAll(/!\[[^\]]*\]\((\/[^\s)]+)/g)].map((m) => m[1])
    expect(images.length).toBeGreaterThan(20)
    expect(images.filter((src) => !existsSync(path.join("public", src)))).toEqual([])
  })
})
