import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { grupales as apiGrupales } from '../api/endpoints';
import Encabezado from '../components/Encabezado';
import { crearTema } from '../theme';

const t = crearTema();

const fmtFecha = (f?: string | null) => {
  if (!f) return null;
  const d = new Date(String(f).replace(' ', 'T'));
  return isNaN(+d) ? null : d.toLocaleDateString('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
};

export default function GrupalesScreen({ navigation }: any) {
  const [mios, setMios] = useState<any[]>([]);
  const [abiertas, setAbiertas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    const [g, l] = await Promise.allSettled([
      apiGrupales.misGrupos(),
      apiGrupales.listar(),
    ]);
    if (g.status === 'fulfilled') setMios((g.value as any)?.grupos ?? []);
    if (l.status === 'fulfilled') {
      const v = l.value as any;
      setAbiertas(v?.grupales ?? v?.salidas ?? []);
    }
    setCargando(false);
    setRefrescando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) {
    return (
      <View style={s.centro}>
        <ActivityIndicator color={t.color.teal} size="large" />
      </View>
    );
  }

  const nada = mios.length === 0 && abiertas.length === 0;

  return (
    <View style={s.fondo}>
      <Encabezado titulo="Salidas grupales" onVolver={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={s.contenido}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => { setRefrescando(true); cargar(); }}
            tintColor={t.color.teal}
          />
        }
      >
        {mios.length > 0 && (
          <>
            <Text style={s.seccion}>Tus salidas</Text>
            {mios.map((g: any, i: number) => (
              <Tarjeta key={g.id ?? 'm' + i} g={g} propia />
            ))}
          </>
        )}

        {abiertas.length > 0 && (
          <>
            <Text style={s.seccion}>Próximas salidas</Text>
            {abiertas.map((g: any, i: number) => (
              <Tarjeta key={g.id ?? 'a' + i} g={g} />
            ))}
          </>
        )}

        {nada && (
          <View style={s.vacioCaja}>
            <Text style={s.vacioTitulo}>No hay salidas grupales por ahora</Text>
            <Text style={s.vacioTexto}>
              Cuando abramos una nueva, la vas a ver acá y te avisamos.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Tarjeta({ g, propia }: { g: any; propia?: boolean }) {
  const fecha = fmtFecha(g.fecha_salida || g.fecha);
  const cupos = g.cupos_disponibles ?? g.cupos;

  return (
    <View style={[s.tarjeta, propia && s.tarjetaPropia]}>
      <View style={s.fila}>
        <Text style={s.destino} numberOfLines={1}>
          {g.destino || g.nombre || g.titulo || 'Salida grupal'}
        </Text>
        {propia && (
          <View style={s.chip}>
            <Text style={s.chipTexto}>Anotado</Text>
          </View>
        )}
      </View>

      {fecha && <Text style={s.fecha}>{fecha}</Text>}

      {g.coordinador_nombre ? (
        <View style={s.datoFila}>
          <Ionicons name="person-outline" size={14} color={t.color.textoSuave} />
          <Text style={s.dato}>Coordina {g.coordinador_nombre}</Text>
        </View>
      ) : null}

      {cupos != null && Number(cupos) >= 0 && (
        <View style={s.datoFila}>
          <Ionicons name="people-outline" size={14} color={t.color.textoSuave} />
          <Text style={s.dato}>
            {Number(cupos) === 0 ? 'Sin cupos' : `${cupos} lugares disponibles`}
          </Text>
        </View>
      )}

      {g.descripcion ? <Text style={s.desc}>{g.descripcion}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: t.color.fondo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.color.fondo },
  contenido: { padding: t.espacio.xl, paddingTop: t.espacio.sm },
  seccion: {
    ...t.texto.chicoFuerte, color: t.color.textoSuave,
    marginTop: t.espacio.lg, marginBottom: t.espacio.sm,
  },
  tarjeta: {
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    padding: t.espacio.lg,
    marginBottom: t.espacio.md,
  },
  tarjetaPropia: { borderLeftWidth: 3, borderLeftColor: t.color.teal },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  destino: { ...t.texto.seccion, color: t.color.texto, flex: 1 },
  chip: {
    backgroundColor: 'rgba(17,188,179,0.12)',
    borderRadius: t.radio.pastilla,
    paddingHorizontal: t.espacio.md,
    paddingVertical: 2,
  },
  chipTexto: { ...t.texto.pie, color: t.color.teal },
  fecha: { ...t.texto.chico, color: t.color.textoSuave, marginTop: t.espacio.xs },
  datoFila: { flexDirection: 'row', alignItems: 'center', gap: t.espacio.sm, marginTop: t.espacio.sm },
  dato: { ...t.texto.chico, color: t.color.textoSuave },
  desc: { ...t.texto.chico, color: t.color.texto, marginTop: t.espacio.md },
  vacioCaja: { padding: t.espacio.xl, alignItems: 'center' },
  vacioTitulo: { ...t.texto.seccion, color: t.color.texto, marginBottom: t.espacio.sm, textAlign: 'center' },
  vacioTexto: { ...t.texto.cuerpo, color: t.color.textoSuave, textAlign: 'center' },
});
