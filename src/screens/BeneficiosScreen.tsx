import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, Pressable, Image,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { beneficios as apiBeneficios, viajes as apiViajes } from '../api/endpoints';
import { useSession } from '../store/SessionContext';
import { TIERS, getTier, faltanParaSubir, fmtPuntos } from '../lib/tiers';
import { CONFIG } from '../config';
import { crearTema } from '../theme';

const t = crearTema();

type Beneficio = {
  id: number;
  titulo: string;
  descripcion?: string | null;
  categoria?: string | null;
  imagen?: string | null;
  comercio_id?: number | null;
  comercio_nombre?: string | null;
  nivel_minimo?: string | null;   // 'Classic' | 'Select' | 'Elite' | 'Infinite'
  usos_count?: number | string | null;
};

const CATEGORIAS: { id: string; label: string; icono: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'todos',       label: 'Todos',        icono: 'sparkles' },
  { id: 'hotel',       label: 'Hoteles',      icono: 'bed' },
  { id: 'restaurante', label: 'Gastronomía',  icono: 'restaurant' },
  { id: 'excursion',   label: 'Excursiones',  icono: 'map' },
  { id: 'comercio',    label: 'Comercios',    icono: 'bag-handle' },
  { id: 'bienestar',   label: 'Bienestar',    icono: 'flower' },
  { id: 'otro',        label: 'Otros',        icono: 'star' },
];

const ICONO_CAT = (c?: string | null): keyof typeof Ionicons.glyphMap =>
  CATEGORIAS.find((x) => x.id === c)?.icono ?? 'star';

/** Posición del nivel en la escalera. Sirve para comparar. */
const ordenNivel = (nombre?: string | null) => {
  const i = TIERS.findIndex(
    (x) => x.nombre.toLowerCase() === String(nombre ?? '').toLowerCase(),
  );
  return i < 0 ? 0 : i;
};

