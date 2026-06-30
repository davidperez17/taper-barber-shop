# Taper Barbershop PWA — Design System

> Stack: Next.js + Tailwind CSS · Dark theme · Mobile-first PWA

---

## 1. Design Foundations

### 1.1 Style Direction
**Modern Dark Minimalist** — dark UI limpia, sin efectos innecesarios.  
Fondo near-black neutro, acento amarillo/dorado vibrante, tipografía bold con mucho espacio.  
Referencia visual: barbershop app moderna (foto full-bleed en onboarding, cards con foto, pill bottom nav).  
Referencia de UX: Duolingo (progreso adictivo) + barbería premium (carácter propio).

**No:** blobs de ambient light, glassmorphism, efectos cinemáticos pesados.  
**Sí:** limpieza, jerarquía clara, el acento amarillo hace todo el trabajo visual.

### 1.2 Core Principle
La tarjeta de lealtad ES la identidad del cliente. Todo lo demás sirve a ese elemento.  
El progreso siempre visible. La gamificación se siente como logro, no manipulación.

---

## 2. Color Palette

### 2.1 Background Scale (Dark)

> Referencia visual: `#1A1A1A`–`#1C1C1C` neutro cálido. No frío azulado, no puro negro.

| Token | Hex | Uso |
|-------|-----|-----|
| `bg-void` | `#0F0F0F` | Capa más profunda (behind everything) |
| `bg-base` | `#181818` | Fondo de pantalla base |
| `bg-elevated` | `#222222` | Cards, inputs, bottom sheets |
| `bg-surface` | `#2C2C2C` | Hover states, category chips inactivos |
| `border` | `rgba(255,255,255,0.08)` | Bordes sutiles en dark |
| `border-strong` | `rgba(255,255,255,0.16)` | Bordes enfatizados, separadores |

### 2.2 Foreground Scale

| Token | Hex | Uso |
|-------|-----|-----|
| `fg-primary` | `#FFFFFF` | Texto principal |
| `fg-secondary` | `#A0A0A0` | Texto secundario, labels |
| `fg-muted` | `#606060` | Placeholders, disabled, metadata |

### 2.3 Brand Accent — Yellow Gold

> Acento principal: amarillo dorado vibrante. Energético, masculino, moderno.  
> Referencia visual directa: el amarillo del botón "Get started" y bottom nav activo.

| Token | Hex | Uso |
|-------|-----|-----|
| `accent` | `#F5C800` | CTAs primarios, bottom nav activo, progreso |
| `accent-dark` | `#D4AB00` | Hover/pressed state del accent |
| `accent-text` | `#0F0F0F` | Texto SOBRE el accent (negro — contraste 15:1+) |
| `accent-dim` | `rgba(245,200,0,0.12)` | Fondos sutiles con tinte accent |
| `accent-glow` | `rgba(245,200,0,0.20)` | Sombra glow en botones y elementos activos |

### 2.4 VIP Tier Gradients

Cada nivel tiene gradiente de tarjeta + glow color propio.

```css
/* SILVER — inicio del journey */
--tier-silver-from: #71717A;
--tier-silver-to:   #3F3F46;
--tier-silver-glow: rgba(161,161,170,0.20);
--tier-silver-text: #E4E4E7;

/* GOLD — cliente frecuente */
--tier-gold-from:   #F59E0B;
--tier-gold-to:     #92400E;
--tier-gold-glow:   rgba(245,158,11,0.30);
--tier-gold-text:   #FEF3C7;

/* PLATINUM — VIP */
--tier-plat-from:   #3B82F6;
--tier-plat-to:     #1E1B4B;
--tier-plat-glow:   rgba(59,130,246,0.30);
--tier-plat-text:   #DBEAFE;

/* BLACK — élite */
--tier-black-from:  #27272A;
--tier-black-to:    #09090B;
--tier-black-glow:  rgba(200,121,65,0.35); /* accent glow para élite */
--tier-black-text:  #F0F0F2;
```

### 2.5 Semantic / Feedback Colors

| Token | Hex | Uso |
|-------|-----|-----|
| `success` | `#22C55E` | Recompensa disponible, confirmación |
| `success-dim` | `rgba(34,197,94,0.15)` | Fondo de estado success |
| `warning` | `#F59E0B` | Alertas, puntos a vencer |
| `error` | `#EF4444` | Errores de formulario |

