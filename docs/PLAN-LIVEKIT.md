# Plan: Llamadas de Voz, Video y Compartir Pantalla con LiveKit

> **App:** CatChat (Next.js 16 + Electron + Supabase + Vercel)
> **Objetivo:** Migrar/implementar el sistema de llamadas usando **LiveKit** como infraestructura de medios (SFU), manteniendo Supabase Realtime solo para la lógica de invitación de llamadas (ring/aceptar/rechazar) y Vercel para la emisión de tokens.

---

## 1. ¿Por qué LiveKit? (vs. WebRTC P2P puro)

El plan anterior (`PLAN-VIDEOLLAMADAS.md`) usaba WebRTC P2P con Supabase Realtime como señalización. Funciona, pero tiene un talón de Aquiles: el **NAT simétrico** (~5-15% de redes, típico en 4G/5G y redes corporativas), donde sin un servidor TURN la llamada simplemente no conecta.

LiveKit resuelve esto porque es un **SFU (Selective Forwarding Unit)**: todos los participantes se conectan al servidor de LiveKit, nunca directamente entre sí.

| Aspecto | WebRTC P2P (plan anterior) | LiveKit (este plan) |
|---|---|---|
| Conectividad | Falla con NAT simétrico sin TURN | **Funciona siempre** (conexión saliente al SFU) |
| Señalización | Manual (Supabase Broadcast + SDP/ICE) | **Incluida** en el SDK — no gestionas SDP/ICE |
| Llamadas grupales | Malla P2P: no escala (n² conexiones) | **Nativo**: N participantes en una sala |
| Reconexión | Manual (ICE restart a mano) | **Automática** en el SDK |
| Calidad adaptativa | Manual | **Simulcast + adaptive stream** integrados |
| UI | Todo a mano | `@livekit/components-react` con hooks listos |
| Coste | $0 pero frágil | $0 en tier Build (con límites, ver §2) |

---

## 2. Coste: LiveKit Cloud tier gratuito (Build)

LiveKit Cloud tiene un plan **Build gratuito, sin tarjeta de crédito**:

- **5,000 minutos de conexión/mes** (participante-minuto: 2 personas × 30 min = 60 min consumidos)
- **100 participantes concurrentes**
- **50 GB de ancho de banda/mes**

Para un chat entre amigos es más que suficiente: ~40 horas/mes de llamadas 1:1.

**Alternativa 100% gratis sin límites:** LiveKit es open source (Apache 2.0) y puedes auto-hospedar el servidor (`livekit-server`) en cualquier VPS. La API es idéntica — solo cambia la URL. Este plan usa LiveKit Cloud por simplicidad; migrar a self-hosted después es cambiar una variable de entorno.

> **Nota:** Los "agent minutes" e "Inference credits" del tier gratuito son para agentes de IA — no los usamos, no afectan.

---

## 3. Arquitectura

```
┌──────────────┐   1. "Te llamo" (invite/accept/decline)   ┌──────────────┐
│  Electron A  │◄──────── Supabase Realtime Broadcast ─────►│  Electron B  │
│  (CatChat)   │                                            │  (CatChat)   │
└──────┬───────┘                                            └──────┬───────┘
       │ 2. POST /api/livekit/token  (Vercel, valida sesión)       │
       │◄──────────── token JWT firmado ─────────────────────────►│
       │                                                           │
       │ 3. Conexión WebRTC (audio/video/pantalla)                 │
       ▼                                                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    LiveKit Cloud (SFU)                            │
│         wss://<tu-proyecto>.livekit.cloud                         │
└──────────────────────────────────────────────────────────────────┘
```

**Reparto de responsabilidades:**

