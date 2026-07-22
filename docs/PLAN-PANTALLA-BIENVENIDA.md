# Plan: Pantalla de Bienvenida (Estado Vacío sin Amigos)

> Rediseño completo de la pantalla que se muestra cuando el usuario **no tiene amigos ni conversaciones**. Sustituye por completo el chat vacío actual (header + icono + input de mensaje) por una experiencia de bienvenida memorable.

---

## 1. Diagnóstico del problema actual

Hoy, cuando `activeConversation === null`, el componente `ChatThread` se renderiza igualmente con todo su "chrome":

- **Header** con título "New Conversation", pin, añadir miembros, info y búsqueda — acciones que **no tienen sentido** sin conversación.
- **Input "Type a message..."** — invita a escribir a nadie. Es confuso y transmite que la app está rota o vacía.
- **Estado vacío genérico** — icono + 2 líneas de texto centradas. No comunica personalidad, no enseña qué puede hacer la app, y no da un camino de acción claro (el "click +" está escondido en texto gris).

**Regla de oro:** el estado vacío del primer uso es la primera impresión de la app. Debe *vender* la app y llevar al usuario a su primer momento de valor (agregar un amigo y enviar el primer mensaje).

---

## 2. Concepto propuesto: "CatChat Home"

En lugar de un chat vacío, renderizar un componente **completamente distinto**: `components/welcome-screen.tsx`. Sin header de chat, sin input de mensaje, sin panel de info. Una pantalla tipo "home de bienvenida" al estilo Discord/Slack pero con la identidad gatuna de CatChat.

### Estructura visual (de arriba a abajo)

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│              [Ilustración hero: gato]                │
│                                                      │
│         ¡Bienvenido a CatChat, {nombre}!             │
│    Tu espacio para hablar, llamar y compartir.       │
│                                                      │
│        ┌────────────────────────────────┐            │
│        │  [+] Agregar tu primer amigo   │  ← CTA     │
│        └────────────────────────────────┘            │
│                                                      │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│   │ Mensajes │  │ Llamadas │  │ Pantalla │  ← Bento  │
│   │ en vivo  │  │ voz/video│  │ compartida│          │
│   └──────────┘  └──────────┘  └──────────┘           │
│                                                      │
│        Consejo: pulsa Ctrl+K para buscar             │
└──────────────────────────────────────────────────────┘
```

### 2.1 Hero con personalidad

- **Ilustración de gato generada** (guardar en `public/images/welcome-cat.png`): un gato amigable con auriculares, estilo flat/ilustración moderna, coherente con tema oscuro. NO usar emoji ni un icono genérico de Lucide.
- Alternativa animada: gato construido con `framer-motion` (orejas que se mueven levemente, parpadeo en loop con `animate` + `repeat: Infinity`). Sutil, no circense.
- **Saludo personalizado**: usar `user.name` — "¡Bienvenido, Ana!" conecta mucho más que un texto genérico.
- Fondo: patrón sutil de huellas de gato con opacidad muy baja (`opacity-[0.03]`) usando un SVG repetido, o un glow radial suave detrás del gato (`bg-primary/10 blur-3xl`). Nada de gradientes agresivos.

### 2.2 CTA principal — un solo botón grande

- **"Agregar tu primer amigo"** (`size="lg"`, color primario, icono `UserPlus`).
- Al hacer clic abre directamente el modal existente `SearchModal` o `NewChatModal` (reutilizar `setNewChatOpen(true)` / `setSearchOpen(true)` que ya viven en `ChatApp`).
- Debajo, enlace secundario discreto: "o explora los ajustes y temas" → abre `SettingsModal`.
- Un solo CTA primario. Si hay 3 botones del mismo peso, no hay ninguno.

### 2.3 Bento de características (3 tarjetas)

Grid `grid grid-cols-1 md:grid-cols-3 gap-4` con tarjetas que enseñan lo que la app ya sabe hacer (¡acabas de implementar llamadas!):

| Tarjeta | Icono | Título | Descripción |
|---|---|---|---|
| 1 | `MessageSquare` | Mensajes en tiempo real | Chats instantáneos con reacciones, respuestas y traducción |
| 2 | `Video` / `Phone` | Llamadas de voz y video | Llamadas P2P cifradas, directas entre tú y tus amigos |
| 3 | `MonitorUp` | Comparte tu pantalla | Muestra lo que ves con un clic, como en Discord |

- Estilo: `rounded-2xl border bg-card p-5`, icono en contenedor `size-10 rounded-xl bg-primary/10 text-primary`.
- Animación de entrada escalonada con `framer-motion` (`staggerChildren: 0.08`, fade + slide-up de 12px). Ya tienes framer-motion instalado.
- Hover sutil: `hover:border-primary/40 transition-colors`. Las tarjetas son informativas, no clicables (o la de llamadas puede abrir el modal de nuevo chat también).

### 2.4 Footer de ayuda

- Tip de teclado: "Pulsa `Ctrl+K` para buscar usuarios en cualquier momento" con la tecla renderizada como `<kbd>` estilizada (`rounded border bg-secondary px-1.5 text-[11px] font-mono`).
- Rotar entre 2-3 tips aleatorios al montar (traducción de mensajes, temas, etc.) para que la pantalla se sienta viva en visitas repetidas.

---

## 3. Dos variantes según el estado real

No es lo mismo "no tengo amigos" que "tengo chats pero no seleccioné ninguno":

| Estado | Condición | Qué mostrar |
|---|---|---|
| **Primer uso** | `conversations.length === 0` | Pantalla de bienvenida completa (hero + CTA + bento) |
| **Sin selección** | `conversations.length > 0 && activeConversationId === null` | Versión mínima: gato pequeño + "Elige una conversación" + accesos rápidos a los 3 chats más recientes |

La segunda variante evita que un usuario veterano vea onboarding cada vez que deselecciona un chat.

---

## 4. Cambios técnicos exactos

### 4.1 Nuevo componente: `components/welcome-screen.tsx`

```tsx
'use client'

