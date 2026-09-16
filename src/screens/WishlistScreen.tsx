import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { catalogo } from '../api/endpoints';
import Encabezado from '../components/Encabezado';
import { crearTema } from '../theme';

const t = crearTema();

/**
 * Espejo exacto de la tabla `wishlist`: dest, prio, nota.
 * OJO: la columna es `dest`, no `destino`. Mandar otro nombre
 * hace que el backend descarte el ítem sin avisar.
 *
 * No hay id en la tabla, así que la clave de lista se arma
 * con el destino, que es único por socio en la práctica.
 */
type Deseo = {
  dest: string;
  nota?: string | null;
  prio: number;      // 1 alta, 2 media, 3 baja
};

const PRIO = [
  { n: 1, label: 'Sueño mayor', color: t.color.bordo },
  { n: 2, label: 'Me gustaría', color: t.color.teal },
  { n: 3, label: 'Algún día',   color: t.color.textoSuave },
];

export default function WishlistScreen({ navigation }: any) {
  const [items, setItems] = useState<Deseo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [modal, setModal] = useState(false);
  const [destino, setDestino] = useState('');
  const [nota, setNota] = useState('');
  const [prio, setPrio] = useState(2);

  const cargar = useCallback(async () => {
    try {
      const d: any = await catalogo.wishlist();
      setItems(ordenar(d?.items ?? []));
    } catch {
      setItems([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  /**
   * El backend guarda la lista completa, no de a uno.
   * Se manda siempre el array entero.
   */
  async function guardar(nuevos: Deseo[]) {
    setGuardando(true);
    const previos = items;
    setItems(ordenar(nuevos)); // optimista: la lista responde al toque
    try {
      // Solo las tres columnas que existen del otro lado.
      await catalogo.guardarWishlist(
        nuevos.map((x) => ({ dest: x.dest, prio: x.prio, nota: x.nota ?? '' })),
      );
    } catch (e: any) {
      setItems(previos); // si falla, se vuelve atrás
      Alert.alert('No se pudo guardar', e?.message ?? 'Probá de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  function agregar() {
    const d = destino.trim();
    if (!d) return;
    // Si ya estaba, se actualiza en vez de duplicarse.
    const sinRepetir = items.filter(
      (x) => x.dest.trim().toLowerCase() !== d.toLowerCase(),
    );
    guardar([...sinRepetir, { dest: d, nota: nota.trim() || null, prio }]);
    setDestino(''); setNota(''); setPrio(2); setModal(false);
  }

  function borrar(item: Deseo) {
    Alert.alert('Sacar de la lista', `¿Sacamos ${item.dest}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sacar',
        style: 'destructive',
        onPress: () => guardar(items.filter((x) => x.dest !== item.dest)),
      },
    ]);
  }

  if (cargando) {
    return (
      <View style={s.centro}>
        <ActivityIndicator color={t.color.teal} size="large" />
      </View>
    );
  }

  return (
    <View style={s.fondo}>
      <Encabezado
        titulo="Wishlist"
        onVolver={() => navigation.goBack()}
        accion={
          <Pressable onPress={() => setModal(true)} hitSlop={12} disabled={guardando}>
            <Ionicons name="add" size={26} color={t.color.teal} />
          </Pressable>
        }
      />

      <FlatList
        data={items}
        keyExtractor={(x) => x.dest}
        contentContainerStyle={s.contenido}
        renderItem={({ item }) => {
          const p = PRIO.find((x) => x.n === Number(item.prio)) ?? PRIO[1];
          return (
            <View style={s.tarjeta}>
              <View style={[s.punto, { backgroundColor: p.color }]} />
              <View style={s.texto}>
                <Text style={s.destino}>{item.dest}</Text>
                <Text style={s.prio}>{p.label}</Text>
                {item.nota ? <Text style={s.nota}>{item.nota}</Text> : null}
              </View>
              <Pressable onPress={() => borrar(item)} hitSlop={10}>
                <Ionicons name="close" size={20} color={t.color.borde} />
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s.vacioCaja}>
            <Text style={s.vacioTitulo}>Tu lista está vacía</Text>
            <Text style={s.vacioTexto}>
              Guardá los destinos que querés conocer. Cuando tengamos una promo
              para alguno, te avisamos.
            </Text>
          </View>
        }
      />

      {/* ── Agregar destino ── */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView
          style={s.modalFondo}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.modalCaja}>
            <Text style={s.modalTitulo}>Sumar un destino</Text>

            <TextInput
              style={s.input}
              value={destino}
              onChangeText={setDestino}
              placeholder="¿A dónde querés ir?"
              placeholderTextColor={t.color.textoSuave}
              autoFocus
            />
            <TextInput
              style={[s.input, s.inputNota]}
              value={nota}
              onChangeText={setNota}
              placeholder="Una nota (opcional)"
              placeholderTextColor={t.color.textoSuave}
            />

            <View style={s.prios}>
              {PRIO.map((p) => (
                <Pressable
                  key={p.n}
                  style={[s.prioBtn, prio === p.n && { borderColor: p.color, borderWidth: 2 }]}
                  onPress={() => setPrio(p.n)}
                >
                  <Text style={[s.prioBtnTexto, prio === p.n && { color: p.color }]}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={s.modalBotones}>
              <Pressable style={s.btnGris} onPress={() => setModal(false)}>
                <Text style={s.btnGrisTexto}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[s.btnTeal, !destino.trim() && s.btnApagado]}
                onPress={agregar}
                disabled={!destino.trim()}
              >
                <Text style={s.btnTealTexto}>Agregar</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const ordenar = (l: Deseo[]) =>
  [...l].sort((a, b) => Number(a.prio || 2) - Number(b.prio || 2));

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: t.color.fondo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.color.fondo },
  contenido: { padding: t.espacio.xl, paddingTop: t.espacio.sm },
  tarjeta: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    padding: t.espacio.lg,
    marginBottom: t.espacio.md,
  },
  punto: { width: 8, height: 8, borderRadius: 4 },
  texto: { flex: 1, marginLeft: t.espacio.md },
  destino: { ...t.texto.seccion, color: t.color.texto },
  prio: { ...t.texto.pie, color: t.color.textoSuave },
  nota: { ...t.texto.chico, color: t.color.textoSuave, marginTop: t.espacio.xs },

  vacioCaja: { padding: t.espacio.xl, alignItems: 'center' },
  vacioTitulo: { ...t.texto.seccion, color: t.color.texto, marginBottom: t.espacio.sm },
  vacioTexto: { ...t.texto.cuerpo, color: t.color.textoSuave, textAlign: 'center' },

  modalFondo: { flex: 1, backgroundColor: 'rgba(7,45,64,0.5)', justifyContent: 'flex-end' },
  modalCaja: {
    backgroundColor: t.color.fondo,
    borderTopLeftRadius: t.radio.grande,
    borderTopRightRadius: t.radio.grande,
    padding: t.espacio.xl,
  },
  modalTitulo: { ...t.texto.titulo, color: t.color.texto, marginBottom: t.espacio.lg },
  input: {
    ...t.texto.cuerpo,
    color: t.color.texto,
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    paddingHorizontal: t.espacio.lg,
    paddingVertical: t.espacio.md,
    marginBottom: t.espacio.md,
  },
  inputNota: { marginBottom: t.espacio.lg },
  prios: { flexDirection: 'row', gap: t.espacio.sm, marginBottom: t.espacio.xl },
  prioBtn: {
    flex: 1,
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingVertical: t.espacio.md,
    alignItems: 'center',
  },
  prioBtnTexto: { ...t.texto.pie, color: t.color.textoSuave },
  modalBotones: { flexDirection: 'row', gap: t.espacio.md },
  btnGris: {
    flex: 1, alignItems: 'center', paddingVertical: t.espacio.lg,
    borderRadius: t.radio.medio, backgroundColor: t.color.superficie,
  },
  btnGrisTexto: { ...t.texto.cuerpoFuerte, color: t.color.textoSuave },
  btnTeal: {
    flex: 1, alignItems: 'center', paddingVertical: t.espacio.lg,
    borderRadius: t.radio.medio, backgroundColor: t.color.teal,
  },
  btnApagado: { opacity: 0.4 },
  btnTealTexto: { ...t.texto.cuerpoFuerte, color: '#fff' },
});
