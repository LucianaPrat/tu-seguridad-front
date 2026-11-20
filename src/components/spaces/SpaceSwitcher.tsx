import { useState } from "react"
import { Link } from "react-router-dom"
import { Check, ChevronsUpDown, Mail, Pencil, Plus } from "lucide-react"
import Modal from "@/components/common/Modal"
import SpaceNameForm from "./SpaceNameForm"
import { useSwitchSpace } from "@/hooks/useSpaces"
import { useT } from "@/hooks/useT"
import { useCan } from "@/lib/permissions"
import type { TranslationKey } from "@/lib/i18n"
import type { SpaceRole } from "@/lib/schemas"
import { useSessionStore } from "@/stores/sessionStore"

const ROLE_LABELS = {
  admin: "role.admin",
  collaborator: "role.collaborator",
  guest: "role.guest",
} as const satisfies Record<SpaceRole, TranslationKey>

const ITEM =
  "w-full flex items-center gap-2 px-2 py-2 min-h-11 rounded-md text-sm text-white/90 hover:bg-white/10 text-left disabled:opacity-50"

/*
 * An inline disclosure, not a Popover: a Radix popover inside the modal Sheet in
 * MobileNav adds portal and focus-trap problems; a plain toggle doesn't.
 */
export default function SpaceSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useT()
  const user = useSessionStore((state) => state.user)
  const { isAdmin } = useCan()
  const switchSpace = useSwitchSpace()
  const [open, setOpen] = useState(false)
  const [modal, setModal] = useState<"create" | "rename" | null>(null)
  const current = user?.currentSpace ?? null
  const count = user?.pendingInvitationsCount ?? 0

  return (
    <div className="min-w-0 flex-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-1 min-h-11 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-white font-semibold text-sm leading-tight truncate">
            {current?.name ?? t("nav.defaultSpaceName")}
          </span>
          <span className="block text-white/50 text-xs">{t("nav.controlPanel")}</span>
        </span>
        <ChevronsUpDown size={14} className="shrink-0 text-white/50" />
      </button>

      {open && (
        <div className="mt-2 rounded-lg bg-white/10 p-1 space-y-0.5">
          <ul>
            {(user?.spaces ?? []).map((space) => {
              const isCurrent = space.id === current?.id
              return (
                <li key={space.id}>
                  <button
                    type="button"
                    className={ITEM}
                    aria-current={isCurrent || undefined}
                    disabled={switchSpace.isPending}
                    onClick={() => {
                      if (isCurrent) return
                      onNavigate?.() // close the drawer now; this component remounts on success
                      switchSpace.mutate(space.id)
                    }}
                  >
                    <Check size={14} className={isCurrent ? "shrink-0" : "shrink-0 invisible"} />
                    <span className="flex-1 truncate">{space.name}</span>
                    <span className="text-[10px] uppercase tracking-wide text-white/60">
                      {t(ROLE_LABELS[space.role])}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          {switchSpace.isError && (
            <p role="alert" className="px-2 py-1 text-xs text-red-200">
              {t("spaces.switchFailed")}
            </p>
          )}
          <button type="button" className={ITEM} onClick={() => setModal("create")}>
            <Plus size={14} className="shrink-0" /> {t("spaces.create")}
          </button>
          {isAdmin && (
            <button type="button" className={ITEM} onClick={() => setModal("rename")}>
              <Pencil size={14} className="shrink-0" /> {t("spaces.rename")}
            </button>
          )}
          {count > 0 && (
            <Link to="/invitations" onClick={onNavigate} className={ITEM}>
              <Mail size={14} className="shrink-0" /> {t("spaces.invitations", { count })}
            </Link>
          )}
        </div>
      )}

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        width="sm"
        title={t(modal === "rename" ? "spaces.rename" : "spaces.create")}
      >
        {modal && <SpaceNameForm mode={modal} onDone={() => setModal(null)} />}
      </Modal>
    </div>
  )
}
