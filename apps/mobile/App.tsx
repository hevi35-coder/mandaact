import './global.css'
import React, { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'

import RootNavigator from './src/navigation/RootNavigator'
import { useAuthStore } from './src/store/authStore'
import {
  asyncStoragePersister,
  createPersistableQueryClient,
  persistOptions,
} from './src/lib/queryPersister'
import { ErrorBoundary, ToastProvider } from './src/components'

// Create a single instance of the query client
const queryClient = createPersistableQueryClient()

function AppContent() {
  const { initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  return <RootNavigator />
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
              persister: asyncStoragePersister,
              maxAge: persistOptions.maxAge,
              buster: persistOptions.buster,
            }}
          >
            <ToastProvider>
              <StatusBar style="auto" />
              <AppContent />
            </ToastProvider>
          </PersistQueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
