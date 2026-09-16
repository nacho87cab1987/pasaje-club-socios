import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { viajes as apiViajes } from '../api/endpoints';
import { crearTema } from '../theme';

const t = crearTema();

type Punto = {
  nombre: string;
  lat: number;
  lng: number;
  veces: number;
  futuro: boolean;
};

/**
 * Mapa con Leaflet y OpenStreetMap: no necesita API key ni una
 * cuenta de Google, y funciona igual en Expo Go que en el build.
 *
 * Con react-native-maps habría que configurar claves distintas
 * para iOS y Android, y en Expo Go ni siquiera se vería.
 */
function htmlMapa(puntos: Punto[]) {
  const datos = JSON.stringify(puntos);

  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html,body,#m{margin:0;padding:0;height:100%;width:100%;background:#F0EDE8}
  .leaflet-control-attribution{font-size:8px;opacity:.5}
  .pin{
    width:100%;height:100%;border-radius:50%;
    border:2.5px solid #fff;box-sizing:border-box;
    box-shadow:0 2px 6px rgba(7,45,64,.35);
  }
  .ido{background:#11BCB3}
  .proximo{background:#D7CA4A}
  .leaflet-popup-content{
    font-family:-apple-system,system-ui,sans-serif;
    font-size:13px;font-weight:600;color:#072D40;margin:8px 12px;
  }
</style>
</head><body>
<div id="m"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var puntos = ${datos};
  var mapa = L.map('m', { zoomControl:false, attributionControl:true })
              .setView([-20, -50], 2);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution:'&copy; OpenStreetMap &copy; CARTO', maxZoom:18
  }).addTo(mapa);

  var grupo = [];
  puntos.forEach(function(p){
    var tam = p.veces > 1 ? 20 : 15;
    var icono = L.divIcon({
      className:'',
      html:'<div class="pin '+(p.futuro?'proximo':'ido')+'"></div>',
      iconSize:[tam,tam], iconAnchor:[tam/2,tam/2]
    });
    var m = L.marker([p.lat,p.lng],{icon:icono}).addTo(mapa);
    m.bindPopup(p.nombre + (p.veces>1 ? ' · '+p.veces+' veces' : ''));
    grupo.push([p.lat,p.lng]);
  });

  // Encuadrar todos los destinos, con aire alrededor.
  if (grupo.length === 1) {
    mapa.setView(grupo[0], 5);
  } else if (grupo.length > 1) {
    mapa.fitBounds(grupo, { padding:[35,35], maxZoom:6 });
  }
</script>
</body></html>`;
}

export default function MapaViajes() {
  const [puntos, setPuntos] = useState<Punto[] | null>(null);

  const cargar = useCallback(async () => {
    try {
      const d: any = await apiViajes.misDestinos();
      setPuntos(d?.destinos ?? []);
    } catch {
      setPuntos([]);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (puntos === null) {
    return (
      <View style={s.cargando}>
        <ActivityIndicator color={t.color.teal} />
      </View>
    );
  }

  // Sin destinos no se muestra un mapa vacío del mundo: no dice nada.
  if (puntos.length === 0) return null;

  const idos = puntos.filter((p) => !p.futuro).length;
  const proximos = puntos.filter((p) => p.futuro).length;

  return (
    <>
      <View style={s.encabezado}>
        <Text style={s.titulo}>Tu mapa</Text>
        <Text style={s.resumen}>
          {puntos.length} {puntos.length === 1 ? 'destino' : 'destinos'}
        </Text>
      </View>

      <View style={s.caja}>
        <WebView
          originWhitelist={['*']}
          source={{ html: htmlMapa(puntos) }}
          style={s.mapa}
          scrollEnabled={false}
          startInLoadingState
          renderLoading={() => (
            <View style={s.cargandoMapa}>
              <ActivityIndicator color={t.color.teal} />
            </View>
          )}
        />

        <View style={s.leyenda}>
          {idos > 0 && (
            <View style={s.item}>
              <View style={[s.punto, { backgroundColor: t.color.teal }]} />
              <Text style={s.itemTxt}>
                {idos} {idos === 1 ? 'visitado' : 'visitados'}
              </Text>
            </View>
          )}
          {proximos > 0 && (
            <View style={s.item}>
              <View style={[s.punto, { backgroundColor: t.color.gold }]} />
              <Text style={s.itemTxt}>
                {proximos} por venir
              </Text>
            </View>
          )}
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  cargando: { paddingVertical: t.espacio.xl, alignItems: 'center' },
  encabezado: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    marginTop: t.espacio.xl, marginBottom: t.espacio.sm,
  },
  titulo: { ...t.texto.seccion, color: t.color.texto },
  resumen: { ...t.texto.pie, color: t.color.textoSuave },
  caja: {
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    overflow: 'hidden',
  },
  mapa: { height: 240 },
  cargandoMapa: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.color.superficie,
  },
  leyenda: {
    flexDirection: 'row', gap: t.espacio.lg,
    paddingHorizontal: t.espacio.lg, paddingVertical: t.espacio.md,
    borderTopWidth: 1, borderTopColor: t.color.borde,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: t.espacio.sm },
  punto: { width: 9, height: 9, borderRadius: 5 },
  itemTxt: { ...t.texto.pie, color: t.color.textoSuave },
});
