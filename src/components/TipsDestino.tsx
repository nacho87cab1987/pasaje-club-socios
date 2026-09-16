import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { grupales as apiGrupales } from '../api/endpoints';
import { crearTema } from '../theme';

const t = crearTema();

type Info = {
  descripcion?: string;
  lugares?: string[];
  tips?: string[];
  gastronomia?: string;
  mejor_epoca?: string;
  moneda?: string;
};

export default function TipsDestino({ destino }: { destino?: string | null }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    if (!destino) { setCargando(false); return; }
    try {
      const d: any = await apiGrupales.infoDestino(destino);
      setInfo(d?.info ?? null);
    } catch {
      setInfo(null);
    } finally {
      setCargando(false);
    }
  }, [destino]);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) {
    return (
      <View style={s.centro}>
        <ActivityIndicator color={t.color.teal} />
        <Text style={s.cargandoTxt}>Armando la guía de {destino}</Text>
      </View>
    );
  }

  if (!info) {
    return (
      <View style={s.vacio}>
        <Ionicons name="book-outline" size={28} color={t.color.borde} />
        <Text style={s.vacioTitulo}>Sin guía todavía</Text>
        <Text style={s.vacioTexto}>
          Preguntale a tu asesora por recomendaciones de este destino.
        </Text>
      </View>
    );
  }

  return (
    <>
      {info.descripcion ? (
        <View style={s.intro}>
          <Text style={s.introTxt}>{info.descripcion}</Text>
        </View>
      ) : null}

      {info.lugares?.length ? (
        <>
          <Text style={s.seccion}>Imperdibles</Text>
          <View style={s.bloque}>
            {info.lugares.map((l, i) => (
              <View key={i} style={[s.fila, i > 0 && s.filaBorde]}>
                <Ionicons name="location" size={16} color={t.color.teal} />
                <Text style={s.filaTxt}>{l}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {info.tips?.length ? (
        <>
          <Text style={s.seccion}>Para tener en cuenta</Text>
          <View style={s.bloque}>
            {info.tips.map((tip, i) => (
              <View key={i} style={[s.fila, i > 0 && s.filaBorde]}>
                <Ionicons name="bulb-outline" size={16} color={t.color.gold} />
                <Text style={s.filaTxt}>{tip}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {info.gastronomia ? (
        <Tarjeta icono="restaurant-outline" titulo="Qué comer" texto={info.gastronomia} />
      ) : null}

      {info.mejor_epoca ? (
        <Tarjeta icono="sunny-outline" titulo="Mejor época" texto={info.mejor_epoca} />
      ) : null}

      {info.moneda ? (
        <Tarjeta icono="cash-outline" titulo="Plata" texto={info.moneda} />
      ) : null}

      <Text style={s.pie}>
        Guía generada automáticamente. Ante la duda, consultá con tu asesora.
      </Text>
    </>
  );
}

function Tarjeta({
  icono, titulo, texto,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  titulo: string;
  texto: string;
}) {
  return (
    <View style={s.tarjeta}>
      <View style={s.tarjetaCab}>
        <Ionicons name={icono} size={16} color={t.color.teal} />
        <Text style={s.tarjetaTit}>{titulo}</Text>
      </View>
      <Text style={s.tarjetaTxt}>{texto}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  centro: { paddingVertical: t.espacio.xxl, alignItems: 'center', gap: t.espacio.md },
  cargandoTxt: { ...t.texto.chico, color: t.color.textoSuave },

  intro: {
    backgroundColor: t.color.navy,
    borderRadius: t.radio.medio,
    padding: t.espacio.xl,
  },
  introTxt: { ...t.texto.cuerpo, color: '#fff', lineHeight: 23 },

  seccion: {
    ...t.texto.chicoFuerte, color: t.color.textoSuave,
    marginTop: t.espacio.xl, marginBottom: t.espacio.sm,
  },
  bloque: {
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    paddingHorizontal: t.espacio.lg,
  },
  fila: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: t.espacio.md, paddingVertical: t.espacio.lg,
  },
  filaBorde: { borderTopWidth: 1, borderTopColor: t.color.borde },
  filaTxt: { ...t.texto.cuerpo, color: t.color.texto, flex: 1 },

  tarjeta: {
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    padding: t.espacio.lg,
    marginTop: t.espacio.md,
  },
  tarjetaCab: { flexDirection: 'row', alignItems: 'center', gap: t.espacio.sm },
  tarjetaTit: { ...t.texto.chicoFuerte, color: t.color.teal },
  tarjetaTxt: { ...t.texto.cuerpo, color: t.color.texto, marginTop: t.espacio.sm },

  pie: {
    ...t.texto.pie, color: t.color.textoSuave,
    textAlign: 'center', marginTop: t.espacio.xl,
  },
  vacio: { alignItems: 'center', paddingVertical: t.espacio.xxl, gap: t.espacio.sm },
  vacioTitulo: { ...t.texto.seccion, color: t.color.texto },
  vacioTexto: { ...t.texto.cuerpo, color: t.color.textoSuave, textAlign: 'center' },
});
