import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { viajes as apiViajes, type Viaje } from '../api/endpoints';
import { fmtPuntos } from '../lib/tiers';
import EstadoCuenta from '../components/EstadoCuenta';
import MapaYExcursiones from '../components/MapaYExcursiones';
import { CONFIG } from '../config';
import { crearTema } from '../theme';

const t = crearTema();

type Doc = 'pasaporte' | 'cobertura';

const fmtFecha = (f: string) =>
  new Date(f + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

function diasHasta(f: string) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const d = new Date(f + 'T00:00:00'); d.setHours(0, 0, 0, 0);
  return Math.round((+d - +hoy) / 86400000);
}

export default function ViajeDetalleScreen({ route, navigation }: any) {
  const viajeId: number | undefined = route?.params?.viajeId;
  const viajeInicial: Viaje | undefined = route?.params?.viaje;

  const [viaje, setViaje] = useState<Viaje | null>(viajeInicial ?? null);
  const [companeros, setCompaneros] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [docsExpediente, setDocsExpediente] = useState<any[]>([]);
  const [adjuntos, setAdjuntos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(!viajeInicial);
  const [subiendo, setSubiendo] = useState<Doc | null>(null);

  const cargar = useCallback(async () => {
    const id = viaje?.id ?? viajeId;
    if (!id) { setCargando(false); return; }

    // Si llegamos por notificación no tenemos el viaje: lo buscamos.
    if (!viaje) {
      try {
        const d = await apiViajes.listar();
        const encontrado = (d.viajes ?? []).find((v) => Number(v.id) === Number(id));
        if (encontrado) setViaje(encontrado);
      } catch {}
    }

    // Estos dos son opcionales: si fallan, la pantalla sirve igual.
    apiViajes.companeros(id).then((d: any) => setCompaneros(d?.companeros ?? [])).catch(() => {});
    apiViajes.vouchers(id).then((d: any) => setVouchers(d?.vouchers ?? [])).catch(() => {});

    // Lo que la vendedora ya cargó en el expediente: no se le pide
    // al socio algo que la agencia ya tiene.
    apiViajes.documentos(id)
      .then((d: any) => {
        setDocsExpediente(d?.documentos ?? []);
        setAdjuntos(d?.adjuntos ?? []);
      })
      .catch(() => {});

    setCargando(false);
  }, [viaje, viajeId]);

  useEffect(() => { cargar(); }, []);

  async function subirDoc(tipo: Doc) {
    try {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos para adjuntar el documento.');
        return;
      }

      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (r.canceled || !r.assets?.[0]) return;

      setSubiendo(tipo);
      const archivo = r.assets[0];
      const form = new FormData();
      form.append('archivo', {
        uri: archivo.uri,
        name: archivo.fileName || `${tipo}.jpg`,
        type: archivo.mimeType || 'image/jpeg',
      } as any);

      await apiViajes.subirDoc(tipo, form);
      Alert.alert('Listo', 'Tu documento quedó cargado.');
    } catch (e: any) {
      Alert.alert('No pudimos subirlo', e?.message ?? 'Probá de nuevo en un rato.');
    } finally {
      setSubiendo(null);
    }
  }

  if (cargando) {
    return (
      <View style={s.centro}>
        <ActivityIndicator color={t.color.teal} size="large" />
      </View>
    );
  }

  if (!viaje) {
    return (
      <SafeAreaView style={s.fondo} edges={['top']}>
        <Encabezado onVolver={() => navigation.goBack()} />
        <View style={s.contenido}>
          <Text style={s.vacio}>No encontramos ese viaje.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dias = diasHasta(viaje.fecha);
  const futuro = dias >= 0;

  return (
    <SafeAreaView style={s.fondo} edges={['top']}>
      <Encabezado onVolver={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={s.contenido}>
        {/* ── Cabecera del viaje ── */}
        <View style={s.hero}>
          <Text style={s.destino}>{viaje.destino || 'Tu viaje'}</Text>
          <Text style={s.fecha}>{fmtFecha(viaje.fecha)}</Text>

          {futuro && (
            <View style={s.regresiva}>
              <Text style={s.regresivaNum}>{dias}</Text>
              <Text style={s.regresivaTxt}>
                {dias === 0 ? 'Salís hoy' : dias === 1 ? 'día para tu viaje' : 'días para tu viaje'}
              </Text>
            </View>
          )}

          {Number(viaje.puntos) > 0 && (
            <Text style={s.puntos}>
              Este viaje te sumó {fmtPuntos(Number(viaje.puntos))} puntos
            </Text>
          )}

          {viaje.expediente_codigo && (
            <Text style={s.codigo}>Expediente {viaje.expediente_codigo}</Text>
          )}
        </View>

        {/* ── Estado de cuenta ── */}
        {/* Va antes que todo lo demás: es lo que el socio viene a ver
            entre viaje y viaje. */}
        <EstadoCuenta viajeId={Number(viaje.id)} />

        {/* ── Documentación ── */}
        <Text style={s.seccion}>Tu documentación</Text>
        <View style={s.bloque}>
          {/* Primero lo que ya tenemos cargado del expediente */}
          {docsExpediente.map((d: any, i: number) => (
            <View key={'doc' + i} style={[s.fila, i > 0 && s.filaBorde]}>
              <Ionicons
                name={d.vencido ? 'alert-circle' : 'checkmark-circle'}
                size={20}
                color={d.vencido ? t.color.error : t.color.teal}
              />
              <View style={s.docTexto}>
                <Text style={s.docTitulo}>
                  {String(d.tipo || 'Documento').replace(/^./, (c: string) => c.toUpperCase())}
                  {d.numero ? ` · ${d.numero}` : ''}
                </Text>
                <Text style={[s.docDetalle, d.vencido && s.docAlerta]}>
                  {d.vencido
                    ? 'Vencido, hay que renovarlo'
                    : d.por_vencer
                      ? 'Vence cerca de tu viaje, revisalo'
                      : d.vencimiento
                        ? `Vence el ${new Date(d.vencimiento + 'T00:00:00')
                            .toLocaleDateString('es-AR')}`
                        : 'Ya lo tenemos cargado'}
                </Text>
              </View>
            </View>
          ))}

          {/* Y después lo que el socio puede sumar */}
          <FilaDoc
            icono="document-text-outline"
            titulo={docsExpediente.length ? 'Subir otro documento' : 'Pasaporte o DNI'}
            detalle="Foto de la primera página, legible y completa"
            borde={docsExpediente.length > 0}
            cargando={subiendo === 'pasaporte'}
            onPress={() => subirDoc('pasaporte')}
          />
          <FilaDoc
            icono="shield-checkmark-outline"
            titulo="Cobertura médica"
            detalle="Tu asistencia al viajero o seguro"
            borde
            cargando={subiendo === 'cobertura'}
            onPress={() => subirDoc('cobertura')}
          />
        </View>

        {/* ── Documentos que cargó la agencia ── */}
        {adjuntos.length > 0 && (
          <>
            <Text style={s.seccion}>Cargado por la agencia</Text>
            <View style={s.bloque}>
              {adjuntos.map((a: any, i: number) => (
                <Pressable
                  key={a.id ?? i}
                  style={[s.fila, i > 0 && s.filaBorde]}
                  onPress={() => {
                    const url = String(a.url || '').startsWith('http')
                      ? a.url
                      : CONFIG.HOST + a.url;
                    Linking.openURL(url).catch(() =>
                      Alert.alert('No pudimos abrirlo', 'Intentá desde la web.'),
                    );
                  }}
                >
                  <Ionicons name="attach-outline" size={18} color={t.color.teal} />
                  <Text style={s.filaTexto} numberOfLines={1}>{a.nombre}</Text>
                  <Ionicons name="chevron-forward" size={18} color={t.color.borde} />
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* ── Mapa y qué hacer en el destino ── */}
        <MapaYExcursiones destino={viaje.destino} futuro={futuro} />

        {/* ── Acompañantes ── */}
        {companeros.length > 0 && (
          <>
            <Text style={s.seccion}>Viajan con vos</Text>
            <View style={s.bloque}>
              {companeros.map((c: any, i: number) => (
                <View key={c.id ?? i} style={[s.fila, i > 0 && s.filaBorde]}>
                  <Ionicons name="person-outline" size={18} color={t.color.textoSuave} />
                  <Text style={s.filaTexto} numberOfLines={1}>
                    {c.nombre} {c.apellido}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Vouchers ── */}
        {vouchers.length > 0 && (
          <>
            <Text style={s.seccion}>Documentos del viaje</Text>
            <View style={s.bloque}>
              {vouchers.map((v: any, i: number) => (
                <Pressable
                  key={v.id ?? i}
                  style={[s.fila, i > 0 && s.filaBorde]}
                  onPress={() => {
                    const url = v.url?.startsWith('http') ? v.url : CONFIG.HOST + v.url;
                    Linking.openURL(url).catch(() =>
                      Alert.alert('No pudimos abrirlo', 'Intentá desde la web.'),
                    );
                  }}
                >
                  <Ionicons name="download-outline" size={18} color={t.color.teal} />
                  <Text style={s.filaTexto} numberOfLines={1}>
                    {v.nombre || v.titulo || 'Voucher'}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={t.color.borde} />
                </Pressable>
              ))}
            </View>
          </>
        )}

        {viaje.notas ? (
          <>
            <Text style={s.seccion}>Notas</Text>
            <View style={s.bloque}>
              <Text style={s.notas}>{viaje.notas}</Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Encabezado({ onVolver }: { onVolver: () => void }) {
  return (
    <View style={s.barra}>
      <Pressable onPress={onVolver} hitSlop={12} style={s.volver}>
        <Ionicons name="chevron-back" size={24} color={t.color.texto} />
      </Pressable>
      <Text style={s.barraTitulo}>Tu viaje</Text>
      <View style={s.volver} />
    </View>
  );
}

function FilaDoc({
  icono, titulo, detalle, borde, cargando, onPress,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  titulo: string;
  detalle: string;
  borde?: boolean;
  cargando?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[s.fila, borde && s.filaBorde]} onPress={onPress} disabled={cargando}>
      <Ionicons name={icono} size={20} color={t.color.textoSuave} />
      <View style={s.docTexto}>
        <Text style={s.docTitulo}>{titulo}</Text>
        <Text style={s.docDetalle}>{detalle}</Text>
      </View>
      {cargando
        ? <ActivityIndicator color={t.color.teal} />
        : <Ionicons name="cloud-upload-outline" size={20} color={t.color.teal} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: t.color.fondo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.color.fondo },
  barra: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: t.espacio.lg, paddingVertical: t.espacio.md,
  },
  volver: { width: 32 },
  barraTitulo: { ...t.texto.seccion, color: t.color.texto },
  contenido: { padding: t.espacio.xl, paddingTop: 0, paddingBottom: t.espacio.xxl },

  hero: {
    backgroundColor: t.color.navy,
    borderRadius: t.radio.grande,
    padding: t.espacio.xl,
  },
  destino: { ...t.texto.titulo, color: '#fff' },
  fecha: { ...t.texto.chico, color: 'rgba(255,255,255,0.75)', marginTop: t.espacio.xs },
  regresiva: { flexDirection: 'row', alignItems: 'baseline', marginTop: t.espacio.lg },
  regresivaNum: { ...t.texto.cifra, color: t.color.teal },
  regresivaTxt: { ...t.texto.chico, color: '#fff', marginLeft: t.espacio.sm },
  puntos: { ...t.texto.chicoFuerte, color: t.color.gold, marginTop: t.espacio.md },
  codigo: { ...t.texto.pie, color: 'rgba(255,255,255,0.5)', marginTop: t.espacio.sm },

  seccion: {
    ...t.texto.chicoFuerte, color: t.color.textoSuave,
    marginTop: t.espacio.xl, marginBottom: t.espacio.sm,
  },
  bloque: {
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    paddingHorizontal: t.espacio.lg,
  },
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: t.espacio.lg },
  filaBorde: { borderTopWidth: 1, borderTopColor: t.color.borde },
  filaTexto: { ...t.texto.cuerpo, color: t.color.texto, flex: 1, marginLeft: t.espacio.md },
  docTexto: { flex: 1, marginLeft: t.espacio.md },
  docTitulo: { ...t.texto.cuerpoFuerte, color: t.color.texto },
  docDetalle: { ...t.texto.pie, color: t.color.textoSuave },
  docAlerta: { color: t.color.error },
  notas: { ...t.texto.cuerpo, color: t.color.texto, paddingVertical: t.espacio.lg },
  vacio: { ...t.texto.cuerpo, color: t.color.textoSuave },
});
