import './global.css'
import React, { useEffect, useRef } from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import * as Notifications from 'expo-notifications'

import RootNavigator from './src/navigation/RootNavigator'
import { useAuthStore } from './src/store/authStore'
import {
  asyncStoragePersister,
  createPersistableQueryClient,
  persistOptions,
} from './src/lib/queryPersister'
import { ErrorBoundary, ToastProvider } from './src/components'
import {
  addNotificationResponseListener,
  addNotificationReceivedListener,
} from './src/services/notificationService'

// Create a single instance of the query client
const queryClient = createPersistableQueryClient()

function AppContent() {
  const { initialize } = useAuthStore()
  const notificationListener = useRef<Notifications.EventSubscription>()
  const responseListener = useRef<Notifications.EventSubscription>()

  useEffect(() => {
    initialize()

    // Set up notification listeners
    notificationListener.current = addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification)
      }
    )

    responseListener.current = addNotificationResponseListener((response) => {
      console.log('Notification response:', response)
      // Handle notification tap - navigate to specific screen if needed
      const data = response.notification.request.content.data
      if (data?.screen) {
        // Navigation handling can be added here
        console.log('Navigate to:', data.screen)
      }
    })

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current)
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current)
      }
    }
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
