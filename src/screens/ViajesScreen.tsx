import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SectionList, RefreshControl, ActivityIndicator, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { viajes as apiViajes, type Viaje } from '../api/endpoints';
import { useSession } from '../store/SessionContext';
import CatalogoLista from '../components/CatalogoLista';
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
  const [pestana, setPestana] = useState<'mios' | 'catalogo'>('mios');

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

  // Al socio sin viajes se le abre el catálogo: mostrarle un cartel
  // que dice que no tiene nada es la peor primera impresión.
  const [decidido, setDecidido] = useState(false);
  useEffect(() => {
    if (cargando || decidido) return;
    if (lista.length === 0) setPestana('catalogo');
    setDecidido(true);
  }, [cargando, lista.length, decidido]);

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
      {/* Dos pestañas en vez de dos solapas en la barra de abajo:
          es el mismo lugar mental, y cinco pestañas ya son muchas. */}
      <View style={s.pestanas}>
        <Pressable
          style={[s.pestana, pestana === 'mios' && s.pestanaActiva]}
          onPress={() => setPestana('mios')}
        >
          <Text style={[s.pestanaTxt, pestana === 'mios' && s.pestanaTxtActiva]}>
            Mis viajes
          </Text>
        </Pressable>
        <Pressable
          style={[s.pestana, pestana === 'catalogo' && s.pestanaActiva]}
          onPress={() => setPestana('catalogo')}
        >
          <Text style={[s.pestanaTxt, pestana === 'catalogo' && s.pestanaTxtActiva]}>
            Descubrí
          </Text>
        </Pressable>
      </View>

      {pestana === 'catalogo' ? (
        <CatalogoLista navigation={navigation} />
      ) : (
      <>
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
          <Pressable style={s.tarjeta} onPress={() => setPestana('catalogo')}>
            <Text style={s.vacio}>
              Todavía no tenés viajes cargados. Cuando reserves con nosotros,
              aparece acá con tus puntos.
            </Text>
            <Text style={s.vacioLink}>Mirá los viajes que tenemos →</Text>
          </Pressable>
        }
      />
      </>
      )}
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
  pestanas: {
    flexDirection: 'row',
    paddingHorizontal: t.espacio.xl,
    paddingTop: t.espacio.md,
    gap: t.espacio.xl,
    borderBottomWidth: 1,
    borderBottomColor: t.color.borde,
  },
  pestana: {
    paddingVertical: t.espacio.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  pestanaActiva: { borderBottomColor: t.color.teal },
  pestanaTxt: { ...t.texto.titulo, fontSize: 19, color: t.color.textoSuave },
  pestanaTxtActiva: { color: t.color.texto },
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
  vacioLink: { ...t.texto.cuerpoFuerte, color: t.color.teal, marginTop: t.espacio.md },
  error: {
    ...t.texto.chico,
    color: t.color.error,
    paddingHorizontal: t.espacio.xl,
    marginTop: t.espacio.sm,
  },
});
