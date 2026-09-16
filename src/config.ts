// ══════════════════════════════════════════════════════
// CONFIG · Pasaje Club Socios
// Única fuente de verdad de URLs y flags.
// Ninguna pantalla debe armar una URL a mano.
// ══════════════════════════════════════════════════════

/**
 * Dominio canónico. NUNCA usar pasajeclub.com.ar:
 * redirige con 301 y un redirect en POST puede perder
 * el body y el header X-Token.
 */
const HOST = 'https://pasajeclub.com';

export const CONFIG = {
  HOST,
  API: `${HOST}/socios/api`,
  FOTOS: `${HOST}/socios/fotos/`,
  IMG_BENEFICIOS: `${HOST}/socios/imagenes_beneficios/`,

  /** Timeout de red en ms. Ferozo a veces tarda en despertar. */
  TIMEOUT: 20000,

  /** Reintentos ante error de red (no ante 4xx). */
  RETRIES: 2,
} as const;

// ── Multi-tenant ready ────────────────────────────────
// El branding NO vive en el código: se pide al backend.
// Hoy devuelve siempre Pasaje Club. El día que AgenciaOS
// venda esto white-label, cambia el endpoint y nada más.

export type Brand = {
  nombre: string;
  logoUrl: string | null;
  colores: {
    navy: string;
    teal: string;
    cream: string;
    gold: string;
    bordo: string;
  };
};

export const BRAND_FALLBACK: Brand = {
  nombre: 'Pasaje Club',
  logoUrl: null,
  colores: {
    navy: '#072D40',
    teal: '#11BCB3',
    cream: '#F0EDE8',
    gold: '#D7CA4A',
    bordo: '#790F35',
  },
};
