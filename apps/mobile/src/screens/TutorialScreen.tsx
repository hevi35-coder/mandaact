import React, { useState, useRef, useMemo } from 'react'
import {
  View,
  Text,
  Pressable,
  Dimensions,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Target,
  Grid3x3,
  CheckCircle,
  TrendingUp,
  Award,
  Bell,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Camera,
  Image as ImageIcon,
  FileText,
  RotateCw,
  Lightbulb,
  LucideIcon,
} from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTranslation } from 'react-i18next'

import type { RootStackParamList } from '../navigation/RootNavigator'
import { trackTutorialCompleted } from '../lib'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// Tutorial step config (without text - text comes from translations)
interface TutorialStepConfig {
  id: string
  icon: LucideIcon
  iconColor: string
  iconBg: string
  contentKey: string
  bullets?: string[] | { icon: LucideIcon; textKey: string }[]
  useIconBullets?: boolean
}

const TUTORIAL_STEP_CONFIGS: TutorialStepConfig[] = [
  {
    id: 'welcome',
    icon: Target,
    iconColor: '#2563eb',
    iconBg: '#eff6ff',
    contentKey: 'welcome',
  },
  {
    id: 'mandalart',
    icon: Grid3x3,
    iconColor: '#8b5cf6',
    iconBg: '#f3e8ff',
    contentKey: 'mandalart',
    bullets: ['bullet1', 'bullet2', 'bullet3'],
  },
  {
    id: 'create',
    icon: Sparkles,
    iconColor: '#ec4899',
    iconBg: '#fce7f3',
    contentKey: 'create',
    bullets: [
      { icon: Camera, textKey: 'imageUpload' },
      { icon: ImageIcon, textKey: 'textPaste' },
      { icon: FileText, textKey: 'manual' },
    ],
    useIconBullets: true,
  },
  {
    id: 'daily',
    icon: CheckCircle,
    iconColor: '#22c55e',
    iconBg: '#dcfce7',
    contentKey: 'daily',
    bullets: [
      { icon: RotateCw, textKey: 'routine' },
      { icon: Target, textKey: 'mission' },
      { icon: Lightbulb, textKey: 'reference' },
    ],
    useIconBullets: true,
  },
  {
    id: 'gamification',
    icon: Award,
    iconColor: '#f59e0b',
    iconBg: '#fef3c7',
    contentKey: 'gamification',
    bullets: ['bullet1', 'bullet2'],
  },
  {
    id: 'stats',
    icon: TrendingUp,
    iconColor: '#06b6d4',
    iconBg: '#cffafe',
    contentKey: 'stats',
    bullets: ['bullet1', 'bullet2'],
  },
  {
    id: 'notification',
    icon: Bell,
    iconColor: '#ef4444',
    iconBg: '#fee2e2',
    contentKey: 'notification',
  },
]

const TUTORIAL_COMPLETED_KEY = '@mandaact/tutorial_completed'