---

## 3. Typography

### 3.1 Font Pairing — Sports/Fitness adapted

**Display / Headings:** `Barlow Condensed` — condensada, impactante, masculina  
**Body / UI:** `Barlow` — familiar de display, legible, sin fricción

```css
/* globals.css */
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Barlow:wght@300;400;500;600&display=swap');
```

### 3.2 Type Scale

| Role | Font | Size | Weight | Line-height | Letter-spacing | Uso |
|------|------|------|--------|-------------|----------------|-----|
| `display` | Barlow Condensed | 48px | 800 | 1.0 | -0.02em | Nombre cliente en tarjeta |
| `heading-1` | Barlow Condensed | 32px | 700 | 1.1 | -0.01em | Títulos de pantalla |
| `heading-2` | Barlow Condensed | 24px | 700 | 1.2 | 0 | Subtítulos, card headers |
| `heading-3` | Barlow Condensed | 20px | 600 | 1.3 | 0 | Labels de sección |
| `body-lg` | Barlow | 18px | 400 | 1.6 | 0 | Texto descriptivo |
| `body` | Barlow | 16px | 400 | 1.6 | 0 | Body base (mínimo mobile) |
| `body-sm` | Barlow | 14px | 400 | 1.5 | 0 | Helper text, labels |
| `caption` | Barlow | 12px | 500 | 1.4 | 0.02em | Badges, tags, metadata |
| `mono-counter` | Barlow | 32px | 600 | 1.0 | 0.04em | "4/6" — contador lealtad |

---

## 4. Spacing & Layout System

### 4.1 Base Grid: 4px

```
4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96
```

### 4.2 Screen Padding

| Contexto | Valor |
|----------|-------|
| Padding horizontal mobile | `px-4` (16px) |
| Padding horizontal comfortable | `px-5` (20px) |
| Gap entre secciones | `gap-6` (24px) |
| Gap entre cards | `gap-4` (16px) |

### 4.3 Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `rounded-sm` | 8px | Inputs, chips |
| `rounded-md` | 12px | Botones, badges |
| `rounded-lg` | 16px | Cards secundarias |
| `rounded-xl` | 20px | Loyalty card principal |
| `rounded-2xl` | 24px | Modals, bottom sheets |
| `rounded-full` | 9999px | Avatars, progress pills |

### 4.4 Elevation / Shadows

```css
/* Usados en dark: sombras de color (no grises genéricos) */
--shadow-card:   0 4px 24px rgba(0,0,0,0.40);
--shadow-modal:  0 8px 40px rgba(0,0,0,0.60);
--shadow-accent: 0 0 24px var(--accent-glow); /* botón primario */
--shadow-tier:   0 0 32px var(--tier-*-glow); /* loyalty card */
```

---

## 5. Component Library

### 5.1 Loyalty Card — Flip Interaction (componente central)

> La tarjeta es la cereza del pastel. Dos caras: identidad al frente, QR al reverso.  
> Referencias: Nike ticket (QR dominante + color de marca), Concert app (reveal interaction).  
> Tap en cualquier parte de la card → flip 3D → QR aparece.

#### Interacción Flip

```
[FRENTE]  →  tap  →  [REVERSO]
identidad            QR dominante
+ progreso           + nombre
+ beneficios         + "Muéstraselo al cajero"
```

**Animación:**
```css
/* Wrapper — perspectiva 3D */
.card-scene {
  perspective: 1000px;
  width: 100%;
  aspect-ratio: 3/2; /* más ancha que alta — tarjeta física */
}

/* Card container — hace el flip */
.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 500ms cubic-bezier(0.16, 1, 0.3, 1);
}
.card-inner.flipped {
  transform: rotateY(180deg);
}

/* Cada cara */
.card-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 20px;
}
.card-back {
  transform: rotateY(180deg);
}
```

**Hint visual:** pequeño indicador "Toca para ver QR" en el frente (desaparece después del primer flip).

**Reduced motion:** sin flip — en su lugar, cross-fade entre las dos vistas.

---

#### CARA FRONTAL — Identidad + Progreso

