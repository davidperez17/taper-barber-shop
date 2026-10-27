import {
  AbsoluteFill,
  Audio,
  Img,
  Easing,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadCondensed } from "@remotion/google-fonts/BarlowCondensed";
import { loadFont as loadBarlow } from "@remotion/google-fonts/Barlow";

// Anuncio vertical (1080×1920) de la renovación de Taper Chimaltenango.
// Voz en off: ElevenLabs (Claus Encant, eleven_v4), toma A. Los cortes de
// escena siguen las pausas de esa toma (silencedetect), desplazadas VOZ_INICIO.

export const FPS = 30;
export const DURACION = 540; // 18 s

const { fontFamily: CONDENSED } = loadCondensed("normal", { weights: ["600", "800"], subsets: ["latin"] });
const { fontFamily: BARLOW } = loadBarlow("normal", { weights: ["500", "600"], subsets: ["latin"] });

const AMARILLO = "#f5c800";
const NEGRO = "#0b0b0b";
const ROJO = "#e11d2e";

const VOZ_INICIO = 33; // la voz entra justo después del corte del listón
const CORTE = 27; // frame en que cierra la tijera

/** Segundo de la toma A → frame del video. */
const f = (s: number) => Math.round(VOZ_INICIO + s * FPS);

// Frases de la toma A (inicio en s, medido con silencedetect).
const T = {
  renovo: f(1.25), // "…se renovó"
  nuevaCara: f(2.28),
  mismoFilo: f(3.34),
  pasa: f(4.56),
  yaQue: f(5.75),
  sal: f(6.8),
  tarjeta: f(8.55),
  taper: f(11.12),
  esperamos: f(13.45),
};

const ESCENAS = {
  liston: [0, T.nuevaCara - 1],
  filo: [T.nuevaCara - 1, T.pasa - 2],
  barbero: [T.pasa - 2, T.tarjeta - 2],
  tarjeta: [T.tarjeta - 2, T.taper - 2],
  cierre: [T.taper - 2, DURACION],
} as const;

export const Renovacion = () => {
  return (
    <AbsoluteFill style={{ background: NEGRO, fontFamily: CONDENSED }}>
      {Object.entries(ESCENAS).map(([k, [desde, hasta]]) => {
        const Escena = { liston: Liston, filo: Filo, barbero: Barbero, tarjeta: Tarjeta, cierre: Cierre }[k]!;
        return (
          <Sequence key={k} from={desde} durationInFrames={hasta - desde}>
            <Escena />
          </Sequence>
        );
      })}

      <Sequence from={CORTE - 3}>
        <Audio src={staticFile("audio/tijera-a.mp3")} volume={0.9} />
      </Sequence>
      <Sequence from={T.mismoFilo - 2}>
        <Audio src={staticFile("audio/tijera-a.mp3")} volume={0.45} />
      </Sequence>
      <Sequence from={VOZ_INICIO}>
        <Audio src={staticFile("audio/voz-a.mp3")} />
      </Sequence>

      <Vineta />
      <FadeFinal />
    </AbsoluteFill>
  );
};

// ── Escena 1: corte de listón ────────────────────────────────────────────────

