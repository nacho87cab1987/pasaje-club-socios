import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, Pressable, Image, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSession } from '../store/SessionContext';
import RegistroScreen from './RegistroScreen';
import { crearTema } from '../theme';

const t = crearTema();

// Mismos tonos que el login del Hub
const AZUL_SUAVE = '#A9CBD6';   // bajada
const AZUL_PIE   = '#7FA6B5';   // pie
const ROJO_ICONO = '#F09595';
const ROJO_TEXTO = '#F7C1C1';
const GRIS_INPUT = '#5A7A85';

export default function LoginScreen() {
  const { entrar } = useSession();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [registrando, setRegistrando] = useState(false);

  const enviar = async () => {
    if (!email.trim() || !pass) { setError('Completá email y contraseña'); return; }
    setError(null);
    setCargando(true);
    try {
      await entrar(email, pass);
    } catch (e: any) {
      // El servidor distingue "credenciales mal" de otros casos.
      // Repetir su mensaje es más útil que uno genérico.
      setError(e?.message ?? 'No pudimos ingresar');
    } finally {
      setCargando(false);
    }
  };

  if (registrando) return <RegistroScreen onVolver={() => setRegistrando(false)} />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.color.navy }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        <Image
          source={require('../../assets/logo.png')}
          style={s.logo}
          resizeMode="contain"
        />
        <Text style={s.sub}>Tus viajes, tus puntos y tus beneficios, en un solo lugar</Text>

        <View style={s.campo}>
          <MaterialIcons name="mail-outline" size={20} color={GRIS_INPUT} />
          <TextInput
            style={s.input}
            placeholder="tu@email.com"
            placeholderTextColor={GRIS_INPUT}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="next"
            editable={!cargando}
          />
        </View>

        <View style={s.campo}>
          <MaterialIcons name="lock-outline" size={20} color={GRIS_INPUT} />
          <TextInput
            style={s.input}
            placeholder="Contraseña"
            placeholderTextColor={GRIS_INPUT}
            value={pass}
            onChangeText={setPass}
            secureTextEntry={!ver}
            autoCapitalize="none"
            autoComplete="current-password"
            onSubmitEditing={enviar}
            returnKeyType="go"
            editable={!cargando}
          />
          <Pressable onPress={() => setVer(!ver)} hitSlop={10}>
            <MaterialIcons
              name={ver ? 'visibility-off' : 'visibility'}
              size={20}
              color={GRIS_INPUT}
            />
          </Pressable>
        </View>

        {error ? (
          <View style={s.error}>
            <MaterialIcons name="error-outline" size={18} color={ROJO_ICONO} />
            <Text style={s.errorTxt}>{error}</Text>
          </View>
        ) : null}

        {/* El fondo del login es navy y el botón también: sobre ese fondo
            quedaba como texto suelto. En teal se lee como botón. */}
        <Pressable
          onPress={cargando ? undefined : enviar}
          style={({ pressed }) => [s.entrar, pressed && { opacity: 0.85 }]}
        >
          {cargando ? (
            <ActivityIndicator color={t.color.navy} size="small" />
          ) : (
            <>
              <Text style={s.entrarTxt}>Entrar</Text>
              <MaterialIcons name="arrow-forward" size={19} color={t.color.navy} />
            </>
          )}
        </Pressable>

        <Pressable style={s.olvide} hitSlop={8}>
          <Text style={s.olvideTxt}>Olvidé mi contraseña</Text>
        </Pressable>

        <View style={s.separador}>
          <View style={s.raya} />
          <Text style={s.separadorTxt}>o</Text>
          <View style={s.raya} />
        </View>

        <Pressable
          onPress={() => setRegistrando(true)}
          style={({ pressed }) => [s.crear, pressed && { opacity: 0.85 }]}
        >
          <Text style={s.crearTxt}>Crear mi cuenta</Text>
        </Pressable>

        <Text style={s.pie}>
          Si ya viajaste con nosotros, al registrarte con tu DNI sumás los
          puntos de tus viajes anteriores.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  // El logo trae su proporción: se fija el alto y el ancho se acomoda solo.
  logo: { width: 160, height: 90, alignSelf: 'center', marginBottom: 20 },
  sub: {
    ...t.texto.cuerpo,
    fontSize: 14.5, color: AZUL_SUAVE, marginBottom: 26, lineHeight: 21,
    textAlign: 'center', paddingHorizontal: 10,
  },
  campo: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff',
    borderRadius: t.radio.medio, paddingHorizontal: 14, height: 52, marginBottom: 11,
  },
  input: { ...t.texto.cuerpo, flex: 1, fontSize: 15.5, color: t.color.texto },
  error: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4,
    backgroundColor: 'rgba(240,149,149,0.14)', padding: 12, borderRadius: t.radio.medio,
  },
  errorTxt: { ...t.texto.chico, color: ROJO_TEXTO, fontSize: 13.5, flex: 1, lineHeight: 19 },
  entrar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: t.color.teal, borderRadius: 14, paddingVertical: 16, marginTop: 20,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  entrarTxt: { ...t.texto.cuerpoFuerte, color: t.color.navy, fontSize: 16 },
  olvide: { alignItems: 'center', marginTop: 18 },
  olvideTxt: { ...t.texto.chico, color: AZUL_SUAVE },
  separador: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24 },
  raya: { flex: 1, height: 1, backgroundColor: 'rgba(169,203,214,0.25)' },
  separadorTxt: { ...t.texto.chico, color: AZUL_PIE },
  crear: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, paddingVertical: 15, marginTop: 16,
    borderWidth: 1.5, borderColor: t.color.teal,
  },
  crearTxt: { ...t.texto.cuerpoFuerte, color: t.color.teal, fontSize: 15.5 },
  pie: {
    ...t.texto.pie, color: AZUL_PIE, fontSize: 12.5,
    textAlign: 'center', marginTop: 22, lineHeight: 18,
  },
});
