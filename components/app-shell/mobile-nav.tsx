"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { NavLinks } from "./nav-links"

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="icon" className="md:hidden" aria-label="Open navigation" />}>
        <Menu aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="top" className="on-navy gap-0 border-sidebar-border bg-navy pb-3 text-white">
        <div className="flex flex-col gap-0.5 px-5 py-4">
          <SheetTitle className="text-[15px] font-semibold text-white">Advising Outreach</SheetTitle>
          <span className="text-[12px] text-white/75">Student Success · Prototype</span>
        </div>
        <nav aria-label="Primary">
          <NavLinks onNavigate={() => setOpen(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  )
}