function Liston() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Tijera: entra desde la derecha, cierra en CORTE, sale hacia arriba.
  const entra = spring({ frame, fps, config: { damping: 18, mass: 0.7 } });
  const sale = interpolate(frame, [CORTE + 10, CORTE + 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  const tijeraX = 650 + (1 - entra) * 700 + sale * 260;
  const tijeraY = 1000 - sale * 340;
  const apertura = interpolate(frame, [CORTE - 8, CORTE], [17, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.quad),
  });

  // Mitades del listón: caen con rebote desde cada poste.
  const caida = spring({ frame: frame - CORTE, fps, config: { damping: 9, stiffness: 90 } });
  const angulo = caida * 68;

  // Destellos y flash del corte.
  const flash = interpolate(frame, [CORTE, CORTE + 2, CORTE + 10], [0, 0.55, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const eyebrow = spring({ frame: frame - (VOZ_INICIO + 2), fps, config: { damping: 200 } });
  const renovo = spring({ frame: frame - T.renovo, fps, config: { damping: 11, stiffness: 140 } });

  return (
    <AbsoluteFill>
      <Glow y={1000} />
      <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="liston" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff5a5f" />
            <stop offset=".5" stopColor={ROJO} />
            <stop offset="1" stopColor="#8f0e1c" />
          </linearGradient>
        </defs>

        <Poste x={60} y={640} frame={frame} id="pl" alto={620} />
        <Poste x={930} y={640} frame={frame} id="pr" alto={620} />

        <g transform={`rotate(${angulo} 150 1000)`}>
          <path d="M150 972 L540 978 L540 1030 L150 1028 Z" fill="url(#liston)" />
        </g>
        <g transform={`rotate(${-angulo} 930 1000)`}>
          <path d="M540 978 L930 972 L930 1028 L540 1030 Z" fill="url(#liston)" />
        </g>

        <g transform={`translate(${tijeraX} ${tijeraY}) scale(5.4)`} opacity={1 - sale}>
          <Tijera apertura={apertura} />
        </g>

        {[
          [540, 900, 1.6],
          [450, 950, 1],
          [630, 940, 1.2],
          [500, 1090, 0.9],
          [600, 1080, 1.3],
        ].map(([x, y, s], i) => {
          const p = interpolate(frame - CORTE - i * 2, [0, 6, 18], [0, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return <path key={i} d={destello(x, y, s * 26 * p)} fill="#fffbe6" opacity={p} />;
        })}
      </svg>

      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />

      <div
        style={{
          position: "absolute",
          top: 250,
          width: "100%",
          textAlign: "center",
          opacity: eyebrow,
          transform: `translateY(${(1 - eyebrow) * 40}px)`,
        }}
      >
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 92, letterSpacing: 6 }}>TAPER</div>
        <div style={{ color: AMARILLO, fontWeight: 600, fontSize: 58, letterSpacing: 16, marginTop: -6 }}>
          CHIMALTENANGO
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 1530,
          width: "100%",
          textAlign: "center",
          color: "#fff",
          fontWeight: 800,
          fontSize: 200,
          lineHeight: 0.9,
          opacity: Math.min(1, renovo * 1.5),
          transform: `scale(${0.6 + renovo * 0.4})`,
        }}
      >
        ¡SE <span style={{ color: AMARILLO }}>RENOVÓ!</span>
      </div>
    </AbsoluteFill>
  );
}

// ── Escena 2: nueva cara · mismo filo ────────────────────────────────────────

function Filo() {
  const frame = useCurrentFrame();
  const base = ESCENAS.filo[0];
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <Glow y={960} />
      <Navaja texto="NUEVA CARA" color="#fff" top={700} desde={T.nuevaCara - base} frame={frame} />
      <Navaja texto="MISMO FILO" color={AMARILLO} top={980} desde={T.mismoFilo - base} frame={frame} />
    </AbsoluteFill>
  );
}

