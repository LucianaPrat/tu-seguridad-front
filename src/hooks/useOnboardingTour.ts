import { useEffect } from "react"
import { useNavigate, type NavigateFunction } from "react-router-dom"
import { driver, type Driver, type PopoverDOM } from "driver.js"
import { useSessionStore } from "@/stores/sessionStore"
import "driver.js/dist/driver.css"

/*
 * Guided tour of the menu, run once on the first login. driver.js owns the
 * overlay and the popover; this module owns the routing, because a step lives
 * on a page the previous step was not on.
 *
 * Deliberately not a component: the driver instance is DOM-level, and every
 * app page mounts its own AppShell, so a component holding the instance would
 * be torn down by the very navigation the tour performs.
 */

/*
 * Per browser, not per user — a shared browser shows the tour to whoever
 * clears it first. Good enough for an operator console; src/test/setup.ts
 * seeds it so page tests never trip over an overlay.
 */
const TOUR_FLAG = "ts-tour-done"

interface TourStep {
  /** Route the step lives on. The tour navigates there before highlighting. */
  to: string
  /** Omitted on the intro step, which driver.js then centres as a modal. */
  element?: string
  /** Dropped for a plain member, whose screen has no such control to point at. */
  adminOnly?: true
  /** Leading glyph. Carries the step at a glance so the body can stay one line. */
  icon: string
  title: string
  body: string
}

const STEPS: TourStep[] = [
  {
    to: "/",
    icon: "👋",
    title: "Bienvenido",
    body: "Un minuto para ver qué hace cada sección. Podés saltarlo cuando quieras.",
  },
  {
    to: "/",
    element: '[data-tour="nav-home"]',
    icon: "🏠",
    title: "Inicio",
    body: "Todas tus cámaras de un vistazo: online u offline, y hace cuánto es la foto.",
  },
  {
    to: "/",
    element: '[data-tour="page-action"]',
    adminOnly: true,
    icon: "👥",
    title: "Invitar",
    body: "Sumás gente al espacio con su email. Le llega un link para entrar.",
  },
  {
    to: "/cameras/monitor",
    element: '[data-tour="nav-monitor"]',
    icon: "🎯",
    title: "Monitoreo",
    body: "Qué vigila cada cámara: toda la imagen, o zonas que dibujás vos.",
  },
  {
    to: "/cameras/monitor",
    element: '[data-tour="page-action"]',
    icon: "💾",
    title: "Guardar",
    body: "Las zonas no se aplican hasta apretar acá.",
  },
  {
    to: "/events",
    element: '[data-tour="nav-events"]',
    icon: "📋",
    title: "Eventos",
    body: "El histórico de alertas. Tocá una fila y ves la imagen del momento.",
  },
  {
    to: "/events",
    element: '[data-tour="events-filters"]',
    icon: "🔎",
    title: "Filtros",
    body: "Por fecha y por nivel: intruso o sospechoso.",
  },
  {
    to: "/dvr-config",
    element: '[data-tour="nav-dvr"]',
    icon: "📼",
    title: "DVR",
    body: "La conexión al grabador. Ojo: cambiarla puede borrar la config de las cámaras.",
  },
  {
    to: "/channels",
    element: '[data-tour="nav-channels"]',
    icon: "📣",
    title: "Canales",
    body: "Por dónde salen las alertas y a quién le llegan. Se guarda solo.",
  },
  {
    to: "/channels",
    element: '[data-tour="channels-routing"]',
    icon: "🔀",
    title: "Enrutamiento",
    body: "Por cada nivel marcás los medios: llamada, WhatsApp o email.",
  },
  {
    to: "/channels",
    element: '[data-tour="channels-recipients"]',
    icon: "🔔",
    title: "Destinatarios",
    body: "Un interruptor por miembro. Usa el mail y el teléfono de su registro.",
  },
  {
    to: "/members",
    element: '[data-tour="nav-members"]',
    icon: "🧑‍🤝‍🧑",
    title: "Miembros",
    body: "Quiénes entran al espacio y cuándo entraron por última vez.",
  },
  {
    to: "/profile",
    element: '[data-tour="nav-profile"]',
    icon: "⚙️",
    title: "Perfil",
    body: "Tus datos y tu contraseña.",
  },
  {
    to: "/profile",
    element: '[data-tour="topbar-user"]',
    icon: "🔑",
    title: "Tu cuenta",
    body: "Tu perfil, cerrar sesión, y «Ver el tutorial» para repetir esto.",
  },
  {
    to: "/",
    element: '[data-tour="nav-help"]',
    icon: "🎉",
    title: "Listo",
    body: "Repetilo desde acá, o desde el menú de tu perfil.",
  },
]

/**
 * Polls `check` on animation frames until it passes, or gives up at `timeout`.
 * Only one thing needs this: seeing the outgoing page actually leave the DOM.
 * Waiting for what arrives is driver.js's own `waitForElement`.
 */
export function waitFor(check: () => boolean, timeout = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeout
    const tick = () => {
      if (check()) return resolve(true)
      if (Date.now() > deadline) return resolve(false)
      requestAnimationFrame(tick)
    }
    tick()
  })
}

