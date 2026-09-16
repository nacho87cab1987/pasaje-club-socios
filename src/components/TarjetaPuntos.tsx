import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getTier, faltanParaSubir, fmtPuntos, TIERS } from '../lib/tiers';
import { crearTema } from '../theme';

const t = crearTema();

/**
 * Tarjeta de puntos.
 *
 * El número es lo único grande: todo lo demás lo acompaña. Antes
 * competían el saldo, el nivel y el texto de progreso al mismo
 * tamaño, y no se sabía dónde mirar.
 */
export default function TarjetaPuntos({ puntos }: { puntos: number }) {
  const tier = getTier(puntos);
  const siguiente = faltanParaSubir(puntos);

  // Cuánto del tramo actual ya recorrió
  const desde = tier.min;
  const hasta = siguiente ? siguiente.proximo.min : tier.min;
  const avance = siguiente && hasta > desde
    ? Math.min(100, Math.max(3, ((puntos - desde) / (hasta - desde)) * 100))
    : 100;

  const posicion = TIERS.indexOf(tier) + 1;

  return (
    <LinearGradient
      colors={[t.color.navy, '#0d4a60']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.caja}
    >
      {/* Círculos de fondo: le dan profundidad sin robar atención */}
      <View style={s.circulo1} pointerEvents="none" />
      <View style={s.circulo2} pointerEvents="none" />

      <View style={s.cabecera}>
        <View style={[s.chip, { backgroundColor: tier.color }]}>
          <Ionicons name="diamond" size={11} color="#fff" />
          <Text style={s.chipTxt}>{tier.nombre}</Text>
        </View>
        <Text style={s.nivel}>
          Nivel {posicion} de {TIERS.length}
        </Text>
      </View>

      <Text style={s.cifra}>{fmtPuntos(puntos)}</Text>
      <Text style={s.cifraLabel}>puntos disponibles</Text>

      {siguiente ? (
        <View style={s.progresoCaja}>
          <View style={s.barra}>
            <LinearGradient
              colors={[t.color.teal, t.color.gold]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[s.barraLlena, { width: `${avance}%` }]}
            />
          </View>
          <Text style={s.progresoTxt}>
            {siguiente.faltan === 1
              ? `Te falta 1 punto para ${siguiente.proximo.nombre}`
              : `Te faltan ${fmtPuntos(siguiente.faltan)} para ${siguiente.proximo.nombre}`}
          </Text>
        </View>
      ) : (
        <View style={s.topeCaja}>
          <Ionicons name="trophy" size={15} color={t.color.gold} />
          <Text style={s.topeTxt}>Llegaste al nivel más alto</Text>
        </View>
      )}
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  caja: {
    borderRadius: t.radio.grande,
    padding: t.espacio.xl,
    overflow: 'hidden',
  },
  circulo1: {
    position: 'absolute', top: -70, right: -50,
    width: 190, height: 190, borderRadius: 95,
    backgroundColor: 'rgba(17,188,179,0.10)',
  },
  circulo2: {
    position: 'absolute', bottom: -90, left: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(215,202,74,0.07)',
  },

  cabecera: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: t.espacio.lg,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: t.radio.pastilla,
    paddingHorizontal: t.espacio.md,
    paddingVertical: 4,
  },
  chipTxt: { ...t.texto.pie, color: '#fff' },
  nivel: { ...t.texto.pie, color: 'rgba(255,255,255,0.45)' },

  cifra: { ...t.texto.cifra, fontSize: 46, lineHeight: 54, color: '#fff' },
  cifraLabel: { ...t.texto.chico, color: 'rgba(255,255,255,0.6)', marginTop: -2 },

  progresoCaja: { marginTop: t.espacio.xl },
  barra: {
    height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  barraLlena: { height: 6, borderRadius: 3 },
  progresoTxt: {
    ...t.texto.chico, color: 'rgba(255,255,255,0.8)',
    marginTop: t.espacio.sm,
  },

  topeCaja: {
    flexDirection: 'row', alignItems: 'center', gap: t.espacio.sm,
    marginTop: t.espacio.xl,
  },
  topeTxt: { ...t.texto.chicoFuerte, color: t.color.gold },
});