/** Texto que se revela con un barrido de navaja (línea brillante de izq. a der.). */
function Navaja({ texto, color, top, desde, frame }: { texto: string; color: string; top: number; desde: number; frame: number }) {
  const p = interpolate(frame - desde, [0, 9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const linea = interpolate(frame - desde, [0, 9, 14], [1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top, left: 0, width: "100%", height: 240 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          textAlign: "center",
          color,
          fontWeight: 800,
          fontSize: 230,
          lineHeight: "240px",
          clipPath: `inset(0 ${100 - p * 100}% 0 0)`,
        }}
      >
        {texto}
      </div>
      {p > 0 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${p * 100}%`,
            width: 6,
            background: "linear-gradient(#fff0, #fff, #fff0)",
            boxShadow: `0 0 30px 8px ${AMARILLO}88`,
            opacity: linea,
          }}
        />
      )}
    </div>
  );
}

// ── Escena 3: foto del barbero + llamado ─────────────────────────────────────

function Barbero() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const base = ESCENAS.barbero[0];
  const zoom = interpolate(frame, [0, durationInFrames], [1.08, 1.2]);
  const entra = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  const linea = (desde: number) => spring({ frame: frame - (desde - base), fps, config: { damping: 16, stiffness: 160 } });
  const a = linea(T.pasa);
  const b = linea(T.yaQue);
  const c = linea(T.sal);
  const fresco = spring({ frame: frame - (T.sal - base + 16), fps, config: { damping: 10, stiffness: 150 } });

  return (
    <AbsoluteFill style={{ opacity: entra }}>
      <AbsoluteFill style={{ transform: `scale(${zoom}) translateY(${-frame * 0.4}px)` }}>
        <Img src={staticFile("img/barbero.webp")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{ background: "linear-gradient(180deg, #0b0b0b00 30%, #0b0b0bcc 58%, #0b0b0b 80%)" }}
      />
      <div style={{ position: "absolute", left: 80, right: 80, top: 1180, color: "#fff", fontWeight: 800 }}>
        <Linea p={a} size={104}>PASA A CONOCERLA</Linea>
        <Linea p={b} size={104} color="#ffffffb3">Y YA QUE VIENES,</Linea>
        <Linea p={c} size={104}>SAL CON UN</Linea>
        <div
          style={{
            display: "inline-block",
            marginTop: 14,
            padding: "4px 30px 0",
            background: AMARILLO,
            color: NEGRO,
            fontSize: 150,
            lineHeight: 1.05,
            transform: `scale(${fresco}) rotate(${(1 - fresco) * -6}deg)`,
            transformOrigin: "left center",
          }}
        >
          CORTE FRESCO
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Linea({ p, size, color = "#fff", children }: { p: number; size: number; color?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: size,
        lineHeight: 1.02,
        color,
        opacity: Math.min(1, p * 1.4),
        transform: `translateX(${(1 - p) * -80}px)`,
      }}
    >
      {children}
    </div>
  );
}

// ── Escena 4: la tarjeta de lealtad sigue igual ──────────────────────────────

const SELLOS = 10;
const LLENOS = 7;

function Tarjeta() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = spring({ frame, fps, config: { damping: 14, stiffness: 110 } });
  const titulo = spring({ frame: frame - 2, fps, config: { damping: 200 } });
  const igual = spring({ frame: frame - 34, fps, config: { damping: 10, stiffness: 160 } });

  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      <Glow y={980} />
      <div
        style={{
          position: "absolute",
          top: 330,
          textAlign: "center",
          color: "#fff",
          fontWeight: 800,
          fontSize: 120,
          lineHeight: 0.95,
          opacity: titulo,
          transform: `translateY(${(1 - titulo) * 30}px)`,
        }}
      >
        TU TARJETA
        <br />Y TUS SELLOS
      </div>

      <div
        style={{
          position: "absolute",
          top: 680,
          width: 880,
          height: 540,
          borderRadius: 40,
          padding: "52px 56px",
          boxSizing: "border-box",
          background: "linear-gradient(140deg, #1d1d1d 0%, #121212 60%, #2a2405 100%)",
          border: `3px solid ${AMARILLO}66`,
          boxShadow: `0 40px 120px #000, 0 0 80px ${AMARILLO}22`,
          transform: `perspective(1600px) rotateX(${(1 - card) * 40}deg) translateY(${(1 - card) * 260}px)`,
          opacity: Math.min(1, card * 1.5),
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ color: AMARILLO, fontWeight: 800, fontSize: 64, letterSpacing: 4 }}>CLUB TAPER</div>
          <div style={{ color: "#ffffff99", fontFamily: BARLOW, fontWeight: 500, fontSize: 34 }}>Chimaltenango</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 30, marginTop: 64, justifyItems: "center" }}>
          {Array.from({ length: SELLOS }, (_, i) => {
            const lleno = i < LLENOS;
            const pop = spring({ frame: frame - 10 - i * 3, fps, config: { damping: 9, stiffness: 180 } });
            return (
              <div
                key={i}
                style={{
                  width: 118,
                  height: 118,
                  borderRadius: "50%",
                  border: `5px solid ${lleno ? AMARILLO : "#ffffff30"}`,
                  background: lleno ? AMARILLO : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${lleno ? pop : 1})`,
                }}
              >
                {lleno && (
                  <svg viewBox="-60 -20 90 40" width={74} height={34}>
                    <Tijera apertura={14} mono={NEGRO} />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 1330,
          color: AMARILLO,
          fontWeight: 800,
          fontSize: 150,
          transform: `scale(${igual})`,
          display: "flex",
          alignItems: "center",
          gap: 26,
        }}
      >
        SIGUEN IGUAL
        <svg viewBox="0 0 24 24" width={110} height={110}>
          <path d="M4 12.5l5 5L20 6.5" fill="none" stroke={AMARILLO} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </AbsoluteFill>
  );
}

// ── Escena 5: cierre con logo ────────────────────────────────────────────────

function Cierre() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const base = ESCENAS.cierre[0];
  const logo = spring({ frame, fps, config: { damping: 15, stiffness: 120 } });
  const lugar = spring({ frame: frame - 26, fps, config: { damping: 200 } });
  const cta = spring({ frame: frame - (T.esperamos - base), fps, config: { damping: 9, stiffness: 150 } });
  const pulso = 1 + Math.sin(Math.max(0, frame - (T.esperamos - base) - 20) / 5) * 0.025 * (cta > 0.95 ? 1 : 0);

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Poste x={60} y={1300} frame={frame} id="cl" alto={420} />
        <Poste x={930} y={1300} frame={frame} id="cr" alto={420} />
      </svg>

      <Img
        src={staticFile("img/logo.png")}
        style={{
          position: "absolute",
          top: 260,
          left: 90,
          width: 900,
          mixBlendMode: "lighten",
          opacity: logo,
          transform: `scale(${0.8 + logo * 0.2})`,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 1070,
          width: "100%",
          textAlign: "center",
          opacity: lugar,
          transform: `translateY(${(1 - lugar) * 30}px)`,
        }}
      >
        <div style={{ color: AMARILLO, fontWeight: 800, fontSize: 96, letterSpacing: 14 }}>CHIMALTENANGO</div>
        <div style={{ color: "#ffffffaa", fontFamily: BARLOW, fontWeight: 500, fontSize: 40, marginTop: 6 }}>
          Nueva cara · Mismo filo
        </div>
      </div>

      <div style={{ position: "absolute", top: 1440, width: "100%", display: "flex", justifyContent: "center" }}>
        <div
          style={{
            background: AMARILLO,
            color: NEGRO,
            fontWeight: 800,
            fontSize: 100,
            padding: "18px 70px 10px",
            borderRadius: 999,
            transform: `scale(${cta * pulso})`,
            boxShadow: `0 0 60px ${AMARILLO}66`,
          }}
        >
          ¡TE ESPERAMOS!
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Piezas compartidas ───────────────────────────────────────────────────────

/** Poste de barbero (cilindro 90×alto) con las franjas subiendo. */
function Poste({ x, y, frame, id, alto = 760 }: { x: number; y: number; frame: number; id: string; alto?: number }) {
  const W = 90;
  const P = 120; // periodo de las franjas
  const mov = (frame * 4) % P;
  const franjas = Array.from({ length: Math.ceil(alto / P) + 3 }, (_, i) => i * P - 2 * P + mov);
  return (
    <g transform={`translate(${x} ${y})`}>
      <defs>
        <clipPath id={`c${id}`}>
          <rect width={W} height={alto} rx={14} />
        </clipPath>
        <linearGradient id={`v${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".4" />
          <stop offset=".35" stopColor="#fff" stopOpacity=".3" />
          <stop offset=".6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".5" />
        </linearGradient>
        <linearGradient id={`m${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#5d6168" />
          <stop offset=".4" stopColor="#eceef1" />
          <stop offset="1" stopColor="#4b4e54" />
        </linearGradient>
      </defs>
      <path d={`M-16 0 Q${W / 2} -80 ${W + 16} 0 Z`} fill={`url(#m${id})`} />
      <circle cx={W / 2} cy={-66} r={16} fill={`url(#m${id})`} />
      <rect x={-16} y={-12} width={W + 32} height={26} rx={8} fill={`url(#m${id})`} />
      <rect x={-16} y={alto - 12} width={W + 32} height={26} rx={8} fill={`url(#m${id})`} />
      <rect x={10} y={alto + 14} width={W - 20} height={90} fill={`url(#m${id})`} />
      <rect x={-26} y={alto + 100} width={W + 52} height={26} rx={10} fill={`url(#m${id})`} />
      <g clipPath={`url(#c${id})`}>
        <rect width={W} height={alto} fill="#f6f6f6" />
        {franjas.map((o) => (
          <g key={o}>
            <path d={`M-20 ${o + 90} L${W + 20} ${o} L${W + 20} ${o + 34} L-20 ${o + 124} Z`} fill="#d7262f" />
            <path d={`M-20 ${o + 150} L${W + 20} ${o + 60} L${W + 20} ${o + 84} L-20 ${o + 174} Z`} fill="#1f3f99" />
          </g>
        ))}
        <rect width={W} height={alto} fill={`url(#v${id})`} />
      </g>
    </g>
  );
}

/** Tijera con el perno en (0,0), hojas hacia la izquierda. */
function Tijera({ apertura, mono }: { apertura: number; mono?: string }) {
  const pieza = (signo: 1 | -1) => (
    <g transform={`rotate(${apertura * signo})`}>
      <path
        d={`M3 ${-2.6 * signo} L-46 ${-1.2 * signo} Q-49 0 -46 ${0.9 * signo} L3 ${2.2 * signo} Z`}
        fill={mono ?? "#dfe3e8"}
        stroke={mono ? "none" : "#80868e"}
        strokeWidth={0.6}
      />
      <path d={`M2 0 L15 ${8 * signo}`} stroke={mono ?? AMARILLO} strokeWidth={5} strokeLinecap="round" />
      <circle cx={23} cy={12 * signo} r={7.5} fill="none" stroke={mono ?? AMARILLO} strokeWidth={4} />
    </g>
  );
  return (
    <>
      {pieza(1)}
      {pieza(-1)}
      <circle r={2.6} fill={mono ?? "#55585e"} />
    </>
  );
}

function destello(x: number, y: number, a: number) {
  const b = a * 0.27;
  return `M${x} ${y - a} L${x + b} ${y - b} L${x + a} ${y} L${x + b} ${y + b} L${x} ${y + a} L${x - b} ${y + b} L${x - a} ${y} L${x - b} ${y - b} Z`;
}

function Glow({ y }: { y: number }) {
  const frame = useCurrentFrame();
  const r = 0.85 + Math.sin(frame / 18) * 0.08;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% ${(y / 1920) * 100}%, ${AMARILLO}38 0%, transparent ${46 * r}%)`,
      }}
    />
  );
}

function Vineta() {
  return <AbsoluteFill style={{ pointerEvents: "none", background: "radial-gradient(ellipse at center, transparent 60%, #000a 100%)" }} />;
}

function FadeFinal() {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [DURACION - 14, DURACION - 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: "#000", opacity: o }} />;
}
