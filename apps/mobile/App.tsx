import './global.css'
import React, { useEffect, useRef, useCallback, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import * as Notifications from 'expo-notifications'
import * as Font from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { View } from 'react-native'

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
import { initSentry, logger, trackAppOpened } from './src/lib'
import { initI18n } from './src/i18n'

// Initialize Sentry and PostHog on app load
initSentry().then(() => {
  // Track app opened event
  trackAppOpened()
})

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync()

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
        logger.debug('Notification received', { notification })
      }
    )

    responseListener.current = addNotificationResponseListener((response) => {
      logger.debug('Notification response', { response })
      // Handle notification tap - navigate to specific screen if needed
      const data = response.notification.request.content.data
      if (data?.screen) {
        // Navigation handling can be added here
        logger.debug('Navigate to', { screen: data.screen })
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
  const [fontsLoaded, setFontsLoaded] = useState(false)
  const [i18nReady, setI18nReady] = useState(false)

  // Load fonts and i18n on app start
  useEffect(() => {
    async function loadResources() {
      try {
        // Load fonts and i18n in parallel
        await Promise.all([
          Font.loadAsync({
            'Pretendard-Regular': require('./assets/fonts/Pretendard-Regular.otf'),
            'Pretendard-Medium': require('./assets/fonts/Pretendard-Medium.otf'),
            'Pretendard-SemiBold': require('./assets/fonts/Pretendard-SemiBold.otf'),
            'Pretendard-Bold': require('./assets/fonts/Pretendard-Bold.otf'),
          }),
          initI18n(),
        ])
        setFontsLoaded(true)
        setI18nReady(true)
      } catch (error) {
        logger.error('Error loading resources', error)
        // Continue even if some resources fail
        setFontsLoaded(true)
        setI18nReady(true)
      }
    }
    loadResources()
  }, [])

  // Hide splash screen when resources are loaded
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && i18nReady) {
      await SplashScreen.hideAsync()
    }
  }, [fontsLoaded, i18nReady])

  if (!fontsLoaded || !i18nReady) {
    return null
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
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
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
