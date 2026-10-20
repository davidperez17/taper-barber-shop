import { Isotipo } from "@/components/Isotipo";
import { headers } from "next/headers";
import { QR_OFFLINE_KEY } from "@/lib/qr-offline";
import { NONCE_HEADER } from "@/lib/csp";

// El SW sirve esta página (precacheada) cuando una navegación falla sin red.
// Sus chunks JS pueden no estar en caché, así que todo lo dinámico va en un
// script inline: muestra el número de cliente guardado por la tarjeta (el QR
// rotativo no sirve sin red) y cablea "Reintentar".
const SCRIPT = `(function(){
  var b=document.getElementById("offline-retry");
  if(b)b.onclick=function(){location.reload()};
  try{
    var k=${JSON.stringify(QR_OFFLINE_KEY)};
    var d=JSON.parse(localStorage.getItem(k)||"null");
    if(!d||!d.memberId)return;
    if(d.qrSvg)localStorage.setItem(k,JSON.stringify({nombre:d.nombre,memberId:d.memberId}));
    document.getElementById("offline-qr-nombre").textContent=d.nombre||"";
    document.getElementById("offline-qr-id").textContent=d.memberId;
    document.getElementById("offline-qr").hidden=false;
  }catch(e){}
})();`;

const BLOQUE_NUMERO = `<div id="offline-qr" hidden>
  <div class="rounded-2xl border border-line bg-elevated p-5">
    <p class="text-xs text-muted">Tu número de cliente</p>
    <p id="offline-qr-id" class="mt-1 font-display text-4xl font-bold tabular-nums text-accent"></p>
    <p id="offline-qr-nombre" class="mt-2 font-display text-base font-semibold text-ink"></p>
  </div>
  <p class="mt-2 text-xs text-muted">Sin internet tu QR no se actualiza. Dile este número al cajero.</p>
</div>`;

export default async function OfflinePage() {
  // El script inline necesita el nonce de la CSP (lib/csp.ts).
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-full border border-line bg-elevated">
        <Isotipo className="h-[24px] w-[13px] text-accent" />
      </div>
      <h1 className="font-display text-2xl font-bold text-ink">Sin conexión</h1>
      <p className="mt-2 max-w-[280px] text-sm text-muted">
        No hay internet ahora mismo. Tu tarjeta y progreso vuelven en cuanto recuperes la red.
      </p>

      {/* Fuera del árbol de React: el script lo llena antes de hidratar y, si
          fuera JSX, la hidratación lo vaciaba (error #418, texto distinto). */}
      <div className="mt-6 w-full max-w-[260px]" dangerouslySetInnerHTML={{ __html: BLOQUE_NUMERO }} />

      <button
        id="offline-retry"
        type="button"
        className="mt-6 inline-flex min-h-11 items-center rounded-full bg-accent px-6 font-semibold text-accent-ink"
      >
        Reintentar
      </button>
      <script nonce={nonce} dangerouslySetInnerHTML={{ __html: SCRIPT }} />
    </main>
  );
}
