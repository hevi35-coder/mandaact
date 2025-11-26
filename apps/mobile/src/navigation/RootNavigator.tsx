import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Home, CheckSquare, Grid3X3, BarChart3, Settings } from 'lucide-react-native'

import { useAuthStore } from '../store/authStore'

// Screens
import HomeScreen from '../screens/HomeScreen'
import TodayScreen from '../screens/TodayScreen'
import MandalartListScreen from '../screens/MandalartListScreen'
import MandalartCreateScreen from '../screens/MandalartCreateScreen'
import MandalartDetailScreen from '../screens/MandalartDetailScreen'
import StatsScreen from '../screens/StatsScreen'
import SettingsScreen from '../screens/SettingsScreen'
import LoginScreen from '../screens/LoginScreen'
import LoadingScreen from '../screens/LoadingScreen'

export type RootStackParamList = {
  Main: undefined
  Login: undefined
  MandalartDetail: { id: string }
  CreateMandalart: undefined
}

export type MainTabParamList = {
  Home: undefined
  Today: undefined
  Mandalart: undefined
  Stats: undefined
  Settings: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator<MainTabParamList>()

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#667eea',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: '홈',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Today"
        component={TodayScreen}
        options={{
          tabBarLabel: '오늘',
          tabBarIcon: ({ color, size }) => <CheckSquare size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Mandalart"
        component={MandalartListScreen}
        options={{
          tabBarLabel: '만다라트',
          tabBarIcon: ({ color, size }) => <Grid3X3 size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarLabel: '통계',
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: '설정',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  )
}

export default function RootNavigator() {
  const { user, initialized } = useAuthStore()

  if (!initialized) {
    return <LoadingScreen />
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="CreateMandalart"
              component={MandalartCreateScreen}
              options={{
                presentation: 'modal',
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
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
