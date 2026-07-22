# Plan de integración: Videollamadas, Llamadas de Voz y Compartir Pantalla en CatChat

> **Objetivo:** añadir llamadas de voz, videollamadas 1:1 y compartir pantalla a CatChat
> usando **solo tecnología gratuita**, la infraestructura que **ya tienes** (Vercel + Supabase + Electron)
> y **cero servicios de túneles de terceros** (nada de ngrok, Cloudflare Tunnel, Pinggy, Tailscale Funnel, LocalXpose, etc.).

---

## Índice

1. [Análisis de la aplicación actual](#1-análisis-de-la-aplicación-actual)
2. [Arquitectura propuesta: por qué WebRTC P2P](#2-arquitectura-propuesta-por-qué-webrtc-p2p)
3. [Cómo evitamos túneles de terceros](#3-cómo-evitamos-túneles-de-terceros)
4. [Señalización con Supabase Realtime (gratis)](#4-señalización-con-supabase-realtime-gratis)
5. [Esquema de base de datos](#5-esquema-de-base-de-datos)
6. [Fase 1 — Núcleo WebRTC y llamadas de voz](#6-fase-1--núcleo-webrtc-y-llamadas-de-voz)
7. [Fase 2 — Videollamadas](#7-fase-2--videollamadas)
8. [Fase 3 — Compartir pantalla (Electron + Web)](#8-fase-3--compartir-pantalla-electron--web)
9. [Fase 4 — UI/UX de llamadas](#9-fase-4--uiux-de-llamadas)
10. [Cambios necesarios en Electron](#10-cambios-necesarios-en-electron)
11. [Limitaciones honestas y mitigaciones](#11-limitaciones-honestas-y-mitigaciones)
12. [Estructura de archivos final](#12-estructura-de-archivos-final)
13. [Checklist de implementación](#13-checklist-de-implementación)

---

## 1. Análisis de la aplicación actual

### Stack detectado

| Capa | Tecnología | Relevancia para llamadas |
|---|---|---|
| Frontend | Next.js 16 + React 19 | Hooks de llamada + componentes de UI |
| Auth | Better Auth (email/password) | Identificar quién llama a quién |
| BD principal | Postgres vía Drizzle ORM (`lib/db`) | Historial de llamadas (tabla `calls`) |
| Tiempo real | **Supabase Realtime** (ya lo usas para typing en `chat-thread.tsx`) | **Canal de señalización WebRTC — pieza clave** |
| Storage | Supabase Storage (avatares/banners) | No se necesita para llamadas |
| Desktop | Electron 43 con servidor Next embebido en `127.0.0.1:3000` | `desktopCapturer` para compartir pantalla |
| Hosting | Vercel (`catchat-one.vercel.app`) | Sirve la app web y las server actions |

### Puntos fuertes que aprovecharemos

1. **Ya tienes Supabase Realtime funcionando** (`lib/supabase/client.ts` + suscripciones en `chat-thread.tsx`). Los canales *Broadcast* de Supabase son gratuitos y perfectos como servidor de señalización WebRTC. **No hay que montar ningún servidor de WebSockets propio.**
2. **Ya tienes conversaciones 1:1** (`createDirectConversation` en `app/actions/chat.ts`) con la relación de participantes verificada en servidor (`assertParticipant`). La llamada se asocia a una conversación existente y hereda su control de acceso.
3. **Electron con `contextIsolation` + preload** (`preload.js`): patrón limpio ya establecido para exponer `desktopCapturer` de forma segura.
4. **El renderer de Electron es Chromium**: WebRTC (`RTCPeerConnection`, `getUserMedia`, `getDisplayMedia`) está disponible nativamente, sin dependencias.

### Conclusión del análisis

**No necesitas instalar ni un solo paquete npm nuevo para el núcleo de llamadas.** WebRTC es API nativa del navegador/Electron, y la señalización viaja por el Supabase Realtime que ya usas.

---

## 2. Arquitectura propuesta: por qué WebRTC P2P

```
┌─────────────────┐                              ┌─────────────────┐
│  Usuario A      │                              │  Usuario B      │
│  (Electron/Web) │                              │  (Electron/Web) │
│                 │                              │                 │
│  RTCPeer        │  ── Audio/Vídeo/Pantalla ──► │  RTCPeer        │
│  Connection     │ ◄──   DIRECTO P2P (SRTP)  ── │  Connection     │
└───────┬─────────┘                              └────────┬────────┘
        │                                                 │
        │            SEÑALIZACIÓN (solo texto:            │
        │            offer/answer/ICE candidates)         │
        │                                                 │
        └────────►  Supabase Realtime Broadcast  ◄────────┘
                    (canal `call:{conversationId}`)
                    ── GRATIS, ya lo usas ──

        └────────►  STUN público (stun.l.google.com)  ◄───┘
                    (solo descubre tu IP pública,
                     NO retransmite media, GRATIS)
```

### Por qué esta arquitectura y no otra

| Alternativa | Veredicto |
|---|---|
| **WebRTC P2P + Supabase señalización** | ✅ **Elegida.** 100% gratis, sin servidores de media, latencia mínima (directo entre pares), cifrado extremo-a-extremo (DTLS-SRTP) obligatorio por el estándar. |
| SFU autoalojado (LiveKit, mediasoup) | ❌ Necesita un servidor con puertos UDP abiertos 24/7 — Vercel no ejecuta servidores persistentes y exponer tu PC requeriría túneles (prohibido en los requisitos). |
| Servicios gestionados (Twilio, Daily, Agora) | ❌ Terceros de pago. Descartado. |
| Media por el servidor Next embebido de Electron | ❌ El servidor solo escucha en `127.0.0.1`; exponerlo a Internet requeriría túneles. Descartado. |

### Roles de cada pieza (todo gratis)

- **Vercel**: sirve la app, las server actions (crear registro de llamada, validar participantes) y la web. Nunca toca el audio/vídeo.
- **Supabase Realtime Broadcast**: transporta los mensajitos JSON de señalización (SDP offer/answer y candidatos ICE, ~2-10 KB por llamada). Incluido en el plan gratuito (200 conexiones concurrentes, 2M mensajes/mes — de sobra).
- **STUN públicos**: `stun:stun.l.google.com:19302` (y espejos). Un servidor STUN **no retransmite ningún dato de la llamada**; solo responde "tu IP pública es X.X.X.X" para que los pares se encuentren. Es un servicio público gratuito de Google, no un túnel.
- **Los propios clientes**: el audio/vídeo/pantalla viaja **directamente entre los dos usuarios** cifrado con SRTP.

> **Nota importante sobre STUN:** STUN no es un túnel ni un relay. No pasa tráfico de la llamada por ningún tercero — solo es una consulta de descubrimiento de IP (como visitar "cuál es mi IP"). Si aun así quisieras evitarlo, la llamada seguiría funcionando dentro de la misma red local sin STUN.

---

## 3. Cómo evitamos túneles de terceros

Los túneles (ngrok, etc.) se usan para **exponer un servidor local a Internet**. Nuestra arquitectura **no expone ningún servidor**:

1. **La señalización es saliente**: ambos clientes abren conexiones WebSocket *salientes* hacia Supabase (igual que ya hace tu typing indicator). Ningún puerto entrante.
2. **El media es P2P con ICE/hole-punching**: WebRTC usa la técnica estándar de *UDP hole punching* — ambos pares envían paquetes salientes simultáneamente, lo que abre el camino en sus routers NAT sin abrir puertos manualmente ni túneles. Funciona en la gran mayoría de redes domésticas y de oficina.
3. **El servidor Next embebido de Electron sigue en `127.0.0.1`**: no se toca, no se expone.

---

## 4. Señalización con Supabase Realtime (gratis)

### Protocolo de señalización (canal `call:{conversationId}`)

Definiremos un protocolo JSON simple sobre Broadcast. Cada mensaje lleva `from` (userId) para ignorar los propios:

| Evento | Payload | Emisor | Significado |
|---|---|---|---|
| `call-request` | `{ from, callType: 'audio' \| 'video', callId }` | Llamante | "Te estoy llamando" (hace sonar el timbre) |
| `call-accept` | `{ from, callId }` | Receptor | "Acepto" → el llamante crea la offer |
| `call-reject` | `{ from, callId, reason? }` | Receptor | Rechazada / ocupado |
| `call-cancel` | `{ from, callId }` | Llamante | Colgó antes de que contestaras |
| `sdp-offer` | `{ from, callId, sdp }` | Llamante | Oferta SDP de WebRTC |
| `sdp-answer` | `{ from, callId, sdp }` | Receptor | Respuesta SDP |
| `ice-candidate` | `{ from, callId, candidate }` | Ambos | Candidatos ICE (trickle) |
| `renegotiate` | `{ from, callId, sdp }` | Ambos | Renegociación (p. ej. al activar pantalla) |
| `call-end` | `{ from, callId }` | Ambos | Fin de llamada |
| `media-state` | `{ from, callId, micOn, camOn, screenOn }` | Ambos | Mostrar iconos de mute/cámara del otro |

### Suscripción global de llamadas entrantes

Además del canal por conversación, cada usuario se suscribe a un canal personal
`incoming-calls:{userId}` **al iniciar sesión** (montado en `chat-app.tsx`), para
recibir timbres aunque no tenga abierta esa conversación:

```ts
// lib/calls/signaling.ts (esquema)
import { supabase } from '@/lib/supabase/client'

export function subscribeIncomingCalls(userId: string, onRing: (p: CallRequest) => void) {
  const channel = supabase
    .channel(`incoming-calls:${userId}`)
    .on('broadcast', { event: 'call-request' }, ({ payload }) => onRing(payload))
    .subscribe()
  return () => supabase.removeChannel(channel)
}

export function createCallChannel(conversationId: number) {
  return supabase.channel(`call:${conversationId}`, {
    config: { broadcast: { self: false } }, // no recibir mis propios mensajes
  })
}
```

> **Ventaja clave de Broadcast vs postgres_changes:** los mensajes de Broadcast no tocan la base de datos (latencia ~50-100 ms, sin coste de filas). Solo persistiremos en Postgres el *registro* de la llamada (historial), no la señalización.

### Presencia (saber si el otro está conectado)

Supabase Realtime incluye **Presence** gratis en el mismo canal. La usaremos para:
- Mostrar "en línea / desconectado" antes de llamar.
- Detectar desconexiones bruscas (si el peer desaparece de presence → colgar con "conexión perdida").

---

## 5. Esquema de base de datos

Solo una tabla nueva en tu Postgres (Drizzle), para **historial** — la señalización nunca pasa por la BD:

```ts
// lib/db/schema.ts — AÑADIR
export const calls = pgTable('calls', {
  id: text('id').primaryKey(),                    // uuid generado en cliente (callId)
  conversationId: integer('conversationId').notNull(),
  callerId: text('callerId').notNull(),
  calleeId: text('calleeId').notNull(),
  type: text('type').notNull(),                   // 'audio' | 'video'
  status: text('status').notNull(),               // 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended'
  startedAt: timestamp('startedAt').notNull().defaultNow(),
  answeredAt: timestamp('answeredAt'),
  endedAt: timestamp('endedAt'),
})
```

Y server actions nuevas en `app/actions/calls.ts` (siguiendo tu patrón `getUserId()` + `assertParticipant()`):

- `startCall(conversationId, type)` → valida participante, inserta fila `ringing`, devuelve `callId`.
- `answerCall(callId)` → marca `accepted` + `answeredAt`.
- `endCall(callId, status)` → marca `ended`/`missed`/`rejected` + `endedAt`.
- `getCallHistory(conversationId)` → historial para pintar en el hilo ("Llamada perdida", "Videollamada · 12 min").

Con esto puedes renderizar burbujas de sistema en el chat tipo Discord/WhatsApp: *"📞 Llamada de voz — 5:32"*.

---

## 6. Fase 1 — Núcleo WebRTC y llamadas de voz

### 6.1 El motor: `lib/calls/webrtc.ts`

Clase/manager que encapsula `RTCPeerConnection`. Puntos técnicos críticos:

```ts
const ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
]

export function createPeer() {
  return new RTCPeerConnection({ iceServers: ICE_SERVERS })
}
```

**El flujo "perfect negotiation" (patrón oficial W3C) que implementaremos:**

1. **Llamante** pulsa "llamar" → `startCall()` (server action) → broadcast `call-request` al canal `incoming-calls:{calleeId}`.
2. **Receptor** ve el modal de timbre → acepta → broadcast `call-accept`.
3. Ambos se unen al canal `call:{conversationId}`.
4. **Llamante**: `getUserMedia({ audio: true })` → `pc.addTrack(...)` → `pc.createOffer()` → `setLocalDescription` → broadcast `sdp-offer`.
5. **Receptor**: `setRemoteDescription(offer)` → `getUserMedia` → `addTrack` → `createAnswer()` → broadcast `sdp-answer`.
6. Ambos intercambian `ice-candidate` según van llegando (*trickle ICE* = conexión más rápida).
7. `pc.ontrack` → conectar el `MediaStream` remoto a un elemento `<audio autoplay>`.
8. `pc.onconnectionstatechange === 'connected'` → arrancar cronómetro de llamada.

**Detalles que evitan bugs clásicos:**

- **Cola de candidatos ICE**: guardar los `ice-candidate` que lleguen antes de `setRemoteDescription` y aplicarlos después (race condition habitual).
- **`broadcast: { self: false }`** para no procesar tus propios mensajes.
- **Timeout de timbre** (30 s) → auto-`missed`.
- **Detección de "ocupado"**: si ya hay una llamada activa, responder `call-reject` con `reason: 'busy'` automáticamente.
- **Audio processing gratis del navegador**: `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })` — cancelación de eco y ruido nativas de Chromium sin librerías.

### 6.2 Hook de React: `hooks/use-call.ts`

Máquina de estados que consumirá la UI:

```
idle → outgoing-ringing → connecting → in-call → ended
idle → incoming-ringing → connecting → in-call → ended
                        ↘ rejected/missed ↗
```

Expone: `state`, `startCall(type)`, `accept()`, `reject()`, `hangUp()`, `toggleMic()`, `toggleCam()`, `toggleScreen()`, `remoteStream`, `localStream`, `remoteMediaState`, `duration`.

---

## 7. Fase 2 — Videollamadas

Sobre la Fase 1, el vídeo es incremental:

1. `getUserMedia({ audio: {...}, video: { width: 1280, height: 720, frameRate: 30 } })`.
2. La UI cambia de "avatar + ondas" a `<video>` remoto grande + `<video muted>` local en esquina (PiP).
3. **Toggle de cámara en caliente sin renegociar**: usar `RTCRtpSender.replaceTrack()`:
   - Apagar cámara → `sender.replaceTrack(null)` + broadcast `media-state`.
   - Encender → `replaceTrack(videoTrack)`. Sin cortes de audio.
4. **Llamada de voz → videollamada**: añadir el track de vídeo dispara `pc.onnegotiationneeded` → renegociación por el evento `renegotiate` del canal (mismo mecanismo offer/answer).
5. **Adaptación automática de calidad**: WebRTC ajusta bitrate/resolución solo según el ancho de banda (congestion control integrado). Opcionalmente, limitar con `sender.setParameters({ encodings: [{ maxBitrate: 1_500_000 }] })` para conexiones lentas.

---

## 8. Fase 3 — Compartir pantalla (Electron + Web)

### En el navegador (versión Vercel)

Trivial — API nativa:

```ts
const screenStream = await navigator.mediaDevices.getDisplayMedia({
  video: { frameRate: 15 },
  audio: false,
})
```

Chrome muestra su propio selector de pantalla/ventana/pestaña.

### En Electron (la parte especial)

Electron **no** muestra el selector automáticamente; hay que implementarlo con `desktopCapturer`. Tres cambios:

**1. `electron-main.js`** — registrar el handler moderno (Electron ≥ 22, tu v43 lo soporta):

```js
const { desktopCapturer, session } = require('electron')

// dentro de createWindow(), tras crear mainWindow:
mainWindow.webContents.session.setDisplayMediaRequestHandler(
  (request, callback) => {
    desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
      // Enviar las fuentes al renderer para mostrar NUESTRO selector
      mainWindow.webContents.send('screen-share:sources', 
        sources.map(s => ({ id: s.id, name: s.name, thumbnail: s.thumbnail.toDataURL() })))
      // Guardar el callback para resolverlo cuando el usuario elija
      pendingDisplayMediaCallback = callback
    })
  },
  { useSystemPicker: false }
)

ipcMain.handle('screen-share:select', (_e, sourceId) => {
  if (pendingDisplayMediaCallback) {
    // sourceId null = usuario canceló
    if (sourceId) {
      desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
        const source = sources.find(s => s.id === sourceId)
        pendingDisplayMediaCallback(source ? { video: source } : undefined)
        pendingDisplayMediaCallback = null
      })
    } else {
      pendingDisplayMediaCallback(undefined)
      pendingDisplayMediaCallback = null
    }
  }
})
```

**2. `preload.js`** — exponer el puente:

```js
contextBridge.exposeInMainWorld('screenShare', {
  onSources: (cb) => {
    const l = (_e, sources) => cb(sources)
    ipcRenderer.on('screen-share:sources', l)
    return () => ipcRenderer.removeListener('screen-share:sources', l)
  },
  select: (sourceId) => ipcRenderer.invoke('screen-share:select', sourceId),
})
```

**3. Componente `components/calls/screen-picker-modal.tsx`** — grid de miniaturas (estilo Discord) que aparece al pulsar "compartir pantalla" en Electron. En web no se muestra (Chrome trae el suyo). Detección: `typeof window !== 'undefined' && 'screenShare' in window`.

### Envío del stream de pantalla

Dos estrategias; recomendamos la **B**:

- **A) `replaceTrack`**: sustituir el track de cámara por el de pantalla. Simple, pero no puedes tener cámara + pantalla a la vez.
- **B) Track adicional (recomendada)**: `pc.addTrack(screenTrack)` como segundo track de vídeo → renegociación → el receptor distingue por `transceiver.mid` u orden de tracks. Permite **cámara y pantalla simultáneas** (como Discord).

Ajuste de calidad para pantalla (texto nítido > fluidez):

```ts
screenTrack.contentHint = 'detail'   // prioriza nitidez para texto/código
```

Detectar "Dejar de compartir" del sistema: `screenTrack.onended = () => stopScreenShare()`.

---

## 9. Fase 4 — UI/UX de llamadas

Componentes nuevos (siguiendo tu estética actual: tema oscuro, estilo Discord, framer-motion ya instalado):

| Componente | Descripción |
|---|---|
| `components/calls/call-provider.tsx` | Context global montado en `chat-app.tsx`. Escucha `incoming-calls:{userId}` y aloja el estado de la llamada activa (persiste al cambiar de conversación). |
| `components/calls/incoming-call-modal.tsx` | Timbre entrante: avatar animado, nombre, botones Aceptar (verde) / Rechazar (rojo), sonido de timbre en bucle (`<audio loop>`, generar/añadir `public/sounds/ringtone.mp3`). |
| `components/calls/call-overlay.tsx` | Pantalla de llamada activa: vídeo remoto a pantalla completa dentro de la ventana, PiP local arrastrable, barra de controles inferior (mic, cámara, pantalla, colgar), cronómetro, indicador de calidad de conexión (`pc.getStats()` → RTT/packetLoss). |
| `components/calls/call-controls.tsx` | Botonera reutilizable con estados on/off e iconos `lucide-react` (ya instalado): `Mic`, `MicOff`, `Video`, `VideoOff`, `MonitorUp`, `PhoneOff`. |
| `components/calls/screen-picker-modal.tsx` | Selector de pantalla/ventana para Electron (grid de miniaturas). |
| `components/calls/call-message-bubble.tsx` | Burbuja en el hilo del chat: "Llamada perdida", "Videollamada · 12:34" con botón "volver a llamar". |
| Botones en cabecera de `chat-thread.tsx` | Iconos `Phone` y `Video` en la cabecera de conversaciones directas (solo si `isDirect`). |

Extras de pulido:
- **Minimizar llamada**: barra flotante compacta al navegar a otra conversación (la llamada vive en el provider, no en el hilo).
- **Auto-mute visual**: analizar volumen con `AudioContext` + `AnalyserNode` para el anillo verde de "está hablando".

---

## 10. Cambios necesarios en Electron

| Archivo | Cambio | Por qué |
|---|---|---|
| `electron-main.js` | `setDisplayMediaRequestHandler` + IPC `screen-share:select` | Selector de pantalla (sección 8) |
| `electron-main.js` | Handler `session.setPermissionRequestHandler` que conceda `media` (micrófono/cámara) para `http://127.0.0.1:3000` | Electron pide permiso para `getUserMedia`; auto-conceder solo para tu origen local |
| `preload.js` | Exponer `screenShare` (sección 8) | Puente seguro con `contextIsolation` |
| `package.json` (build) | Nada nuevo | WebRTC va incluido en Chromium/Electron |

**Permisos del sistema (Windows):** la primera vez, Windows pedirá acceso a micrófono/cámara para CatChat — es el diálogo estándar del SO, sin configuración extra en NSIS.

> **Importante:** todo funciona igual en `https://catchat-one.vercel.app` (web) y en Electron, porque WebRTC exige contexto seguro y tanto `https:` como `http://127.0.0.1` (localhost) cuentan como seguros. Un solo código, dos plataformas.

---

## 11. Limitaciones honestas y mitigaciones

Siendo transparentes — es importante que las conozcas:

### 11.1 NAT simétrico / redes muy restrictivas (~5-15% de los casos)

**El problema:** WebRTC P2P con solo STUN falla cuando *ambos* usuarios están detrás de NAT simétrico (algunas redes móviles 4G/5G, universidades, oficinas con firewalls estrictos). La solución estándar es un servidor TURN (relay), pero **un TURN gratuito de terceros no existe de forma fiable, y autoalojarlo requeriría exponer un servidor — que es lo que quieres evitar**.

**Mitigaciones dentro de tus requisitos:**
1. **Detectarlo y avisar**: si `pc.iceConnectionState === 'failed'`, mostrar "No se pudo establecer conexión directa. Prueba desde otra red." en vez de un cuelgue silencioso.
2. **La mayoría de redes domésticas funcionan**: NAT tipo cono (el habitual en routers caseros) funciona perfecto con STUN.
3. **Puerta abierta futura**: si algún día tienes un VPS (Oracle Cloud Free Tier ofrece VMs gratis *para siempre* — no es un túnel, es tu propio servidor), instalar `coturn` son 10 minutos y solo habría que añadir una entrada a `ICE_SERVERS`. El diseño ya lo contempla.

### 11.2 Solo llamadas 1:1 (por ahora)

P2P puro escala mal en grupo (con N participantes cada uno sube N-1 streams). Para 3-4 personas se puede hacer *mesh* P2P más adelante reutilizando el 95% de este código (un `RTCPeerConnection` por par). Para grupos grandes haría falta un SFU (servidor). Este plan cubre 1:1, que encaja con tus conversaciones directas actuales.

### 11.3 Límites del plan gratuito de Supabase Realtime

200 conexiones concurrentes / 500 mensajes por segundo por canal. Una llamada usa ~20-40 mensajes de señalización *en total* (no por segundo). Incluso con decenas de usuarios simultáneos estás lejísimos del límite.

### 11.4 Vercel no participa en el media

Ni las server actions ni las funciones de Vercel tocan audio/vídeo (no podrían: son serverless efímeras). Vercel solo sirve la app y guarda el historial. Esto es una *ventaja*: cero coste de ancho de banda de llamadas.

---

## 12. Estructura de archivos final

```
catchat/
├── app/
│   └── actions/
│       └── calls.ts                     # NUEVO — server actions (historial + validación)
├── components/
│   └── calls/
│       ├── call-provider.tsx            # NUEVO — contexto global + listener de entrantes
│       ├── incoming-call-modal.tsx      # NUEVO — timbre entrante
│       ├── call-overlay.tsx             # NUEVO — UI de llamada activa
│       ├── call-controls.tsx            # NUEVO — botonera mic/cam/pantalla/colgar
│       ├── screen-picker-modal.tsx      # NUEVO — selector de pantalla (Electron)
│       └── call-message-bubble.tsx      # NUEVO — burbuja de historial en el chat
├── hooks/
│   └── use-call.ts                      # NUEVO — máquina de estados de llamada
├── lib/
│   ├── calls/
│   │   ├── webrtc.ts                    # NUEVO — motor RTCPeerConnection
│   │   ├── signaling.ts                 # NUEVO — canales Supabase Broadcast
│   │   └── types.ts                     # NUEVO — tipos del protocolo
│   └── db/
│       └── schema.ts                    # MODIFICAR — añadir tabla `calls`
├── components/
│   └── chat-thread.tsx                  # MODIFICAR — botones Phone/Video en cabecera
│   └── chat-app.tsx                     # MODIFICAR — montar <CallProvider>
├── electron-main.js                     # MODIFICAR — setDisplayMediaRequestHandler + permisos
├── preload.js                           # MODIFICAR — puente screenShare
└── public/
    └── sounds/
        ├── ringtone.mp3                 # NUEVO — timbre entrante
        └── calling.mp3                  # NUEVO — tono de llamada saliente
```

---

## 13. Checklist de implementación

### Fase 1 — Voz (la base, ~60% del trabajo)
- [ ] Migración: tabla `calls` en Postgres
- [ ] `app/actions/calls.ts` con validación de participantes
- [ ] `lib/calls/types.ts` — protocolo de señalización
- [ ] `lib/calls/signaling.ts` — canales Broadcast + presencia
- [ ] `lib/calls/webrtc.ts` — peer connection, offer/answer, trickle ICE, cola de candidatos
- [ ] `hooks/use-call.ts` — máquina de estados
- [ ] `call-provider.tsx` montado en `chat-app.tsx` + listener global de entrantes
- [ ] `incoming-call-modal.tsx` + sonidos
- [ ] `call-overlay.tsx` en modo audio (avatar + controles + cronómetro)
- [ ] Botón `Phone` en cabecera de chats directos
- [ ] Permisos de media en `electron-main.js`
- [ ] Timeout de timbre, estado "ocupado", manejo de `iceConnectionState: failed`

### Fase 2 — Vídeo
- [ ] `getUserMedia` con vídeo + layout de `<video>` remoto/local
- [ ] Toggle de cámara con `replaceTrack`
- [ ] Renegociación (voz → vídeo en caliente)
- [ ] Evento `media-state` (iconos de mute/cámara del otro)

### Fase 3 — Pantalla
- [ ] `getDisplayMedia` en web
- [ ] `setDisplayMediaRequestHandler` + IPC en Electron
- [ ] `screen-picker-modal.tsx`
- [ ] Track adicional + renegociación (cámara y pantalla simultáneas)
- [ ] `contentHint = 'detail'` + `onended`

### Fase 4 — Pulido
- [ ] `call-message-bubble.tsx` + historial en el hilo
- [ ] Barra flotante de llamada minimizada
- [ ] Indicador de calidad (`getStats`)
- [ ] Anillo de "hablando" con `AnalyserNode`
- [ ] Pruebas: Electron↔Electron, Electron↔Web, Web↔Web, redes distintas

---

## Resumen ejecutivo

| Pregunta | Respuesta |
|---|---|
| ¿Coste? | **0 €** — WebRTC nativo + Supabase Realtime (plan free) + STUN público + Vercel actual |
| ¿Túneles de terceros? | **Ninguno.** Solo conexiones salientes; el media es P2P directo cifrado |
| ¿Paquetes npm nuevos? | **Ninguno** para el núcleo (todo API nativa) |
| ¿Servidores nuevos? | **Ninguno** — reutilizas Supabase y Vercel |
| ¿Funciona en web y Electron? | Sí, mismo código; Electron solo añade el selector de pantalla |
| ¿Riesgo principal? | NAT simétrico en ~5-15% de redes (detectado y comunicado al usuario; ampliable con TURN propio en el futuro) |
