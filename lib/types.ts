// Tipos de dominio compartidos (espejo de las respuestas de los RPC).

export type ItemTipo = "servicio" | "producto";
export type MetodoPago = "efectivo" | "tarjeta" | "transferencia";

export interface ClienteInfo {
  id: string;
  numero: number;
  nombre: string;
  telefono: string;
  qr_token: string;
  created_at: string;
}

export interface VentaItemDetalle {
  nombre: string;
  precio: number;
  tipo: ItemTipo;
  cantidad: number;
}

export interface HistorialVenta {
  id: string;
  total: number;
  created_at: string;
  recompensa_canjeada: boolean;
  barbero: string | null;
  items: VentaItemDetalle[];
}

export interface LoyaltyRawData {
  cortes_total: number;
  visitas_12m: number;
  recompensas_canjeadas: number;
  cortes_objetivo: number;
  ultima_visita: string | null;
}

export interface ClienteDashboard {
  cliente: ClienteInfo;
  loyalty: LoyaltyRawData;
  historial: HistorialVenta[];
}

// ── CRM: clientes ───────────────────────────────────────────────
export interface ClienteRow {
  id: string;
  numero: number;
  nombre: string;
  telefono: string;
  correo: string | null;
  created_at: string;
  loyalty: LoyaltyRawData;
}

export interface ClienteNota {
  id: string;
  texto: string;
  created_at: string;
}

export interface ClienteFicha {
  cliente: {
    id: string;
    numero: number;
    nombre: string;
    telefono: string;
    correo: string | null;
    qr_token: string;
    created_at: string;
    activo: boolean;
  };
  loyalty: LoyaltyRawData;
  historial: HistorialVenta[];
  notas: ClienteNota[];
  etiquetas: string[];
}

// ── Catálogo (panel admin) ──────────────────────────────────────
export interface Servicio {
  id: string;
  nombre: string;
  precio: number;
  categoria: string | null;
  duracion_min: number | null;
  cuenta_lealtad: boolean;
  activo: boolean;
  orden: number;
  imagen_url: string | null;
}

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  categoria: string | null;
  activo: boolean;
  imagen_url: string | null;
  stock: number;
  stock_min: number;
  controla_stock: boolean;
}

export interface Barbero {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface ConfigLealtad {
  id: number;
  cortes_objetivo: number;
  ventana_meses: number;
}

// ── Sucursales ──────────────────────────────────────────────────
export interface Sucursal {
  id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  activo: boolean;
  orden: number;
  created_at: string;
}

// ── Personal (staff con login) ──────────────────────────────────
export type RolStaff = "cajero" | "barbero" | "admin" | "dueno";

export interface StaffRow {
  id: string;
  user_id: string | null;
  nombre: string;
  rol: RolStaff;
  email: string | null;
  activo: boolean;
  created_at: string;
  last_sign_in_at: string | null;
}

// ── Agenda (citas) ──────────────────────────────────────────────
export type CitaUbicacion = "barberia" | "domicilio";
export type CitaEstado = "pendiente" | "confirmada" | "completada" | "cancelada";

export interface CitaRow {
  id: string;
  cliente_id: string | null;
  cliente_nombre: string | null;
  barbero_id: string | null;
  servicio_id: string | null;
  inicia_en: string;
  duracion_min: number;
  ubicacion: CitaUbicacion;
  direccion: string | null;
  nota: string | null;
  estado: CitaEstado;
  cliente: { nombre: string; telefono: string } | null;
  barbero: { nombre: string } | null;
  servicio: { nombre: string; precio: number; duracion_min: number | null } | null;
}

// ── Cupones (promociones) ───────────────────────────────────────
export type CuponTipo = "porcentaje" | "monto";

export interface Cupon {
  id: string;
  codigo: string;
  tipo: CuponTipo;
  valor: number;
  min_compra: number;
  vigencia_desde: string | null;
  vigencia_hasta: string | null;
  usos_max: number | null;
  usos: number;
  activo: boolean;
  created_at: string;
}
