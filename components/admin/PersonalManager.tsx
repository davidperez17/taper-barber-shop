"use client";

import { useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  crearStaff, actualizarStaff, cambiarActivoStaff, resetPasswordStaff,
  type PersonalResult,
} from "@/app/admin/(panel)/personal/actions";
import type { StaffRow, RolStaff } from "@/lib/types";
import { IconPlus, IconPencil, IconEye, IconEyeOff } from "@/components/icons";
import { useModalA11y } from "@/components/admin/useModalA11y";

const ROLES: RolStaff[] = ["cajero", "barbero", "admin", "dueno"];
const ROL_LABEL: Record<RolStaff, string> = { cajero: "Cajero", barbero: "Barbero", admin: "Admin", dueno: "Dueño" };
const ROL_DESC: Record<RolStaff, string> = {
  cajero: "Cobra y registra ventas.",
  barbero: "Cobra ventas y atiende.",
  admin: "Gestiona catálogo, reportes e inventario.",
  dueno: "Control total, incluido el personal.",
};
const ROL_CLS: Record<RolStaff, string> = {
  dueno: "border-accent/40 bg-accent-dim text-accent",
  admin: "border-line-strong text-ink",
  barbero: "border-line text-muted",
  cajero: "border-line text-muted",
};

function fmtAcceso(iso: string | null): string {
  if (!iso) return "Sin acceso aún";
  return "Últ. acceso " + new Intl.DateTimeFormat("es-GT", { timeZone: "America/Guatemala", day: "numeric", month: "short" }).format(new Date(iso));
}
function generarPassword(): string {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const rnd = typeof crypto !== "undefined" ? crypto.getRandomValues(new Uint32Array(10)) : null;
  for (let i = 0; i < 10; i++) out += abc[(rnd ? rnd[i] : Math.floor(Math.random() * 1e9)) % abc.length];
  return out;
}

interface SucursalMini { id: string; nombre: string }

export function PersonalManager({ personal, yoId, sucursales }: { personal: StaffRow[]; yoId: string; sucursales: SucursalMini[] }) {
  const [modal, setModal] = useState<StaffRow | "nuevo" | null>(null);

  return (
    <div className="animate-fade-up">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="font-display text-[26px] font-bold tracking-[-0.01em] text-ink">Personal</h1>
        <button onClick={() => setModal("nuevo")} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink">
          <IconPlus size={18} /> Nuevo integrante
        </button>
      </div>
      <p className="mb-5 text-sm text-muted">Dueños y trabajadores con acceso al panel. Solo el dueño gestiona esta sección.</p>

      <div className="flex flex-col gap-2">
        {personal.map((s) => (
          <PersonalFila key={s.id} staff={s} esYo={s.id === yoId} onEdit={() => setModal(s)} />
        ))}
      </div>

      {modal && (
        <PersonalSheet
          staff={modal === "nuevo" ? null : modal}
          esYo={modal !== "nuevo" && modal.id === yoId}
          sucursales={sucursales}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ── acción compartida ───────────────────────────────────────────
function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<PersonalResult>, onOk?: () => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) { setError(r.error ?? "Error"); return; }
      onOk?.();
      router.refresh();
    });
  return { pending, error, setError, run };
}

