// ══════════════════════════════════════════════════════
// SESSION CONTEXT
// Un solo lugar donde vive "quién soy". Las pantallas
// leen de acá, nunca de SecureStore directamente.
// ══════════════════════════════════════════════════════

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, type Usuario } from '../api/endpoints';
import { guardarSesion, leerSesion, cerrarSesion, conectarLogoutAutomatico } from './session';

export type ResultadoRegistro = {
  viajesRecuperados: number;
  puntosRecuperados: number;
};

type Ctx = {
  /** null = no logueado. undefined = todavía cargando. */
  me: Usuario | null | undefined;
  entrar: (email: string, password: string) => Promise<void>;
  registrar: (datos: Record<string, unknown>) => Promise<ResultadoRegistro>;
  salir: () => Promise<void>;
  actualizarMe: (datos: Partial<Usuario>) => void;
};

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Usuario | null | undefined>(undefined);

  // Restaurar sesión al arrancar
  useEffect(() => {
    leerSesion().then((s) => setMe(s?.me ?? null));
    conectarLogoutAutomatico(() => setMe(null));
  }, []);

  const entrar = useCallback(async (email: string, password: string) => {
    const r = await auth.login(email.trim().toLowerCase(), password);
    await guardarSesion(r.token, r.user);
    setMe(r.user);
  }, []);

  /**
   * Alta de socio. El backend, además de crear la cuenta, busca los
   * viajes que esa persona ya hizo (por DNI) y se los acredita.
   * Por eso devuelve cuántos recuperó: la app lo muestra al entrar.
   */
  const registrar = useCallback(async (datos: Record<string, unknown>) => {
    const r: any = await auth.registrar(datos);
    if (r?.token && r?.user) {
      await guardarSesion(r.token, r.user);
      setMe(r.user);
    }
    return {
      viajesRecuperados: Number(r?.viajes_recuperados ?? 0),
      puntosRecuperados: Number(r?.puntos_recuperados ?? 0),
    };
  }, []);

  const salir = useCallback(async () => {
    await cerrarSesion();
    setMe(null);
  }, []);

  const actualizarMe = useCallback((datos: Partial<Usuario>) => {
    setMe((prev) => (prev ? { ...prev, ...datos } : prev));
  }, []);

  return (
    <SessionContext.Provider value={{ me, entrar, registrar, salir, actualizarMe }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession se usó fuera de SessionProvider');
  return ctx;
}
