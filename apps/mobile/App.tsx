import React from 'react';
import { StatusBar } from 'expo-status-bar';

// Initialize Supabase (must be imported before using stores)
import './src/lib/supabase-init';

// Navigation
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <>
      <RootNavigator />
      <StatusBar style="auto" />
    </>
  );
}