```
┌──────────────────────────────────────────┐
│  TAPER             [GOLD ★]  [tap hint] │  ← logo izq, badge tier der
│                                          │
│                                          │
│  Carlos Méndez                           │  ← display font, grande, blanco
│                                          │
│  ───────────────────────────────────     │  ← separador sutil
│                                          │
│  CORTES             BENEFICIO ACTIVO    │  ← 2 columnas de stat
│    4/6              Descuento 10%       │
│  ████████░░         [✓ Gold member]     │  ← progress bar izq, badge der
│                                          │
│  Te faltan 2 cortes para gratis         │  ← motivational copy, pequeño
│                                          │
└──────────────────────────────────────────┘
```

**Propiedades CSS:**
- Aspect ratio: `3/2` (tarjeta física landscape)
- Width: `100%` con `max-w-[360px]` centrado, `mx-auto`
- Fondo: `bg-gradient-to-br from-[tier-from] to-[tier-to]`
- Padding: `p-5`
- Border: `1px solid rgba(255,255,255,0.15)`
- Sombra: `box-shadow: 0 8px 40px var(--tier-glow), 0 4px 20px rgba(0,0,0,0.50)`
- Texto sobre la tarjeta: siempre blanco (`var(--tier-text)`)

**Layout interno:**
```
flex flex-col justify-between h-full

Top row:    flex justify-between items-start
  - Logo "TAPER" (Barlow Condensed, 14px, tracking-widest, opacity-80)
  - VIP badge chip + tap hint icon

Middle:
  - Nombre: Barlow Condensed 36px font-800

Bottom section:
  flex justify-between items-end gap-4
  Left:  progress bar (w-full max-w-[160px]) + "4/6" counter
  Right: beneficio activo pill (si tiene) o próximo nivel
  
Footer:
  - Copy motivacional, body-sm, opacity-70
```

---

#### CARA TRASERA — QR Dominante

> Inspiración: Nike Art of Victory ticket — el QR ES el protagonista.  
> Fondo: amarillo accent `#F5C800`. QR: negro puro sobre blanco. Alto contraste máximo.

```
┌──────────────────────────────────────────┐
│                 TAPER                    │  ← logo centrado, negro, pequeño
│                                          │
│         ┌──────────────────┐             │
│         │                  │             │
│         │   ▓▓▓▓▓▓▓▓▓▓    │             │  ← QR ocupa ~60% del ancho
│         │   ▓▓▓▓▓▓▓▓▓▓    │             │     fondo blanco, módulos negros
│         │   ▓▓▓▓▓▓▓▓▓▓    │             │     mínimo 200×200px
│         └──────────────────┘             │
│                                          │
│           Carlos Méndez                  │  ← nombre, centrado, negro
│           Miembro Gold · #00847          │  ← ID corto, caption negro/60
│                                          │
│      Muéstraselo al cajero              │  ← caption, negro, centrado
└──────────────────────────────────────────┘
```

**Propiedades CSS (cara trasera):**
- Fondo: `bg-accent` (`#F5C800`) — amarillo sólido, sin gradiente
- Todo el texto: `text-accent-text` (`#0F0F0F`)
- QR wrapper: `bg-white rounded-xl p-3 mx-auto` — siempre blanco
- QR size: `w-[180px] h-[180px]` mínimo garantizado
- Layout: `flex flex-col items-center justify-center gap-3`

**Por qué amarillo en el reverso:**  
- Contraste máximo para escaneo (fondo claro = mejor para cámaras)
- Momento de "reveal" impactante — de dark a yellow
- Identidad de marca: el amarillo es nuestro color de acción
- Si el tier es Gold → la cara trasera naturalmente es gold. Cohesión total.

---

#### Estados de la Tarjeta (cara frontal)

| Estado | Visual en frente |
|--------|-----------------|
| `new` (0 visitas) | Progress vacío `0/6`, copy "Tu journey empieza hoy", badge "NUEVO" |
| `in-progress` | Barra parcial, copy motivacional "¡Ya casi! X más" |
| `reward-ready` | Barra 100% verde `#22C55E`, glow verde pulsante, copy "¡Corte gratis listo!" |
| `level-up` | Transición de gradiente (600ms), confetti sutil, badge nuevo tier con scale-in |

---

#### Tip de Interacción en Home Screen

Bajo la card (o superpuesto en esquina):
```
[↩ Toca para ver tu QR]  ← caption, fg-muted, desaparece tras primer uso
```

### 5.2 Progress Bar

