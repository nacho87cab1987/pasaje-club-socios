import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Image,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { paquetes as apiPaquetes, type PaqueteCard } from '../api/endpoints';
import { crearTema } from '../theme';

const t = crearTema();

const plata = (n: number, moneda?: string | null) => {
  const sim = (moneda ?? 'USD') === 'ARS' ? '$' : 'USD';
  return `${sim} ${new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
  }).format(Math.round(n))}`;
};

const fmtMes = (f?: string | null) => {
  if (!f) return null;
  const d = new Date(String(f).slice(0, 10) + 'T12:00:00');
  if (isNaN(+d)) return null;
  return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
};

type Filtro = 'todos' | 'grupal' | 'paquete';

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todos',   label: 'Todo' },
  { id: 'grupal',  label: 'Grupales' },
  { id: 'paquete', label: 'A tu medida' },
];

/**
 * El catálogo de viajes.
 *
 * Vive dentro de Mis viajes, no en una pestaña propia: el socio que
 * entra ahí y todavía no tiene ninguno encuentra qué mirar, en vez
 * de un cartel diciéndole que no tiene nada.
 */
export default function CatalogoLista({ navigation }: { navigation: any }) {
  const [lista, setLista] = useState<PaqueteCard[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const d: any = await apiPaquetes.listar();
      setLista(Array.isArray(d) ? d : (d?.items ?? d?.destinos ?? []));
    } catch (e: any) {
      setError(e?.message ?? 'No pudimos cargar los viajes.');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Los filtros solo se muestran si hay de los dos tipos: con un
  // solo tipo, el filtro no filtra nada.
  const hayDeAmbos = useMemo(() => {
    const tipos = new Set(lista.map((p) => (p.tipo === 'grupal' ? 'g' : 'p')));
    return tipos.size > 1;
  }, [lista]);

  const visibles = useMemo(() => {
    if (filtro === 'todos') return lista;
    if (filtro === 'grupal') return lista.filter((p) => p.tipo === 'grupal');
    return lista.filter((p) => p.tipo !== 'grupal');
  }, [lista, filtro]);

  if (cargando) {
    return (
      <View style={s.centro}>
        <ActivityIndicator color={t.color.teal} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={visibles}
      keyExtractor={(p, i) => p.destino_slug || String(i)}
      contentContainerStyle={s.contenido}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refrescando}
          onRefresh={() => { setRefrescando(true); cargar(); }}
          tintColor={t.color.teal}
        />
      }
      ListHeaderComponent={
        <>
          {error ? <Text style={s.error}>{error}</Text> : null}
          {hayDeAmbos && (
            <View style={s.filtros}>
              {FILTROS.map((f) => {
                const activo = filtro === f.id;
                return (
                  <Pressable
                    key={f.id}
                    style={[s.chip, activo && s.chipActivo]}
                    onPress={() => setFiltro(f.id)}
                  >
                    <Text style={[s.chipTxt, activo && s.chipTxtActivo]}>
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      }
      renderItem={({ item }) => {
        const precio = Number(item.precio_desde ?? 0);
        const mes = fmtMes(item.fecha_salida);
        const noches = Number(item.noches ?? 0);

        return (
          <Pressable
            style={s.tarjeta}
            onPress={() =>
              navigation.navigate('CatalogoDetalle', {
                slug: item.destino_slug,
                destino: item.destino,
                portada: item.portada,
              })
            }
          >
            {item.portada ? (
              <Image source={{ uri: item.portada }} style={s.foto} resizeMode="cover" />
            ) : (
              <View style={[s.foto, s.fotoVacia]}>
                <Ionicons name="image-outline" size={26} color={t.color.borde} />
              </View>
            )}

            {item.tipo === 'grupal' && (
              <View style={s.etiqueta}>
                <Ionicons name="people" size={11} color={t.color.navy} />
                <Text style={s.etiquetaTxt}>Grupal</Text>
              </View>
            )}

            <View style={s.cuerpo}>
              <Text style={s.destino} numberOfLines={1}>{item.destino}</Text>

              <Text style={s.detalle}>
                {[
                  item.pais,
                  noches > 0 ? `${noches} noches` : null,
                  mes,
                ].filter(Boolean).join(' · ')}
              </Text>

              {precio > 0 && (
                <View style={s.precioFila}>
                  <Text style={s.desde}>desde</Text>
                  <Text style={s.precio}>{plata(precio, item.moneda)}</Text>
                  {item.base ? <Text style={s.base}>{item.base}</Text> : null}
                </View>
              )}
            </View>
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <View style={s.vacio}>
          <Ionicons name="compass-outline" size={28} color={t.color.borde} />
          <Text style={s.vacioTit}>Todavía no hay viajes publicados</Text>
          <Text style={s.vacioTxt}>
            Escribinos y te armamos uno a tu medida.
          </Text>
        </View>
      }
    />
  );
}

const s = StyleSheet.create({
  centro: { paddingVertical: t.espacio.xxl, alignItems: 'center' },
  contenido: { padding: t.espacio.xl, paddingTop: t.espacio.sm },

  filtros: { flexDirection: 'row', gap: t.espacio.sm, marginBottom: t.espacio.lg },
  chip: {
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.pastilla,
    paddingHorizontal: t.espacio.lg,
    paddingVertical: t.espacio.sm,
  },
  chipActivo: { backgroundColor: t.color.navy },
  chipTxt: { ...t.texto.pie, color: t.color.textoSuave },
  chipTxtActivo: { color: '#fff' },

  tarjeta: {
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    overflow: 'hidden',
    marginBottom: t.espacio.lg,
  },
  foto: { width: '100%', height: 165 },
  fotoVacia: {
    backgroundColor: 'rgba(7,45,64,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  etiqueta: {
    position: 'absolute', top: t.espacio.md, left: t.espacio.md,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: t.color.gold,
    borderRadius: t.radio.pastilla,
    paddingHorizontal: t.espacio.md,
    paddingVertical: 3,
  },
  etiquetaTxt: { ...t.texto.pie, color: t.color.navy },

  cuerpo: { padding: t.espacio.lg },
  destino: { ...t.texto.seccion, color: t.color.texto },
  detalle: { ...t.texto.pie, color: t.color.textoSuave, marginTop: 2 },

  precioFila: {
    flexDirection: 'row', alignItems: 'baseline',
    gap: t.espacio.sm, marginTop: t.espacio.md,
  },
  desde: { ...t.texto.pie, color: t.color.textoSuave },
  precio: { ...t.texto.seccion, color: t.color.teal },
  base: { ...t.texto.pie, color: t.color.textoSuave },

  vacio: { alignItems: 'center', paddingVertical: t.espacio.xxl, gap: t.espacio.sm },
  vacioTit: { ...t.texto.seccion, color: t.color.texto },
  vacioTxt: { ...t.texto.cuerpo, color: t.color.textoSuave, textAlign: 'center' },
  error: {
    ...t.texto.chico, color: t.color.error, marginBottom: t.espacio.md,
  },
});
