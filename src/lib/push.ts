// ══════════════════════════════════════════════════════
// PUSH
//
// Usa el token NATIVO del dispositivo (APNs en iOS, FCM en
// Android), no el de Expo, porque el enviador PHP que ya
// funciona en el Hub habla directo con APNs y FCM V1.
//
// OJO: en Expo Go esto no funciona desde el SDK 53. Hace falta
// un development build para probarlo de verdad.
// ══════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
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
};

export function leerDestino(
  respuesta: Notifications.NotificationResponse | null,
): DestinoPush | null {
  const data = respuesta?.notification?.request?.content?.data as any;
  if (!data?.tipo) return null;
  return { tipo: String(data.tipo), id: data.id ? Number(data.id) : undefined };
}

/** Pide permiso y devuelve el token nativo, o null si no se puede. */
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

    // Token nativo: APNs en iOS, FCM en Android.
    const { data: token } = await Notifications.getDevicePushTokenAsync();
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
