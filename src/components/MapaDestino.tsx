import React from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Linking, Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { crearTema } from '../theme';

const t = crearTema();

/**
 * Mapa embebido de Google, sin API key.
 *
 * Google rechaza `output=embed` si no está adentro de un <iframe>:
 * cargando la URL directo en la WebView tira el error de que debe
 * usarse embebido. Por eso se monta un HTML mínimo con el iframe.
 */
const htmlMapa = (destino: string) => {
  const url =
    'https://maps.google.com/maps?q=' +
    encodeURIComponent('atracciones turísticas ' + destino) +
    '&output=embed&z=12';

  return `<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
    <style>html,body{margin:0;padding:0;height:100%;overflow:hidden;background:#F0EDE8}
    iframe{border:0;width:100%;height:100%;display:block}</style>
    </head><body>
    <iframe src="${url}" allowfullscreen loading="eager"></iframe>
    </body></html>`;
};

const urlMapaApp = (destino: string) =>
  Platform.OS === 'ios'
    ? `http://maps.apple.com/?q=${encodeURIComponent('atracciones ' + destino)}`
    : `https://www.google.com/maps/search/${encodeURIComponent('atracciones ' + destino)}`;

export default function MapaDestino({ destino }: { destino?: string | null }) {
  if (!destino) return null;

  return (
    <View style={s.caja}>
      <View style={s.mapaCaja}>
        <WebView
          originWhitelist={['*']}
          source={{ html: htmlMapa(destino), baseUrl: 'https://maps.google.com' }}
          style={s.mapa}
          scrollEnabled={false}
          startInLoadingState
          renderLoading={() => (
            <View style={s.cargando}>
              <ActivityIndicator color={t.color.teal} />
            </View>
          )}
        />
      </View>

      <Pressable style={s.abrir} onPress={() => Linking.openURL(urlMapaApp(destino))}>
        <Ionicons name="navigate-outline" size={16} color={t.color.teal} />
        <Text style={s.abrirTxt}>Abrir en el mapa del celular</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  caja: {
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    overflow: 'hidden',
  },
  mapaCaja: { height: 340 },
  mapa: { flex: 1 },
  cargando: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.color.superficie,
  },
  abrir: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: t.espacio.sm,
    paddingVertical: t.espacio.lg,
    borderTopWidth: 1, borderTopColor: t.color.borde,
  },
  abrirTxt: { ...t.texto.chicoFuerte, color: t.color.teal },
});
