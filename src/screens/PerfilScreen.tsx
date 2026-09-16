import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../store/SessionContext';
import { CONFIG } from '../config';
import { crearTema } from '../theme';

const t = crearTema();

/** Secciones que no entran en la tab bar. */
const SECCIONES: { ruta: string; label: string; icono: keyof typeof Ionicons.glyphMap }[] = [
  { ruta: 'Puntos',    label: 'Historial de puntos', icono: 'stats-chart-outline' },
  { ruta: 'Wishlist',  label: 'Wishlist',            icono: 'heart-outline' },
  { ruta: 'Grupales',  label: 'Salidas grupales',    icono: 'map-outline' },
  { ruta: 'Chat',      label: 'Chat con la agencia', icono: 'chatbubble-outline' },
  { ruta: 'Referidos', label: 'Referidos',           icono: 'people-outline' },
  { ruta: 'Avisos',    label: 'Avisos',              icono: 'notifications-outline' },
];

export default function PerfilScreen({ navigation }: any) {
  const { me, salir } = useSession();

  function confirmarSalir() {
    Alert.alert('Cerrar sesión', '¿Querés salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => { salir(); } },
    ]);
  }

  return (
    <SafeAreaView style={s.fondo} edges={['top']}>
      <ScrollView contentContainerStyle={s.contenido}>
        <View style={s.cabecera}>
          {me?.foto ? (
            <Image source={{ uri: CONFIG.FOTOS + me.foto }} style={s.foto} />
          ) : (
            <View style={s.fotoVacia}>
              <Text style={s.iniciales}>
                {(me?.nombre?.[0] ?? '') + (me?.apellido?.[0] ?? '')}
              </Text>
            </View>
          )}
          <Text style={s.nombre}>{me?.nombre} {me?.apellido}</Text>
          <Text style={s.email}>{me?.email}</Text>
        </View>

        <View style={s.bloque}>
          <Dato clave="Nº de socio" valor={String(me?.id ?? '—')} />
          <Dato clave="DNI" valor={me?.dni || '—'} />
          <Dato clave="Teléfono" valor={me?.telefono || '—'} />
        </View>

        {/* Sin DNI no se le pueden acreditar los viajes que ya hizo,
            así que el aviso va antes que el botón común. */}
        {!me?.dni ? (
          <Pressable
            style={s.completar}
            onPress={() => navigation.navigate('EditarPerfil')}
          >
            <Ionicons name="alert-circle" size={20} color={t.color.gold} />
            <View style={s.completarTexto}>
              <Text style={s.completarTit}>Cargá tu DNI</Text>
              <Text style={s.completarTxt}>
                Si ya viajaste con nosotros, sumás esos puntos
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.color.borde} />
          </Pressable>
        ) : (
          <Pressable
            style={s.editar}
            onPress={() => navigation.navigate('EditarPerfil')}
          >
            <Ionicons name="create-outline" size={18} color={t.color.teal} />
            <Text style={s.editarTxt}>Editar mis datos</Text>
          </Pressable>
        )}

        <Text style={s.seccion}>Más</Text>
        <View style={s.bloque}>
          {SECCIONES.map((sec, i) => (
            <Pressable
              key={sec.ruta}
              style={[s.item, i > 0 && s.itemBorde]}
              onPress={() => navigation.navigate(sec.ruta)}
            >
              <Ionicons name={sec.icono} size={20} color={t.color.textoSuave} />
              <Text style={s.itemTexto}>{sec.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={t.color.borde} />
            </Pressable>
          ))}
        </View>

        <Pressable onPress={confirmarSalir} style={s.salir}>
          <Text style={s.salirTexto}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Dato({ clave, valor }: { clave: string; valor: string }) {
  return (
    <View style={s.datoFila}>
      <Text style={s.datoClave}>{clave}</Text>
      <Text style={s.datoValor}>{valor}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: t.color.fondo },
  contenido: { padding: t.espacio.xl },
  cabecera: { alignItems: 'center', marginBottom: t.espacio.xl },
  foto: { width: 88, height: 88, borderRadius: t.radio.grande },
  fotoVacia: {
    width: 88, height: 88, borderRadius: t.radio.grande,
    backgroundColor: t.color.navy, alignItems: 'center', justifyContent: 'center',
  },
  iniciales: { ...t.texto.titulo, color: '#fff' },
  nombre: { ...t.texto.seccion, color: t.color.texto, marginTop: t.espacio.md },
  email: { ...t.texto.chico, color: t.color.textoSuave },
  bloque: {
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    paddingHorizontal: t.espacio.lg,
  },
  datoFila: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: t.espacio.md,
  },
  datoClave: { ...t.texto.chico, color: t.color.textoSuave },
  datoValor: { ...t.texto.chicoFuerte, color: t.color.texto },
  editar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: t.espacio.sm, paddingVertical: t.espacio.lg, marginTop: t.espacio.md,
  },
  editarTxt: { ...t.texto.chicoFuerte, color: t.color.teal },
  completar: {
    flexDirection: 'row', alignItems: 'center',
    gap: t.espacio.md,
    backgroundColor: 'rgba(215,202,74,0.10)',
    borderRadius: t.radio.medio,
    borderWidth: 1, borderColor: 'rgba(215,202,74,0.35)',
    padding: t.espacio.lg,
    marginTop: t.espacio.md,
  },
  completarTexto: { flex: 1 },
  completarTit: { ...t.texto.cuerpoFuerte, color: t.color.texto },
  completarTxt: { ...t.texto.pie, color: t.color.textoSuave },
  seccion: {
    ...t.texto.chicoFuerte, color: t.color.textoSuave, 
    marginTop: t.espacio.xl, marginBottom: t.espacio.sm,
  },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: t.espacio.lg },
  itemBorde: { borderTopWidth: 1, borderTopColor: t.color.borde },
  itemTexto: { ...t.texto.cuerpo, color: t.color.texto, flex: 1, marginLeft: t.espacio.md },
  salir: { alignItems: 'center', marginTop: t.espacio.xxl },
  salirTexto: { ...t.texto.chicoFuerte, color: t.color.error },
});