| Pieza | Rol |
|---|---|
| **Supabase Realtime** | Solo el "ring": invitar, aceptar, rechazar, colgar antes de conectar. (Ya lo tienes.) |
| **Vercel (API Route)** | Emitir tokens JWT de LiveKit de forma segura (las API keys nunca tocan el cliente). |
| **LiveKit Cloud** | Todo el transporte de medios: audio, video, pantalla, reconexión, calidad. |
| **Electron** | Captura de pantalla vía `desktopCapturer` (ya configurado del plan anterior). |
| **Supabase DB** | Historial de llamadas (tabla `calls`, ya existente del plan anterior). |

---

## 4. Fase 0 — Setup

### 4.1 Cuenta y proyecto LiveKit

1. Crear cuenta gratis en https://cloud.livekit.io (sin tarjeta).
2. Crear un proyecto → obtienes:
   - `LIVEKIT_URL` → `wss://<proyecto>.livekit.cloud`
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`

### 4.2 Variables de entorno (Vercel + `.env.local`)

```bash
# Servidor (NUNCA exponer al cliente)
LIVEKIT_API_KEY=APIxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxx

# Cliente (pública, solo es la URL del websocket)
NEXT_PUBLIC_LIVEKIT_URL=wss://<proyecto>.livekit.cloud
```

### 4.3 Dependencias

```bash
pnpm add livekit-server-sdk @livekit/components-react @livekit/components-styles livekit-client
```

| Paquete | Uso |
|---|---|
| `livekit-server-sdk` | Generar tokens en el API route (servidor) |
| `livekit-client` | SDK core del cliente (Room, tracks) |
| `@livekit/components-react` | Hooks y componentes React (`LiveKitRoom`, `useTracks`, etc.) |
| `@livekit/components-styles` | Estilos base (opcional, podemos tematizar con nuestros tokens) |

---

## 5. Fase 1 — Endpoint de tokens en Vercel

**Archivo nuevo:** `app/api/livekit/token/route.ts`

Reglas de seguridad:
- Validar la **sesión Supabase** del usuario (server-side) antes de emitir token.
- El nombre de la sala se deriva del ID de conversación: `call-<conversationId>`.
- Verificar que el usuario **pertenece a esa conversación** (query a la tabla de miembros) — nadie puede unirse a llamadas ajenas.
- Tokens de corta duración (ej. 10 minutos de TTL; solo para conectar, la conexión persiste).

```ts
// app/api/livekit/token/route.ts (esquema)
import { AccessToken } from "livekit-server-sdk"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })

  const { conversationId } = await req.json()

  // Verificar membresía en la conversación (anti-intrusos)
  // ... query a conversation_members ...

  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity: user.id,
      name: displayName,
      ttl: "10m",
    },
  )
  token.addGrant({
    room: `call-${conversationId}`,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  })

  return Response.json({ token: await token.toJwt(), url: process.env.NEXT_PUBLIC_LIVEKIT_URL })
}
```

---

## 6. Fase 2 — Flujo de llamada (ring) con Supabase Realtime

Se **conserva** el protocolo de invitación del plan anterior, pero simplificado — ya no hay SDP/ICE que intercambiar:

```
A pulsa "Llamar" ──► broadcast { type: "call:invite", callId, kind: "voice"|"video" }
                                        │
B recibe ──► UI de llamada entrante (ringtone, aceptar/rechazar)
                                        │
B acepta ──► broadcast { type: "call:accept", callId }
                                        │
A y B piden token a /api/livekit/token y se conectan a la sala
                                        │
