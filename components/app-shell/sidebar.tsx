import { NavLinks } from "./nav-links"

export function AppTitle() {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[15px] font-semibold tracking-tight text-white">Advising Outreach</span>
      <span className="text-[12px] text-white/75">Student Success · Prototype</span>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="on-navy fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-navy text-white md:flex">
      <div className="border-b border-sidebar-border px-5 py-4">
        <AppTitle />
      </div>
      <nav aria-label="Primary" className="flex-1 py-3">
        <NavLinks />
      </nav>
      <p className="border-t border-sidebar-border px-5 py-3 text-[12px] leading-relaxed text-white/75">
        Scores are rule-based. Fictional student data, for demonstration only.
      </p>
    </aside>
  )
}
