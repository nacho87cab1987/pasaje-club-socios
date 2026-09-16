import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from './src/store/SessionContext';
import LoginScreen from './src/screens/LoginScreen';
import RootTabs from './src/navigation/RootTabs';
import Bienvenida from './src/components/Bienvenida';
import { useFuentes } from './src/lib/fuentes';
import { crearTema } from './src/theme';

const t = crearTema();

function Puerta() {
  const { me } = useSession();

  // undefined = todavía leyendo SecureStore. No se muestra nada: la
  // animación de bienvenida está tapando por encima.
  if (me === undefined) return <View style={s.fondoNavy} />;

  return me === null ? <LoginScreen /> : <RootTabs />;
}

export default function App() {
  const [mostrarLogo, setMostrarLogo] = useState(true);
  const fuentesListas = useFuentes();

  return (
    <SafeAreaProvider>
      {/* Navy mientras se ve el logo y el login; al entrar la app queda
          sobre fondo claro, pero para entonces el navy de arriba ya se fue. */}
      <StatusBar style="light" />

      {/* La app se monta debajo mientras corre la animación: para cuando
          el logo se va, la sesión ya se verificó y la pantalla está lista.
          Si se mostrara una cosa después de la otra, la espera se sumaría
          en vez de aprovecharse. Lo mismo con las fuentes. */}
      <View style={{ flex: 1 }}>
        {fuentesListas ? (
          <SessionProvider>
            <Puerta />
          </SessionProvider>
        ) : (
          <View style={s.fondoNavy} />
        )}

        {mostrarLogo || !fuentesListas ? (
          <Bienvenida onTerminar={() => setMostrarLogo(false)} />
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  fondoNavy: { flex: 1, backgroundColor: t.color.navy },
});
