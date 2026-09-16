import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  Alert, Linking, ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { viajes as apiViajes, destinos as apiDestinos, type Viaje } from '../api/endpoints';
import { fmtPuntos } from '../lib/tiers';
import EstadoCuenta from '../components/EstadoCuenta';
import MapaDestino from '../components/MapaDestino';
import ExcursionesDestino from '../components/ExcursionesDestino';
import TipsDestino from '../components/TipsDestino';
import { CONFIG } from '../config';
import { crearTema } from '../theme';

const t = crearTema();

type Doc = 'pasaporte' | 'cobertura';
type Pestana = 'estado' | 'mapa' | 'excursiones' | 'tips';

const PESTANAS: { id: Pestana; label: string; icono: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'estado',      label: 'Estado',      icono: 'document-text-outline' },
  { id: 'mapa',        label: 'Mapa',        icono: 'map-outline' },
  { id: 'excursiones', label: 'Excursiones', icono: 'ticket-outline' },
  { id: 'tips',        label: 'Tips',        icono: 'bulb-outline' },
];

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
  const [cargando, setCargando] = useState(!viajeInicial);
  const [pestana, setPestana] = useState<Pestana>('estado');
  const [foto, setFoto] = useState<string | null>(null);

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
    setCargando(false);
  }, [viaje, viajeId]);

  useEffect(() => { cargar(); }, []);

  // La foto del destino, para la portada. Si no hay, queda el navy
  // de siempre: nunca se muestra un hueco.
  useEffect(() => {
    if (!viaje?.destino) return;
    apiDestinos.foto(viaje.destino)
      .then((d: any) => setFoto(d?.foto ?? null))
      .catch(() => {});
  }, [viaje?.destino]);

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
        <View style={s.barra}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={t.color.texto} />
          </Pressable>
          <Text style={s.barraTitulo}>Tu viaje</Text>
          <View style={{ width: 24 }} />
        </View>
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
      {/* ── Portada: foto del destino con degradé, o navy si no hay ── */}
      <Portada
        foto={foto}
        destino={viaje.destino}
        fecha={fmtFecha(viaje.fecha)}
        dias={dias}
        futuro={futuro}
        puntos={Number(viaje.puntos)}
        onVolver={() => navigation.goBack()}
      />

      {/* ── Pestañas ── */}
      <View style={s.tabs}>
        {PESTANAS.map((p) => {
          const activa = pestana === p.id;
          return (
            <Pressable
              key={p.id}
              style={[s.tab, activa && s.tabActiva]}
              onPress={() => setPestana(p.id)}
            >
              <Ionicons
                name={p.icono}
                size={17}
                color={activa ? t.color.teal : t.color.textoSuave}
              />
              <Text style={[s.tabTxt, activa && s.tabTxtActiva]}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={s.contenido} showsVerticalScrollIndicator={false}>
        {pestana === 'estado' && <PestanaEstado viaje={viaje} />}
        {pestana === 'mapa' && <MapaDestino destino={viaje.destino} />}
        {pestana === 'excursiones' && (
          <ExcursionesDestino destino={viaje.destino} futuro={futuro} />
        )}
        {pestana === 'tips' && <TipsDestino destino={viaje.destino} />}
      </ScrollView>
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════
// Pestaña Estado: plata, documentación, acompañantes y vouchers
// ════════════════════════════════════════════════════════════
function PestanaEstado({ viaje }: { viaje: Viaje }) {
  const [companeros, setCompaneros] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [docsExpediente, setDocsExpediente] = useState<any[]>([]);
  const [adjuntos, setAdjuntos] = useState<any[]>([]);
  const [subiendo, setSubiendo] = useState<Doc | null>(null);

  useEffect(() => {
    const id = Number(viaje.id);

    // Todo esto es opcional: si algo falla, la pestaña sirve igual.
    apiViajes.companeros(id)
      .then((d: any) => setCompaneros(d?.companeros ?? [])).catch(() => {});
    apiViajes.vouchers(id)
      .then((d: any) => setVouchers(d?.vouchers ?? [])).catch(() => {});
    apiViajes.documentos(id)
      .then((d: any) => {
        setDocsExpediente(d?.documentos ?? []);
        setAdjuntos(d?.adjuntos ?? []);
      })
      .catch(() => {});
  }, [viaje.id]);

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

  function abrir(url: string) {
    const u = String(url).startsWith('http') ? url : CONFIG.HOST + url;
    Linking.openURL(u).catch(() =>
      Alert.alert('No pudimos abrirlo', 'Intentá desde la web.'),
    );
  }

  return (
    <>
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
                      ? `Vence el ${new Date(d.vencimiento + 'T00:00:00').toLocaleDateString('es-AR')}`
                      : 'Ya lo tenemos cargado'}
              </Text>
            </View>
          </View>
        ))}

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
                onPress={() => abrir(a.url)}
              >
                <Ionicons name="attach-outline" size={18} color={t.color.teal} />
                <Text style={s.filaTexto} numberOfLines={1}>{a.nombre}</Text>
                <Ionicons name="chevron-forward" size={18} color={t.color.borde} />
              </Pressable>
            ))}
          </View>
        </>
      )}

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
                onPress={() => abrir(v.url)}
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

      {viaje.expediente_codigo ? (
        <Text style={s.codigo}>Expediente {viaje.expediente_codigo}</Text>
      ) : null}
    </>
  );
}

