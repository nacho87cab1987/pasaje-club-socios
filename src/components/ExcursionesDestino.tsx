import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { destinos as apiDestinos } from '../api/endpoints';
import { crearTema } from '../theme';

const t = crearTema();
const CIV_ROSA = '#f70759';

export default function ExcursionesDestino({
  destino,
  futuro,
}: {
  destino?: string | null;
  futuro: boolean;
}) {
  const [excursiones, setExcursiones] = useState<any[]>([]);
  const [civUrl, setCivUrl] = useState<string | null>(null);
  const [civFallo, setCivFallo] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    if (!destino) { setCargando(false); return; }

    const [propias, civ] = await Promise.allSettled([
      apiDestinos.excursiones(destino),
      // Civitatis solo tiene página para los destinos de su catálogo.
      // Si no la tiene, no se muestra nada: mejor eso que ofrecerle
      // excursiones de Roma a alguien que viaja a Ezeiza.
      apiDestinos.civitatis(destino),
    ]);

    if (propias.status === 'fulfilled') {
      setExcursiones((propias.value as any)?.excursiones ?? []);
    }
    if (civ.status === 'fulfilled') {
      const d = civ.value as any;
      setCivUrl(d?.valido ? d.url : null);
    }
    setCargando(false);
  }, [destino]);

  useEffect(() => { cargar(); }, [cargar]);

  if (!destino) return null;

  if (cargando) {
    return (
      <View style={s.centro}>
        <ActivityIndicator color={t.color.teal} />
      </View>
    );
  }

  const nada = excursiones.length === 0 && !civUrl;

  return (
    <>
      {/* Lo de la agencia primero: es lo propio */}
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

      {/* Civitatis: solo si el viaje no pasó y si el destino existe
          en su catálogo. */}
      {futuro && civUrl && (
        <>
          <Text style={s.seccion}>Actividades para reservar</Text>

          <View style={s.civAviso}>
            <Text style={s.civAvisoTxt}>
              Reservá con descuento por ser socio de Pasaje Club
            </Text>
          </View>

          {/* Se carga sola, igual que el mapa: si hay que tocar un
              botón para verla, casi nadie la ve. */}
          {civFallo ? (
            <Pressable
              style={s.civError}
              onPress={() => Linking.openURL(civUrl).catch(() => {})}
            >
              <Ionicons name="open-outline" size={22} color={CIV_ROSA} />
              <Text style={s.civErrorTit}>Ver las actividades en Civitatis</Text>
              <Text style={s.civErrorTxt}>{civFallo}</Text>
            </Pressable>
          ) : (
            <View style={s.civCaja}>
              <WebView
                source={{ uri: civUrl }}
                style={s.civWeb}
                startInLoadingState
                // Sin un user agent de navegador, algunos sitios
                // devuelven una página vacía a las WebView.
                userAgent={
                  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
                  'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile Safari/604.1'
                }
                javaScriptEnabled
                domStorageEnabled
                thirdPartyCookiesEnabled
                sharedCookiesEnabled
                allowsInlineMediaPlayback
                onError={(e) =>
                  setCivFallo(e.nativeEvent?.description || 'No pudimos cargarla acá')
                }
                onHttpError={(e) => {
                  const c = e.nativeEvent?.statusCode;
                  if (c && c >= 400) setCivFallo(`La página respondió ${c}`);
                }}
                renderLoading={() => (
                  <View style={s.centro}>
                    <ActivityIndicator color={CIV_ROSA} />
                  </View>
                )}
              />
            </View>
          )}

          <Pressable
            style={s.civLink}
            onPress={() => Linking.openURL(civUrl).catch(() => {})}
          >
            <Text style={s.civLinkTxt}>Abrir Civitatis en el navegador</Text>
            <Ionicons name="open-outline" size={14} color={t.color.textoSuave} />
          </Pressable>
        </>
      )}

      {nada && (
        <View style={s.vacio}>
          <Ionicons name="compass-outline" size={28} color={t.color.borde} />
          <Text style={s.vacioTitulo}>Todavía no hay excursiones</Text>
          <Text style={s.vacioTexto}>
            {futuro
              ? 'Escribinos y te armamos actividades para este destino.'
              : 'Este viaje ya pasó.'}
          </Text>
        </View>
      )}
    </>
  );
}

const s = StyleSheet.create({
  centro: { paddingVertical: t.espacio.xxl, alignItems: 'center' },
  seccion: {
    ...t.texto.chicoFuerte, color: t.color.textoSuave,
    marginBottom: t.espacio.sm, marginTop: t.espacio.lg,
  },
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
  civError: {
    alignItems: 'center', gap: t.espacio.sm,
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    paddingVertical: t.espacio.xl,
    paddingHorizontal: t.espacio.lg,
  },
  civErrorTit: { ...t.texto.cuerpoFuerte, color: CIV_ROSA },
  civErrorTxt: { ...t.texto.pie, color: t.color.textoSuave, textAlign: 'center' },
  civCaja: {
    height: 560,
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

  vacio: { alignItems: 'center', paddingVertical: t.espacio.xxl, gap: t.espacio.sm },
  vacioTitulo: { ...t.texto.seccion, color: t.color.texto },
  vacioTexto: { ...t.texto.cuerpo, color: t.color.textoSuave, textAlign: 'center' },
});
