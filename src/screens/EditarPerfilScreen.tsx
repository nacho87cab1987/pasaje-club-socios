import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable, Image,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSession } from '../store/SessionContext';
import { perfil as apiPerfil } from '../api/endpoints';
import { fmtPuntos } from '../lib/tiers';
import Encabezado from '../components/Encabezado';
import { CONFIG } from '../config';
import { crearTema } from '../theme';

const t = crearTema();

/** "1985-03-12" → "12/03/1985", que es como se escribe acá. */
function aVisible(iso?: string | null) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/** "12/03/1985" → "1985-03-12", que es lo que espera la base. */
function aISO(visible: string) {
  const m = visible.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mes, a] = m;
  if (+d < 1 || +d > 31 || +mes < 1 || +mes > 12) return null;
  return `${a}-${mes}-${d}`;
}

/** Va poniendo las barras a medida que se escribe. */
function formatearFecha(texto: string) {
  const n = texto.replace(/\D/g, '').slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
}

export default function EditarPerfilScreen({ navigation }: any) {
  const { me, actualizarMe } = useSession();

  const [nombre, setNombre]     = useState(me?.nombre ?? '');
  const [apellido, setApellido] = useState(me?.apellido ?? '');
  const [dni, setDni]           = useState(me?.dni ?? '');
  const [telefono, setTelefono] = useState(me?.telefono ?? '');
  const [email, setEmail]       = useState(me?.email ?? '');
  const [nacimiento, setNacimiento] = useState(aVisible(me?.fecha_nacimiento));

  const [cambiarPass, setCambiarPass] = useState(false);
  const [pass, setPass]     = useState('');
  const [pass2, setPass2]   = useState('');
  const [verPass, setVerPass] = useState(false);

  const [foto, setFoto] = useState<string | null>(me?.foto ?? null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sinDni = !me?.dni;

  async function cambiarFoto() {
    try {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos.');
        return;
      }
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (r.canceled || !r.assets?.[0]) return;

      setSubiendoFoto(true);
      const a = r.assets[0];
      const form = new FormData();
      form.append('foto', {
        uri: a.uri,
        name: a.fileName || 'perfil.jpg',
        type: a.mimeType || 'image/jpeg',
      } as any);

      const resp: any = await apiPerfil.subirFoto(form);
      const nueva = resp?.foto ?? resp?.archivo ?? null;
      if (nueva) {
        setFoto(nueva);
        actualizarMe({ foto: nueva });
      }
    } catch (e: any) {
      Alert.alert('No pudimos subirla', e?.message ?? 'Probá de nuevo.');
    } finally {
      setSubiendoFoto(false);
    }
  }

  async function guardar() {
    setError(null);

    // El backend pide todos estos sí o sí
    if (!nombre.trim() || !apellido.trim() || !dni.trim()
        || !telefono.trim() || !email.trim()) {
      setError('Completá todos los datos: el DNI y el teléfono también');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Revisá el email');
      return;
    }
    if (cambiarPass) {
      if (pass.length < 6) { setError('La contraseña necesita al menos 6 caracteres'); return; }
      if (pass !== pass2)  { setError('Las contraseñas no coinciden'); return; }
    }
    if (nacimiento && !aISO(nacimiento)) {
      setError('La fecha va como DD/MM/AAAA');
      return;
    }

    setGuardando(true);
    try {
      const datos: any = {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dni: dni.replace(/\D/g, ''),
        telefono: telefono.trim(),
        email: email.trim().toLowerCase(),
      };
      if (nacimiento) datos.fecha_nacimiento = aISO(nacimiento);
      if (cambiarPass) datos.password = pass;

      const r: any = await apiPerfil.editar(datos);

      actualizarMe({
        nombre: datos.nombre,
        apellido: datos.apellido,
        dni: datos.dni,
        telefono: datos.telefono,
        email: datos.email,
        fecha_nacimiento: datos.fecha_nacimiento ?? me?.fecha_nacimiento,
      });

      // Si al cargar el DNI aparecieron viajes, se lo decimos: es
      // el motivo por el que se le pide.
      const recuperados = Number(r?.viajes_recuperados ?? 0);
      if (recuperados > 0) {
        Alert.alert(
          '¡Encontramos tus viajes!',
          `Reconocimos ${recuperados} ${recuperados === 1 ? 'viaje' : 'viajes'} ` +
          `que hiciste con nosotros. Ya tenés ` +
          `${fmtPuntos(Number(r?.puntos_recuperados ?? 0))} puntos.`,
          [{ text: 'Buenísimo', onPress: () => navigation.goBack() }],
        );
      } else {
        Alert.alert('Listo', 'Guardamos tus datos.', [
          { text: 'Dale', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e: any) {
      setError(e?.message ?? 'No pudimos guardar los cambios');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.fondo}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Encabezado titulo="Editar perfil" onVolver={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled">
        {/* ── Foto ── */}
        <Pressable style={s.fotoCaja} onPress={cambiarFoto} disabled={subiendoFoto}>
          {foto ? (
            <Image source={{ uri: CONFIG.FOTOS + foto }} style={s.foto} />
          ) : (
            <View style={s.fotoVacia}>
              <Text style={s.iniciales}>
                {(nombre[0] ?? '') + (apellido[0] ?? '')}
              </Text>
            </View>
          )}
          <View style={s.fotoBoton}>
            {subiendoFoto
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="camera" size={15} color="#fff" />}
          </View>
        </Pressable>
        <Text style={s.fotoTxt}>Tocá para cambiar tu foto</Text>

        {/* ── Si no tiene DNI, el motivo primero ── */}
        {sinDni && (
          <View style={s.dniAviso}>
            <View style={s.dniCab}>
              <Ionicons name="auto-awesome" size={17} color={t.color.gold} />
              <Text style={s.dniTit}>¿Ya viajaste con nosotros?</Text>
            </View>
            <Text style={s.dniTxt}>
              Cargá tu DNI y sumamos automáticamente los puntos de tus viajes
              anteriores.
            </Text>
          </View>
        )}

        <Campo label="Nombre" valor={nombre} onChange={setNombre} editable={!guardando} />
        <Campo label="Apellido" valor={apellido} onChange={setApellido} editable={!guardando} />
        <Campo
          label="DNI"
          valor={dni}
          onChange={setDni}
          teclado="number-pad"
          placeholder="Sin puntos"
          destacado={sinDni}
          editable={!guardando}
        />
        <Campo
          label="Teléfono"
          valor={telefono}
          onChange={setTelefono}
          teclado="phone-pad"
          editable={!guardando}
        />
        <Campo
          label="Email"
          valor={email}
          onChange={setEmail}
          teclado="email-address"
          editable={!guardando}
        />
        <Campo
          label="Fecha de nacimiento"
          valor={nacimiento}
          onChange={(x) => setNacimiento(formatearFecha(x))}
          teclado="number-pad"
          placeholder="DD/MM/AAAA"
          ayuda="Te regalamos puntos en tu cumpleaños"
          editable={!guardando}
        />

        {/* ── Contraseña ── */}
        <Pressable style={s.passBtn} onPress={() => setCambiarPass(!cambiarPass)}>
          <Ionicons
            name={cambiarPass ? 'lock-open-outline' : 'lock-closed-outline'}
            size={18}
            color={t.color.teal}
          />
          <Text style={s.passBtnTxt}>
            {cambiarPass ? 'Dejar la contraseña como está' : 'Cambiar mi contraseña'}
          </Text>
        </Pressable>

        {cambiarPass && (
          <>
            <View style={s.campo}>
              <Text style={s.label}>Nueva contraseña</Text>
              <View style={s.inputFila}>
                <TextInput
                  style={[s.input, s.inputPass]}
                  value={pass}
                  onChangeText={setPass}
                  secureTextEntry={!verPass}
                  autoCapitalize="none"
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={t.color.textoSuave}
                  editable={!guardando}
                />
                <Pressable onPress={() => setVerPass(!verPass)} hitSlop={8} style={s.ojo}>
                  <Text style={s.ojoTxt}>{verPass ? 'Ocultar' : 'Ver'}</Text>
                </Pressable>
              </View>
            </View>
            <Campo
              label="Repetila"
              valor={pass2}
              onChange={setPass2}
              secreto={!verPass}
              editable={!guardando}
            />
          </>
        )}

        {error ? (
          <View style={s.error}>
            <Ionicons name="alert-circle-outline" size={18} color={t.color.error} />
            <Text style={s.errorTxt}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={[s.guardar, guardando && s.guardarApagado]}
          onPress={guardar}
          disabled={guardando}
        >
          {guardando
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.guardarTxt}>Guardar cambios</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Campo({
  label, valor, onChange, teclado, placeholder, ayuda, destacado, secreto, editable,
}: {
  label: string;
  valor: string;
  onChange: (x: string) => void;
  teclado?: any;
  placeholder?: string;
  ayuda?: string;
  destacado?: boolean;
  secreto?: boolean;
  editable?: boolean;
}) {
  return (
    <View style={s.campo}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, destacado && s.inputDestacado]}
        value={valor}
        onChangeText={onChange}
        keyboardType={teclado}
        placeholder={placeholder}
        placeholderTextColor={t.color.textoSuave}
        autoCapitalize={teclado === 'email-address' ? 'none' : 'words'}
        secureTextEntry={secreto}
        editable={editable}
      />
      {ayuda ? <Text style={s.ayuda}>{ayuda}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: t.color.fondo },
  contenido: { padding: t.espacio.xl, paddingTop: t.espacio.sm, paddingBottom: t.espacio.xxl },

  fotoCaja: { alignSelf: 'center', marginTop: t.espacio.md },
  foto: { width: 96, height: 96, borderRadius: 48 },
  fotoVacia: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: t.color.navy,
    alignItems: 'center', justifyContent: 'center',
  },
  iniciales: { ...t.texto.titulo, color: '#fff' },
  fotoBoton: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: t.color.teal,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: t.color.fondo,
  },
  fotoTxt: {
    ...t.texto.pie, color: t.color.textoSuave,
    textAlign: 'center', marginTop: t.espacio.sm, marginBottom: t.espacio.lg,
  },

  dniAviso: {
    backgroundColor: 'rgba(215,202,74,0.10)',
    borderRadius: t.radio.medio,
    borderWidth: 1, borderColor: 'rgba(215,202,74,0.35)',
    padding: t.espacio.lg,
    marginBottom: t.espacio.lg,
  },
  dniCab: { flexDirection: 'row', alignItems: 'center', gap: t.espacio.sm },
  dniTit: { ...t.texto.cuerpoFuerte, color: t.color.texto },
  dniTxt: { ...t.texto.chico, color: t.color.textoSuave, marginTop: t.espacio.xs },

  campo: { marginBottom: t.espacio.lg },
  label: { ...t.texto.pie, color: t.color.textoSuave, marginBottom: t.espacio.xs },
  input: {
    ...t.texto.cuerpo,
    color: t.color.texto,
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    borderWidth: 1.5, borderColor: 'transparent',
    paddingHorizontal: t.espacio.lg,
    paddingVertical: t.espacio.md,
  },
  inputDestacado: { borderColor: t.color.gold },
  inputFila: { position: 'relative', justifyContent: 'center' },
  inputPass: { paddingRight: 76 },
  ojo: { position: 'absolute', right: t.espacio.lg },
  ojoTxt: { ...t.texto.chicoFuerte, color: t.color.teal },
  ayuda: { ...t.texto.pie, color: t.color.textoSuave, marginTop: t.espacio.xs },

  passBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: t.espacio.sm, paddingVertical: t.espacio.md,
    marginBottom: t.espacio.md,
  },
  passBtnTxt: { ...t.texto.chicoFuerte, color: t.color.teal },

  error: {
    flexDirection: 'row', alignItems: 'center', gap: t.espacio.sm,
    backgroundColor: 'rgba(121,15,53,0.08)',
    borderRadius: t.radio.medio,
    padding: t.espacio.md,
    marginBottom: t.espacio.md,
  },
  errorTxt: { ...t.texto.chico, color: t.color.error, flex: 1 },

  guardar: {
    backgroundColor: t.color.teal,
    borderRadius: t.radio.medio,
    paddingVertical: t.espacio.lg,
    alignItems: 'center',
    marginTop: t.espacio.sm,
  },
  guardarApagado: { opacity: 0.6 },
  guardarTxt: { ...t.texto.cuerpoFuerte, color: '#fff' },
});
