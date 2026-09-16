// ══════════════════════════════════════════════════════
// THEME
// Los colores base vienen de CONFIG.BRAND (remoto), no de
// acá, para que la app sea white-label sin tocar código.
// Este archivo define la ESCALA: jerarquía, tamaños, pesos.
// ══════════════════════════════════════════════════════

import { BRAND_FALLBACK, type Brand } from '../config';

export function crearTema(brand: Brand = BRAND_FALLBACK) {
  const c = brand.colores;
  return {
    color: {
      ...c,
      fondo: c.cream,
      superficie: '#FFFFFF',
      texto: c.navy,
      textoSuave: '#5A7A85',
      borde: 'rgba(7,45,64,0.12)',
      exito: c.teal,
      alerta: c.gold,
      error: c.bordo,
    },

    /**
     * Baloo 2 para números y títulos (tiene el peso que necesitan
     * los puntos y los precios). Poppins para todo lo que se lee.
     */
    fuente: {
      cifra: 'Baloo2_800ExtraBold',
      titulo: 'Baloo2_700Bold',
      tituloMedio: 'Baloo2_600SemiBold',
      cuerpo: 'Poppins_400Regular',
      cuerpoMedio: 'Poppins_500Medium',
      cuerpoFuerte: 'Poppins_600SemiBold',
      cuerpoBold: 'Poppins_700Bold',
    },

    /**
     * Escala tipográfica, con la familia ya incluida.
     *
     * Importante: con fuentes personalizadas, fontWeight NO se
     * aplica: hay que elegir la variante correcta de la familia.
     * Por eso cada estilo trae su fontFamily.
     */
    texto: {
      // Números grandes: puntos, saldos
      cifra:   { fontFamily: 'Baloo2_800ExtraBold', fontSize: 34, lineHeight: 42 },
      titulo:  { fontFamily: 'Baloo2_700Bold',      fontSize: 22, lineHeight: 30 },
      seccion: { fontFamily: 'Baloo2_600SemiBold',  fontSize: 17, lineHeight: 24 },

      // Texto que se lee
      cuerpo:  { fontFamily: 'Poppins_400Regular',  fontSize: 15, lineHeight: 22 },
      cuerpoFuerte: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, lineHeight: 22 },
      chico:   { fontFamily: 'Poppins_400Regular',  fontSize: 13, lineHeight: 19 },
      chicoFuerte: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, lineHeight: 19 },
      pie:     { fontFamily: 'Poppins_500Medium',   fontSize: 11, lineHeight: 16 },
    },

    /** Múltiplos de 4. */
    espacio: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },

    radio: { chico: 10, medio: 16, grande: 24, pastilla: 999 },
  };
}

export type Tema = ReturnType<typeof crearTema>;
