import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Linking, Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { grupales as apiGrupales } from '../api/endpoints';
import { crearTema } from '../theme';

const t = crearTema();

// Códigos de afiliado de la agencia. Los mismos que usaba la app vieja.
const CIV_AGENCY = '84075';
const CIV_ROSA   = '#f70759';

/**
 * Slug del destino para Civitatis: sin tildes, sin símbolos y
 * quedándose con la ciudad sola.
 *
 *   "Río de Janeiro, Brasil"   → rio-de-janeiro
 *   "SAN JUAN (P.R)"           → san-juan
 *   "Perú (Lima + Cuzco)"      → peru
 *
 * Lo de los paréntesis importa: los destinos vienen cargados con
 * aclaraciones entre paréntesis y, si quedan en el slug, Civitatis
 * no encuentra la ciudad y el widget sale vacío.
 */
function slugDestino(destino: string) {
  return String(destino)
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')   // sacar aclaraciones entre paréntesis
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e')
    .replace(/[íìï]/g, 'i').replace(/[óòö]/g, 'o')
    .replace(/[úùü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9\s,+]/g, ' ')
    .split(/[,+]/)[0]              // solo la primera ciudad
    .trim()
    .replace(/\s+/g, '-');
}

const urlCivitatis = (destino: string) =>
  `https://www.civitatis.com/es/${slugDestino(destino)}/?ag_aid=${CIV_AGENCY}`;

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

/**
 * Mapa del destino y qué hacer ahí.
 *
 * Solo para viajes que todavía no pasaron: a alguien que ya volvió
 * no le sirve que le ofrezcan excursiones.
 */