```html
<!-- Estructura Tailwind -->
<div class="relative h-3 rounded-full bg-white/10 overflow-hidden">
  <div 
    class="h-full rounded-full bg-gradient-to-r from-accent to-accent-light
           transition-[width] duration-700 ease-out"
    style="width: 66%"  <!-- 4/6 = 66.6% -->
  />
</div>
<!-- Counter -->
<span class="font-mono text-2xl font-semibold tracking-wider text-fg-primary">
  4<span class="text-fg-muted">/6</span>
</span>
```

### 5.3 Botón Primario

Pill shape. Amarillo con texto negro. Full-width en mobile.

```css
/* Base */
bg-accent text-accent-text font-semibold rounded-full px-6 py-4
min-h-[52px] w-full /* touch target + full-width mobile */
text-base tracking-wide
transition-all duration-200

/* Hover */
hover:bg-accent-dark

/* Active */
active:scale-[0.97]

/* Disabled */
opacity-40 cursor-not-allowed
```

### 5.4 Bottom Navigation (PWA) — Pill Active Style

Patrón de referencia: active item = pill/lozenge amarillo con icon+label, inactivos = solo icono gris.

```
┌──────────────────────────────────────────┐
│  [🏠 Tarjeta]   [🔍]   [📋]   [👤]      │
│   ← pill amarillo  ← solo icono muted    │
└──────────────────────────────────────────┘
```

```css
/* Container */
fixed bottom-0 inset-x-0 bg-bg-elevated border-t border-border
h-16 pb-safe-area-inset-bottom px-4
flex items-center justify-between

/* Active item — pill */
bg-accent text-accent-text rounded-full px-4 py-2
flex items-center gap-2 font-semibold text-sm

/* Inactive item — icon only */
text-fg-muted p-3 rounded-full
hover:text-fg-secondary transition-colors duration-150
```

### 5.5 VIP Badge

```css
/* Chips por tier — siempre uppercase, caption size */
Silver: bg-zinc-700 text-zinc-200 border border-zinc-500
Gold:   bg-amber-900/60 text-amber-300 border border-amber-600
Plat:   bg-blue-900/60 text-blue-300 border border-blue-500
Black:  bg-zinc-950 text-fg-primary border border-accent/40
```

---

## 6. Screen Designs

### Screen 1: Onboarding / Welcome

**Objetivo:** Primera impresión memorable. Foto full-bleed real de barbería.

```
┌─────────────────────────┐
│                         │
│   [FOTO BARBERÍA]       │  ← full-bleed, ocupa 65% pantalla
│   barbero + cliente     │  ← imagen real, atmosférica
│                         │
│ ░░░░░░░░░░░░░░░░░░░░░░░ │  ← gradient overlay negro bottom
│                         │
│  Tu corte.              │  ← heading-1 blanco, bold
│  Tu nivel.              │
│  Tu recompensa.         │
│                         │
│  Acumula visitas y      │  ← body-sm, fg-secondary
│  gana tu próximo        │
│  corte gratis.          │
│                         │
│  [    Comenzar gratis  ]│  ← btn primario pill amarillo
│  Ya tengo cuenta        │  ← link, fg-muted, centrado
│                         │
└─────────────────────────┘
```

- Layout: `relative min-h-dvh flex flex-col`
- Foto: `absolute inset-0 object-cover object-top` con `z-0`
- Gradient: `absolute bottom-0 inset-x-0 h-[60%] bg-gradient-to-t from-black via-black/80 to-transparent`
- Contenido texto + botón: `relative z-10 mt-auto px-5 pb-10`
- Sin blobs ni efectos extra — la foto hace el trabajo visual

### Screen 2: Registro Rápido

**Objetivo:** Mínima fricción. Nombre + teléfono = suficiente.

```
┌─────────────────────────┐
│  ← Atrás                │  ← back nav
│                         │
│  Crea tu cuenta         │  ← heading-1
│  Tarda menos de 1 min   │  ← body-sm, fg-secondary
│                         │
│  ┌───────────────────┐  │
│  │ Nombre completo   │  │  ← input, autofocus
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ +502 ─────────── │  │  ← inputmode=tel, prefijo GT
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ Correo (opcional) │  │  ← campo opcional, marcado claro
│  └───────────────────┘  │
│                         │
│  [  Crear mi cuenta  ]  │  ← btn primario
│                         │
│  Al continuar aceptas   │  ← caption, fg-muted
│  los términos de uso    │
└─────────────────────────┘
```

