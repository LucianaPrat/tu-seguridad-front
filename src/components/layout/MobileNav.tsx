import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { SidebarContent } from "./Sidebar"
import { useNavStore } from "@/stores/navStore"

/**
 * The sidebar as a drawer, below `lg`. Same menu, same order — Sidebar owns the
 * markup and this owns the frame around it.
 */
export default function MobileNav() {
  const { open, tourActive, setOpen } = useNavStore()

  return (
    /*
     * `modal={false}` while the tour runs. Radix's modal branch traps focus,
     * runs `hideOthers` over everything outside the panel and dismisses on an
     * outside pointer-down — which between them would leave the driver.js
     * popover unreachable by keyboard, invisible to a screen reader, and
     * self-closing on the first click of Siguiente.
     */
    <Sheet open={open} onOpenChange={setOpen} modal={!tourActive}>
      <SheetContent
        side="left"
        data-nav="mobile"
        showCloseButton={!tourActive}
        onInteractOutside={(e) => {
          if (tourActive) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          // driver.js owns Escape during the tour, and its handler marks the
          // tour seen. Radix closing the drawer underneath would skip that.
          if (tourActive) e.preventDefault()
        }}
        className="w-60 max-w-[85vw] gap-0 border-0 bg-[#0d4f47] p-0 overflow-y-auto [&>button]:text-white/70"
      >
        {/* Radix warns on a dialog with no accessible title, and the drawer's
            own title is the logo block inside SidebarContent. */}
        <SheetTitle className="sr-only">Menú</SheetTitle>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
