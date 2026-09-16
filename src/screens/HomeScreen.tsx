import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../store/SessionContext';
import { viajes as apiViajes, type Viaje } from '../api/endpoints';
import TarjetaPuntos from '../components/TarjetaPuntos';
import MapaViajes from '../components/MapaViajes';
import { crearTema } from '../theme';

const t = crearTema();

const fmtFecha = (f: string) =>
  new Date(f + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

function diasHasta(f: string) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const d = new Date(f + 'T00:00:00'); d.setHours(0, 0, 0, 0);
  return Math.round((+d - +hoy) / 86400000);
}

function saludo() {
  const h = new Date().getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buen día';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function HomeScreen({ navigation }: any) {
  const { me } = useSession();
  const [lista, setLista] = useState<Viaje[]>([]);
  const [puntos, setPuntos] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const d = await apiViajes.listar();
      const mios = (d.viajes ?? []).filter(
        (v) => !v.usuario_id || String(v.usuario_id) === String(me?.id),
      );
      const total = mios.reduce((s, v) => s + Number(v.puntos || 0), 0);
      setLista(mios);
      setPuntos(Math.max(0, total - Number(d.puntos_usados || 0)));
    } catch (e: any) {
      setError(e?.message ?? 'No pudimos cargar tus datos.');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [me?.id]);

  useEffect(() => { cargar(); }, [cargar]);

  const proximo = lista
    .filter((v) => diasHasta(v.fecha) >= 0)
    .sort((a, b) => +new Date(a.fecha) - +new Date(b.fecha))[0];

  const hechos = lista.filter((v) => diasHasta(v.fecha) < 0).length;

  if (cargando) {
    return (
      <View style={s.centro}>
        <ActivityIndicator color={t.color.teal} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.fondo} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.contenido}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => { setRefrescando(true); cargar(); }}
            tintColor={t.color.teal}
          />
        }
      >
        <Text style={s.saludo}>{saludo()},</Text>
        <Text style={s.nombre}>{me?.nombre}</Text>

        {error && (
          <View style={s.aviso}>
            <Text style={s.avisoTxt}>{error}</Text>
            <Pressable onPress={cargar}>
              <Text style={s.avisoLink}>Reintentar</Text>
            </Pressable>
          </View>
        )}

        <View style={s.puntosCaja}>
          <TarjetaPuntos puntos={puntos} />
        </View>

        {/* ── Próximo viaje ── */}
        {proximo ? (
          <>
            <Text style={s.seccion}>Tu próximo viaje</Text>
            <Pressable
              style={s.viaje}
              onPress={() =>
                navigation.navigate('Viajes', {
                  screen: 'ViajeDetalle',
                  params: { viajeId: proximo.id, viaje: proximo },
                })
              }
            >
              <View style={s.viajeIcono}>
                <Ionicons name="airplane" size={20} color={t.color.teal} />
              </View>
              <View style={s.viajeTexto}>
                <Text style={s.viajeDestino} numberOfLines={1}>
                  {proximo.destino || 'Tu viaje'}
                </Text>
                <Text style={s.viajeFecha}>{fmtFecha(proximo.fecha)}</Text>
              </View>
              <View style={s.cuenta}>
                <Text style={s.cuentaNum}>{diasHasta(proximo.fecha)}</Text>
                <Text style={s.cuentaTxt}>
                  {diasHasta(proximo.fecha) === 1 ? 'día' : 'días'}
                </Text>
              </View>
            </Pressable>
          </>
        ) : (
          <View style={s.sinViaje}>
            <Ionicons name="airplane-outline" size={26} color={t.color.teal} />
            <Text style={s.sinViajeTit}>No tenés viajes por delante</Text>
            <Text style={s.sinViajeTxt}>
              {hechos > 0
                ? '¿Arrancamos con el próximo? Escribinos y lo armamos.'
                : 'Cuando reserves con nosotros, lo vas a ver acá.'}
            </Text>
          </View>
        )}

        {/* ── Accesos ── */}
        <View style={s.accesos}>
          <Acceso
            icono="card-outline"
            label="Mi credencial"
            onPress={() => navigation.navigate('Tarjeta')}
          />
          <Acceso
            icono="gift-outline"
            label="Beneficios"
            onPress={() => navigation.navigate('Beneficios')}
          />
          <Acceso
            icono="stats-chart-outline"
            label="Mis puntos"
            onPress={() => navigation.navigate('Perfil', { screen: 'Puntos' })}
          />
        </View>

        {/* ── Mapa de destinos ── */}
        <MapaViajes />
      </ScrollView>
    </SafeAreaView>
  );
}

function Acceso({
  icono, label, onPress,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={s.acceso} onPress={onPress}>
      <Ionicons name={icono} size={22} color={t.color.navy} />
      <Text style={s.accesoTxt}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: t.color.fondo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.color.fondo },
  contenido: { padding: t.espacio.xl, paddingBottom: t.espacio.xxl },

  saludo: { ...t.texto.chico, color: t.color.textoSuave },
  nombre: { ...t.texto.titulo, color: t.color.texto, marginBottom: t.espacio.lg },

  aviso: {
    backgroundColor: t.color.superficie,
    borderLeftWidth: 3, borderLeftColor: t.color.error,
    borderRadius: t.radio.chico,
    padding: t.espacio.md,
    marginBottom: t.espacio.md,
  },
  avisoTxt: { ...t.texto.chico, color: t.color.texto },
  avisoLink: { ...t.texto.chicoFuerte, color: t.color.teal, marginTop: t.espacio.xs },

  puntosCaja: { marginBottom: t.espacio.sm },

  seccion: {
    ...t.texto.chicoFuerte, color: t.color.textoSuave,
    marginTop: t.espacio.xl, marginBottom: t.espacio.sm,
  },
  viaje: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    padding: t.espacio.lg,
  },
  viajeIcono: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(17,188,179,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  viajeTexto: { flex: 1, marginLeft: t.espacio.md },
  viajeDestino: { ...t.texto.seccion, color: t.color.texto },
  viajeFecha: { ...t.texto.pie, color: t.color.textoSuave },
  cuenta: { alignItems: 'center', minWidth: 46 },
  cuentaNum: { ...t.texto.titulo, color: t.color.teal },
  cuentaTxt: { ...t.texto.pie, color: t.color.textoSuave, marginTop: -4 },

  sinViaje: {
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    padding: t.espacio.xl,
    alignItems: 'center',
    gap: t.espacio.sm,
    marginTop: t.espacio.xl,
  },
  sinViajeTit: { ...t.texto.seccion, color: t.color.texto },
  sinViajeTxt: { ...t.texto.chico, color: t.color.textoSuave, textAlign: 'center' },

  accesos: { flexDirection: 'row', gap: t.espacio.md, marginTop: t.espacio.lg },
  acceso: {
    flex: 1, alignItems: 'center', gap: t.espacio.sm,
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    paddingVertical: t.espacio.lg,
  },
  accesoTxt: { ...t.texto.pie, color: t.color.texto, textAlign: 'center' },
});