function PersonalFila({ staff, esYo, onEdit }: { staff: StaffRow; esYo: boolean; onEdit: () => void }) {
  const { pending, run } = useAction();
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-elevated px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`truncate font-semibold ${staff.activo ? "text-ink" : "text-subtle line-through"}`}>{staff.nombre}</p>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${ROL_CLS[staff.rol]}`}>{ROL_LABEL[staff.rol]}</span>
          {esYo && <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-subtle">Tú</span>}
        </div>
        <p className="truncate text-[13px] text-muted">{staff.email ?? "Sin email"}</p>
        <p className="text-[11px] text-subtle">
          {fmtAcceso(staff.last_sign_in_at)}
          {(staff.rol === "cajero" || staff.rol === "barbero") && staff.sucursal_nombre ? ` · ${staff.sucursal_nombre}` : ""}
        </p>
      </div>

      {/* Switch de estado (bloqueado para la propia cuenta) */}
      <button
        type="button"
        role="switch"
        aria-checked={staff.activo}
        aria-label={`${staff.activo ? "Desactivar" : "Activar"} a ${staff.nombre}`}
        disabled={pending || esYo}
        onClick={() => run(() => cambiarActivoStaff(staff.id, !staff.activo))}
        title={esYo ? "No puedes desactivar tu propia cuenta" : undefined}
        className="flex min-h-11 shrink-0 items-center gap-2 rounded-full px-1.5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={`w-14 text-right text-[11px] font-semibold tabular-nums ${staff.activo ? "text-success" : "text-subtle"}`}>
          {staff.activo ? "Activo" : "Inactivo"}
        </span>
        <span className={`relative inline-flex h-[26px] w-[46px] shrink-0 items-center rounded-full transition-colors ${staff.activo ? "bg-success" : "bg-line-strong"}`}>
          <span className={`absolute size-5 rounded-full bg-white shadow-sm transition-transform ${staff.activo ? "translate-x-[23px]" : "translate-x-[3px]"}`} />
        </span>
      </button>

      <button onClick={onEdit} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 text-[13px] font-medium text-muted transition-colors hover:border-line-strong hover:text-ink">
        <IconPencil size={15} /> Editar
      </button>
    </div>
  );
}

// ── helpers de formulario ───────────────────────────────────────
const inputCls = "min-h-[46px] w-full rounded-lg border border-line bg-elevated px-3.5 text-base text-ink outline-none placeholder:text-muted focus:border-accent";

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="flex items-center rounded-lg border border-line bg-elevated px-3.5 focus-within:border-accent">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={ver ? "text" : "password"}
        placeholder={placeholder}
        autoComplete="new-password"
        className="min-h-[46px] w-full bg-transparent text-base text-ink outline-none placeholder:text-muted"
      />
      <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? "Ocultar" : "Mostrar"} aria-pressed={ver} className="ml-1 flex size-9 shrink-0 items-center justify-center rounded-md text-muted hover:text-ink">
        {ver ? <IconEyeOff size={19} /> : <IconEye size={19} />}
      </button>
    </div>
  );
}

function RolSelector({ value, onChange, disabled }: { value: RolStaff; onChange: (r: RolStaff) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      {ROLES.map((r) => {
        const activo = value === r;
        return (
          <button
            key={r}
            type="button"
            disabled={disabled}
            onClick={() => onChange(r)}
            className={`flex items-start gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors disabled:opacity-50 ${activo ? "border-accent bg-accent-dim" : "border-line bg-elevated hover:border-line-strong"}`}
          >
            <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${activo ? "border-accent" : "border-line-strong"}`}>
              {activo && <span className="size-2 rounded-full bg-accent" />}
            </span>
            <span className="min-w-0">
              <span className={`block text-sm font-semibold ${activo ? "text-ink" : "text-muted"}`}>{ROL_LABEL[r]}</span>
              <span className="block text-[12px] text-subtle">{ROL_DESC[r]}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PersonalSheet({ staff, esYo, sucursales, onClose }: { staff: StaffRow | null; esYo: boolean; sucursales: SucursalMini[]; onClose: () => void }) {
  const { pending, error, run } = useAction();
  const ref = useModalA11y(onClose);
  const [nombre, setNombre] = useState(staff?.nombre ?? "");
  const [email, setEmail] = useState(staff?.email ?? "");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<RolStaff>(staff?.rol ?? "cajero");
  const [sucursalId, setSucursalId] = useState<string>(staff?.sucursal_id ?? sucursales[0]?.id ?? "");

  const esNuevo = staff === null;
  // La sucursal solo aplica a trabajadores (dueño/admin ven todas).
  const asignaSucursal = rol === "cajero" || rol === "barbero";

  const guardar = () =>
    esNuevo
      ? run(() => crearStaff({ nombre, email, password, rol, sucursalId: asignaSucursal ? sucursalId : null }), onClose)
      : run(() => actualizarStaff(staff.id, { nombre, rol, sucursalId: asignaSucursal ? sucursalId : null }), onClose);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={esNuevo ? "Nuevo integrante" : "Editar integrante"}>
      <button aria-label="Cerrar" tabIndex={-1} className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div ref={ref} className="animate-fade-up relative flex max-h-[90dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-2xl border border-line bg-bg sm:max-h-[85dvh] sm:rounded-2xl">
        <h2 className="shrink-0 border-b border-line px-5 py-4 font-display text-xl font-bold text-ink">{esNuevo ? "Nuevo integrante" : "Editar integrante"}</h2>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
          <Campo label="Nombre"><input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} autoFocus /></Campo>

          {esNuevo ? (
            <>
              <Campo label="Email (para iniciar sesión)">
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoCapitalize="none" className={inputCls} placeholder="trabajador@taper.gt" />
              </Campo>
              <Campo label="Contraseña temporal">
                <div className="flex flex-col gap-1.5">
                  <PasswordInput value={password} onChange={setPassword} placeholder="Mínimo 8 caracteres" />
                  <button type="button" onClick={() => setPassword(generarPassword())} className="self-start text-[13px] font-medium text-accent hover:underline">
                    Generar contraseña
                  </button>
                </div>
              </Campo>
            </>
          ) : (
            <p className="rounded-lg border border-line bg-elevated px-3.5 py-2.5 text-[13px] text-muted">
              Email: <span className="text-ink">{staff.email ?? "—"}</span>
            </p>
          )}

          <Campo label="Rol y permisos"><RolSelector value={rol} onChange={setRol} disabled={esYo} /></Campo>
          {esYo && <p className="text-[12px] text-subtle">No puedes cambiar tu propio rol de dueño.</p>}

          {asignaSucursal && sucursales.length > 0 && (
            <Campo label="Sucursal asignada">
              <select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)} className={inputCls}>
                {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </Campo>
          )}

          {!esNuevo && <ResetPassword staffId={staff.id} />}

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </div>

        <div className="shrink-0 border-t border-line px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3.5">
          <div className="flex gap-3">
            <button onClick={onClose} className="min-h-[48px] flex-1 rounded-full border border-line text-sm font-medium text-muted hover:text-ink">Cancelar</button>
            <button onClick={guardar} disabled={pending} className="min-h-[48px] flex-1 rounded-full bg-accent text-sm font-semibold text-accent-ink disabled:opacity-50">
              {pending ? "Guardando…" : esNuevo ? "Crear integrante" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ResetPassword({ staffId }: { staffId: string }) {
  const { pending, run } = useAction();
  const [abierto, setAbierto] = useState(false);
  const [pass, setPass] = useState("");
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="self-start text-[13px] font-medium text-accent hover:underline">
        Cambiar contraseña
      </button>
    );
  }
  return (
    <div className="rounded-lg border border-line bg-elevated p-3">
      <p className="mb-2 text-[13px] font-medium text-muted">Nueva contraseña</p>
      <PasswordInput value={pass} onChange={(v) => { setPass(v); setOk(false); setErr(null); }} placeholder="Mínimo 8 caracteres" />
      {err && <p role="alert" className="mt-2 text-[13px] text-danger">{err}</p>}
      {ok && <p className="mt-2 text-[13px] text-success">Contraseña actualizada ✓</p>}
      <div className="mt-2.5 flex gap-2">
        <button type="button" onClick={() => { setAbierto(false); setPass(""); setErr(null); setOk(false); }} className="min-h-10 flex-1 rounded-full border border-line text-[13px] text-muted hover:text-ink">Cancelar</button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(
            async () => {
              const r = await resetPasswordStaff(staffId, pass);
              if (r.ok) { setOk(true); setPass(""); }
              else setErr(r.error ?? "Error");
              return { ok: true }; // el estado local ya refleja el resultado
            },
          )}
          className="min-h-10 flex-1 rounded-full bg-accent text-[13px] font-semibold text-accent-ink disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Actualizar"}
        </button>
      </div>
    </div>
  );
}