/**
 * Portada del viaje.
 *
 * Con foto del destino y un degradé que va de transparente a navy,
 * para que el texto blanco se lea sin importar cómo sea la imagen.
 * Sin foto, el mismo navy de siempre: nunca queda un hueco gris.
 */
function Portada({
  foto, destino, fecha, dias, futuro, puntos, onVolver,
}: {
  foto: string | null;
  destino?: string | null;
  fecha: string;
  dias: number;
  futuro: boolean;
  puntos: number;
  onVolver: () => void;
}) {
  const contenido = (
    <>
      <Pressable onPress={onVolver} hitSlop={12} style={s.volver}>
        <Ionicons name="chevron-back" size={24} color="#fff" />
      </Pressable>

      <View style={s.heroTexto}>
        <Text style={s.destino} numberOfLines={2}>
          {destino || 'Tu viaje'}
        </Text>
        <Text style={s.fecha}>{fecha}</Text>

        <View style={s.heroPie}>
          {futuro && (
            <View style={s.pastilla}>
              <Text style={s.pastillaTxt}>
                {dias === 0 ? 'Salís hoy'
                  : dias === 1 ? 'Falta 1 día'
                  : `Faltan ${dias} días`}
              </Text>
            </View>
          )}
          {puntos > 0 && (
            <Text style={s.puntos}>+{fmtPuntos(puntos)} puntos</Text>
          )}
        </View>
      </View>
    </>
  );

  if (!foto) {
    return <View style={[s.hero, s.heroSinFoto]}>{contenido}</View>;
  }

  return (
    <ImageBackground source={{ uri: foto }} style={s.hero} resizeMode="cover">
      {/* Tres paradas en vez de dos: la del medio evita que el
          degradé tape la foto demasiado arriba. */}
      <LinearGradient
        colors={['rgba(7,45,64,0.35)', 'rgba(7,45,64,0.72)', 'rgba(7,45,64,0.96)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      {contenido}
    </ImageBackground>
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

  hero: {
    minHeight: 190,
    paddingHorizontal: t.espacio.xl,
    paddingTop: t.espacio.sm,
    paddingBottom: t.espacio.lg,
    justifyContent: 'space-between',
  },
  heroSinFoto: { backgroundColor: t.color.navy, minHeight: 0 },
  heroTexto: { marginTop: t.espacio.lg },
  volver: { marginLeft: -6, alignSelf: 'flex-start' },
  destino: {
    ...t.texto.titulo, color: '#fff',
    // Sobre foto, la sombra es lo que hace que el texto se lea
    // aunque la imagen tenga una zona clara justo detrás.
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  fecha: {
    ...t.texto.chico, color: 'rgba(255,255,255,0.85)', marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  heroPie: {
    flexDirection: 'row', alignItems: 'center',
    gap: t.espacio.md, marginTop: t.espacio.md,
  },
  pastilla: {
    backgroundColor: t.color.teal,
    borderRadius: t.radio.pastilla,
    paddingHorizontal: t.espacio.md,
    paddingVertical: 3,
  },
  pastillaTxt: { ...t.texto.pie, color: t.color.navy },
  puntos: { ...t.texto.chicoFuerte, color: t.color.gold },

  tabs: {
    flexDirection: 'row',
    backgroundColor: t.color.superficie,
    borderBottomWidth: 1,
    borderBottomColor: t.color.borde,
  },
  tab: {
    flex: 1, alignItems: 'center', gap: 3,
    paddingVertical: t.espacio.md,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActiva: { borderBottomColor: t.color.teal },
  tabTxt: { ...t.texto.pie, color: t.color.textoSuave },
  tabTxtActiva: { color: t.color.teal },

  contenido: { padding: t.espacio.xl, paddingBottom: t.espacio.xxl },

  barra: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: t.espacio.lg, paddingVertical: t.espacio.md,
  },
  barraTitulo: { ...t.texto.seccion, color: t.color.texto },

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
  codigo: {
    ...t.texto.pie, color: t.color.textoSuave,
    textAlign: 'center', marginTop: t.espacio.xl,
  },
  vacio: { ...t.texto.cuerpo, color: t.color.textoSuave },
});
