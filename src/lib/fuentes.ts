// ══════════════════════════════════════════════════════
// FUENTES
// Baloo 2 para números y títulos, Poppins para el resto.
// Se cargan una vez al arrancar; hasta que terminan, la app
// muestra el splash en vez de un parpadeo de tipografía.
// ══════════════════════════════════════════════════════

import { useFonts } from 'expo-font';
import {
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
} from '@expo-google-fonts/baloo-2';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

export function useFuentes() {
  const [listas, error] = useFonts({
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Si las fuentes fallan, la app arranca igual con las del
  // sistema. Se ve peor, pero es mejor que una pantalla negra.
  return listas || !!error;
}