- Inputs: `bg-bg-elevated border border-border rounded-sm px-4 py-3 min-h-[48px]`
- Label flotante (float label pattern) en foco
- Error inline bajo el campo, `text-error text-sm`
- Validación on-blur, no on-keystroke

### Screen 3: HOME — Tarjeta de Lealtad (Flip Card)

**Objetivo:** La tarjeta domina la pantalla. El QR está a un tap de distancia.

```
ESTADO FRENTE (default):
┌─────────────────────────┐
│  Hola, Carlos  [🔔]     │  ← top bar: saludo + notif
│                         │
│ ┌─────────────────────┐ │
│ │ TAPER       [GOLD★] │ │  ← LOYALTY CARD frente
│ │                     │ │     gradient tier
│ │ Carlos Méndez       │ │  ← display 36px
│ │                     │ │
│ │ CORTES   BENEFICIO  │ │
│ │  4/6    Desc. 10%   │ │  ← stats lado a lado
│ │ ████░░              │ │  ← progress bar
│ │                     │ │
│ │ 2 cortes para gratis│ │  ← copy motivacional
│ │        ↩ ver QR     │ │  ← tap hint, pequeño
│ └─────────────────────┘ │
│                         │
│  ┌──────┐  ┌──────────┐ │
│  │ Stats│  │ Historia │ │  ← quick actions 2-col
│  └──────┘  └──────────┘ │
│                         │
│ [🏠 Tarjeta][🔍][📋][👤]│  ← bottom nav pill
└─────────────────────────┘

ESTADO REVERSO (tras tap):
┌─────────────────────────┐
│  Hola, Carlos  [🔔]     │
│                         │
│ ┌─────────────────────┐ │
│ │      TAPER          │ │  ← LOYALTY CARD reverso
│ │  [fondo amarillo]   │ │     bg-accent #F5C800
│ │                     │ │
│ │   ┌─────────────┐   │ │
│ │   │ ▓▓▓▓▓▓▓▓▓  │   │ │  ← QR 180×180px
│ │   │ ▓▓▓▓▓▓▓▓▓  │   │ │     fondo blanco
│ │   └─────────────┘   │ │
│ │                     │ │
│ │    Carlos Méndez    │ │  ← nombre negro
│ │  Muéstraselo al     │ │
│ │     cajero          │ │  ← instrucción caption
│ └─────────────────────┘ │
│  ↩ Toca para regresar   │  ← hint bajo la card
│                         │
│ [🏠 Tarjeta][🔍][📋][👤]│
└─────────────────────────┘
```

**Layout key:**
- Card: `mx-5 mt-4` con `aspect-[3/2]`, `max-w-[360px]`
- Flip: `perspective-1000` en wrapper, `rotateY(180deg)` en `.card-inner.flipped`
- Flip duration: `500ms cubic-bezier(0.16,1,0.3,1)`
- El fondo de pantalla NO cambia en el flip — solo rota la card
- Quick actions: 2 cards 50/50, `rounded-xl bg-bg-elevated p-4`

**Estado Recompensa Disponible (cara frontal):**
```
│ CORTES      ¡GRATIS LISTO! │  ← texto success verde
│  6/6        [✓ reclamar]   │
│ ████████████               │  ← barra 100% verde, glow success pulsante
│ ¡Muéstrale esta tarjeta    │
│  al cajero y reclama!      │
│           ↩ ver QR         │
```

**Estado Nivel Subido:**
- Trigger al regresar a la app: gradiente cambia (600ms ease-out)
- Toast sobre la card: "¡Subiste a Gold! ★" — 3s auto-dismiss
- Badge tier nuevo con scale-in `0→1` en 300ms

### Screen 4: Stats / Mis Números

