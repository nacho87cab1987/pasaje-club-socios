import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { chat as apiChat } from '../api/endpoints';
import Encabezado from '../components/Encabezado';
import { crearTema } from '../theme';

const t = crearTema();

const hora = (f: string) => {
  const d = new Date(String(f).replace(' ', 'T'));
  return isNaN(+d) ? '' : d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

export default function ChatScreen({ navigation }: any) {
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const lista = useRef<FlatList>(null);

  const cargar = useCallback(async (silencioso = false) => {
    try {
      const d: any = await apiChat.conversacion();
      setMensajes(d?.mensajes ?? []);
    } catch {
      if (!silencioso) setMensajes([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    // Refresco suave mientras la pantalla está abierta.
    const id = setInterval(() => cargar(true), 20000);
    return () => clearInterval(id);
  }, [cargar]);

  async function enviar() {
    const msg = texto.trim();
    if (!msg || enviando) return;

    setEnviando(true);
    setTexto('');

    // Se muestra al toque, sin esperar al servidor.
    const provisorio = {
      id: 'tmp' + Date.now(),
      texto: msg,
      de_admin: 0,
      creado_el: new Date().toISOString(),
      _enviando: true,
    };
    setMensajes((m) => [...m, provisorio]);

    try {
      await apiChat.enviar(msg);
      await cargar(true);
    } catch {
      setMensajes((m) =>
        m.map((x) => (x.id === provisorio.id ? { ...x, _enviando: false, _falló: true } : x)),
      );
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <View style={s.centro}>
        <ActivityIndicator color={t.color.teal} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.fondo}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <Encabezado titulo="Chat con la agencia" onVolver={() => navigation.goBack()} />

      <FlatList
        ref={lista}
        data={mensajes}
        keyExtractor={(m, i) => String(m.id ?? i)}
        contentContainerStyle={s.contenido}
        onContentSizeChange={() => lista.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const deEllos = Number(item.de_admin) === 1;
          return (
            <View style={[s.burbuja, deEllos ? s.deEllos : s.deMi]}>
              <Text style={[s.mensaje, deEllos ? s.textoEllos : s.textoMi]}>
                {item.texto || item.mensaje}
              </Text>
              <Text style={[s.hora, deEllos ? s.horaEllos : s.horaMi]}>
                {item._falló ? 'No se envió' : item._enviando ? 'Enviando…' : hora(item.creado_el)}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s.vacioCaja}>
            <Text style={s.vacioTitulo}>Escribinos</Text>
            <Text style={s.vacioTexto}>
              Preguntanos lo que necesites sobre tu viaje, tus puntos o una idea
              que tengas en mente.
            </Text>
          </View>
        }
      />

      <View style={s.barraEnvio}>
        <TextInput
          style={s.input}
          value={texto}
          onChangeText={setTexto}
          placeholder="Escribí tu mensaje"
          placeholderTextColor={t.color.textoSuave}
          multiline
          maxLength={1000}
        />
        <Pressable
          style={[s.enviar, !texto.trim() && s.enviarApagado]}
          onPress={enviar}
          disabled={!texto.trim() || enviando}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: t.color.fondo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.color.fondo },
  contenido: { padding: t.espacio.lg, paddingBottom: t.espacio.xl },
  burbuja: {
    maxWidth: '80%',
    borderRadius: t.radio.medio,
    paddingHorizontal: t.espacio.lg,
    paddingVertical: t.espacio.md,
    marginBottom: t.espacio.sm,
  },
  deMi: { alignSelf: 'flex-end', backgroundColor: t.color.teal, borderBottomRightRadius: 4 },
  deEllos: { alignSelf: 'flex-start', backgroundColor: t.color.superficie, borderBottomLeftRadius: 4 },
  mensaje: { ...t.texto.cuerpo },
  textoMi: { color: '#fff' },
  textoEllos: { color: t.color.texto },
  hora: { ...t.texto.pie, marginTop: t.espacio.xs },
  horaMi: { color: 'rgba(255,255,255,0.75)', textAlign: 'right' },
  horaEllos: { color: t.color.textoSuave },

  barraEnvio: {
    flexDirection: 'row', alignItems: 'flex-end', gap: t.espacio.sm,
    padding: t.espacio.md,
    borderTopWidth: 1, borderTopColor: t.color.borde,
    backgroundColor: t.color.superficie,
  },
  input: {
    ...t.texto.cuerpo,
    flex: 1, maxHeight: 110,
    color: t.color.texto,
    backgroundColor: t.color.fondo,
    borderRadius: t.radio.medio,
    paddingHorizontal: t.espacio.lg,
    paddingVertical: t.espacio.md,
  },
  enviar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: t.color.teal,
    alignItems: 'center', justifyContent: 'center',
  },
  enviarApagado: { opacity: 0.4 },

  vacioCaja: { padding: t.espacio.xl, alignItems: 'center' },
  vacioTitulo: { ...t.texto.seccion, color: t.color.texto, marginBottom: t.espacio.sm },
  vacioTexto: { ...t.texto.cuerpo, color: t.color.textoSuave, textAlign: 'center' },
});
