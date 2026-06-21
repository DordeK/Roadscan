import 'react-native-get-random-values'; // Must be the very first import (UUID polyfill)
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import './src/services/location';
import { requestNotificationPermissions } from './src/services/notifications';

import AppNavigator from './src/navigation';

export default function App() {
  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: '#2196F3',
            background: '#0F0F0F',
            card: '#0F0F0F',
            text: '#FFFFFF',
            border: '#1E1E1E',
            notification: '#2196F3',
          },
        }}
      >
        <StatusBar style="light" backgroundColor="#0F0F0F" />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