export default function TutorialScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { t } = useTranslation()
  const scrollViewRef = useRef<ScrollView>(null)
  const [currentStep, setCurrentStep] = useState(0)

  // Get translated steps
  const tutorialSteps = useMemo(() => {
    return TUTORIAL_STEP_CONFIGS.map(step => ({
      ...step,
      title: t(`tutorial.content.${step.contentKey}.title`),
      description: t(`tutorial.content.${step.contentKey}.description`),
    }))
  }, [t])

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      const nextStep = currentStep + 1
      setCurrentStep(nextStep)
      scrollViewRef.current?.scrollTo({ x: nextStep * SCREEN_WIDTH, animated: true })
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1
      setCurrentStep(prevStep)
      scrollViewRef.current?.scrollTo({ x: prevStep * SCREEN_WIDTH, animated: true })
    }
  }

  const handleComplete = async () => {
    // Mark tutorial as completed
    await AsyncStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true')
    trackTutorialCompleted({
      completed_steps: tutorialSteps.length,
      total_steps: tutorialSteps.length,
      skipped: false,
    })
    navigation.goBack()
  }

  const handleSkip = async () => {
    await AsyncStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true')
    trackTutorialCompleted({
      completed_steps: currentStep + 1,
      total_steps: tutorialSteps.length,
      skipped: true,
    })
    navigation.goBack()
  }

  const isLastStep = currentStep === tutorialSteps.length - 1

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Skip Button */}
      <View className="flex-row justify-end px-4 py-2">
        <Pressable onPress={handleSkip} className="px-4 py-2">
          <Text className="text-gray-500">{t('tutorial.skip')}</Text>
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        className="flex-1"
      >
        {tutorialSteps.map((step, _index) => {
          const IconComponent = step.icon
          return (
            <View
              key={step.id}
              style={{ width: SCREEN_WIDTH }}
              className="flex-1 px-8 justify-center"
            >
              {/* Icon */}
              <View className="items-center mb-8">
                <View
                  className="w-24 h-24 rounded-full items-center justify-center"
                  style={{ backgroundColor: step.iconBg }}
                >
                  <IconComponent size={48} color={step.iconColor} />
                </View>
              </View>

              {/* Title */}
              <Text className="text-2xl font-bold text-gray-900 text-center mb-4">
                {step.title}
              </Text>

              {/* Description */}
              <Text className="text-base text-gray-600 text-center leading-relaxed mb-6">
                {step.description}
              </Text>

              {/* Bullets */}
              {step.bullets && (
                <View className="bg-gray-50 rounded-xl p-4">
                  {step.bullets.map((bullet, bIndex) => {
                    if (step.useIconBullets && typeof bullet === 'object' && 'icon' in bullet) {
                      const BulletIcon = bullet.icon
                      return (
                        <View key={bIndex} className="flex-row items-center mb-2">
                          <BulletIcon size={16} color="#6b7280" />
                          <Text className="text-sm text-gray-700 flex-1 ml-2">
                            {t(`tutorial.content.${step.contentKey}.${bullet.textKey}`)}
                          </Text>
                        </View>
                      )
                    }
                    return (
                      <View key={bIndex} className="flex-row items-start mb-2">
                        <Text className="text-primary mr-2">•</Text>
                        <Text className="text-sm text-gray-700 flex-1">
                          {typeof bullet === 'string' ? t(`tutorial.content.${step.contentKey}.${bullet}`) : ''}
                        </Text>
                      </View>
                    )
                  })}
                </View>
              )}
            </View>
          )
        })}
      </ScrollView>

      {/* Progress Indicators */}
      <View className="flex-row justify-center py-4">
        {tutorialSteps.map((_, index) => (
          <View
            key={index}
            className={`w-2 h-2 rounded-full mx-1 ${
              index === currentStep ? 'bg-primary' : 'bg-gray-300'
            }`}
          />
        ))}
      </View>

      {/* Navigation Buttons */}
      <View className="flex-row px-4 pb-4 gap-3">
        {currentStep > 0 && (
          <Pressable
            className="flex-1 bg-gray-100 rounded-xl py-4 flex-row items-center justify-center"
            onPress={handlePrev}
          >
            <ChevronLeft size={20} color="#374151" />
            <Text className="text-gray-700 font-medium ml-1">{t('tutorial.previous')}</Text>
          </Pressable>
        )}

        <Pressable
          className={`flex-1 bg-primary rounded-xl py-4 flex-row items-center justify-center ${
            currentStep === 0 ? 'flex-[2]' : ''
          }`}
          onPress={isLastStep ? handleComplete : handleNext}
        >
          <Text className="text-white font-medium mr-1">
            {isLastStep ? t('tutorial.start') : t('tutorial.next')}
          </Text>
          {!isLastStep && <ChevronRight size={20} color="white" />}
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

// Check if tutorial has been completed
export async function isTutorialCompleted(): Promise<boolean> {
  const value = await AsyncStorage.getItem(TUTORIAL_COMPLETED_KEY)
  return value === 'true'
}

// Reset tutorial status (for testing)
export async function resetTutorial(): Promise<void> {
  await AsyncStorage.removeItem(TUTORIAL_COMPLETED_KEY)
}