LiveKit gestiona TODO lo demás (medios, reconexión, calidad)
```

Mensajes del protocolo (canal `call:<conversationId>` de Supabase Broadcast):

| Mensaje | Emisor | Efecto |
|---|---|---|
| `call:invite` | Llamante | Muestra UI entrante + ringtone en el receptor |
| `call:accept` | Receptor | Ambos piden token y entran a la sala LiveKit |
| `call:decline` | Receptor | Llamante ve "rechazada", registra en historial |
| `call:cancel` | Llamante | Cancela antes de que respondan |
| `call:timeout` | Auto (30s) | Llamada perdida → historial |

> **Colgar durante la llamada** ya no necesita broadcast: desconectarse de la sala LiveKit dispara el evento `ParticipantDisconnected` en el otro lado.

**Detección de fin de llamada para el historial:** cuando la sala queda vacía, actualizar la fila en la tabla `calls` con `ended_at` (lo hace el último cliente al desconectar, o un webhook de LiveKit si se quiere robustez extra — opcional).

---

## 7. Fase 3 — UI de llamada con `@livekit/components-react`

### 7.1 Componentes nuevos

| Componente | Descripción |
|---|---|
| `components/call/call-provider.tsx` | Contexto global: estado de llamada activa, entrante, saliente. Escucha el canal de Supabase. |
| `components/call/incoming-call-modal.tsx` | Modal de llamada entrante (avatar, ringtone, aceptar voz/video, rechazar). |
| `components/call/call-room.tsx` | Envuelve `<LiveKitRoom>` con el token; monta la UI de la llamada. |
| `components/call/call-stage.tsx` | Grid de participantes usando `useTracks` + `GridLayout`. Pantalla compartida ocupa el escenario principal. |
| `components/call/call-controls.tsx` | Barra de controles: mute, cámara, compartir pantalla, colgar. Usa `useLocalParticipant` / `TrackToggle`. |
| `components/call/screen-share-picker.tsx` | Selector de ventana/pantalla estilo Discord (solo Electron, ya existente del plan anterior — se reutiliza). |

### 7.2 Esqueleto de la sala

```tsx
"use client"
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react"

export function CallRoom({ token, serverUrl, video }: Props) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio
      video={video}          // false para llamadas de solo voz
      onDisconnected={handleCallEnded}
    >
      <RoomAudioRenderer />   {/* reproduce el audio de todos */}
      <CallStage />           {/* grid de video / avatares */}
      <CallControls />        {/* mute, cámara, pantalla, colgar */}
    </LiveKitRoom>
  )
}
```

### 7.3 Hooks clave del SDK (no reinventar)

- `useTracks([Track.Source.Camera, Track.Source.ScreenShare])` → tracks para renderizar
- `useLocalParticipant()` → mute/unmute, activar cámara
- `useIsSpeaking(participant)` → anillo verde alrededor del avatar cuando habla
- `useConnectionQualityIndicator()` → indicador de calidad de red
- `usePersistentUserChoices()` → recordar dispositivo de micro/cámara elegido

### 7.4 Diseño

- **Llamada de voz:** avatares grandes centrados con anillo de "hablando" (`useIsSpeaking`), fondo `bg-background`, sin video.
- **Videollamada:** grid adaptativo; si alguien comparte pantalla, la pantalla ocupa ~80% y las cámaras pasan a una tira lateral (estilo Discord).
- Tematizar con los design tokens existentes de CatChat (no usar los estilos por defecto de `@livekit/components-styles` más que como base estructural).
- Barra de llamada persistente/minimizable para seguir chateando durante la llamada.

---

## 8. Fase 4 — Compartir pantalla en Electron

LiveKit usa `getDisplayMedia()` internamente (`localParticipant.setScreenShareEnabled(true)`). En Electron, `getDisplayMedia` no muestra el picker nativo del navegador — hay que interceptarlo.

### 8.1 `electron-main.js` — handler de captura (ya lo tienes del plan anterior; verificar)

```js
const { session, desktopCapturer } = require("electron")

