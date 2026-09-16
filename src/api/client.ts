// ══════════════════════════════════════════════════════
// API CLIENT
// Replica el contrato de apiFetch() del app.js actual:
//   - header X-Token
//   - respuesta { ok: true, ...datos } | { ok: false, error }
// Agrega lo que el WebView no tenía: timeout, reintentos
// y un canal para avisar que la sesión venció.
// ══════════════════════════════════════════════════════

import { CONFIG } from '../config';

let _token: string | null = null;
let _onUnauthorized: (() => void) | null = null;

export function setToken(token: string | null) {
  _token = token;
}

/** El store de auth registra acá qué hacer cuando el token muere. */
export function onUnauthorized(fn: () => void) {
  _onUnauthorized = fn;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type Opts = {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** FormData para subidas: no se serializa ni lleva Content-Type. */
  form?: FormData;
  signal?: AbortSignal;
};

async function once<T>(path: string, opts: Opts): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CONFIG.TIMEOUT);

  const headers: Record<string, string> = {};
  if (_token) headers['X-Token'] = _token;
  if (!opts.form) headers['Content-Type'] = 'application/json';

  try {
    const res = await fetch(`${CONFIG.API}/${path}`, {
      method: opts.method ?? (opts.body || opts.form ? 'POST' : 'GET'),
      headers,
      body: opts.form ?? (opts.body ? JSON.stringify(opts.body) : undefined),
      signal: opts.signal ?? ctrl.signal,
    });

    if (res.status === 401 || res.status === 403) {
      _onUnauthorized?.();
      throw new ApiError('Tu sesión venció. Ingresá de nuevo.', res.status);
    }

    // Ferozo a veces devuelve HTML de error con status 200.
    const texto = await res.text();
    let data: any;
    try {
      data = JSON.parse(texto);
    } catch {
      throw new ApiError('El servidor respondió algo inesperado.', res.status);
    }

    if (data?.ok === false) {
      throw new ApiError(data.error || 'No se pudo completar la operación.', res.status);
    }
    if (!res.ok) {
      throw new ApiError(`Error del servidor (${res.status}).`, res.status);
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  let ultimo: unknown;
  for (let intento = 0; intento <= CONFIG.RETRIES; intento++) {
    try {
      return await once<T>(path, opts);
    } catch (e) {
      ultimo = e;
      // Solo reintentar errores de red, nunca respuestas del servidor.
      const esDeRed = !(e instanceof ApiError) || (e as ApiError).status === 0;
      const ultimaVuelta = intento === CONFIG.RETRIES;
      if (!esDeRed || ultimaVuelta) throw e;
      await new Promise((r) => setTimeout(r, 400 * (intento + 1)));
    }
  }
  throw ultimo;
}

/** Subida de archivos (foto de perfil, pasaporte, comprobantes). */
export function apiUpload<T = any>(path: string, form: FormData) {
  return api<T>(path, { method: 'POST', form });
}