export default function BeneficiosScreen({ navigation }: any) {
  const { me } = useSession();
  const [lista, setLista] = useState<Beneficio[]>([]);
  const [puntos, setPuntos] = useState(0);
  const [cat, setCat] = useState('todos');
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [b, v] = await Promise.allSettled([
        apiBeneficios.listar(),
        apiViajes.listar(),
      ]);

      if (b.status === 'fulfilled') {
        setLista((b.value as any)?.beneficios ?? []);
      }
      if (v.status === 'fulfilled') {
        const d = v.value as any;
        const mios = (d.viajes ?? []).filter(
          (x: any) => !x.usuario_id || String(x.usuario_id) === String(me?.id),
        );
        const total = mios.reduce((s: number, x: any) => s + Number(x.puntos || 0), 0);
        setPuntos(Math.max(0, total - Number(d.puntos_usados || 0)));
      }
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [me?.id]);

  useEffect(() => { cargar(); }, [cargar]);

  const miTier = getTier(puntos);
  const miNivel = ordenNivel(miTier.nombre);
  const siguiente = faltanParaSubir(puntos);

  // Solo se muestran las categorías que tienen algo: un filtro
  // vacío es una promesa que no se cumple.
  const categoriasConAlgo = useMemo(() => {
    const usadas = new Set(lista.map((b) => b.categoria ?? 'otro'));
    return CATEGORIAS.filter((c) => c.id === 'todos' || usadas.has(c.id));
  }, [lista]);

  const filtrados = useMemo(
    () => (cat === 'todos' ? lista : lista.filter((b) => (b.categoria ?? 'otro') === cat)),
    [lista, cat],
  );

  // Primero lo que puede usar hoy; lo bloqueado va después.
  const disponibles = filtrados.filter((b) => ordenNivel(b.nivel_minimo) <= miNivel);
  const bloqueados  = filtrados.filter((b) => ordenNivel(b.nivel_minimo) > miNivel);

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
        <Text style={s.tituloPantalla}>Beneficios</Text>

        {/* ── Tu nivel ── */}
        <View style={[s.nivelCaja, { borderLeftColor: miTier.color }]}>
          <View style={s.nivelFila}>
            <View>
              <Text style={s.nivelLabel}>Tu nivel</Text>
              <Text style={s.nivelNombre}>{miTier.nombre}</Text>
            </View>
            <View style={s.nivelDerecha}>
              <Text style={s.nivelPuntos}>{fmtPuntos(puntos)}</Text>
              <Text style={s.nivelLabel}>puntos</Text>
            </View>
          </View>
          {siguiente && (
            <Text style={s.nivelFalta}>
              {siguiente.faltan === 1
                ? `Te falta 1 punto para desbloquear ${siguiente.proximo.nombre}`
                : `Te faltan ${fmtPuntos(siguiente.faltan)} para desbloquear ${siguiente.proximo.nombre}`}
            </Text>
          )}
        </View>

        {/* ── Filtros ── */}
        {categoriasConAlgo.length > 2 && (
          <FlatList
            horizontal
            data={categoriasConAlgo}
            keyExtractor={(c) => c.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filtros}
            renderItem={({ item }) => {
              const activa = cat === item.id;
              return (
                <Pressable
                  style={[s.chip, activa && s.chipActivo]}
                  onPress={() => setCat(item.id)}
                >
                  <Ionicons
                    name={item.icono}
                    size={14}
                    color={activa ? '#fff' : t.color.textoSuave}
                  />
                  <Text style={[s.chipTxt, activa && s.chipTxtActivo]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            }}
          />
        )}

        {/* ── Disponibles ── */}
        {disponibles.length > 0 && (
          <>
            <Text style={s.seccion}>Para usar ahora</Text>
            {disponibles.map((b) => (
              <Tarjeta
                key={b.id}
                b={b}
                disponible
                onPress={() => navigation.navigate('Tarjeta')}
              />
            ))}
          </>
        )}

        {/* ── Bloqueados ── */}
        {bloqueados.length > 0 && (
          <>
            <Text style={s.seccion}>
              {disponibles.length > 0 ? 'Con más puntos' : 'Todavía no disponibles'}
            </Text>
            {bloqueados.map((b) => (
              <Tarjeta key={b.id} b={b} disponible={false} />
            ))}
          </>
        )}

        {filtrados.length === 0 && (
          <View style={s.vacio}>
            <Ionicons name="gift-outline" size={28} color={t.color.borde} />
            <Text style={s.vacioTit}>
              {cat === 'todos' ? 'Todavía no hay beneficios' : 'Nada en esta categoría'}
            </Text>
            <Text style={s.vacioTxt}>
              Estamos sumando comercios adheridos. Te vamos a avisar.
            </Text>
          </View>
        )}

        {/* ── La escalera ── */}
        <Text style={s.seccion}>Cómo funcionan los niveles</Text>
        <View style={s.escalera}>
          {TIERS.map((tier, i) => {
            const alcanzado = puntos >= tier.min;
            const esElMio = tier.nombre === miTier.nombre;
            return (
              <View key={tier.nombre} style={s.paso}>
                {/* Línea que une los nodos */}
                <View style={s.rielCol}>
                  <View
                    style={[
                      s.nodo,
                      { backgroundColor: alcanzado ? tier.color : t.color.borde },
                      esElMio && s.nodoActual,
                    ]}
                  >
                    {alcanzado && <Ionicons name="checkmark" size={11} color="#fff" />}
                  </View>
                  {i < TIERS.length - 1 && (
                    <View
                      style={[
                        s.riel,
                        { backgroundColor: puntos >= TIERS[i + 1].min ? tier.color : t.color.borde },
                      ]}
                    />
                  )}
                </View>

                <View style={s.pasoTexto}>
                  <View style={s.pasoCab}>
                    <Text style={[s.pasoNombre, !alcanzado && s.pasoApagado]}>
                      {tier.nombre}
                    </Text>
                    {esElMio && <Text style={s.pasoAqui}>estás acá</Text>}
                  </View>
                  <Text style={s.pasoRango}>
                    {fmtPuntos(tier.min)}
                    {tier.max === Infinity ? ' o más' : ` a ${fmtPuntos(tier.max)}`} puntos
                  </Text>
                  {esElMio && tier.beneficios.map((p) => (
                    <Text key={p} style={s.pasoPerk}>· {p}</Text>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Tarjeta({
  b, disponible, onPress,
}: {
  b: Beneficio;
  disponible: boolean;
  onPress?: () => void;
}) {
  const usos = Number(b.usos_count ?? 0);
  const cat = CATEGORIAS.find((c) => c.id === (b.categoria ?? 'otro'));

  return (
    <Pressable
      style={s.tarjeta}
      onPress={disponible ? onPress : undefined}
      disabled={!disponible}
    >
      {/* Imagen o, si no hay, una franja con el ícono de la categoría */}
      {b.imagen ? (
        <Image
          source={{ uri: CONFIG.IMG_BENEFICIOS + b.imagen }}
          style={[s.imagen, !disponible && s.imagenApagada]}
          resizeMode="cover"
        />
      ) : (
        <View style={[s.imagenVacia, !disponible && s.imagenApagada]}>
          <Ionicons name={ICONO_CAT(b.categoria)} size={30} color={t.color.teal} />
        </View>
      )}

      {!disponible && (
        <View style={s.candado}>
          <Ionicons name="lock-closed" size={13} color="#fff" />
          <Text style={s.candadoTxt}>Desde {b.nivel_minimo}</Text>
        </View>
      )}

      <View style={s.cuerpo}>
        <View style={s.cuerpoCab}>
          {cat && (
            <Text style={s.categoria}>{cat.label}</Text>
          )}
          {usos > 0 && (
            <Text style={s.usos}>
              Usado {usos} {usos === 1 ? 'vez' : 'veces'}
            </Text>
          )}
        </View>

        <Text style={[s.titulo, !disponible && s.tituloApagado]} numberOfLines={2}>
          {b.titulo}
        </Text>

        {b.descripcion ? (
          <Text style={s.descripcion} numberOfLines={3}>{b.descripcion}</Text>
        ) : null}

        {b.comercio_nombre ? (
          <View style={s.comercio}>
            <Ionicons name="location" size={13} color={t.color.teal} />
            <Text style={s.comercioTxt}>{b.comercio_nombre}</Text>
          </View>
        ) : null}

        {disponible && b.comercio_id ? (
          <View style={s.canjear}>
            <Ionicons name="qr-code-outline" size={15} color={t.color.navy} />
            <Text style={s.canjearTxt}>Mostrá tu credencial para usarlo</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: t.color.fondo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.color.fondo },
  contenido: { padding: t.espacio.xl, paddingBottom: t.espacio.xxl },
  tituloPantalla: { ...t.texto.titulo, color: t.color.texto, marginBottom: t.espacio.lg },

  nivelCaja: {
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    borderLeftWidth: 4,
    padding: t.espacio.lg,
  },
  nivelFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  nivelLabel: { ...t.texto.pie, color: t.color.textoSuave },
  nivelNombre: { ...t.texto.seccion, color: t.color.texto },
  nivelDerecha: { alignItems: 'flex-end' },
  nivelPuntos: { ...t.texto.seccion, color: t.color.teal },
  nivelFalta: { ...t.texto.pie, color: t.color.textoSuave, marginTop: t.espacio.sm },

  filtros: { gap: t.espacio.sm, paddingVertical: t.espacio.lg },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.pastilla,
    paddingHorizontal: t.espacio.lg,
    paddingVertical: t.espacio.sm,
  },
  chipActivo: { backgroundColor: t.color.navy },
  chipTxt: { ...t.texto.pie, color: t.color.textoSuave },
  chipTxtActivo: { color: '#fff' },

  seccion: {
    ...t.texto.chicoFuerte, color: t.color.textoSuave,
    marginTop: t.espacio.xl, marginBottom: t.espacio.md,
  },

  tarjeta: {
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    overflow: 'hidden',
    marginBottom: t.espacio.md,
  },
  imagen: { width: '100%', height: 130 },
  imagenApagada: { opacity: 0.4 },
  imagenVacia: {
    width: '100%', height: 90,
    backgroundColor: 'rgba(17,188,179,0.09)',
    alignItems: 'center', justifyContent: 'center',
  },
  candado: {
    position: 'absolute', top: t.espacio.md, right: t.espacio.md,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(7,45,64,0.88)',
    borderRadius: t.radio.pastilla,
    paddingHorizontal: t.espacio.md,
    paddingVertical: 4,
  },
  candadoTxt: { ...t.texto.pie, color: '#fff' },

  cuerpo: { padding: t.espacio.lg },
  cuerpoCab: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: t.espacio.xs,
  },
  categoria: { ...t.texto.pie, color: t.color.textoSuave, textTransform: 'uppercase' },
  usos: { ...t.texto.pie, color: t.color.teal },
  titulo: { ...t.texto.seccion, color: t.color.texto },
  tituloApagado: { color: t.color.textoSuave },
  descripcion: { ...t.texto.chico, color: t.color.textoSuave, marginTop: t.espacio.xs },
  comercio: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: t.espacio.md,
  },
  comercioTxt: { ...t.texto.chicoFuerte, color: t.color.teal },
  canjear: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: t.espacio.sm,
    backgroundColor: 'rgba(17,188,179,0.12)',
    borderRadius: t.radio.chico,
    paddingVertical: t.espacio.md,
    marginTop: t.espacio.md,
  },
  canjearTxt: { ...t.texto.pie, color: t.color.navy },

  escalera: {
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    padding: t.espacio.lg,
  },
  paso: { flexDirection: 'row' },
  rielCol: { alignItems: 'center', width: 26 },
  nodo: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  nodoActual: {
    borderWidth: 3, borderColor: 'rgba(17,188,179,0.3)',
    width: 22, height: 22, borderRadius: 11,
  },
  riel: { width: 2, flex: 1, marginVertical: 2 },
  pasoTexto: { flex: 1, paddingBottom: t.espacio.lg, marginLeft: t.espacio.sm },
  pasoCab: { flexDirection: 'row', alignItems: 'center', gap: t.espacio.sm },
  pasoNombre: { ...t.texto.cuerpoFuerte, color: t.color.texto },
  pasoApagado: { color: t.color.textoSuave },
  pasoAqui: { ...t.texto.pie, color: t.color.teal },
  pasoRango: { ...t.texto.pie, color: t.color.textoSuave },
  pasoPerk: { ...t.texto.chico, color: t.color.texto, marginTop: t.espacio.xs },

  vacio: { alignItems: 'center', paddingVertical: t.espacio.xxl, gap: t.espacio.sm },
  vacioTit: { ...t.texto.seccion, color: t.color.texto },
  vacioTxt: { ...t.texto.cuerpo, color: t.color.textoSuave, textAlign: 'center' },
});
