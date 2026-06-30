import { QrScanner } from "@/components/admin/QrScanner";

export default function EscanearPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[440px]">
      <h1 className="mb-1 font-display text-[26px] font-bold tracking-[-0.01em] text-ink">Escanear QR</h1>
      <p className="mb-5 text-sm text-muted">Identifica al cliente con la cámara.</p>
      <QrScanner />
    </div>
  );
}
