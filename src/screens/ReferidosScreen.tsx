import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Share, Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { perfil } from '../api/endpoints';
import { fmtPuntos } from '../lib/tiers';
import Encabezado from '../components/Encabezado';
import { CONFIG } from '../config';
import { crearTema } from '../theme';

const t = crearTema();

export default function ReferidosScreen({ navigation }: any) {
  const [codigo, setCodigo] = useState('');
  const [lista, setLista] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [copiado, setCopiado] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const d: any = await perfil.referidos();
      setCodigo(d?.codigo ?? '');
      setLista(d?.referidos ?? []);
      setTotal(Number(d?.total ?? 0));
    } catch {}
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const enlace = `${CONFIG.HOST}/socios/?ref=${codigo}`;

  async function copiar() {
    await Clipboard.setStringAsync(codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function compartir() {
    try {
      await Share.share({
        message:
          `Sumate a Pasaje Club con mi código ${codigo} y empezá a juntar ` +
          `puntos en cada viaje: ${enlace}`,
      });
    } catch {}
  }

  if (cargando) {
    return (
      <View style={s.centro}>
        <ActivityIndicator color={t.color.teal} size="large" />
      </View>
    );
  }

  const ganados = lista.reduce(
    (a, r) => a + Number(r.puntos_otorgados || 0), 0,
  );

  return (
    <View style={s.fondo}>
      <Encabezado titulo="Referidos" onVolver={() => navigation.goBack()} />

      <FlatList
        data={lista}
        keyExtractor={(r, i) => String(r.id ?? i)}
        contentContainerStyle={s.contenido}
        ListHeaderComponent={
          <>
            <View style={s.caja}>
              <Text style={s.cajaLabel}>Tu código</Text>
              <Text style={s.codigo}>{codigo || '—'}</Text>

              <View style={s.botones}>
                <Pressable style={s.btnBorde} onPress={copiar}>
                  <Ionicons
                    name={copiado ? 'checkmark' : 'copy-outline'}
                    size={18}
                    color={t.color.teal}
                  />
                  <Text style={s.btnBordeTexto}>
                    {copiado ? 'Copiado' : 'Copiar'}
                  </Text>
                </Pressable>
                <Pressable style={s.btnTeal} onPress={compartir}>
                  <Ionicons name="share-social-outline" size={18} color="#fff" />
                  <Text style={s.btnTealTexto}>Compartir</Text>
                </Pressable>
              </View>
            </View>

            <View style={s.stats}>
              <Stat n={String(total || lista.length)} label="invitados" />
              <Stat n={fmtPuntos(ganados)} label="puntos ganados" />
            </View>

            <Text style={s.comoTitulo}>Cómo funciona</Text>
            <Text style={s.comoTexto}>
              Compartí tu código. Cuando quien se registre con él haga su primer
              viaje, los dos suman puntos.
            </Text>

            {lista.length > 0 && <Text style={s.seccion}>Tus invitados</Text>}
          </>
        }
        renderItem={({ item }) => {
          const listo = String(item.estado).toLowerCase() === 'completado';
          return (
            <View style={s.fila}>
              <Ionicons
                name={listo ? 'checkmark-circle' : 'time-outline'}
                size={20}
                color={listo ? t.color.teal : t.color.textoSuave}
              />
              <View style={s.filaTexto}>
                <Text style={s.filaNombre} numberOfLines={1}>
                  {item.nombre
                    ? `${item.nombre} ${item.apellido ?? ''}`.trim()
                    : 'Invitado'}
                </Text>
                <Text style={s.filaEstado}>
                  {listo ? 'Ya viajó' : 'Todavía no viajó'}
                </Text>
              </View>
              {Number(item.puntos_otorgados) > 0 && (
                <Text style={s.filaPuntos}>
                  +{fmtPuntos(Number(item.puntos_otorgados))}
                </Text>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statN}>{n}</Text>
      <Text style={s.statL}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: t.color.fondo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.color.fondo },
  contenido: { padding: t.espacio.xl, paddingTop: t.espacio.sm },
  caja: {
    backgroundColor: t.color.navy,
    borderRadius: t.radio.grande,
    padding: t.espacio.xl,
    alignItems: 'center',
  },
  cajaLabel: { ...t.texto.chico, color: 'rgba(255,255,255,0.7)' },
  codigo: { ...t.texto.cifra, color: t.color.teal, letterSpacing: 2, marginTop: t.espacio.xs },
  botones: { flexDirection: 'row', gap: t.espacio.md, marginTop: t.espacio.lg, alignSelf: 'stretch' },
  btnBorde: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: t.espacio.sm, paddingVertical: t.espacio.md,
    borderRadius: t.radio.medio, borderWidth: 1.5, borderColor: t.color.teal,
  },
  btnBordeTexto: { ...t.texto.chicoFuerte, color: t.color.teal },
  btnTeal: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: t.espacio.sm, paddingVertical: t.espacio.md,
    borderRadius: t.radio.medio, backgroundColor: t.color.teal,
  },
  btnTealTexto: { ...t.texto.chicoFuerte, color: '#fff' },

  stats: { flexDirection: 'row', gap: t.espacio.md, marginTop: t.espacio.lg },
  stat: {
    flex: 1, backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio, padding: t.espacio.lg, alignItems: 'center',
  },
  statN: { ...t.texto.titulo, color: t.color.texto },
  statL: { ...t.texto.pie, color: t.color.textoSuave },

  comoTitulo: { ...t.texto.chicoFuerte, color: t.color.textoSuave, marginTop: t.espacio.xl },
  comoTexto: { ...t.texto.chico, color: t.color.textoSuave, marginTop: t.espacio.xs },
  seccion: {
    ...t.texto.chicoFuerte, color: t.color.textoSuave,
    marginTop: t.espacio.xl, marginBottom: t.espacio.sm,
  },
  fila: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    padding: t.espacio.lg,
    marginBottom: t.espacio.sm,
  },
  filaTexto: { flex: 1, marginLeft: t.espacio.md },
  filaNombre: { ...t.texto.cuerpoFuerte, color: t.color.texto },
  filaEstado: { ...t.texto.pie, color: t.color.textoSuave },
  filaPuntos: { ...t.texto.cuerpoFuerte, color: t.color.teal },
});
