import './global.css'
import React, { useEffect, useRef, useCallback, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { NavigationContainer } from '@react-navigation/native'
import { navigationRef } from './src/navigation/navigationRef'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import * as Notifications from 'expo-notifications'
import * as Font from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { Platform, View } from 'react-native'
import mobileAds from 'react-native-google-mobile-ads'
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency'

import RootNavigator from './src/navigation/RootNavigator'
import { useAuthStore } from './src/store/authStore'
import {
  asyncStoragePersister,
  createPersistableQueryClient,
  persistOptions,
} from './src/lib/queryPersister'
import { ErrorBoundary, ToastProvider } from './src/components'
import { SubscriptionProvider } from './src/context'
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

// Request ATT permission (iOS only) and then initialize AdMob
// Called from AppContent useEffect to ensure proper timing
async function initializeAds() {
  try {
    // Request ATT permission on iOS 14.5+
    // This must be called after the app UI is visible for the popup to show
    if (Platform.OS === 'ios') {
      const { status } = await requestTrackingPermissionsAsync()
      console.log('[ATT] Tracking permission status:', status)
    }

    // Initialize Google Mobile Ads SDK after ATT prompt
    const adapterStatuses = await mobileAds().initialize()
    console.log('[AdMob] SDK initialized successfully', adapterStatuses)
  } catch (error) {
    console.warn('[AdMob] Initialization error:', error)
  }
}

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync()

// Create a single instance of the query client
const queryClient = createPersistableQueryClient()

function AppContent() {
  const { initialize } = useAuthStore()
  const notificationListener = useRef<Notifications.EventSubscription>()
  const responseListener = useRef<Notifications.EventSubscription>()
  const adsInitialized = useRef(false)

  useEffect(() => {
    initialize()

    // Initialize ATT + AdMob after app UI is visible
    // Only run once to prevent duplicate ATT prompts
    if (!adsInitialized.current) {
      adsInitialized.current = true
      // Small delay to ensure UI is fully rendered before showing ATT popup
      setTimeout(() => {
        initializeAds()
      }, 1000)
    }

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
                <SubscriptionProvider>
                  <StatusBar style="dark" />
                  <NavigationContainer ref={navigationRef}>
                    <AppContent />
                  </NavigationContainer>
                </SubscriptionProvider>
              </ToastProvider>
            </PersistQueryClientProvider>
          </ErrorBoundary>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
