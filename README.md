
## Stack tecnológico

Proyecto: UI de seguridad — monitoreo de eventos vía WebSocket + streaming de video no constante desde VDR de cámaras. Sin requerimientos de SEO, lógica compleja o renderizado de alta performance.

### Base
- **Vite** — build tool. Sin Next.js (no hay SEO ni SSR).
- **React 19**
- **TypeScript**
- **pnpm** — package manager

### Estilos / UI
- **Tailwind CSS v4** — utilidades CSS
- **shadcn/ui** (sobre Radix) — componentes (tablas, modales, badges, alertas, dropdowns)

### Datos / comunicación
- **TanStack Query** — fetch y cache de REST (cámaras, históricos, configuración)
- **WebSocket nativo** (o socket.io-client si el backend lo requiere) — eventos en tiempo real, envuelto en hook propio

### Estado global
- **Zustand** — conexión WS, eventos activos, estado de cámaras

### Video
- **hls.js** si el VDR entrega HLS, o **WebRTC nativo** si entrega baja latencia
- Montar/desmontar el player solo al abrir el panel de cámara (no streaming constante)

### Routing
- **React Router**

### Formularios
- **react-hook-form** + **zod** — login, configuración de reglas/alertas

### Testing
- **Vitest** + **React Testing Library**

### Explícitamente descartado
- Next.js (sin SEO/SSR)
- Redux (estado simple, alcanza Zustand)
- Bootstrap / CSS-in-JS (Tailwind + shadcn/ui cubre todo)
- TanStack Router (overkill para este caso)
- Optimizaciones agresivas de render (no es requerimiento)