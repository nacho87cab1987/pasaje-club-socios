// ══════════════════════════════════════════════════════
// PUSH
//
// Usa el token de EXPO (ExponentPushToken[...]), no el nativo
// de APNs, porque el enviador del servidor manda todo a través
// del servicio de Expo: un POST y Expo se encarga de APNs y de
// FCM. Es el mismo camino que usa el Hub.
//
// OJO: en Expo Go esto no funciona desde el SDK 53. Hace falta
// un build de verdad para probarlo.
// ══════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { Platform, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { avisos } from '../api/endpoints';

/** Con la app abierta: mostrar igual la notificación. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * A dónde lleva cada notificación.
 * El backend manda estos campos en `data`:
 *   { tipo: 'aviso' | 'chat' | 'viaje' | 'beneficio', id?: number }
 */
export type DestinoPush = {
  tipo: string;
  id?: number;
  /** Si el aviso trae un link, se abre en vez de navegar adentro. */
  url?: string;
};

export function leerDestino(
  respuesta: Notifications.NotificationResponse | null,
): DestinoPush | null {
  const data = respuesta?.notification?.request?.content?.data as any;
  if (!data?.tipo && !data?.url) return null;
  return {
    tipo: String(data.tipo ?? 'aviso'),
    id: data.id ? Number(data.id) : undefined,
    url: data.url ? String(data.url) : undefined,
  };
}

export type EstadoPush = 'concedido' | 'denegado' | 'sin_dispositivo' | 'error';

/**
 * En qué estado están las notificaciones, sin pedir nada.
 *
 * Hace falta porque iOS solo muestra el diálogo una vez: si la
 * persona dijo que no (o lo dijo en la app vieja de Capacitor,
 * que comparte el bundle), no se lo vuelve a preguntar nunca y
 * queda sin avisos sin enterarse.
 */
export async function estadoPush(): Promise<EstadoPush> {
  if (!Device.isDevice) return 'sin_dispositivo';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted' ? 'concedido' : 'denegado';
  } catch {
    return 'error';
  }
}

/** Abre los ajustes del sistema, que es el único lugar donde se puede reactivar. */
export function abrirAjustes() {
  Linking.openSettings().catch(() => {});
}

/** Pide permiso y devuelve el token, o null si no se puede. */
export async function registrarPush(): Promise<string | null> {
  // En emulador no hay push real.
  if (!Device.isDevice) return null;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Avisos de Pasaje Club',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#11BCB3',
      });
    }

    const { status: actual } = await Notifications.getPermissionsAsync();
    let status = actual;
    if (status !== 'granted') {
      const pedido = await Notifications.requestPermissionsAsync();
      status = pedido.status;
    }
    if (status !== 'granted') return null;

    // Desde el SDK 49 hay que pasarle el projectId a mano: sin eso
    // falla en el build de producción aunque ande en desarrollo.
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId;

    if (!projectId) return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return null;

    await avisos.registrarToken(String(token), Platform.OS === 'ios' ? 'ios' : 'android');
    return String(token);
  } catch {
    // Que nunca rompa el arranque de la app.
    return null;
  }
}

/**
 * Engancha el ciclo de vida de las notificaciones.
 *
 * `alAbrir` se llama tanto si la app estaba abierta como si se
 * abrió desde cero tocando la notificación. Ese segundo caso es
 * el que se suele olvidar y el que más se nota.
 */
export function usePush(
  logueado: boolean,
  alAbrir: (destino: DestinoPush) => void,
) {
  const yaRegistro = useRef(false);

  useEffect(() => {
    if (!logueado || yaRegistro.current) return;
    yaRegistro.current = true;
    registrarPush();
  }, [logueado]);

  useEffect(() => {
    if (!logueado) return;

    // App cerrada: la notificación que la abrió.
    Notifications.getLastNotificationResponseAsync().then((r) => {
      const d = leerDestino(r);
      if (d) alAbrir(d);
    });

    // App abierta o en segundo plano.
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const d = leerDestino(r);
      if (d) alAbrir(d);
    });

    return () => sub.remove();
  }, [logueado, alAbrir]);
}
