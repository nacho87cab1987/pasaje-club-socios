import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { viajes as apiViajes } from '../api/endpoints';
import { CONFIG } from '../config';
import { crearTema } from '../theme';

const t = crearTema();

const plata = (n: number, moneda: string) =>
  `${moneda === 'ARS' ? '$' : 'USD'} ${new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(n)}`;

const fmtFecha = (f?: string | null) => {
  if (!f) return '';
  const d = new Date(String(f).replace(' ', 'T'));
  return isNaN(+d) ? '' : d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * Estado de cuenta del viaje.
 *
 * Es la sección que hace que el socio abra la app entre viaje y
 * viaje: ver cuánto debe y poder mandar el comprobante sin tener
 * que escribirle a nadie.
 */
export default function EstadoCuenta({ viajeId }: { viajeId: number }) {
  const [cuenta, setCuenta] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(false);
  const [monto, setMonto] = useState('');
  const [ref, setRef] = useState('');
  const [archivo, setArchivo] = useState<any>(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const d: any = await apiViajes.cuenta(viajeId);
      setCuenta(d?.tiene_cuenta ? d : null);
    } catch {
      setCuenta(null);
    } finally {
      setCargando(false);
    }
  }, [viajeId]);

  useEffect(() => { cargar(); }, [cargar]);

  async function elegirArchivo() {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos para adjuntar el comprobante.');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!r.canceled && r.assets?.[0]) setArchivo(r.assets[0]);
  }

  async function enviar() {
    const m = parseFloat(monto.replace(',', '.'));
    if (!m || m <= 0) { Alert.alert('Falta el monto', 'Poné cuánto pagaste.'); return; }
    if (!archivo) { Alert.alert('Falta el comprobante', 'Adjuntá la foto o el PDF.'); return; }

    setEnviando(true);
    try {
      const form = new FormData();
      form.append('monto', String(m));
      form.append('moneda', cuenta?.moneda ?? 'USD');
      form.append('fecha_pago', new Date().toISOString().slice(0, 10));
      form.append('metodo', 'transferencia');
      if (ref.trim()) form.append('referencia', ref.trim());
      form.append('comprobante', {
        uri: archivo.uri,
        name: archivo.fileName || 'comprobante.jpg',
        type: archivo.mimeType || 'image/jpeg',
      } as any);

      const r: any = await apiViajes.subirComprobante(viajeId, form);
      setModal(false);
      setMonto(''); setRef(''); setArchivo(null);
      Alert.alert('Recibido', r?.mensaje ?? 'Lo revisamos y te avisamos.');
      cargar();
    } catch (e: any) {
      Alert.alert('No pudimos enviarlo', e?.message ?? 'Probá de nuevo en un rato.');
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <View style={s.cargando}>
        <ActivityIndicator color={t.color.teal} />
      </View>
    );
  }

  // Sin expediente asociado no hay nada que mostrar.
  if (!cuenta) return null;

  const moneda = cuenta.moneda ?? 'USD';
  const pct = Math.min(100, Number(cuenta.porcentaje || 0));

  return (
    <>
      <Text style={s.seccion}>Estado de cuenta</Text>

      <View style={s.caja}>
        {cuenta.cancelado ? (
          <View style={s.cancelado}>
            <Ionicons name="checkmark-circle" size={22} color={t.color.teal} />
            <Text style={s.canceladoTxt}>Viaje pago por completo</Text>
          </View>
        ) : (
          <>
            <Text style={s.saldoLabel}>Te falta pagar</Text>
            <Text style={s.saldo}>{plata(Number(cuenta.saldo), moneda)}</Text>
          </>
        )}

        {/* Barra de avance: el número solo no da idea de cuánto falta */}
        <View style={s.barra}>
          <View style={[s.barraLlena, { width: `${pct}%` }]} />
        </View>
        <View style={s.barraPie}>
          <Text style={s.barraTxt}>
            Pagaste {plata(Number(cuenta.pagado), moneda)}
          </Text>
          <Text style={s.barraTxt}>
            de {plata(Number(cuenta.total), moneda)}
          </Text>
        </View>

        {Number(cuenta.en_revision) > 0 && (
          <View style={s.revision}>
            <Ionicons name="time-outline" size={16} color={t.color.gold} />
            <Text style={s.revisionTxt}>
              {plata(Number(cuenta.en_revision), moneda)} en revisión
            </Text>
          </View>
        )}

        {!cuenta.cancelado && (
          <Pressable style={s.btnPagar} onPress={() => setModal(true)}>
            <Ionicons name="cloud-upload-outline" size={18} color={t.color.navy} />
            <Text style={s.btnPagarTxt}>Informar un pago</Text>
          </Pressable>
        )}
      </View>

      {/* ── Movimientos ── */}
      {cuenta.pagos?.length > 0 && (
        <View style={s.bloque}>
          {cuenta.pagos.map((p: any, i: number) => {
            const aprobado = p.estado === 'aprobado';
            return (
              <Pressable
                key={p.id}
                style={[s.pago, i > 0 && s.pagoBorde]}
                disabled={!p.comprobante}
                onPress={() => {
                  const url = String(p.comprobante).startsWith('http')
                    ? p.comprobante
                    : CONFIG.HOST + p.comprobante;
                  Linking.openURL(url).catch(() => {});
                }}
              >
                <Ionicons
                  name={aprobado ? 'checkmark-circle' : 'time-outline'}
                  size={18}
                  color={aprobado ? t.color.teal : t.color.gold}
                />
                <View style={s.pagoTexto}>
                  <Text style={s.pagoMonto}>{plata(Number(p.monto), p.moneda || moneda)}</Text>
                  <Text style={s.pagoDetalle}>
                    {fmtFecha(p.fecha)}
                    {p.metodo ? ` · ${p.metodo}` : ''}
                    {aprobado ? '' : ' · en revisión'}
                  </Text>
                </View>
                {p.comprobante ? (
                  <Ionicons name="chevron-forward" size={18} color={t.color.borde} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* ── Informar pago ── */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView
          style={s.modalFondo}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.modalCaja}>
            <Text style={s.modalTitulo}>Informar un pago</Text>
            <Text style={s.modalSub}>
              Lo revisamos y lo vas a ver acreditado en tu cuenta.
            </Text>

            <Text style={s.label}>¿Cuánto pagaste? ({moneda})</Text>
            <TextInput
              style={s.input}
              value={monto}
              onChangeText={setMonto}
              placeholder="0"
              placeholderTextColor={t.color.textoSuave}
              keyboardType="decimal-pad"
            />

            <Text style={s.label}>Número de operación (opcional)</Text>
            <TextInput
              style={s.input}
              value={ref}
              onChangeText={setRef}
              placeholder="Referencia de la transferencia"
              placeholderTextColor={t.color.textoSuave}
            />

            <Pressable style={s.adjuntar} onPress={elegirArchivo}>
              <Ionicons
                name={archivo ? 'checkmark-circle' : 'image-outline'}
                size={20}
                color={archivo ? t.color.teal : t.color.textoSuave}
              />
              <Text style={[s.adjuntarTxt, archivo && { color: t.color.teal }]}>
                {archivo ? 'Comprobante listo' : 'Adjuntar comprobante'}
              </Text>
            </Pressable>

            <View style={s.modalBotones}>
              <Pressable style={s.btnGris} onPress={() => setModal(false)} disabled={enviando}>
                <Text style={s.btnGrisTxt}>Cancelar</Text>
              </Pressable>
              <Pressable style={s.btnTeal} onPress={enviar} disabled={enviando}>
                {enviando
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.btnTealTxt}>Enviar</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  cargando: { paddingVertical: t.espacio.xl, alignItems: 'center' },
  seccion: {
    ...t.texto.chicoFuerte, color: t.color.textoSuave,
    marginTop: t.espacio.xl, marginBottom: t.espacio.sm,
  },
  caja: {
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    padding: t.espacio.xl,
  },
  saldoLabel: { ...t.texto.chico, color: t.color.textoSuave },
  saldo: { ...t.texto.cifra, color: t.color.texto, marginTop: t.espacio.xs },
  cancelado: { flexDirection: 'row', alignItems: 'center', gap: t.espacio.sm },
  canceladoTxt: { ...t.texto.seccion, color: t.color.teal },

  barra: {
    height: 8, borderRadius: 4,
    backgroundColor: 'rgba(7,45,64,0.08)',
    marginTop: t.espacio.lg,
    overflow: 'hidden',
  },
  barraLlena: { height: 8, borderRadius: 4, backgroundColor: t.color.teal },
  barraPie: { flexDirection: 'row', justifyContent: 'space-between', marginTop: t.espacio.sm },
  barraTxt: { ...t.texto.pie, color: t.color.textoSuave },

  revision: {
    flexDirection: 'row', alignItems: 'center', gap: t.espacio.sm,
    marginTop: t.espacio.md,
  },
  revisionTxt: { ...t.texto.chico, color: t.color.gold },

  btnPagar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: t.espacio.sm,
    backgroundColor: t.color.teal,
    borderRadius: t.radio.medio,
    paddingVertical: t.espacio.lg,
    marginTop: t.espacio.lg,
  },
  btnPagarTxt: { ...t.texto.cuerpoFuerte, color: t.color.navy },

  bloque: {
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    paddingHorizontal: t.espacio.lg,
    marginTop: t.espacio.md,
  },
  pago: { flexDirection: 'row', alignItems: 'center', paddingVertical: t.espacio.lg },
  pagoBorde: { borderTopWidth: 1, borderTopColor: t.color.borde },
  pagoTexto: { flex: 1, marginLeft: t.espacio.md },
  pagoMonto: { ...t.texto.cuerpoFuerte, color: t.color.texto },
  pagoDetalle: { ...t.texto.pie, color: t.color.textoSuave },

  modalFondo: { flex: 1, backgroundColor: 'rgba(7,45,64,0.5)', justifyContent: 'flex-end' },
  modalCaja: {
    backgroundColor: t.color.fondo,
    borderTopLeftRadius: t.radio.grande,
    borderTopRightRadius: t.radio.grande,
    padding: t.espacio.xl,
  },
  modalTitulo: { ...t.texto.titulo, color: t.color.texto },
  modalSub: { ...t.texto.chico, color: t.color.textoSuave, marginTop: t.espacio.xs, marginBottom: t.espacio.lg },
  label: { ...t.texto.pie, color: t.color.textoSuave, marginBottom: t.espacio.xs },
  input: {
    ...t.texto.cuerpo,
    color: t.color.texto,
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    paddingHorizontal: t.espacio.lg,
    paddingVertical: t.espacio.md,
    marginBottom: t.espacio.lg,
  },
  adjuntar: {
    flexDirection: 'row', alignItems: 'center', gap: t.espacio.md,
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    padding: t.espacio.lg,
    marginBottom: t.espacio.xl,
  },
  adjuntarTxt: { ...t.texto.cuerpo, color: t.color.textoSuave },
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
