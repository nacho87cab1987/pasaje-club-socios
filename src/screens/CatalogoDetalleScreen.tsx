import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, Pressable,
  ActivityIndicator, Alert, TextInput, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { paquetes as apiPaquetes, interes as apiInteres } from '../api/endpoints';
import { crearTema } from '../theme';

const t = crearTema();

const plata = (n: number, moneda?: string | null) => {
  const sim = (moneda ?? 'USD') === 'ARS' ? '$' : 'USD';
  return `${sim} ${new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
  }).format(Math.round(n))}`;
};

const fmtFecha = (f?: string | null) => {
  if (!f) return '';
  const d = new Date(String(f).slice(0, 10) + 'T12:00:00');
  return isNaN(+d) ? '' : d.toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
};

export default function CatalogoDetalleScreen({ route, navigation }: any) {
  const { slug, destino, portada } = route?.params ?? {};

  const [datos, setDatos] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(false);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pedido, setPedido] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const d: any = await apiPaquetes.destino(slug);
      setDatos(d);
    } catch {
      setDatos(null);
    } finally {
      setCargando(false);
    }
  }, [slug]);

  useEffect(() => { cargar(); }, [cargar]);

  // Si ya consultó por este destino, el botón cambia: pedirlo dos
  // veces no acelera nada y hace que parezca que no se registró.
  useEffect(() => {
    apiInteres.mios()
      .then((d: any) => {
        const ya = (d?.interes ?? []).some(
          (x: any) => x.slug === slug || x.destino === destino,
        );
        if (ya) setPedido(true);
      })
      .catch(() => {});
  }, [slug, destino]);

  async function pedir() {
    setEnviando(true);
    try {
      const salida = (datos?.salidas ?? [])[0];
      const r: any = await apiInteres.pedir({
        destino: destino || datos?.destino || '',
        slug,
        precio: salida?.precio ?? datos?.precio_desde ?? null,
        moneda: salida?.moneda ?? datos?.moneda ?? null,
        comentario: comentario.trim() || undefined,
      });
      setModal(false);
      setPedido(true);
      setComentario('');
      Alert.alert('Listo', r?.mensaje ?? 'Una asesora te va a escribir.');
    } catch (e: any) {
      Alert.alert('No pudimos enviarlo', e?.message ?? 'Probá de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  const foto = portada || datos?.portada || null;
  const salidas = datos?.salidas ?? [];
  const hoteles = datos?.hoteles ?? [];
  const servicios: string[] = Array.isArray(datos?.servicios) ? datos.servicios : [];

  return (
    <View style={s.fondo}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Portada ── */}
        <View style={s.portada}>
          {foto ? (
            <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: t.color.navy }]} />
          )}
          <LinearGradient
            colors={['rgba(7,46,64,0.45)', 'rgba(7,46,64,0.25)', 'rgba(7,46,64,0.92)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={['top']} style={s.portadaTxt}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={s.volver}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </Pressable>
            <View style={{ flex: 1 }} />
            <Text style={s.destino} numberOfLines={2}>
              {destino || datos?.destino || 'Viaje'}
            </Text>
            {datos?.pais ? <Text style={s.pais}>{datos.pais}</Text> : null}
          </SafeAreaView>
        </View>

        {cargando ? (
          <View style={s.centro}>
            <ActivityIndicator color={t.color.teal} size="large" />
          </View>
        ) : (
          <View style={s.cuerpo}>
            {/* ── Salidas ── */}
            {salidas.length > 0 && (
              <>
                <Text style={s.seccion}>
                  {salidas.length === 1 ? 'La salida' : 'Salidas'}
                </Text>
                <View style={s.bloque}>
                  {salidas.slice(0, 6).map((sa: any, i: number) => (
                    <View key={i} style={[s.fila, i > 0 && s.filaBorde]}>
                      <Ionicons name="calendar-outline" size={18} color={t.color.teal} />
                      <View style={s.filaTxt}>
                        <Text style={s.filaTit}>{fmtFecha(sa.fecha_in)}</Text>
                        <Text style={s.filaSub}>
                          {[
                            sa.noches ? `${sa.noches} noches` : null,
                            sa.origen ? `desde ${sa.origen}` : null,
                          ].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      {Number(sa.precio) > 0 && (
                        <Text style={s.filaPrecio}>
                          {plata(Number(sa.precio), sa.moneda)}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* ── Qué incluye ── */}
            {servicios.length > 0 && (
              <>
                <Text style={s.seccion}>Qué incluye</Text>
                <View style={s.bloque}>
                  {servicios.slice(0, 10).map((sv, i) => (
                    <View key={i} style={[s.fila, i > 0 && s.filaBorde]}>
                      <Ionicons name="checkmark-circle" size={17} color={t.color.teal} />
                      <Text style={[s.filaTxt, s.filaTit]}>{String(sv)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* ── Hoteles ── */}
            {hoteles.length > 0 && (
              <>
                <Text style={s.seccion}>Dónde te alojás</Text>
                <View style={s.bloque}>
                  {hoteles.slice(0, 6).map((h: any, i: number) => (
                    <View key={i} style={[s.fila, i > 0 && s.filaBorde]}>
                      <Ionicons name="bed-outline" size={18} color={t.color.textoSuave} />
                      <View style={s.filaTxt}>
                        <Text style={s.filaTit}>{h.nombre}</Text>
                        {h.regimen ? <Text style={s.filaSub}>{h.regimen}</Text> : null}
                      </View>
                      {Number(h.precio) > 0 && (
                        <Text style={s.filaPrecio}>
                          {plata(Number(h.precio), h.moneda)}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              </>
            )}

            <Text style={s.aclaracion}>
              Los precios son por persona y pueden variar según disponibilidad
              y fecha de reserva.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── La acción, fija abajo ── */}
      <SafeAreaView edges={['bottom']} style={s.barra}>
        {pedido ? (
          <View style={s.pedido}>
            <Ionicons name="checkmark-circle" size={20} color={t.color.teal} />
            <Text style={s.pedidoTxt}>Ya consultaste, te vamos a escribir</Text>
          </View>
        ) : (
          <Pressable style={s.boton} onPress={() => setModal(true)}>
            <Text style={s.botonTxt}>Me interesa</Text>
            <Ionicons name="arrow-forward" size={18} color={t.color.navy} />
          </Pressable>
        )}
      </SafeAreaView>

      {/* ── Pedir contacto ── */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView
          style={s.modalFondo}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.modalCaja}>
            <Text style={s.modalTit}>{destino || datos?.destino}</Text>
            <Text style={s.modalSub}>
              Contanos cuándo pensás viajar y cuántos son, y te armamos
              el presupuesto.
            </Text>

            <TextInput
              style={s.input}
              value={comentario}
              onChangeText={setComentario}
              placeholder="Ej: somos 2, para enero, 7 noches"
              placeholderTextColor={t.color.textoSuave}
              multiline
              maxLength={400}
            />

            <View style={s.modalBotones}>
              <Pressable
                style={s.btnGris}
                onPress={() => setModal(false)}
                disabled={enviando}
              >
                <Text style={s.btnGrisTxt}>Cancelar</Text>
              </Pressable>
              <Pressable style={s.btnTeal} onPress={pedir} disabled={enviando}>
                {enviando
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.btnTealTxt}>Enviar consulta</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: t.color.fondo },
  scroll: { paddingBottom: t.espacio.xxl },
  centro: { paddingVertical: t.espacio.xxl, alignItems: 'center' },

  portada: { height: 260, justifyContent: 'flex-end' },
  portadaTxt: {
    flex: 1,
    paddingHorizontal: t.espacio.xl,
    paddingBottom: t.espacio.xl,
    paddingTop: t.espacio.sm,
  },
  volver: { alignSelf: 'flex-start', marginLeft: -6 },
  destino: {
    ...t.texto.titulo, color: '#fff', fontSize: 28, lineHeight: 34,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  pais: { ...t.texto.chico, color: 'rgba(255,255,255,0.85)' },

  cuerpo: { padding: t.espacio.xl, paddingTop: t.espacio.md },
  seccion: {
    ...t.texto.chicoFuerte, color: t.color.textoSuave,
    marginTop: t.espacio.lg, marginBottom: t.espacio.sm,
  },
  bloque: {
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    paddingHorizontal: t.espacio.lg,
  },
  fila: {
    flexDirection: 'row', alignItems: 'center',
    gap: t.espacio.md, paddingVertical: t.espacio.lg,
  },
  filaBorde: { borderTopWidth: 1, borderTopColor: t.color.borde },
  filaTxt: { flex: 1 },
  filaTit: { ...t.texto.cuerpoFuerte, color: t.color.texto },
  filaSub: { ...t.texto.pie, color: t.color.textoSuave },
  filaPrecio: { ...t.texto.cuerpoFuerte, color: t.color.teal },

  aclaracion: {
    ...t.texto.pie, color: t.color.textoSuave,
    marginTop: t.espacio.xl, textAlign: 'center',
  },

  barra: {
    backgroundColor: t.color.superficie,
    borderTopWidth: 1, borderTopColor: t.color.borde,
    paddingHorizontal: t.espacio.xl,
    paddingTop: t.espacio.md,
  },
  boton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: t.espacio.sm,
    backgroundColor: t.color.teal,
    borderRadius: t.radio.medio,
    paddingVertical: t.espacio.lg,
  },
  botonTxt: { ...t.texto.cuerpoFuerte, color: t.color.navy, fontSize: 16 },
  pedido: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: t.espacio.sm, paddingVertical: t.espacio.lg,
  },
  pedidoTxt: { ...t.texto.cuerpoFuerte, color: t.color.teal },

  modalFondo: { flex: 1, backgroundColor: 'rgba(7,46,64,0.5)', justifyContent: 'flex-end' },
  modalCaja: {
    backgroundColor: t.color.fondo,
    borderTopLeftRadius: t.radio.grande,
    borderTopRightRadius: t.radio.grande,
    padding: t.espacio.xl,
  },
  modalTit: { ...t.texto.titulo, color: t.color.texto },
  modalSub: {
    ...t.texto.chico, color: t.color.textoSuave,
    marginTop: t.espacio.xs, marginBottom: t.espacio.lg,
  },
  input: {
    ...t.texto.cuerpo,
    color: t.color.texto,
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    paddingHorizontal: t.espacio.lg,
    paddingVertical: t.espacio.md,
    minHeight: 92,
    textAlignVertical: 'top',
    marginBottom: t.espacio.xl,
  },
  modalBotones: { flexDirection: 'row', gap: t.espacio.md },
  btnGris: {
    flex: 1, alignItems: 'center', paddingVertical: t.espacio.lg,
    borderRadius: t.radio.medio, backgroundColor: t.color.superficie,
  },
  btnGrisTxt: { ...t.texto.cuerpoFuerte, color: t.color.textoSuave },
  btnTeal: {
    flex: 1, alignItems: 'center', paddingVertical: t.espacio.lg,
    borderRadius: t.radio.medio, backgroundColor: t.color.teal,
  },
  btnTealTxt: { ...t.texto.cuerpoFuerte, color: '#fff' },
});
