import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Home, CalendarCheck, Grid3X3, FileText } from 'lucide-react-native'
import { ScrollView, useWindowDimensions, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'

import { useAuthStore } from '../store/authStore'
import { useUserProfile } from '../hooks/useUserProfile'
import { logger } from '../lib/logger'
import { navigationRef } from './navigationRef'

// Context for scroll-to-top functionality
type ScrollToTopContextType = {
  registerScrollView: (tabName: string, ref: React.RefObject<ScrollView>) => void
  unregisterScrollView: (tabName: string) => void
}

const ScrollToTopContext = createContext<ScrollToTopContextType | null>(null)

export function useScrollToTop(tabName: string, scrollRef: React.RefObject<ScrollView>) {
  const context = useContext(ScrollToTopContext)

  useEffect(() => {
    if (context && scrollRef.current) {
      context.registerScrollView(tabName, scrollRef)
      return () => context.unregisterScrollView(tabName)
    }
  }, [context, tabName, scrollRef])
}

// Screens
import HomeScreen from '../screens/HomeScreen'
import TodayScreen from '../screens/TodayScreen'
import MandalartListScreen from '../screens/MandalartListScreen'
import MandalartCreateScreen from '../screens/MandalartCreateScreen'
import MandalartDetailScreen from '../screens/MandalartDetailScreen'
// StatsScreen features are now integrated into HomeScreen
import SettingsScreen from '../screens/SettingsScreen'
import ReportsScreen from '../screens/ReportsScreen'
import TutorialScreen from '../screens/TutorialScreen'
import LoginScreen from '../screens/LoginScreen'
import LoadingScreen from '../screens/LoadingScreen'
import SubscriptionScreen from '../screens/SubscriptionScreen'
import CoachingFlowScreen from '../screens/CoachingFlowScreen'


export type RootStackParamList = {
  Main: undefined
  Login: undefined
  MandalartDetail: { id: string }
  CreateMandalart: undefined
  Settings: undefined
  Tutorial: undefined
  Subscription: undefined
  CoachingFlow: undefined
}

export type MainTabParamList = {
  Home: undefined
  Today: undefined
  Mandalart: undefined
  Reports: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator<MainTabParamList>()

function MainTabs() {
  const { t } = useTranslation()

  // Store refs to ScrollViews for each tab
  const scrollViewRefs = useRef<Map<string, React.RefObject<ScrollView>>>(new Map())

  const registerScrollView = useCallback((tabName: string, ref: React.RefObject<ScrollView>) => {
    scrollViewRefs.current.set(tabName, ref)
  }, [])

  const unregisterScrollView = useCallback((tabName: string) => {
    scrollViewRefs.current.delete(tabName)
  }, [])

  const scrollToTop = useCallback((tabName: string) => {
    const ref = scrollViewRefs.current.get(tabName)
    if (ref?.current) {
      ref.current.scrollTo({ y: 0, animated: true })
    }
  }, [])

  // Listener for tab press - scroll to top if already on that tab
  const createTabPressListener = (tabName: string) => ({
    tabPress: (_e: { preventDefault: () => void; target?: string }) => {
      // Scroll to top when pressing the current tab
      scrollToTop(tabName)
    },
  })

  return (
    <ScrollToTopContext.Provider value={{ registerScrollView, unregisterScrollView }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#18181b',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: '#f3f4f6',
            paddingTop: 10,
            paddingBottom: 12,
            height: 72,
            backgroundColor: '#ffffff',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.03,
            shadowRadius: 8,
            elevation: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            fontFamily: 'Pretendard-SemiBold',
            marginTop: 2,
          },
          tabBarIconStyle: {
            marginTop: 2,
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: t('nav.home'),
            tabBarIcon: ({ color }) => <Home size={26} color={color} strokeWidth={1.8} />,
          }}
          listeners={createTabPressListener('Home')}
        />
        <Tab.Screen
          name="Today"
          component={TodayScreen}
          options={{
            tabBarLabel: t('nav.today'),
            tabBarIcon: ({ color }) => <CalendarCheck size={26} color={color} strokeWidth={1.8} />,
          }}
          listeners={createTabPressListener('Today')}
        />
        <Tab.Screen
          name="Mandalart"
          component={MandalartListScreen}
          options={{
            tabBarLabel: t('nav.mandalart'),
            tabBarIcon: ({ color }) => <Grid3X3 size={26} color={color} strokeWidth={1.8} />,
          }}
          listeners={createTabPressListener('Mandalart')}
        />
        <Tab.Screen
          name="Reports"
          component={ReportsScreen}
          options={{
            tabBarLabel: t('reports.title'),
            tabBarIcon: ({ color }) => <FileText size={26} color={color} strokeWidth={1.8} />,
          }}
          listeners={createTabPressListener('Reports')}
        />
      </Tab.Navigator>
    </ScrollToTopContext.Provider>
  )
}

export default function RootNavigator() {
  const { user, initialized } = useAuthStore()
  const { autoDetectAndSave } = useUserProfile(user?.id)

  // Detect iPad for fullscreen modal
  const { width } = useWindowDimensions()
  const isTablet = Platform.OS === 'ios' && width >= 768

  // Auto-detect timezone on first login
  useEffect(() => {
    if (user?.id && initialized) {
      autoDetectAndSave().then((saved) => {
        if (saved) {
          logger.info('Timezone auto-detected and saved for user', { userId: user.id })
        }
      })
    }
  }, [user?.id, initialized, autoDetectAndSave])

  if (!initialized) {
    return <LoadingScreen />
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="CreateMandalart"
            component={MandalartCreateScreen}
            options={{
              // iPad: fullScreenModal for better 9x9 grid experience
              // Phone: regular modal
              presentation: isTablet ? 'fullScreenModal' : 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="MandalartDetail"
            component={MandalartDetailScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="Tutorial"
            component={TutorialScreen}
            options={{
              presentation: 'fullScreenModal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="Subscription"
            component={SubscriptionScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="CoachingFlow"
            component={CoachingFlowScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  )
}
