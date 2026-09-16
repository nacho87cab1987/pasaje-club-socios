import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { beneficios as apiBeneficios, viajes as apiViajes } from '../api/endpoints';
import { useSession } from '../store/SessionContext';
import { TIERS, getTier, fmtPuntos } from '../lib/tiers';
import { crearTema } from '../theme';

const t = crearTema();

type Beneficio = {
  id: number;
  titulo: string;
  descripcion?: string | null;
  comercio_nombre?: string | null;
  puntos_minimos?: number | null;
};

export default function BeneficiosScreen() {
  const { me } = useSession();
  const [lista, setLista] = useState<Beneficio[]>([]);
  const [puntos, setPuntos] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [b, v] = await Promise.all([
        apiBeneficios.listar(),
        apiViajes.listar(),
      ]);
      setLista((b as any).beneficios ?? []);
      const mios = ((v as any).viajes ?? []).filter(
        (x: any) => !x.usuario_id || String(x.usuario_id) === String(me?.id),
      );
      const total = mios.reduce((s: number, x: any) => s + Number(x.puntos || 0), 0);
      setPuntos(Math.max(0, total - Number((v as any).puntos_usados || 0)));
    } catch {
      // La pantalla sigue siendo útil mostrando la escalera de niveles.
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [me?.id]);

  useEffect(() => { cargar(); }, [cargar]);

  const miTier = getTier(puntos);

  if (cargando) {
    return (
      <View style={s.centro}>
        <ActivityIndicator color={t.color.teal} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.fondo} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.contenido}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => { setRefrescando(true); cargar(); }}
            tintColor={t.color.teal}
          />
        }
      >
        <Text style={s.titulo}>Beneficios</Text>

        {lista.length > 0 && (
          <>
            <Text style={s.seccion}>En comercios adheridos</Text>
            {lista.map((b) => {
              const alcanza = puntos >= Number(b.puntos_minimos ?? 0);
              return (
                <View key={b.id} style={[s.tarjeta, !alcanza && s.apagada]}>
                  <Text style={s.benTitulo}>{b.titulo}</Text>
                  {b.comercio_nombre && (
                    <Text style={s.comercio}>{b.comercio_nombre}</Text>
                  )}
                  {b.descripcion && <Text style={s.desc}>{b.descripcion}</Text>}
                  {!alcanza && (
                    <Text style={s.bloqueado}>
                      Necesitás {fmtPuntos(Number(b.puntos_minimos))} puntos
                    </Text>
                  )}
                </View>
              );
            })}
          </>
        )}

        <Text style={s.seccion}>Tu nivel</Text>
        {TIERS.map((tier) => {
          const alcanzado = puntos >= tier.min;
          const esElMio = tier.nombre === miTier.nombre;
          return (
            <View
              key={tier.nombre}
              style={[
                s.tarjeta,
                esElMio && { borderWidth: 2, borderColor: tier.color },
                !alcanzado && s.apagada,
              ]}
            >
              <View style={s.fila}>
                <Text style={s.benTitulo}>{tier.nombre}</Text>
                {esElMio && <Text style={[s.marca, { color: tier.color }]}>Tu nivel</Text>}
              </View>
              <Text style={s.rango}>
                {fmtPuntos(tier.min)}
                {tier.max === Infinity ? ' o más' : ` a ${fmtPuntos(tier.max)}`} puntos
              </Text>
              {tier.beneficios.map((p) => (
                <Text key={p} style={s.perk}>· {p}</Text>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: t.color.fondo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.color.fondo },
  contenido: { padding: t.espacio.xl },
  titulo: { ...t.texto.titulo, color: t.color.texto },
  seccion: {
    ...t.texto.chicoFuerte,
    color: t.color.textoSuave,
    
    marginTop: t.espacio.xl,
    marginBottom: t.espacio.sm,
  },
  tarjeta: {
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    padding: t.espacio.lg,
    marginBottom: t.espacio.md,
  },
  apagada: { opacity: 0.5 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  benTitulo: { ...t.texto.seccion, color: t.color.texto },
  marca: { ...t.texto.pie },
  comercio: { ...t.texto.chico, color: t.color.teal, marginTop: t.espacio.xs },
  desc: { ...t.texto.chico, color: t.color.textoSuave, marginTop: t.espacio.sm },
  bloqueado: { ...t.texto.pie, color: t.color.textoSuave, marginTop: t.espacio.sm },
  rango: { ...t.texto.chico, color: t.color.textoSuave, marginTop: t.espacio.xs },
  perk: { ...t.texto.chico, color: t.color.texto, marginTop: t.espacio.xs },
});
