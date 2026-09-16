import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SectionList, RefreshControl, ActivityIndicator, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { viajes as apiViajes, type Viaje } from '../api/endpoints';
import { useSession } from '../store/SessionContext';
import { fmtPuntos } from '../lib/tiers';
import { crearTema } from '../theme';

const t = crearTema();

const fmtFecha = (f: string) =>
  new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });

function diasHasta(f: string) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const d = new Date(f); d.setHours(0, 0, 0, 0);
  return Math.round((+d - +hoy) / 86400000);
}

export default function ViajesScreen({ navigation }: any) {
  const { me } = useSession();
  const [lista, setLista] = useState<Viaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const d = await apiViajes.listar();
      setLista(
        (d.viajes ?? []).filter(
          (v) => !v.usuario_id || String(v.usuario_id) === String(me?.id),
        ),
      );
    } catch (e: any) {
      setError(e?.message ?? 'No pudimos cargar tus viajes.');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [me?.id]);

  useEffect(() => { cargar(); }, [cargar]);

  const futuros = lista
    .filter((v) => diasHasta(v.fecha) >= 0)
    .sort((a, b) => +new Date(a.fecha) - +new Date(b.fecha));
  const pasados = lista
    .filter((v) => diasHasta(v.fecha) < 0)
    .sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha));

  const secciones = [
    ...(futuros.length ? [{ title: 'Próximos', data: futuros }] : []),
    ...(pasados.length ? [{ title: 'Ya viajaste', data: pasados }] : []),
  ];

  if (cargando) {
    return (
      <View style={s.centro}>
        <ActivityIndicator color={t.color.teal} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.fondo} edges={['top']}>
      <Text style={s.titulo}>Mis viajes</Text>

      {error && <Text style={s.error}>{error}</Text>}

      <SectionList
        sections={secciones}
        keyExtractor={(v) => String(v.id)}
        contentContainerStyle={s.contenido}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => { setRefrescando(true); cargar(); }}
            tintColor={t.color.teal}
          />
        }
        renderSectionHeader={({ section }) => (
          <Text style={s.seccion}>{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const dias = diasHasta(item.fecha);
          const futuro = dias >= 0;
          return (
            <Pressable
              style={s.tarjeta}
              onPress={() =>
                navigation.navigate('ViajeDetalle', { viajeId: item.id, viaje: item })
              }
            >
              <View style={s.fila}>
                <Text style={s.destino} numberOfLines={1}>{item.destino}</Text>
                {item.expediente_codigo && (
                  <Text style={s.codigo}>{item.expediente_codigo}</Text>
                )}
              </View>
              <Text style={s.fecha}>{fmtFecha(item.fecha)}</Text>

              {futuro && (
                <View style={s.pastilla}>
                  <Text style={s.pastillaTexto}>
                    {dias === 0 ? 'Salís hoy' : dias === 1 ? 'Falta 1 día' : `Faltan ${dias} días`}
                  </Text>
                </View>
              )}

              {Number(item.puntos) > 0 && (
                <Text style={s.puntos}>+{fmtPuntos(Number(item.puntos))} puntos</Text>
              )}

              {item.notas ? <Text style={s.notas}>{item.notas}</Text> : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={s.tarjeta}>
            <Text style={s.vacio}>
              Todavía no tenés viajes cargados. Cuando reserves con nosotros, aparece acá
              con tus puntos.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: t.color.fondo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.color.fondo },
  titulo: {
    ...t.texto.titulo,
    color: t.color.texto,
    paddingHorizontal: t.espacio.xl,
    paddingTop: t.espacio.md,
  },
  contenido: { padding: t.espacio.xl, paddingTop: t.espacio.md },
  seccion: {
    ...t.texto.chicoFuerte,
    color: t.color.textoSuave,
    
    marginTop: t.espacio.lg,
    marginBottom: t.espacio.sm,
  },
  tarjeta: {
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    padding: t.espacio.lg,
    marginBottom: t.espacio.md,
  },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  destino: { ...t.texto.seccion, color: t.color.texto, flex: 1 },
  codigo: { ...t.texto.pie, color: t.color.textoSuave },
  fecha: { ...t.texto.chico, color: t.color.textoSuave, marginTop: t.espacio.xs },
  pastilla: {
    alignSelf: 'flex-start',
    backgroundColor: t.color.navy,
    borderRadius: t.radio.pastilla,
    paddingHorizontal: t.espacio.md,
    paddingVertical: t.espacio.xs,
    marginTop: t.espacio.md,
  },
  pastillaTexto: { ...t.texto.pie, color: '#fff' },
  puntos: { ...t.texto.chicoFuerte, color: t.color.teal,  marginTop: t.espacio.md },
  notas: { ...t.texto.chico, color: t.color.textoSuave, marginTop: t.espacio.sm },
  vacio: { ...t.texto.cuerpo, color: t.color.textoSuave },
  error: {
    ...t.texto.chico,
    color: t.color.error,
    paddingHorizontal: t.espacio.xl,
    marginTop: t.espacio.sm,
  },
});
