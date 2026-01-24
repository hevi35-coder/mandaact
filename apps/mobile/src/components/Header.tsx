import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { navigationRef } from '../navigation/navigationRef'
import { Settings, ChevronLeft } from 'lucide-react-native'
import MaskedView from '@react-native-masked-view/masked-view'
import { LinearGradient } from 'expo-linear-gradient'

interface HeaderProps {
  showSettings?: boolean
  showBackButton?: boolean
  title?: string
  rightElement?: React.ReactNode
  navigation?: any
}

/**
 * Brand logo component with gradient text for "Act"
 * Increased size for better visibility (text-2xl = 24px)
 */
function BrandLogo() {
  return (
    <View className="flex-row items-center">
      <Text
        className="text-2xl text-gray-900"
        style={{ fontFamily: 'Pretendard-Bold' }}
      >
        Manda
      </Text>
      <MaskedView
        maskElement={
          <Text
            className="text-2xl"
            style={{ fontFamily: 'Pretendard-Bold' }}
          >
            Act
          </Text>
        }
      >
        <LinearGradient
          colors={['#2563eb', '#9333ea', '#ec4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text
            className="text-2xl opacity-0"
            style={{ fontFamily: 'Pretendard-Bold' }}
          >
            Act
          </Text>
        </LinearGradient>
      </MaskedView>
    </View>
  )
}

export default function Header({
  showSettings = true,
  showBackButton = false,
  title,
  rightElement,
  navigation: propNavigation,
}: HeaderProps) {
  const navigation = propNavigation || navigationRef
  const insets = useSafeAreaInsets()

  return (
    <View
      className="bg-white border-b border-gray-100"
      style={{
        paddingTop: insets.top,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View className="flex-row items-center justify-between px-5 h-16">
        {/* Left: Back Button + Title or Brand Logo */}
        {showBackButton ? (
          <View className="flex-row items-center flex-1">
            <Pressable
              onPress={() => navigation.goBack()}
              className="p-2 -ml-2 rounded-full active:bg-gray-100"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronLeft size={28} color="#4b5563" />
            </Pressable>
            {/* title removed here, moved to absolute center below */}
          </View>
        ) : (
          <BrandLogo />
        )}

        {/* Center: Title (if back button) */}
        {showBackButton && title && (
          <View className="absolute left-0 right-0 items-center pointer-events-none">
            <Text
              className="text-lg text-gray-900"
              style={{ fontFamily: 'Pretendard-SemiBold' }}
            >
              {title}
            </Text>
          </View>
        )}

        {/* Right Element or Settings Button */}
        <View className="flex-row items-center">
          {rightElement}
          {showSettings && !showBackButton && (
            <Pressable
              onPress={() => navigation.navigate('Settings')}
              className="p-2.5 rounded-full active:bg-gray-100"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Settings size={24} color="#4b5563" />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  )
}

export { BrandLogo }
