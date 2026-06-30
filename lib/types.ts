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
