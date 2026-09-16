import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../store/SessionContext';
import { viajes as apiViajes, type Viaje } from '../api/endpoints';
import { getTier, faltanParaSubir, fmtPuntos } from '../lib/tiers';
import { crearTema } from '../theme';

const t = crearTema();

export default function HomeScreen() {
  const { me } = useSession();
  const [lista, setLista] = useState<Viaje[]>([]);
  const [puntos, setPuntos] = useState(0);
  const [cargando, setCargando] = useState(true);
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
    }
  }, [me?.id]);

  useEffect(() => { cargar(); }, [cargar]);

  const tier = getTier(puntos);
  const siguiente = faltanParaSubir(puntos);
  const proximo = lista
    .filter((v) => new Date(v.fecha) >= new Date())
    .sort((a, b) => +new Date(a.fecha) - +new Date(b.fecha))[0];

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
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={cargar} tintColor={t.color.teal} />
      }
    >
      <Text style={s.saludo}>Hola, {me?.nombre}</Text>

      {error && (
        <View style={s.aviso}>
          <Text style={s.avisoTexto}>{error}</Text>
          <Pressable onPress={cargar}><Text style={s.avisoLink}>Reintentar</Text></Pressable>
        </View>
      )}

      <View style={[s.tarjetaPuntos, { borderColor: tier.color }]}>
        <Text style={s.cifra}>{fmtPuntos(puntos)}</Text>
        <Text style={s.cifraLabel}>puntos disponibles</Text>
        <View style={[s.pastilla, { backgroundColor: tier.color }]}>
          <Text style={s.pastillaTexto}>{tier.nombre}</Text>
        </View>
        {siguiente && (
          <Text style={s.progreso}>
            {siguiente.faltan === 1
              ? `Te falta 1 punto para ${siguiente.proximo.nombre}`
              : `Te faltan ${fmtPuntos(siguiente.faltan)} puntos para ${siguiente.proximo.nombre}`}
          </Text>
        )}
      </View>

      <Text style={s.seccion}>Tu próximo viaje</Text>
      {proximo ? (
        <View style={s.tarjeta}>
          <Text style={s.destino}>{proximo.destino}</Text>
          <Text style={s.fecha}>
            {new Date(proximo.fecha).toLocaleDateString('es-AR', {
              day: '2-digit', month: 'long', year: 'numeric',
            })}
          </Text>
        </View>
      ) : (
        <View style={s.tarjeta}>
          <Text style={s.vacio}>
            Todavía no tenés viajes cargados. Cuando reserves, aparece acá.
          </Text>
        </View>
      )}

    </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: t.color.fondo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.color.fondo },
  contenido: { padding: t.espacio.xl, paddingBottom: t.espacio.xxl },
  saludo: { ...t.texto.titulo, color: t.color.texto },
  aviso: {
    backgroundColor: '#fff',
    borderLeftWidth: 3,
    borderLeftColor: t.color.error,
    borderRadius: t.radio.chico,
    padding: t.espacio.md,
    marginTop: t.espacio.lg,
  },
  avisoTexto: { ...t.texto.chico, color: t.color.texto },
  avisoLink: { ...t.texto.chicoFuerte, color: t.color.teal,  marginTop: t.espacio.xs },
  tarjetaPuntos: {
    backgroundColor: t.color.navy,
    borderRadius: t.radio.grande,
    borderLeftWidth: 4,
    padding: t.espacio.xl,
    marginTop: t.espacio.lg,
  },
  cifra: { ...t.texto.cifra, color: '#fff' },
  cifraLabel: { ...t.texto.chico, color: 'rgba(255,255,255,0.7)' },
  pastilla: {
    alignSelf: 'flex-start',
    borderRadius: t.radio.pastilla,
    paddingHorizontal: t.espacio.md,
    paddingVertical: t.espacio.xs,
    marginTop: t.espacio.md,
  },
  pastillaTexto: { ...t.texto.chicoFuerte, color: '#fff' },
  progreso: { ...t.texto.chico, color: t.color.teal, marginTop: t.espacio.md },
  seccion: { ...t.texto.seccion, color: t.color.texto, marginTop: t.espacio.xl },
  tarjeta: {
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    padding: t.espacio.lg,
    marginTop: t.espacio.md,
  },
  destino: { ...t.texto.seccion, color: t.color.texto },
  fecha: { ...t.texto.chico, color: t.color.textoSuave, marginTop: t.espacio.xs },
  vacio: { ...t.texto.cuerpo, color: t.color.textoSuave },
});
