import { Isotipo } from "@/components/Isotipo";
import { QR_OFFLINE_KEY } from "@/lib/qr-offline";

// El SW sirve esta página (precacheada) cuando una navegación falla sin red.
// Sus chunks JS pueden no estar en caché, así que todo lo dinámico va en un
// script inline: muestra el QR guardado por la tarjeta y cablea "Reintentar".
const SCRIPT = `(function(){
  var b=document.getElementById("offline-retry");
  if(b)b.onclick=function(){location.reload()};
  try{
    var d=JSON.parse(localStorage.getItem(${JSON.stringify(QR_OFFLINE_KEY)})||"null");
    if(!d||!d.qrSvg)return;
    document.getElementById("offline-qr-svg").innerHTML=d.qrSvg;
    document.getElementById("offline-qr-nombre").textContent=d.nombre||"";
    document.getElementById("offline-qr-id").textContent=d.memberId||"";
    document.getElementById("offline-qr").hidden=false;
  }catch(e){}
})();`;

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-full border border-line bg-elevated">
        <Isotipo className="h-[24px] w-[13px] text-accent" />
      </div>
      <h1 className="font-display text-2xl font-bold text-ink">Sin conexión</h1>
      <p className="mt-2 max-w-[280px] text-sm text-muted">
        No hay internet ahora mismo. Tu tarjeta y progreso vuelven en cuanto recuperes la red.
      </p>

      <div id="offline-qr" hidden className="mt-6 w-full max-w-[260px]">
        <div className="rounded-2xl border border-line bg-elevated p-4">
          <div id="offline-qr-svg" className="qr-tile mx-auto aspect-square w-full overflow-hidden rounded-xl bg-white" />
          <p id="offline-qr-nombre" className="mt-3 font-display text-base font-semibold text-ink" />
          <p id="offline-qr-id" className="mt-0.5 text-xs font-medium tabular-nums text-accent" />
        </div>
        <p className="mt-2 text-xs text-muted">Muéstraselo al cajero: tu QR funciona sin internet.</p>
      </div>

      <button
        id="offline-retry"
        type="button"
        className="mt-6 inline-flex min-h-11 items-center rounded-full bg-accent px-6 font-semibold text-accent-ink"
      >
        Reintentar
      </button>
      <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
    </main>
  );
}
