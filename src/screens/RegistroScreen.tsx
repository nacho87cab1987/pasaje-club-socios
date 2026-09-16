import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, Pressable, Image, ActivityIndicator, Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSession } from '../store/SessionContext';
import { fmtPuntos } from '../lib/tiers';
import { crearTema } from '../theme';

const t = crearTema();

const AZUL_SUAVE = '#A9CBD6';
const AZUL_PIE   = '#7FA6B5';
const ROJO_ICONO = '#F09595';
const ROJO_TEXTO = '#F7C1C1';
const GRIS_INPUT = '#5A7A85';

export default function RegistroScreen({ onVolver }: { onVolver: () => void }) {
  const { registrar } = useSession();

  const [nombre, setNombre]     = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail]       = useState('');
  const [pass, setPass]         = useState('');
  const [dni, setDni]           = useState('');
  const [telefono, setTelefono] = useState('');
  const [referido, setReferido] = useState('');

  const [ver, setVer] = useState(false);
  const [masDatos, setMasDatos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const enviar = async () => {
    if (!nombre.trim() || !apellido.trim() || !email.trim() || !pass) {
      setError('Completá nombre, apellido, email y contraseña');
      return;
    }
    if (pass.length < 6) {
      setError('La contraseña necesita al menos 6 caracteres');
      return;
    }

    setError(null);
    setCargando(true);
    try {
      const r = await registrar({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim().toLowerCase(),
        password: pass,
        dni: dni.replace(/\D/g, '') || null,
        telefono: telefono.trim() || null,
        codigo_referido: referido.trim().toUpperCase() || null,
      });

      // Si recuperó viajes, se lo decimos: es lo que hace que la
      // primera pantalla no esté vacía.
      if (r.viajesRecuperados > 0) {
        Alert.alert(
          '¡Encontramos tus viajes!',
          `Reconocimos ${r.viajesRecuperados} ` +
          `${r.viajesRecuperados === 1 ? 'viaje' : 'viajes'} que hiciste con nosotros. ` +
          `Ya tenés ${fmtPuntos(r.puntosRecuperados)} puntos en tu cuenta.`,
        );
      }
      // Si salió bien, el contexto ya cambió y la app entra sola.
    } catch (e: any) {
      setError(e?.message ?? 'No pudimos crear tu cuenta');
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.color.navy }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        <Pressable onPress={onVolver} hitSlop={12} style={s.volver}>
          <MaterialIcons name="arrow-back" size={24} color={AZUL_SUAVE} />
        </Pressable>

        <Image
          source={require('../../assets/logo.png')}
          style={s.logo}
          resizeMode="contain"
        />
        <Text style={s.sub}>Creá tu cuenta y empezá a sumar puntos en cada viaje</Text>

        <View style={s.fila}>
          <View style={[s.campo, s.mitad]}>
            <MaterialIcons name="person-outline" size={20} color={GRIS_INPUT} />
            <TextInput
              style={s.input}
              placeholder="Nombre"
              placeholderTextColor={GRIS_INPUT}
              value={nombre}
              onChangeText={setNombre}
              editable={!cargando}
            />
          </View>
          <View style={[s.campo, s.mitad]}>
            <TextInput
              style={s.input}
              placeholder="Apellido"
              placeholderTextColor={GRIS_INPUT}
              value={apellido}
              onChangeText={setApellido}
              editable={!cargando}
            />
          </View>
        </View>

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
            editable={!cargando}
          />
        </View>

        <View style={s.campo}>
          <MaterialIcons name="lock-outline" size={20} color={GRIS_INPUT} />
          <TextInput
            style={s.input}
            placeholder="Contraseña (mínimo 6)"
            placeholderTextColor={GRIS_INPUT}
            value={pass}
            onChangeText={setPass}
            secureTextEntry={!ver}
            autoCapitalize="none"
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

        {/* El DNI no es un trámite: es lo que hace que la cuenta arranque
            con los viajes que la persona ya hizo. Por eso va destacado
            y con el motivo a la vista. */}
        <View style={s.dniCaja}>
          <View style={s.dniCabecera}>
            <MaterialIcons name="auto-awesome" size={18} color={t.color.gold} />
            <Text style={s.dniTitulo}>¿Ya viajaste con nosotros?</Text>
          </View>
          <Text style={s.dniTexto}>
            Cargá tu DNI y sumamos automáticamente los puntos de todos tus
            viajes anteriores.
          </Text>
          <View style={[s.campo, s.campoDni]}>
            <MaterialIcons name="badge" size={20} color={GRIS_INPUT} />
            <TextInput
              style={s.input}
              placeholder="Tu DNI, sin puntos"
              placeholderTextColor={GRIS_INPUT}
              value={dni}
              onChangeText={setDni}
              keyboardType="number-pad"
              editable={!cargando}
            />
          </View>
        </View>

        {/* Lo opcional, plegado: que el formulario no asuste de entrada */}
        <Pressable onPress={() => setMasDatos(!masDatos)} style={s.masBtn}>
          <Text style={s.masTxt}>
            {masDatos ? 'Menos opciones' : 'Teléfono y código de referido'}
          </Text>
          <MaterialIcons
            name={masDatos ? 'expand-less' : 'expand-more'}
            size={20}
            color={AZUL_SUAVE}
          />
        </Pressable>

        {masDatos && (
          <>
            <View style={s.campo}>
              <MaterialIcons name="phone" size={20} color={GRIS_INPUT} />
              <TextInput
                style={s.input}
                placeholder="Teléfono"
                placeholderTextColor={GRIS_INPUT}
                value={telefono}
                onChangeText={setTelefono}
                keyboardType="phone-pad"
                editable={!cargando}
              />
            </View>
            <View style={s.campo}>
              <MaterialIcons name="card-giftcard" size={20} color={GRIS_INPUT} />
              <TextInput
                style={s.input}
                placeholder="Código de referido"
                placeholderTextColor={GRIS_INPUT}
                value={referido}
                onChangeText={setReferido}
                autoCapitalize="characters"
                editable={!cargando}
              />
            </View>
          </>
        )}

        {error ? (
          <View style={s.error}>
            <MaterialIcons name="error-outline" size={18} color={ROJO_ICONO} />
            <Text style={s.errorTxt}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={cargando ? undefined : enviar}
          style={({ pressed }) => [s.entrar, pressed && { opacity: 0.85 }]}
        >
          {cargando ? (
            <ActivityIndicator color={t.color.navy} size="small" />
          ) : (
            <>
              <Text style={s.entrarTxt}>Crear mi cuenta</Text>
              <MaterialIcons name="arrow-forward" size={19} color={t.color.navy} />
            </>
          )}
        </Pressable>

        <Pressable onPress={onVolver} style={s.yaTengo} hitSlop={8}>
          <Text style={s.yaTengoTxt}>Ya tengo cuenta</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: 'center', padding: 28, paddingTop: 70 },
  volver: { position: 'absolute', top: 18, left: 20 },
  logo: { width: 140, height: 78, alignSelf: 'center', marginBottom: 16 },
  sub: {
    ...t.texto.cuerpo,
    fontSize: 14.5, color: AZUL_SUAVE, marginBottom: 22, lineHeight: 21,
    textAlign: 'center', paddingHorizontal: 10,
  },
  fila: { flexDirection: 'row', gap: 10 },
  mitad: { flex: 1 },
  campo: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff',
    borderRadius: t.radio.medio, paddingHorizontal: 14, height: 52, marginBottom: 11,
  },
  campoDni: { marginBottom: 0, marginTop: 12 },
  input: { ...t.texto.cuerpo, flex: 1, fontSize: 15.5, color: t.color.texto },

  dniCaja: {
    backgroundColor: 'rgba(215,202,74,0.10)',
    borderRadius: t.radio.medio,
    borderWidth: 1,
    borderColor: 'rgba(215,202,74,0.35)',
    padding: 16,
    marginTop: 4,
    marginBottom: 11,
  },
  dniCabecera: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dniTitulo: { ...t.texto.cuerpoFuerte, color: t.color.gold, fontSize: 14.5 },
  dniTexto: { ...t.texto.chico, color: AZUL_SUAVE, marginTop: 6, lineHeight: 19 },

  masBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, marginBottom: 4,
  },
  masTxt: { ...t.texto.chico, color: AZUL_SUAVE },

  error: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4,
    backgroundColor: 'rgba(240,149,149,0.14)', padding: 12, borderRadius: t.radio.medio,
  },
  errorTxt: { ...t.texto.chico, color: ROJO_TEXTO, fontSize: 13.5, flex: 1, lineHeight: 19 },

  entrar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: t.color.teal, borderRadius: 14, paddingVertical: 16, marginTop: 16,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  entrarTxt: { ...t.texto.cuerpoFuerte, color: t.color.navy, fontSize: 16 },
  yaTengo: { alignItems: 'center', marginTop: 20 },
  yaTengoTxt: { ...t.texto.chico, color: AZUL_PIE },
});