export default function MapaYExcursiones({
  destino,
  futuro,
}: {
  destino?: string | null;
  futuro: boolean;
}) {
  const [excursiones, setExcursiones] = useState<any[]>([]);
  const [verMapa, setVerMapa] = useState(false);
  const [verCiv, setVerCiv] = useState(false);
  const [cargandoExc, setCargandoExc] = useState(true);

  const cargar = useCallback(async () => {
    if (!destino) { setCargandoExc(false); return; }
    try {
      const d: any = await apiGrupales.excursionesDestino(destino);
      setExcursiones(d?.excursiones ?? []);
    } catch {
      setExcursiones([]);
    } finally {
      setCargandoExc(false);
    }
  }, [destino]);

  useEffect(() => { cargar(); }, [cargar]);

  // Sin destino cargado no hay nada que mostrar.
  if (!destino) return null;

  return (
    <>
      {/* ── Mapa ── */}
      <Text style={s.seccion}>Dónde queda</Text>
      <View style={s.caja}>
        {verMapa ? (
          <View style={s.mapaCaja}>
            <WebView
              originWhitelist={['*']}
              source={{ html: htmlMapa(destino), baseUrl: 'https://maps.google.com' }}
              style={s.mapa}
              scrollEnabled={false}
              startInLoadingState
              renderLoading={() => (
                <View style={s.mapaCargando}>
                  <ActivityIndicator color={t.color.teal} />
                </View>
              )}
            />
          </View>
        ) : (
          // No se carga el mapa hasta que lo piden: son varios MB
          // y la mayoría de las veces el socio solo mira el saldo.
          <Pressable style={s.mapaPlaceholder} onPress={() => setVerMapa(true)}>
            <Ionicons name="map-outline" size={28} color={t.color.teal} />
            <Text style={s.mapaTxt}>Ver el mapa de {destino}</Text>
          </Pressable>
        )}

        <Pressable style={s.abrirMapa} onPress={() => Linking.openURL(urlMapaApp(destino))}>
          <Ionicons name="navigate-outline" size={16} color={t.color.teal} />
          <Text style={s.abrirMapaTxt}>Abrir en el mapa del celular</Text>
        </Pressable>
      </View>

      {/* ── Excursiones propias ── */}
      {excursiones.length > 0 && (
        <>
          <Text style={s.seccion}>Lo que recomendamos</Text>
          <View style={s.bloque}>
            {excursiones.map((e: any, i: number) => (
              <Pressable
                key={e.id ?? i}
                style={[s.exc, i > 0 && s.excBorde]}
                disabled={!e.url}
                onPress={() => e.url && Linking.openURL(e.url).catch(() => {})}
              >
                <Ionicons name="location-outline" size={18} color={t.color.teal} />
                <View style={s.excTexto}>
                  <Text style={s.excNombre}>{e.nombre || e.titulo}</Text>
                  {e.descripcion ? (
                    <Text style={s.excDesc} numberOfLines={2}>{e.descripcion}</Text>
                  ) : null}
                </View>
                {e.url ? (
                  <Ionicons name="chevron-forward" size={18} color={t.color.borde} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* ── Civitatis, solo si el viaje no pasó ── */}
      {futuro && (
        <>
          <Text style={s.seccion}>Excursiones y actividades</Text>

          <View style={s.civAviso}>
            <Text style={s.civAvisoTxt}>
              Reservá con descuento por ser socio de Pasaje Club
            </Text>
          </View>

          {verCiv ? (
            <View style={s.civCaja}>
              {/* La página del destino, no el widget: el widget espera
                  un ID interno de Civitatis y con un slug devuelve
                  actividades de cualquier lado. */}
              <WebView
                source={{ uri: urlCivitatis(destino) }}
                style={s.civWeb}
                startInLoadingState
                renderLoading={() => (
                  <View style={s.mapaCargando}>
                    <ActivityIndicator color={CIV_ROSA} />
                  </View>
                )}
              />
            </View>
          ) : (
            <Pressable style={s.civBoton} onPress={() => setVerCiv(true)}>
              <Ionicons name="ticket-outline" size={20} color="#fff" />
              <Text style={s.civBotonTxt}>Ver actividades en {destino}</Text>
            </Pressable>
          )}

          <Pressable
            style={s.civLink}
            onPress={() => Linking.openURL(urlCivitatis(destino)).catch(() => {})}
          >
            <Text style={s.civLinkTxt}>Abrir Civitatis en el navegador</Text>
            <Ionicons name="open-outline" size={14} color={t.color.textoSuave} />
          </Pressable>
        </>
      )}

      {cargandoExc && excursiones.length === 0 ? null : null}
    </>
  );
}

const s = StyleSheet.create({
  seccion: {
    ...t.texto.chicoFuerte, color: t.color.textoSuave,
    marginTop: t.espacio.xl, marginBottom: t.espacio.sm,
  },
  caja: {
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    overflow: 'hidden',
  },
  mapaCaja: { height: 220 },
  mapa: { flex: 1 },
  mapaCargando: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.color.superficie,
  },
  mapaPlaceholder: {
    height: 120, alignItems: 'center', justifyContent: 'center',
    gap: t.espacio.sm,
  },
  mapaTxt: { ...t.texto.cuerpoFuerte, color: t.color.teal },
  abrirMapa: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: t.espacio.sm,
    paddingVertical: t.espacio.lg,
    borderTopWidth: 1, borderTopColor: t.color.borde,
  },
  abrirMapaTxt: { ...t.texto.chicoFuerte, color: t.color.teal },

  bloque: {
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    paddingHorizontal: t.espacio.lg,
  },
  exc: { flexDirection: 'row', alignItems: 'center', paddingVertical: t.espacio.lg },
  excBorde: { borderTopWidth: 1, borderTopColor: t.color.borde },
  excTexto: { flex: 1, marginLeft: t.espacio.md },
  excNombre: { ...t.texto.cuerpoFuerte, color: t.color.texto },
  excDesc: { ...t.texto.pie, color: t.color.textoSuave, marginTop: 2 },

  civAviso: {
    backgroundColor: 'rgba(247,7,89,0.06)',
    borderRadius: t.radio.chico,
    borderWidth: 1.5,
    borderColor: 'rgba(247,7,89,0.15)',
    padding: t.espacio.md,
    marginBottom: t.espacio.md,
  },
  civAvisoTxt: { ...t.texto.chicoFuerte, color: CIV_ROSA },
  civBoton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: t.espacio.sm,
    backgroundColor: CIV_ROSA,
    borderRadius: t.radio.medio,
    paddingVertical: t.espacio.lg,
  },
  civBotonTxt: { ...t.texto.cuerpoFuerte, color: '#fff' },
  civCaja: {
    height: 520,
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    overflow: 'hidden',
  },
  civWeb: { flex: 1 },
  civLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: t.espacio.xs, paddingVertical: t.espacio.lg,
  },
  civLinkTxt: { ...t.texto.chico, color: t.color.textoSuave },
});
