// ══════════════════════════════════════════════════════
// NIVELES DE SOCIO
// Umbrales idénticos a los del app.js actual. No tocar sin
// cambiarlos también del lado web, o un socio ve un nivel
// distinto en la app que en la web.
// ══════════════════════════════════════════════════════

export type Tier = {
  nombre: string;
  min: number;
  max: number;
  color: string;
  beneficios: string[];
};

export const TIERS: Tier[] = [
  {
    nombre: 'Classic',
    min: 0,
    max: 0,
    color: '#5A7A85',
    beneficios: [
      'Bienvenida al Club Pasaje',
      'Acceso a tu panel de socio',
      'Empezá a sumar puntos en tu primer viaje',
    ],
  },
  {
    nombre: 'Select',
    min: 1,
    max: 499,
    color: '#B46428',
    beneficios: [
      'Descuentos en comercios adheridos',
      'Novedades y ofertas por mail',
      'Asistencia personalizada',
    ],
  },
  {
    nombre: 'Elite',
    min: 500,
    max: 999,
    color: '#5A7A85',
    beneficios: [
      'Todo lo de Select',
      'Prioridad en salidas grupales',
      'Beneficios ampliados en comercios',
    ],
  },
  {
    nombre: 'Infinite',
    min: 1000,
    max: Infinity,
    color: '#D7CA4A',
    beneficios: [
      'Todo lo de Elite',
      'Atención preferencial',
      'Acceso anticipado a promociones',
    ],
  },
];

export const getTier = (puntos: number): Tier =>
  TIERS.find((t) => puntos >= t.min && puntos <= t.max) ?? TIERS[0];

/** Puntos que faltan para el próximo nivel. null si ya está en el último. */
export function faltanParaSubir(puntos: number): { proximo: Tier; faltan: number } | null {
  const actual = getTier(puntos);
  const i = TIERS.indexOf(actual);
  if (i === TIERS.length - 1) return null;
  const proximo = TIERS[i + 1];
  return { proximo, faltan: proximo.min - puntos };
}

export const fmtPuntos = (n: number) => new Intl.NumberFormat('es-AR').format(n);
