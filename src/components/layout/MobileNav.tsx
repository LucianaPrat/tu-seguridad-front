import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { SidebarContent } from "./Sidebar"

/**
 * The sidebar as a drawer, below `lg`. Same menu, same order — Sidebar owns the
 * markup and this owns the frame around it.
 */
export default function MobileNav({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-60 max-w-[85vw] gap-0 border-0 bg-[#0d4f47] p-0 overflow-y-auto [&>button]:text-white/70"
      >
        {/* Radix warns on a dialog with no accessible title, and the drawer's
            own title is the logo block inside SidebarContent. */}
        <SheetTitle className="sr-only">Menú</SheetTitle>
        <SidebarContent onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}