```
┌─────────────────────────┐
│  ← Mis Stats            │
│                         │
│  ┌──────┐  ┌──────────┐ │
│  │  47  │  │  Q4,250  │ │  ← stat cards en grid 2 col
│  │ Cortes│  │  Total   │ │
│  └──────┘  └──────────┘ │
│                         │
│  ┌──────┐  ┌──────────┐ │
│  │ GOLD │  │  Mar 24  │ │
│  │Nivel │  │ 1ra visita│ │
│  └──────┘  └──────────┘ │
│                         │
│  Mi progreso VIP        │  ← heading-2
│                         │
│  Silver ●━━━━━━━━━ Gold │  ← tier progress strip
│  Gold   ●━━━━━━━━━ Plat │
│  Plat   ○━━━━━━━━━ Black│  ← no alcanzado: muted
│                         │
│  Próximo nivel          │
│  Platinum: 26 visitas   │  ← 26 en accent color
│  Te faltan 4            │
│                         │
└─────────────────────────┘
```

- Stat cards: `bg-bg-elevated rounded-lg p-4`
- Número en `display font 32px accent-color`
- Label en `caption fg-muted`

### Screen 5: Historial de Servicios

```
┌─────────────────────────┐
│  ← Historial            │
│                         │
│  [Servicios] [Productos]│  ← tab switcher
│  ━━━━━━━━━━━━           │  ← underline active tab, accent
│                         │
│  Junio 2026             │  ← section header, caption
│  ─────────────────────  │
│  │ 20 Jun · Carlos    │ │
│  │ Corte Clásico Q50  │ │  ← list item
│  │ Shampoo Premium Q65│ │
│  │              Q115  │ │  ← total right-aligned, accent
│                         │
│  │ 05 Jun · Marco     │ │
│  │ Corte Fade Q60     │ │
│  │               Q60  │ │
│                         │
│  Mayo 2026              │
│  ─────────────────────  │
│  │ ...                │ │
│                         │
└─────────────────────────┘
```

- Lista virtualizada si >50 ítems
- Empty state: "Aún no tienes servicios registrados — ¡comienza hoy!" + illus
- Pull-to-refresh para sync

### Screen 6: Beneficios VIP

```
┌─────────────────────────┐
│  ← Mis Beneficios       │
│                         │
│  Tu nivel actual        │  ← heading-2
│  ┌─────────────────────┐│
│  │ GOLD     ████░░     ││  ← mini loyalty card, no QR
│  │ Carlos   22/25 VIP  ││
│  └─────────────────────┘│
│                         │
│  Beneficios activos ✓   │  ← heading-3 success
│  ─────────────────────  │
│  ✓ Programa de lealtad  │
│  ✓ Descuento productos  │
│  ✓ Promociones exclusivas│
│                         │
│  Próximo: Platinum      │  ← heading-3
│  ─────────────────────  │
│  ○ Descuentos superiores│  ← locked, fg-muted
│  ○ Prioridad en citas   │
│  ○ Beneficios especiales│
│                         │
│  [Te faltan 3 visitas]  │  ← pill badge accent
│                         │
└─────────────────────────┘
```

---

## 7. Gamification & Micro-interactions

### 7.1 Animaciones y Duración

| Acción | Tipo | Duración | Easing |
|--------|------|----------|--------|
| Entrada de pantalla | fade + translateY(16px→0) | 300ms | ease-out |
| Stagger de lista | delay 40ms por item | — | ease-out |
| Barra de progreso fill | width transition | 700ms | ease-out |
| Press de botón | scale 1.0→0.97 | 100ms | ease-out |
| Card de lealtad appear | scale 0.96→1.0 + fade | 400ms | cubic-bezier(0.16,1,0.3,1) |
| Transición tier (level up) | gradient morph + glow | 600ms | ease-out |
| Confetti/glow (reward) | opacity 0→1→0 | 2000ms | ease-in-out |
| Toast dismiss | translateY 0→16px + fade | 200ms | ease-in |

### 7.2 Reduced Motion

Todos los efectos tienen alternativa estática:

```css
@media (prefers-reduced-motion: reduce) {
  .progress-bar { transition: none; }
  .card-appear  { animation: none; opacity: 1; }
  .confetti     { display: none; }
  .tier-transition { transition: none; }
}
```

### 7.3 Celebración de Recompensa

- Trigger: backend confirma ciclo completo
- Confetti: máx 30 partículas, colores accent + tier-gold, duración 1.5s auto-stop
- Overlay: semi-transparente, heading "¡Corte gratis ganado!" + subtext + botón dismiss
- Reduced-motion: solo texto + icono estático, sin partículas

---