// Props sugeridas
type WelcomeScreenProps = {
  user: AppUser
  hasConversations: boolean       // decide variante completa vs mínima
  recentConversations?: ConversationListItem[]  // para accesos rápidos
  onAddFriend: () => void         // abre SearchModal/NewChatModal
  onOpenSettings: () => void
  onSelectConversation?: (id: number) => void
}
```

Componente 100% presentacional; toda la lógica de modales ya existe en `ChatApp`.

### 4.2 Modificar `components/chat-app.tsx`

Renderizado condicional en lugar de `ChatThread` cuando no hay conversación activa:

```tsx
{activeConversation ? (
  <ChatThread ... />
) : (
  <WelcomeScreen
    user={user}
    hasConversations={conversations.length > 0}
    recentConversations={conversations.slice(0, 3)}
    onAddFriend={() => setNewChatOpen(true)}
    onOpenSettings={() => setSettingsOpen(true)}
    onSelectConversation={setActiveConversationId}
  />
)}
```

Esto además **oculta automáticamente el InfoPanel** (ya condiciona con `activeConversation`) y elimina el header/input sin tocar `ChatThread`.

### 4.3 Limpieza en `components/chat-thread.tsx`

- El bloque de estado vacío actual (`!conversation && allMessages.length === 0`, líneas ~1387-1398) queda muerto tras el cambio — se puede eliminar junto con las claves i18n `selectConversation` / `selectInstruction` si no se usan en otro sitio.

### 4.4 i18n (`lib/i18n.ts`)

Añadir claves en `en` y `es`:

- `welcomeTitle`: "Welcome to CatChat, {name}!" / "¡Bienvenido a CatChat, {name}!"
- `welcomeSubtitle`, `addFirstFriend`, `featureMessagesTitle/Desc`, `featureCallsTitle/Desc`, `featureScreenTitle/Desc`, `welcomeTip`, `pickConversation`, `recentChats`

### 4.5 Assets

- Generar `public/images/welcome-cat.png` con la herramienta de generación de imágenes (gato con auriculares, ilustración flat, fondo transparente, paleta acorde a los temas).
- Opcional: versión más pequeña o la misma imagen a `size-24` para la variante mínima.

---

## 5. Detalles de diseño (tokens y motion)

- **Colores**: solo tokens existentes — `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `text-primary`, `bg-primary/10`. Cero colores nuevos; la pantalla debe verse bien en TODOS los temas de `lib/themes.ts`, no solo en oscuro.
- **Tipografía**: título `text-2xl md:text-3xl font-bold text-balance`, subtítulo `text-sm text-muted-foreground leading-relaxed`.
- **Layout**: `flex flex-1 flex-col items-center justify-center gap-8 p-8 overflow-y-auto`, contenido con `max-w-2xl`.
- **Motion**: una sola orquestación de entrada (contenedor con `staggerChildren`), gato con micro-animación en loop. Respetar `prefers-reduced-motion` desactivando loops.
- **Accesibilidad**: la ilustración con `alt` descriptivo, CTA como `<button>` real, tips con contraste suficiente (`text-muted-foreground` mínimo).

---

## 6. Orden de implementación sugerido

1. Generar la ilustración del gato (`public/images/welcome-cat.png`).
2. Añadir claves i18n en `lib/i18n.ts`.
3. Crear `components/welcome-screen.tsx` con las dos variantes.
4. Condicionar el render en `chat-app.tsx`.
5. Eliminar el estado vacío muerto de `chat-thread.tsx`.
6. Verificar en ambos idiomas, en tema claro y oscuro, y en la ventana de Electron.

**Resultado:** en vez de un chat fantasma con un input inútil, el usuario nuevo ve una pantalla que lo saluda por su nombre, le enseña las tres cosas increíbles que puede hacer (incluidas las llamadas recién implementadas) y le pone un único botón gigante que lo lleva a agregar a su primer amigo.
