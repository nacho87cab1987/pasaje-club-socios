// ══════════════════════════════════════════════════════
// ENDPOINTS
// Los ~35 endpoints que consume la capa socio, agrupados.
// Las pantallas llaman acá, nunca a api() directo:
// así el día que un endpoint cambie se toca un solo archivo.
// ══════════════════════════════════════════════════════

import { api, apiUpload } from './client';

// ── Tipos mínimos (ampliar a medida que se porten pantallas) ──

export type Usuario = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  dni?: string | null;
  telefono?: string | null;
  fecha_nacimiento?: string | null;
  foto?: string | null;
  rol?: string;
};

export type Viaje = {
  id: number;
  usuario_id?: number | null;
  destino: string;
  fecha: string;
  tipo?: string | null;
  notas?: string | null;
  puntos: number;
  /** Nuevo: llega cuando el viaje se creó desde un expediente de Savia. */
  expediente_codigo?: string | null;
};

export type LoginResp = { ok: true; token: string; user: Usuario };

// ── Auth ──────────────────────────────────────────────
export const auth = {
  login: (email: string, password: string) =>
    api<LoginResp>('login.php', { body: { email, password } }),
  registrar: (datos: Record<string, unknown>) =>
    api('register.php', { body: datos }),
  recuperarPass: (email: string) =>
    api('recuperar_pass.php', { body: { email } }),
  eliminarCuenta: () => api('eliminar_cuenta.php', { method: 'POST' }),
};

// ── Viajes y puntos ───────────────────────────────────
export const viajes = {
  listar: () => api<{ viajes: Viaje[]; puntos_usados: number }>('viajes.php'),
  companeros: (viajeId: number) =>
    api(`viaje_companeros.php?viaje_id=${viajeId}`),
  vouchers: (viajeId: number) => api(`vouchers.php?viaje_id=${viajeId}`),
  datosViajero: () => api('viajero_datos.php'),
  lotesPuntos: () => api('puntos_vencimiento.php?action=mis_lotes'),
  configPuntos: () => api('config_puntos.php'),
  subirDoc: (tipo: 'pasaporte' | 'cobertura', form: FormData) =>
    apiUpload(`upload_pasaporte.php?tipo=${tipo}`, form),
  /** Documentación ya cargada en el expediente por la vendedora. */
  documentos: (viajeId: number) =>
    api(`socios_viaje_documentos.php?viaje_id=${viajeId}`),
  /** Estado de cuenta: total, pagado, saldo y lista de pagos. Solo lectura. */
  cuenta: (viajeId: number) =>
    api(`socios_viaje_pagos.php?viaje_id=${viajeId}`),
};

// ── Beneficios y canjes ───────────────────────────────
export const beneficios = {
  listar: () => api('beneficios_socios.php'),
  credencial: () => api('mi_credencial.php'),
  canjes: () => api('canjes.php'),
  productos: () => api('productos.php'),
};

// ── Grupales ──────────────────────────────────────────
export const grupales = {
  listar: () => api('grupales.php'),
  misGrupos: () => api('grupos.php'),
  fotos: (grupalId: number) => api(`grupal_fotos.php?grupal_id=${grupalId}`),
  excursiones: (grupalId: number) => api(`excursiones.php?grupal_id=${grupalId}`),
};

// ── Wishlist, destinos, ofertas ───────────────────────
export const catalogo = {
  wishlist: () => api('wishlist.php'),
  /** El backend guarda la lista completa, no de a un ítem. */
  guardarWishlist: (items: unknown[]) =>
    api('wishlist.php', { body: { items } }),
  destinos: () => api('destinos.php'),
  ofertas: () => api('ofertas.php'),
};

// ── Chat con la agencia ───────────────────────────────
export const chat = {
  conversacion: () => api('chat_cliente.php'),
  enviar: (texto: string) =>
    api('chat_cliente.php', { body: { action: 'enviar', texto } }),
  adjuntar: (form: FormData) => apiUpload('chat_upload.php', form),
};

// ── Avisos y push ─────────────────────────────────────
export const avisos = {
  listar: () => api('notificaciones.php'),
  registrarToken: (token: string, plataforma: 'ios' | 'android') =>
    api('notif_token.php', { body: { token, plataforma } }),
};

// ── Perfil y referidos ────────────────────────────────
export const perfil = {
  yo: () => api<{ user: Usuario }>('usuarios.php'),
  editar: (datos: Partial<Usuario>) => api('editar_perfil.php', { body: datos }),
  subirFoto: (form: FormData) => apiUpload('upload_foto.php', form),
  referidos: () => api('referidos.php'),
  afiliado: () => api('afiliados.php'),
  encuestas: () => api('encuestas.php'),
  reviewGoogle: () => api('review_google.php'),
};