session.defaultSession.setDisplayMediaRequestHandler(
  async (request, callback) => {
    const sources = await desktopCapturer.getSources({ types: ["screen", "window"] })
    // Enviar las fuentes al renderer para mostrar NUESTRO picker
    // y resolver el callback con la fuente elegida:
    callback({ video: selectedSource, audio: "loopback" }) // audio del sistema en Windows
  },
  { useSystemPicker: false },
)
```

### 8.2 Flujo

1. Usuario pulsa "Compartir pantalla" en `CallControls`.
2. En Electron: se abre `screen-share-picker.tsx` con miniaturas (vía IPC `desktopCapturer.getSources`).
3. Al elegir, el handler resuelve y LiveKit publica el track de pantalla — nada más que hacer.
4. En web (fallback): el navegador muestra su picker nativo automáticamente.

### 8.3 Extras de calidad

- Publicar pantalla con `screenShareEncoding` alto y `contentHint: "detail"` para texto nítido.
- Audio del sistema: `audio: "loopback"` funciona en Windows; en macOS requiere permisos extra (documentar como limitación).

---

## 9. Fase 5 — Historial y pulido

- **Tabla `calls`** (ya existe del plan anterior): registrar `started_at`, `ended_at`, `kind`, `status` (`completed`/`missed`/`declined`). Insertar al aceptar, actualizar al terminar.
- **Mensajes de sistema en el chat:** "Llamada de voz · 12 min", "Llamada perdida" como mensajes especiales en la conversación.
- **Sonidos:** ringtone entrante/saliente, sonido de conexión/desconexión (assets locales).
- **Notificación nativa en Electron** si la app está minimizada cuando entra una llamada.
- **Krisp noise filter** (`useKrispNoiseFilter`): cancelación de ruido incluida gratis en LiveKit Cloud.

---

## 10. Orden de implementación

| Paso | Entregable | Depende de |
|---|---|---|
| 1 | Cuenta LiveKit + env vars en Vercel | — |
| 2 | `app/api/livekit/token/route.ts` con validación de membresía | 1 |
| 3 | `CallProvider` + protocolo ring por Supabase Broadcast | 2 |
| 4 | Llamadas de **voz** 1:1 (`CallRoom` sin video) | 3 |
| 5 | **Video** (toggle cámara, grid) | 4 |
| 6 | **Compartir pantalla** (picker Electron + escenario) | 5 |
| 7 | Historial, sonidos, notificaciones, minimizar llamada | 4 |

Cada paso es funcional por sí mismo — se puede probar voz (paso 4) antes de tocar video.

---

## 11. Migración desde el sistema P2P actual

Si el sistema P2P del plan anterior ya está implementado:

1. **Se conserva:** el protocolo de ring por Supabase, la tabla `calls`, el picker de pantalla de Electron, la UI de llamada entrante, los sonidos.
2. **Se elimina:** todo el código de `RTCPeerConnection`, intercambio SDP/ICE por broadcast, lógica de reconexión manual, configuración de STUN.
3. **Se reemplaza:** el "motor" de medios pasa a ser `<LiveKitRoom>` + hooks. El diff neto suele ser **negativo** (menos código que antes).

---

## 12. Riesgos y limitaciones

| Riesgo | Mitigación |
|---|---|
| Superar 5,000 min/mes gratis | Monitorear en el dashboard de LiveKit; si se supera, auto-hospedar `livekit-server` (misma API, $0) |
| Latencia extra vs. P2P | Mínima (~20-50ms); LiveKit Cloud enruta al edge más cercano |
| Audio del sistema en macOS al compartir pantalla | Limitación de la plataforma; solo video de pantalla en macOS |
| Dependencia de un tercero | LiveKit es open source: el plan de salida (self-host) no requiere reescribir código |

---

## 13. Resumen

- **Vercel** emite tokens JWT seguros (`livekit-server-sdk`) validando la sesión Supabase y la membresía de la conversación.
- **Supabase Realtime** solo hace el "ring" — 5 mensajes de protocolo, sin SDP/ICE.
- **LiveKit** hace todo el trabajo pesado de medios: conexión garantizada (sin problemas de NAT), reconexión automática, simulcast, y hooks React listos.
- **Electron** solo aporta el picker de pantalla personalizado vía `setDisplayMediaRequestHandler`.
- Coste: **$0** dentro del tier Build (5,000 min/mes), con salida a self-hosting sin reescribir nada.
