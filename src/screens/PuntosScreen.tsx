import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SectionList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { viajes as apiViajes, beneficios } from '../api/endpoints';
import { useSession } from '../store/SessionContext';
import { fmtPuntos } from '../lib/tiers';
import Encabezado from '../components/Encabezado';
import { crearTema } from '../theme';

const t = crearTema();

type Mov = {
  id: string;
  fecha: string;
  titulo: string;
  detalle?: string | null;
  puntos: number;   // positivo suma, negativo resta
  icono: keyof typeof Ionicons.glyphMap;
};

const fmtFecha = (f: string) => {
  const d = new Date(String(f).replace(' ', 'T'));
  return isNaN(+d) ? '' : d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function PuntosScreen({ navigation }: any) {
  const { me } = useSession();
  const [movs, setMovs] = useState<Mov[]>([]);
  const [saldo, setSaldo] = useState(0);
  const [vence, setVence] = useState<{ fecha: string; dias: number } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    const lista: Mov[] = [];
    let suma = 0;
    let usados = 0;

    try {
      const v: any = await apiViajes.listar();
      const mios = (v.viajes ?? []).filter(
        (x: any) => !x.usuario_id || String(x.usuario_id) === String(me?.id),
      );
      usados = Number(v.puntos_usados || 0);

      for (const x of mios) {
        const p = Number(x.puntos || 0);
        suma += p;
        if (p === 0) continue;
        lista.push({
          id: 'v' + x.id,
          fecha: x.creado_el || x.fecha,
          titulo: x.destino || 'Viaje',
          detalle: x.tipo && x.tipo !== 'titular' ? x.tipo : null,
          puntos: p,
          icono: 'airplane',
        });
      }
    } catch {}

    try {
      const c: any = await beneficios.canjes();
      for (const x of (c.canjes ?? [])) {
        lista.push({
          id: 'c' + x.id,
          fecha: x.creado_el,
          titulo: x.producto_nombre || 'Canje',
          detalle: x.codigo_qr,
          puntos: -Math.abs(Number(x.puntos_usados || 0)),
          icono: 'gift',
        });
      }
    } catch {}

    // Vencimiento: el sistema renueva todo desde el último viaje
    try {
      const l: any = await apiViajes.lotesPuntos();
      const activo = (l.lotes ?? []).find((x: any) => Number(x.disponibles) > 0);
      if (activo?.vence_el) {
        setVence({ fecha: activo.vence_el, dias: Number(activo.dias_restantes || 0) });
      }
    } catch {}

    lista.sort((a, b) => +new Date(String(b.fecha).replace(' ', 'T')) - +new Date(String(a.fecha).replace(' ', 'T')));
    setMovs(lista);
    setSaldo(Math.max(0, suma - usados));
    setCargando(false);
    setRefrescando(false);
  }, [me?.id]);

  useEffect(() => { cargar(); }, [cargar]);

  // Agrupar por mes para que la lista se lea
  const secciones = agruparPorMes(movs);

  if (cargando) {
    return (
      <View style={s.centro}>
        <ActivityIndicator color={t.color.teal} size="large" />
      </View>
    );
  }

  return (
    <View style={s.fondo}>
      <Encabezado titulo="Tus puntos" onVolver={() => navigation.goBack()} />

      <SectionList
        sections={secciones}
        keyExtractor={(m) => m.id}
        contentContainerStyle={s.contenido}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => { setRefrescando(true); cargar(); }}
            tintColor={t.color.teal}
          />
        }
        ListHeaderComponent={
          <View style={s.resumen}>
            <Text style={s.saldo}>{fmtPuntos(saldo)}</Text>
            <Text style={s.saldoLabel}>puntos disponibles</Text>
            {vence && (
              <Text style={s.vence}>
                Vencen el {fmtFecha(vence.fecha)}
                {vence.dias > 0 ? ` · faltan ${vence.dias} días` : ''}
              </Text>
            )}
            <Text style={s.nota}>
              Cada viaje renueva el vencimiento de todos tus puntos.
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={s.mes}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <View style={s.fila}>
            <View style={[s.icono, item.puntos < 0 && s.iconoResta]}>
              <Ionicons
                name={item.icono}
                size={16}
                color={item.puntos < 0 ? t.color.bordo : t.color.teal}
              />
            </View>
            <View style={s.filaTexto}>
              <Text style={s.filaTitulo} numberOfLines={1}>{item.titulo}</Text>
              <Text style={s.filaFecha}>
                {fmtFecha(item.fecha)}{item.detalle ? ` · ${item.detalle}` : ''}
              </Text>
            </View>
            <Text style={[s.filaPuntos, item.puntos < 0 && s.filaResta]}>
              {item.puntos > 0 ? '+' : ''}{fmtPuntos(item.puntos)}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={s.vacio}>
            Todavía no tenés movimientos. Cuando viajes con nosotros vas a verlos acá.
          </Text>
        }
      />
    </View>
  );
}

function agruparPorMes(movs: Mov[]) {
  const mapa = new Map<string, Mov[]>();
  for (const m of movs) {
    const d = new Date(String(m.fecha).replace(' ', 'T'));
    const clave = isNaN(+d)
      ? 'Sin fecha'
      : d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    if (!mapa.has(clave)) mapa.set(clave, []);
    mapa.get(clave)!.push(m);
  }
  return Array.from(mapa, ([title, data]) => ({ title, data }));
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: t.color.fondo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.color.fondo },
  contenido: { padding: t.espacio.xl, paddingTop: 0, paddingBottom: t.espacio.xxl },
  resumen: {
    backgroundColor: t.color.navy,
    borderRadius: t.radio.grande,
    padding: t.espacio.xl,
    marginBottom: t.espacio.lg,
  },
  saldo: { ...t.texto.cifra, color: '#fff' },
  saldoLabel: { ...t.texto.chico, color: 'rgba(255,255,255,0.7)' },
  vence: { ...t.texto.chicoFuerte, color: t.color.gold, marginTop: t.espacio.md },
  nota: { ...t.texto.pie, color: 'rgba(255,255,255,0.5)', marginTop: t.espacio.xs },
  mes: {
    ...t.texto.chicoFuerte, color: t.color.textoSuave,
    marginTop: t.espacio.lg, marginBottom: t.espacio.sm,
    textTransform: 'capitalize',
  },
  fila: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    padding: t.espacio.md,
    marginBottom: t.espacio.sm,
  },
  icono: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(17,188,179,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconoResta: { backgroundColor: 'rgba(121,15,53,0.1)' },
  filaTexto: { flex: 1, marginLeft: t.espacio.md },
  filaTitulo: { ...t.texto.cuerpoFuerte, color: t.color.texto },
  filaFecha: { ...t.texto.pie, color: t.color.textoSuave },
  filaPuntos: { ...t.texto.cuerpoFuerte, color: t.color.teal },
  filaResta: { color: t.color.bordo },
  vacio: { ...t.texto.cuerpo, color: t.color.textoSuave, textAlign: 'center', marginTop: t.espacio.xl },
});