## 8. Tailwind Config

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Backgrounds — warm near-black neutro
        'bg-void':     '#0F0F0F',
        'bg-base':     '#181818',
        'bg-elevated': '#222222',
        'bg-surface':  '#2C2C2C',
        // Foregrounds
        'fg-primary':   '#FFFFFF',
        'fg-secondary': '#A0A0A0',
        'fg-muted':     '#606060',
        // Brand Accent — Yellow Gold
        'accent':       '#F5C800',
        'accent-dark':  '#D4AB00',
        'accent-text':  '#0F0F0F', // texto sobre accent
        'accent-dim':   'rgba(245,200,0,0.12)',
        'accent-glow':  'rgba(245,200,0,0.20)',
        // Semantic
        'success':  '#22C55E',
        'warning':  '#F5C800', // warning = mismo accent
        'error':    '#EF4444',
        // VIP Tiers
        'tier-silver-from': '#71717A',
        'tier-silver-to':   '#3F3F46',
        'tier-gold-from':   '#F59E0B',
        'tier-gold-to':     '#92400E',
        'tier-plat-from':   '#3B82F6',
        'tier-plat-to':     '#1E1B4B',
        'tier-black-from':  '#27272A',
        'tier-black-to':    '#0F0F0F',
      },
      fontFamily: {
        display: ['Barlow Condensed', 'sans-serif'],
        body:    ['Barlow', 'sans-serif'],
        sans:    ['Barlow', 'sans-serif'],
      },
      fontSize: {
        'display': ['48px', { lineHeight: '1.0', letterSpacing: '-0.02em', fontWeight: '800' }],
        'h1':      ['32px', { lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '700' }],
        'h2':      ['24px', { lineHeight: '1.2', fontWeight: '700' }],
        'h3':      ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.6' }],
        'base':    ['16px', { lineHeight: '1.6' }],
        'sm':      ['14px', { lineHeight: '1.5' }],
        'caption': ['12px', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' }],
        'counter': ['32px', { lineHeight: '1.0', letterSpacing: '0.04em', fontWeight: '600' }],
      },
      borderRadius: {
        'sm':  '8px',
        'md':  '12px',
        'lg':  '16px',
        'xl':  '20px',
        '2xl': '24px',
      },
      boxShadow: {
        'card':       '0 4px 24px rgba(0,0,0,0.40)',
        'modal':      '0 8px 40px rgba(0,0,0,0.60)',
        'accent':     '0 0 24px rgba(200,121,65,0.25)',
        'tier-silver':'0 0 32px rgba(161,161,170,0.20)',
        'tier-gold':  '0 0 32px rgba(245,158,11,0.30)',
        'tier-plat':  '0 0 32px rgba(59,130,246,0.30)',
        'tier-black': '0 0 32px rgba(200,121,65,0.35)',
        'success':    '0 0 24px rgba(34,197,94,0.30)',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'card-appear': {
          '0%':   { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 24px rgba(200,121,65,0.25)' },
          '50%':      { boxShadow: '0 0 40px rgba(200,121,65,0.50)' },
        },
        'pulse-success': {
          '0%, 100%': { boxShadow: '0 0 24px rgba(34,197,94,0.20)' },
          '50%':      { boxShadow: '0 0 40px rgba(34,197,94,0.50)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        'fade-up':       'fade-up 300ms ease-out both',
        'card-appear':   'card-appear 400ms cubic-bezier(0.16,1,0.3,1) both',
        'pulse-glow':    'pulse-glow 2s ease-in-out infinite',
        'pulse-success': 'pulse-success 1.5s ease-in-out infinite',
        'float':         'float 3s ease-in-out infinite',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}

export default config
```

---

## 9. PWA Config Checklist

```typescript
// next.config.ts — PWA setup
// Recomendado: next-pwa o @ducanh2912/next-pwa

// public/manifest.json
{
  "name": "Taper Barbershop",
  "short_name": "Taper",
  "theme_color": "#0F0F13",      // bg-base
  "background_color": "#07070A", // bg-void
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Meta tags en `app/layout.tsx`:**
```tsx
<meta name="theme-color" content="#0F0F13" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

**`viewport-fit=cover`** esencial para safe-area en notch/isla.

---

## 10. Accessibility Checklist

- [ ] Contraste texto primario sobre `bg-base`: 14:1 ✓ (F0F0F2 / 0F0F13)
- [ ] Contraste accent sobre `bg-base`: verificar con herramienta — si falla, usar `#D4894E`
- [ ] QR: siempre fondo blanco `#FFFFFF`, módulos `#000000`, mínimo 200×200px
- [ ] Touch targets: mínimo `min-h-[48px] min-w-[48px]` en todo interactivo
- [ ] Bottom nav: `role="navigation"`, `aria-label="Navegación principal"`
- [ ] Progress bar: `role="progressbar" aria-valuenow={4} aria-valuemax={6} aria-label="4 de 6 cortes"`
- [ ] Tier badges: `aria-label="Nivel Gold"`
- [ ] Panel admin: funcional en tablets con teclado, full keyboard nav
- [ ] `prefers-reduced-motion`: todas las animaciones con fallback estático
- [ ] QR con alto contraste siempre, nunca con opacidad reducida

---

## 11. Component File Map (propuesto)

```
components/
├── loyalty-card/
│   ├── LoyaltyCard.tsx          ← card principal con estados
│   ├── ProgressBar.tsx          ← barra + counter
│   ├── QRDisplay.tsx            ← QR con tamaño mínimo garantizado
│   ├── TierBadge.tsx            ← chip Silver/Gold/Plat/Black
│   └── RewardOverlay.tsx        ← overlay de celebración
├── ui/
│   ├── Button.tsx               ← primary/secondary/ghost variants
│   ├── Input.tsx                ← float label, error state
│   ├── BottomNav.tsx            ← navegación principal PWA
│   ├── StatCard.tsx             ← card de métrica (número + label)
│   ├── HistoryItem.tsx          ← ítem de historial de servicio
│   └── Toast.tsx                ← feedback con aria-live
├── onboarding/
│   ├── WelcomeScreen.tsx
│   ├── FeatureSlide.tsx
│   └── RegisterForm.tsx
└── vip/
    ├── BenefitsList.tsx
    └── TierProgressStrip.tsx
```

---

## 12. Design Decisions Log

| Decisión | Razón |
|----------|-------|
| **Acento amarillo `#F5C800` vs cobre** | Referencia visual confirma: yellow-gold es el estándar moderno de barbershop apps. Más energético, mayor contraste sobre dark. Cobre quedaba opaco. |
| **Foto full-bleed en onboarding vs blobs** | La referencia usa foto real de barbería — más impacto, más contexto, más credibilidad. Los blobs eran decoración sin contenido. |
| **Bottom nav pill style** | Referencia directa: active item = pill amarillo con icon+label. Patrón moderno, muy legible, identitario. |
| **Botón pill `rounded-full` vs rounded-md** | Referencia usa pill buttons — más suave, más moderno, contrasta bien con las cards rectangulares. |
| **Backgrounds `#181818` (cálido) vs `#0F0F13` (azulado)** | El azulado-negro se siente tech/corporate. El neutro cálido se siente barbería/premium masculino. |
| Barlow Condensed vs Clash Display | Barlow en Google Fonts = sin dependencia de Fontshare en prod |
| 4/2.5 aspect ratio en loyalty card | Evoca tarjeta física real — psicología de "tengo algo valioso" |
| QR siempre blanco/negro (no themed) | Legibilidad de escáner sobre todo — el tier color rodea, no invade |
| Bottom nav 4 ítems (no 5) | Tarjeta · Stats · Historial · Perfil — nada más necesita ser primario |
| `min-h-dvh` en lugar de `100vh` | iOS Safari oculta barra de URL — dvh corrige el viewport real |
| `viewport-fit=cover` | Safe area en iPhone con notch/Dynamic Island sin blancos raros |
| Gradiente en tarjeta per-tier vs solo badge | La tarjeta DEBE verse físicamente diferente por tier — es el reward visual |
| **Flip card vs QR en frente** | QR en el frente fragmenta la jerarquía visual. El frente = identidad del cliente. El QR es la acción — merece su propio momento. Tap → flip → reveal. |
| **Cara trasera amarilla (`#F5C800`)** | Contraste máximo para escaneo. Momento de reveal impactante (dark→yellow). Consistente con el accent de la app. Si tier es Gold, la coherencia es total. |
| **Flip animation 500ms spring vs 300ms linear** | La tarjeta física debe sentirse con peso. 500ms spring da "masa" sin sentirse lento. Linear se siente digital-barato. |
