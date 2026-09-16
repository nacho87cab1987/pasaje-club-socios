import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PerfilScreen from '../screens/PerfilScreen';
import EditarPerfilScreen from '../screens/EditarPerfilScreen';
import PuntosScreen from '../screens/PuntosScreen';
import WishlistScreen from '../screens/WishlistScreen';
import GrupalesScreen from '../screens/GrupalesScreen';
import ChatScreen from '../screens/ChatScreen';
import ReferidosScreen from '../screens/ReferidosScreen';
import AvisosScreen from '../screens/AvisosScreen';

const Stack = createNativeStackNavigator();

/** Perfil y las seis secciones que no entran en la tab bar. */
export default function PerfilStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PerfilInicio" component={PerfilScreen} />
      <Stack.Screen name="EditarPerfil" component={EditarPerfilScreen} />
      <Stack.Screen name="Puntos" component={PuntosScreen} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} />
      <Stack.Screen name="Grupales" component={GrupalesScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Referidos" component={ReferidosScreen} />
      <Stack.Screen name="Avisos" component={AvisosScreen} />
    </Stack.Navigator>
  );
}
