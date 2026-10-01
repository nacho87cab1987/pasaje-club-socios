import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Linking, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { avisos as apiAvisos } from '../api/endpoints';
import Encabezado from '../components/Encabezado';
import TextoConLinks from '../components/TextoConLinks';
import { CONFIG } from '../config';
import { crearTema } from '../theme';

const t = crearTema();

const COLOR: Record<string, string> = {
  viaje:     t.color.teal,
  beneficio: t.color.gold,
  aviso:     t.color.navy,
};

const ICONO: Record<string, keyof typeof Ionicons.glyphMap> = {
  viaje:     'airplane',
  beneficio: 'gift',
  aviso:     'megaphone',
  promo:     'pricetag',
  puntos:    'star',
  chat:      'chatbubble',
};

const fmtFecha = (f?: string | null) => {
  if (!f) return '';
  const d = new Date(String(f).replace(' ', 'T'));
  return isNaN(+d) ? '' : d.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  });
};

export default function AvisoDetalleScreen({ route, navigation }: any) {
  const aviso = route?.params?.aviso;

  // Abrirlo es leerlo: no hace falta un botón aparte.
  useEffect(() => {
    if (!aviso?.id) return;
    const sinLeer = aviso.leida === 0 || aviso.leida === '0' || aviso.leida === false;
    if (sinLeer) apiAvisos.marcarLeida(Number(aviso.id)).catch(() => {});
  }, [aviso?.id]);

  if (!aviso) {
    return (
      <View style={s.fondo}>
        <Encabezado titulo="Aviso" onVolver={() => navigation.goBack()} />
        <Text style={s.vacio}>No encontramos ese aviso.</Text>
      </View>
    );
  }

  const tipo = String(aviso.tipo ?? 'aviso');
  const color = COLOR[tipo] ?? t.color.navy;

  return (
    <View style={s.fondo}>
      <Encabezado titulo="Aviso" onVolver={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={s.contenido}>
        {/* La imagen va primero y a todo el ancho: si el aviso trae
            una, es lo que la persona quiere ver. */}
        {aviso.imagen ? (
          <Image
            source={{ uri: CONFIG.IMG_AVISOS + aviso.imagen }}
            style={s.imagen}
            resizeMode="cover"
          />
        ) : null}

        <View style={[s.cabecera, { backgroundColor: color }]}>
          <Ionicons
            name={ICONO[tipo] ?? 'notifications'}
            size={24}
            color={tipo === 'beneficio' ? t.color.navy : '#fff'}
          />
          <Text style={[s.tipo, tipo === 'beneficio' && { color: t.color.navy }]}>
            {tipo}
          </Text>
        </View>

        <Text style={s.titulo}>{aviso.titulo || 'Aviso'}</Text>
        <Text style={s.fecha}>{fmtFecha(aviso.creado_el)}</Text>

        {aviso.mensaje ? (
          <TextoConLinks style={s.mensaje}>{aviso.mensaje}</TextoConLinks>
        ) : null}

        {/* Si el aviso trae un link aparte del texto, va como botón */}
        {aviso.url ? (
          <Pressable
            style={[s.boton, { backgroundColor: color }]}
            onPress={() =>
              Linking.openURL(String(aviso.url)).catch(() =>
                Alert.alert('No pudimos abrirlo', String(aviso.url)),
              )
            }
          >
            <Text style={s.botonTxt}>Ver más</Text>
            <Ionicons name="open-outline" size={17} color="#fff" />
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: t.color.fondo },
  contenido: { padding: t.espacio.xl, paddingTop: t.espacio.sm },
  imagen: {
    width: '100%', height: 190,
    borderRadius: t.radio.medio,
    marginBottom: t.espacio.lg,
    backgroundColor: t.color.superficie,
  },

  cabecera: {
    flexDirection: 'row', alignItems: 'center', gap: t.espacio.sm,
    alignSelf: 'flex-start',
    borderRadius: t.radio.pastilla,
    paddingHorizontal: t.espacio.lg,
    paddingVertical: t.espacio.sm,
  },
  tipo: {
    ...t.texto.pie, color: '#fff',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  titulo: {
    ...t.texto.titulo, color: t.color.texto,
    marginTop: t.espacio.lg,
  },
  fecha: {
    ...t.texto.pie, color: t.color.textoSuave,
    marginTop: t.espacio.xs, textTransform: 'capitalize',
  },
  mensaje: {
    ...t.texto.cuerpo, color: t.color.texto,
    lineHeight: 24, marginTop: t.espacio.xl,
  },

  boton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: t.espacio.sm,
    borderRadius: t.radio.medio,
    paddingVertical: t.espacio.lg,
    marginTop: t.espacio.xl,
  },
  botonTxt: { ...t.texto.cuerpoFuerte, color: '#fff' },

  vacio: {
    ...t.texto.cuerpo, color: t.color.textoSuave,
    textAlign: 'center', marginTop: t.espacio.xxl,
  },
});
