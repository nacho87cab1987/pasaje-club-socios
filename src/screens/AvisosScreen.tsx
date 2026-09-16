import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { avisos } from '../api/endpoints';
import Encabezado from '../components/Encabezado';
import { crearTema } from '../theme';

const t = crearTema();

const ICONO: Record<string, keyof typeof Ionicons.glyphMap> = {
  promo: 'pricetag',
  viaje: 'airplane',
  puntos: 'star',
  chat: 'chatbubble',
  cumple: 'gift',
};

function cuandoFue(f: string) {
  const d = new Date(String(f).replace(' ', 'T'));
  if (isNaN(+d)) return '';
  const min = Math.floor((Date.now() - +d) / 60000);
  if (min < 1) return 'reci\u00e9n';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

export default function AvisosScreen({ navigation }: any) {
  const [lista, setLista] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const d: any = await avisos.listar();
      setLista(d?.notificaciones ?? []);
    } catch {
      setLista([]);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) {
    return (
      <View style={s.centro}>
        <ActivityIndicator color={t.color.teal} size="large" />
      </View>
    );
  }

  return (
    <View style={s.fondo}>
      <Encabezado titulo="Avisos" onVolver={() => navigation.goBack()} />

      <FlatList
        data={lista}
        keyExtractor={(n, i) => String(n.id ?? i)}
        contentContainerStyle={s.contenido}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => { setRefrescando(true); cargar(); }}
            tintColor={t.color.teal}
          />
        }
        renderItem={({ item }) => {
          const sinLeer = item.leido === 0 || item.leido === '0' || item.leido === false;
          return (
            <View style={[s.tarjeta, sinLeer && s.sinLeer]}>
              <View style={s.icono}>
                <Ionicons
                  name={ICONO[String(item.tipo)] ?? 'notifications'}
                  size={18}
                  color={t.color.teal}
                />
              </View>
              <View style={s.texto}>
                <Text style={s.titulo}>{item.titulo || 'Aviso'}</Text>
                {item.mensaje ? <Text style={s.mensaje}>{item.mensaje}</Text> : null}
                <Text style={s.cuando}>{cuandoFue(item.creado_el)}</Text>
              </View>
              {sinLeer && <View style={s.bolita} />}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s.vacioCaja}>
            <Text style={s.vacioTitulo}>No hay avisos</Text>
            <Text style={s.vacioTexto}>
              Acá te vamos a avisar de promos, novedades de tus viajes y puntos
              por vencer.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: t.color.fondo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.color.fondo },
  contenido: { padding: t.espacio.xl, paddingTop: t.espacio.sm },
  tarjeta: {
    flexDirection: 'row',
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    padding: t.espacio.lg,
    marginBottom: t.espacio.md,
  },
  sinLeer: { borderLeftWidth: 3, borderLeftColor: t.color.teal },
  icono: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(17,188,179,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  texto: { flex: 1, marginLeft: t.espacio.md },
  titulo: { ...t.texto.cuerpoFuerte, color: t.color.texto },
  mensaje: { ...t.texto.chico, color: t.color.textoSuave, marginTop: t.espacio.xs },
  cuando: { ...t.texto.pie, color: t.color.textoSuave, marginTop: t.espacio.sm },
  bolita: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: t.color.teal, marginTop: t.espacio.xs,
  },
  vacioCaja: { padding: t.espacio.xl, alignItems: 'center' },
  vacioTitulo: { ...t.texto.seccion, color: t.color.texto, marginBottom: t.espacio.sm },
  vacioTexto: { ...t.texto.cuerpo, color: t.color.textoSuave, textAlign: 'center' },
});
