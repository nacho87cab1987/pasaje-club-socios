import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { crearTema } from '../theme';

const t = crearTema();

/** Barra superior de las pantallas internas. */
export default function Encabezado({
  titulo,
  onVolver,
  accion,
}: {
  titulo: string;
  onVolver: () => void;
  accion?: React.ReactNode;
}) {
  return (
    <SafeAreaView edges={['top']} style={s.safe}>
      <View style={s.barra}>
        <Pressable onPress={onVolver} hitSlop={12} style={s.lado}>
          <Ionicons name="chevron-back" size={24} color={t.color.texto} />
        </Pressable>
        <Text style={s.titulo} numberOfLines={1}>{titulo}</Text>
        <View style={s.lado}>{accion}</View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { backgroundColor: t.color.fondo },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: t.espacio.lg,
    paddingVertical: t.espacio.md,
  },
  lado: { width: 40, alignItems: 'flex-end' },
  titulo: { ...t.texto.seccion, color: t.color.texto, flex: 1, marginHorizontal: t.espacio.sm },
});
