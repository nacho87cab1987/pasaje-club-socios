// ══════════════════════════════════════════════════════
// SESIÓN
// El token pasa de localStorage (WebView) a SecureStore
// (Keychain en iOS, Keystore en Android).
//
// OJO — el día del lanzamiento: el localStorage del WebView
// NO es accesible desde React Native. Todos los socios van
// a quedar deslogueados con el update. Ver nota al pie.
// ══════════════════════════════════════════════════════

import * as SecureStore from 'expo-secure-store';
import { setToken, onUnauthorized } from '../api/client';
import type { Usuario } from '../api/endpoints';

const K_TOKEN = 'pc_token';
const K_ME = 'pc_me';

export type Sesion = { token: string; me: Usuario } | null;

export async function guardarSesion(token: string, me: Usuario) {
  await SecureStore.setItemAsync(K_TOKEN, token);
  await SecureStore.setItemAsync(K_ME, JSON.stringify(me));
  setToken(token);
}

export async function leerSesion(): Promise<Sesion> {
  const token = await SecureStore.getItemAsync(K_TOKEN);
  const crudo = await SecureStore.getItemAsync(K_ME);
  if (!token || !crudo) return null;
  try {
    const me = JSON.parse(crudo) as Usuario;
    setToken(token);
    return { token, me };
  } catch {
    await cerrarSesion();
    return null;
  }
}

export async function cerrarSesion() {
  await SecureStore.deleteItemAsync(K_TOKEN);
  await SecureStore.deleteItemAsync(K_ME);
  setToken(null);
}

/** Llamar una vez al arrancar la app. */
export function conectarLogoutAutomatico(alCerrar: () => void) {
  onUnauthorized(() => {
    cerrarSesion().finally(alCerrar);
  });
}

// ── NOTA DE MIGRACIÓN ─────────────────────────────────
// Antes de publicar la v1 nativa:
//   1. Mandar un push avisando "vas a tener que ingresar
//      de nuevo una sola vez".
//   2. Tener el "olvidé mi contraseña" probado y visible,
//      porque muchos socios entraron con Google y nunca
//      definieron una.
//   3. Si el login con Google no entra en la v1, el backend
//      necesita un login por link mágico al email, o esos
//      socios quedan afuera.