/** One tour at a time, and it outlives the AppShell that started it. */
let current: Driver | null = null

export function startTour(navigate: NavigateFunction) {
  if (current) return

  /*
   * Built per run, not per module. `skipMissingElement` below would drop an
   * admin-only step on its own, but it jumps straight to the next index
   * without going through goTo, so the tour would talk about the next screen
   * while still standing on this one. Dropping the step up front keeps every
   * index paired with the route it belongs to — and keeps the progress count
   * honest for a member who is never shown that step.
   */
  const isAdmin = useSessionStore.getState().user?.role === "admin"
  const steps = STEPS.filter((s) => !s.adminOnly || isAdmin)

  /*
   * The only place the tour is marked seen. It cannot live in onDestroyed:
   * driver.js fires that from inside its animation loop, so closing during the
   * first 400ms of a step skips it and the tour reopens on the next page.
   */
  const finish = () => {
    localStorage.setItem(TOUR_FLAG, "1")
    const tour = current
    current = null
    tour?.destroy()
  }

  /*
   * Routing is the only part driver.js cannot do for itself. Everything after
   * the navigation — waiting for the anchor, skipping one that never shows —
   * is `waitForElement` and `skipMissingElement` in the config below.
   */
  const goTo = async (index: number) => {
    const step = steps[index]
    if (!step) return finish()

    if (window.location.pathname !== step.to) {
      /*
       * Every app page renders its own AppShell, so navigating throws the whole
       * sidebar away and builds a new one. The node matching this step's
       * selector right now is the doomed one, and driver.js would happily
       * highlight it: a detached node measures all zeros, which is what parked
       * the popover in the corner over the menu. Waiting for it to leave means
       * the selector can only match its replacement.
       */
      const stale = step.element ? document.querySelector(step.element) : null
      navigate(step.to)
      if (stale) await waitFor(() => !stale.isConnected)
    }

    d.drive(index)
  }

  /* Icon and skip button, re-applied on every step — driver.js rebuilds the
   * popover DOM each time. The default close control is a bare × in the
   * corner, which nobody reads as "salir"; relabelled and moved into the
   * footer it sits where a skip button belongs. */
  const dressPopover = (popover: PopoverDOM) => {
    const step = steps[d.getActiveIndex() ?? 0]
    if (step) {
      const icon = document.createElement("span")
      icon.className = "ts-tour-icon"
      icon.setAttribute("aria-hidden", "true")
      icon.textContent = step.icon
      popover.title.prepend(icon)
    }
    popover.closeButton.textContent = "Saltar"
    popover.closeButton.setAttribute("aria-label", "Saltar el tutorial")
    popover.footer.prepend(popover.closeButton)
  }

  const d = driver({
    showProgress: true,
    progressText: "{{current}} de {{total}}",
    nextBtnText: "Siguiente",
    prevBtnText: "Anterior",
    doneBtnText: "Entendido",
    showButtons: ["next", "previous", "close"],
    // Load-bearing: driver.js filters "close" out of showButtons when this is
    // false, which would leave the tour with no skip button at all.
    allowClose: true,
    // A stray click on the dimmed page should do nothing — not advance, not
    // abort. A no-op function is how driver.js spells that.
    overlayClickBehavior: () => {},
    // The point of the overlay: nothing outside the popover is clickable.
    disableActiveInteraction: true,
    // Navigation renders the anchor a beat after the route changes, so let
    // driver.js watch for it instead of racing it.
    waitForElement: 2000,
    // Safety net only: the role filter above should mean no step is ever
    // missing. If one is anyway, move past it instead of stalling the tour.
    skipMissingElement: true,
    overlayColor: "#0d4f47",
    overlayOpacity: 0.62,
    stagePadding: 6,
    stageRadius: 12,
    smoothScroll: true,
    popoverClass: "ts-tour",
    onPopoverRender: dressPopover,
    // The popover is pinned by CSS, so `side` would be dead config: only the
    // spotlight moves between steps, which is the whole point — no chasing a
    // panel around the screen.
    steps: steps.map((s) => ({
      element: s.element,
      popover: { title: s.title, description: s.body },
    })),
    // Overriding these turns off driver.js's own advance, so every move — the
    // done button included — routes through goTo and its navigation.
    onNextClick: () => goTo((d.getActiveIndex() ?? 0) + 1),
    onPrevClick: () => goTo((d.getActiveIndex() ?? 0) - 1),
    onCloseClick: finish,
    /*
     * Escape is the one exit driver.js drives itself. Claiming this hook stops
     * its internal teardown and hands the close back to us, so that path marks
     * the tour seen like every other.
     */
    onDestroyStarted: finish,
  })

  current = d
  void goTo(0)
}

/**
 * Fires the tour on the first visit. Mounted in AppShell, which remounts on
 * every navigation — the `current` guard is what keeps the tour from
 * restarting itself as it walks the menu.
 */
export function useOnboardingTour() {
  const navigate = useNavigate()

  useEffect(() => {
    if (localStorage.getItem(TOUR_FLAG)) return
    if (window.location.pathname !== "/") return
    startTour(navigate)
  }, [navigate])
}
