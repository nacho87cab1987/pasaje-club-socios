import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Pressable, Image, Platform,
} from 'react-native';
import * as Brightness from 'expo-brightness';
import QRCode from 'react-native-qrcode-svg';
import { beneficios } from '../api/endpoints';
import { useSession } from '../store/SessionContext';
import { CONFIG } from '../config';
import { crearTema } from '../theme';

const t = crearTema();

type Socio = {
  nombre: string;
  apellido: string;
  nivel?: string;
  foto?: string | null;
  qr_token: string;
};

export default function TarjetaScreen() {
  const { me } = useSession();
  const [socio, setSocio] = useState<Socio | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    beneficios
      .credencial()
      .then((d: any) => {
        if (!d?.socio?.qr_token) throw new Error('Tu credencial todavía no está lista.');
        setSocio(d.socio);
      })
      .catch((e: any) => setError(e?.message ?? 'No pudimos cargar tu credencial.'));
  }, []);

  // Subir el brillo al máximo: los lectores del comercio leen mucho
  // mejor y el socio no tiene que buscar el control en el mostrador.
  useEffect(() => {
    let previo: number | null = null;
    (async () => {
      try {
        const { granted } = await Brightness.requestPermissionsAsync();
        if (!granted) return;
        previo = await Brightness.getBrightnessAsync();
        await Brightness.setBrightnessAsync(1);
      } catch {}
    })();
    return () => {
      if (previo !== null) Brightness.setBrightnessAsync(previo).catch(() => {});
    };
  }, []);

  if (error) {
    return (
      <View style={s.centro}>
        <Text style={s.error}>{error}</Text>
      </View>
    );
  }

  if (!socio) {
    return (
      <View style={s.centro}>
        <ActivityIndicator color={t.color.teal} size="large" />
      </View>
    );
  }

  return (
    <View style={s.fondo}>
      <View style={s.credencial}>
        <View style={s.encabezado}>
          {socio.foto ? (
            <Image source={{ uri: CONFIG.FOTOS + socio.foto }} style={s.foto} />
          ) : (
            <View style={s.fotoVacia}>
              <Text style={s.iniciales}>
                {(socio.nombre?.[0] ?? '') + (socio.apellido?.[0] ?? '')}
              </Text>
            </View>
          )}
          <View style={s.datos}>
            <Text style={s.nombre} numberOfLines={1}>
              {socio.nombre} {socio.apellido}
            </Text>
            <Text style={s.nivel}>{socio.nivel ?? 'Socio'}</Text>
            <Text style={s.numero}>Nº {me?.id}</Text>
          </View>
        </View>

        <View style={s.qrMarco}>
          <QRCode
            value={socio.qr_token}
            size={220}
            color={t.color.navy}
            backgroundColor="#fff"
            ecl="H"
          />
        </View>

        <Text style={s.instruccion}>
          Mostrá este código en el comercio para usar tu beneficio.
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: t.color.navy,
    alignItems: 'center',
    justifyContent: 'center',
    padding: t.espacio.xl,
  },
  centro: {
    flex: 1,
    backgroundColor: t.color.navy,
    alignItems: 'center',
    justifyContent: 'center',
    padding: t.espacio.xl,
  },
  error: { ...t.texto.cuerpo, color: '#fff', textAlign: 'center' },
  credencial: {
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.grande,
    padding: t.espacio.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: t.espacio.xl,
  },
  foto: { width: 56, height: 56, borderRadius: t.radio.medio },
  fotoVacia: {
    width: 56,
    height: 56,
    borderRadius: t.radio.medio,
    backgroundColor: t.color.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iniciales: { ...t.texto.seccion, color: '#fff' },
  datos: { flex: 1, marginLeft: t.espacio.md },
  nombre: { ...t.texto.seccion, color: t.color.texto },
  nivel: { ...t.texto.chicoFuerte, color: t.color.teal },
  numero: { ...t.texto.pie, color: t.color.textoSuave },
  qrMarco: {
    backgroundColor: '#fff',
    padding: t.espacio.md,
    borderRadius: t.radio.medio,
  },
  instruccion: {
    ...t.texto.chico,
    color: t.color.textoSuave,
    textAlign: 'center',
    marginTop: t.espacio.lg,
  },
});
