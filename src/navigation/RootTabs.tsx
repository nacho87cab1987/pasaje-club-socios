import React, { useCallback, useRef } from 'react';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import ViajesScreen from '../screens/ViajesScreen';
import ViajeDetalleScreen from '../screens/ViajeDetalleScreen';
import TarjetaScreen from '../screens/TarjetaScreen';
import BeneficiosScreen from '../screens/BeneficiosScreen';
import PerfilStack from './PerfilStack';
import { usePush, type DestinoPush } from '../lib/push';
import { crearTema } from '../theme';

const t = crearTema();
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/** Referencia global para poder navegar desde una notificación. */
export const navRef = createNavigationContainerRef<any>();

const ICONOS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Inicio: ['home', 'home-outline'],
  Viajes: ['airplane', 'airplane-outline'],
  Tarjeta: ['card', 'card-outline'],
  Beneficios: ['gift', 'gift-outline'],
  Perfil: ['person', 'person-outline'],
};

// Mis viajes tiene su propio stack: lista → detalle
function ViajesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ViajesLista" component={ViajesScreen} />
      <Stack.Screen name="ViajeDetalle" component={ViajeDetalleScreen} />
    </Stack.Navigator>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: t.color.teal,
        tabBarInactiveTintColor: t.color.textoSuave,
        tabBarStyle: {
          backgroundColor: t.color.superficie,
          borderTopColor: t.color.borde,
          height: 84,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
        tabBarIcon: ({ focused, color, size }) => {
          const par = ICONOS[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={focused ? par[0] : par[1]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Viajes" component={ViajesStack} options={{ title: 'Mis viajes' }} />
      <Tab.Screen name="Tarjeta" component={TarjetaScreen} />
      <Tab.Screen name="Beneficios" component={BeneficiosScreen} />
      <Tab.Screen name="Perfil" component={PerfilStack} />
    </Tab.Navigator>
  );
}

export default function RootTabs() {
  const pendiente = useRef<DestinoPush | null>(null);

  /**
   * Lleva a la pantalla que corresponde a la notificación.
   * Si la navegación todavía no está lista (caso típico cuando
   * la app se abre desde cero), guarda el destino y lo aplica
   * apenas monta.
   */
  const irA = useCallback((destino: DestinoPush) => {
    if (!navRef.isReady()) {
      pendiente.current = destino;
      return;
    }
    switch (destino.tipo) {
      case 'viaje':
        navRef.navigate('Viajes', {
          screen: destino.id ? 'ViajeDetalle' : 'ViajesLista',
          params: destino.id ? { viajeId: destino.id } : undefined,
        });
        break;
      case 'beneficio':
        navRef.navigate('Beneficios');
        break;
      case 'chat':
        navRef.navigate('Perfil', { screen: 'Chat' });
        break;
      case 'aviso':
        navRef.navigate('Perfil', { screen: 'Avisos' });
        break;
      case 'puntos':
        navRef.navigate('Perfil', { screen: 'Puntos' });
        break;
      default:
        navRef.navigate('Inicio');
        break;
    }
  }, []);

  usePush(true, irA);

  return (
    <NavigationContainer
      ref={navRef}
      onReady={() => {
        if (pendiente.current) {
          const d = pendiente.current;
          pendiente.current = null;
          setTimeout(() => irA(d), 0);
        }
      }}
    >
      <Tabs />
    </NavigationContainer>
  );
}
