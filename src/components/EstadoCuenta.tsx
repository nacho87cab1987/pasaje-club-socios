import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { viajes as apiViajes } from '../api/endpoints';
import { CONFIG } from '../config';
import { crearTema } from '../theme';

const t = crearTema();

const plata = (n: number, moneda: string) =>
  `${moneda === 'ARS' ? '$' : 'USD'} ${new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(n)}`;

const fmtFecha = (f?: string | null) => {
  if (!f) return '';
  const d = new Date(String(f).replace(' ', 'T'));
  return isNaN(+d) ? '' : d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * Estado de cuenta del viaje. Solo lectura.
 *
 * El socio ve cuánto pagó y cuánto falta, pero no informa pagos
 * desde acá: eso sigue entrando por la vendedora, que es quien
 * valida el comprobante antes de cargarlo.
 */
export default function EstadoCuenta({ viajeId }: { viajeId: number }) {
  const [cuenta, setCuenta] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const d: any = await apiViajes.cuenta(viajeId);
      setCuenta(d?.tiene_cuenta ? d : null);
    } catch {
      setCuenta(null);
    } finally {
      setCargando(false);
    }
  }, [viajeId]);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) {
    return (
      <View style={s.cargando}>
        <ActivityIndicator color={t.color.teal} />
      </View>
    );
  }

  // Sin expediente asociado no hay nada que mostrar.
  if (!cuenta) return null;

  const moneda = cuenta.moneda ?? 'USD';
  const pct = Math.min(100, Number(cuenta.porcentaje || 0));

  return (
    <>
      <Text style={s.seccion}>Estado de cuenta</Text>

      <View style={s.caja}>
        {cuenta.cancelado ? (
          <View style={s.cancelado}>
            <Ionicons name="checkmark-circle" size={22} color={t.color.teal} />
            <Text style={s.canceladoTxt}>Viaje pago por completo</Text>
          </View>
        ) : (
          <>
            <Text style={s.saldoLabel}>Te falta pagar</Text>
            <Text style={s.saldo}>{plata(Number(cuenta.saldo), moneda)}</Text>
          </>
        )}

        {/* Barra de avance: el número solo no da idea de cuánto falta */}
        <View style={s.barra}>
          <View style={[s.barraLlena, { width: `${pct}%` }]} />
        </View>
        <View style={s.barraPie}>
          <Text style={s.barraTxt}>
            Pagaste {plata(Number(cuenta.pagado), moneda)}
          </Text>
          <Text style={s.barraTxt}>
            de {plata(Number(cuenta.total), moneda)}
          </Text>
        </View>

        {Number(cuenta.en_revision) > 0 && (
          <View style={s.revision}>
            <Ionicons name="time-outline" size={16} color={t.color.gold} />
            <Text style={s.revisionTxt}>
              {plata(Number(cuenta.en_revision), moneda)} en revisión
            </Text>
          </View>
        )}

        {!cuenta.cancelado && (
          <Text style={s.aclaracion}>
            Para pagar o coordinar, escribile a tu asesora.
          </Text>
        )}
      </View>

      {/* ── Movimientos ── */}
      {cuenta.pagos?.length > 0 && (
        <View style={s.bloque}>
          {cuenta.pagos.map((p: any, i: number) => {
            const aprobado = p.estado === 'aprobado';
            return (
              <Pressable
                key={p.id}
                style={[s.pago, i > 0 && s.pagoBorde]}
                disabled={!p.comprobante}
                onPress={() => {
                  const url = String(p.comprobante).startsWith('http')
                    ? p.comprobante
                    : CONFIG.HOST + p.comprobante;
                  Linking.openURL(url).catch(() => {});
                }}
              >
                <Ionicons
                  name={aprobado ? 'checkmark-circle' : 'time-outline'}
                  size={18}
                  color={aprobado ? t.color.teal : t.color.gold}
                />
                <View style={s.pagoTexto}>
                  <Text style={s.pagoMonto}>{plata(Number(p.monto), p.moneda || moneda)}</Text>
                  <Text style={s.pagoDetalle}>
                    {fmtFecha(p.fecha)}
                    {p.metodo ? ` · ${p.metodo}` : ''}
                    {aprobado ? '' : ' · en revisión'}
                  </Text>
                </View>
                {p.comprobante ? (
                  <Ionicons name="chevron-forward" size={18} color={t.color.borde} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}

    </>
  );
}

const s = StyleSheet.create({
  cargando: { paddingVertical: t.espacio.xl, alignItems: 'center' },
  seccion: {
    ...t.texto.chicoFuerte, color: t.color.textoSuave,
    marginTop: t.espacio.xl, marginBottom: t.espacio.sm,
  },
  caja: {
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    padding: t.espacio.xl,
  },
  saldoLabel: { ...t.texto.chico, color: t.color.textoSuave },
  saldo: { ...t.texto.cifra, color: t.color.texto, marginTop: t.espacio.xs },
  cancelado: { flexDirection: 'row', alignItems: 'center', gap: t.espacio.sm },
  canceladoTxt: { ...t.texto.seccion, color: t.color.teal },

  barra: {
    height: 8, borderRadius: 4,
    backgroundColor: 'rgba(7,45,64,0.08)',
    marginTop: t.espacio.lg,
    overflow: 'hidden',
  },
  barraLlena: { height: 8, borderRadius: 4, backgroundColor: t.color.teal },
  barraPie: { flexDirection: 'row', justifyContent: 'space-between', marginTop: t.espacio.sm },
  barraTxt: { ...t.texto.pie, color: t.color.textoSuave },

  revision: {
    flexDirection: 'row', alignItems: 'center', gap: t.espacio.sm,
    marginTop: t.espacio.md,
  },
  revisionTxt: { ...t.texto.chico, color: t.color.gold },
  aclaracion: {
    ...t.texto.pie, color: t.color.textoSuave,
    marginTop: t.espacio.lg, textAlign: 'center',
  },


  bloque: {
    backgroundColor: t.color.superficie,
    borderRadius: t.radio.medio,
    paddingHorizontal: t.espacio.lg,
    marginTop: t.espacio.md,
  },
  pago: { flexDirection: 'row', alignItems: 'center', paddingVertical: t.espacio.lg },
  pagoBorde: { borderTopWidth: 1, borderTopColor: t.color.borde },
  pagoTexto: { flex: 1, marginLeft: t.espacio.md },
  pagoMonto: { ...t.texto.cuerpoFuerte, color: t.color.texto },
  pagoDetalle: { ...t.texto.pie, color: t.color.textoSuave },

});
