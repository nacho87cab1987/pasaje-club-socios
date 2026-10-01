import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { estadoPush, abrirAjustes } from '../lib/push';
import { crearTema } from '../theme';

const t = crearTema();

/**
 * Aviso de notificaciones apagadas.
 *
 * iOS solo muestra el diálogo de permiso una vez. Si la persona
 * dijo que no —o lo dijo en la app vieja, que comparte el bundle—
 * no se lo vuelve a preguntar y se queda sin avisos sin saberlo.
 * La única salida son los Ajustes del sistema.
 *
 * Cuando el permiso está bien, no se muestra nada.
 */
export default function AvisoNotificaciones({ compacto }: { compacto?: boolean }) {
  const [denegado, setDenegado] = useState(false);

  const revisar = useCallback(async () => {
    const e = await estadoPush();
    setDenegado(e === 'denegado');
  }, []);

  useEffect(() => {
    revisar();

    // Al volver de los Ajustes hay que volver a mirar: si lo activó,
    // el aviso tiene que desaparecer solo.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') revisar();
    });
    return () => sub.remove();
  }, [revisar]);

  if (!denegado) return null;

  return (
    <Pressable style={[s.caja, compacto && s.compacto]} onPress={abrirAjustes}>
      <Ionicons name="notifications-off-outline" size={20} color={t.color.gold} />
      <View style={s.texto}>
        <Text style={s.titulo}>Tenés las notificaciones apagadas</Text>
        {!compacto && (
          <Text style={s.detalle}>
            Así no te podemos avisar de tus viajes, tus puntos ni las promos.
            Tocá para activarlas.
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={t.color.borde} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.espacio.md,
    backgroundColor: 'rgba(215,202,74,0.10)',
    borderRadius: t.radio.medio,
    borderWidth: 1,
    borderColor: 'rgba(215,202,74,0.35)',
    padding: t.espacio.lg,
    marginBottom: t.espacio.md,
  },
  compacto: { paddingVertical: t.espacio.md },
  texto: { flex: 1 },
  titulo: { ...t.texto.cuerpoFuerte, color: t.color.texto },
  detalle: { ...t.texto.pie, color: t.color.textoSuave, marginTop: 2 },
});
