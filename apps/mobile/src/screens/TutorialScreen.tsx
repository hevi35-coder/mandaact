import React, { useState, useRef, useMemo } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Alert,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Target,
  Rocket,
  ChevronRight,
  ChevronLeft,
  RotateCw,
  Lightbulb,
  LucideIcon,
} from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTranslation } from 'react-i18next'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuthStore } from '../store/authStore'
import { useResponsive } from '../hooks/useResponsive'

import type { RootStackParamList } from '../navigation/RootNavigator'
import { trackTutorialCompleted } from '../lib'
import { xpService } from '../lib/xp'
import InteractiveMandalartDemo from '../components/Tutorial/InteractiveMandalartDemo'
import { GradientText } from '../components/GradientText'

// Import tutorial images
const TUTORIAL_IMAGES = {
  appIcon: require('../../assets/icon.png'),
  mandalart: require('../../assets/images/tutorial/mandalart_grid.png'),
  daily: require('../../assets/images/tutorial/daily_practice_transparent.png'),
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

// Tutorial step config
interface TutorialStepConfig {
  id: string
  icon?: LucideIcon
  iconColor?: string
  iconBg?: string
  image?: keyof typeof TUTORIAL_IMAGES
  interactive?: boolean
  contentKey: string
  bullets?: string[] | { icon: LucideIcon; textKey: string }[]
  useIconBullets?: boolean
}

// New 4-step tutorial configuration with images
const TUTORIAL_STEP_CONFIGS: TutorialStepConfig[] = [
  {
    id: 'welcome',
    image: 'appIcon',
    contentKey: 'welcome',
  },
  {
    id: 'mandalart',
    interactive: true, // Use interactive demo instead of image
    contentKey: 'mandalart',
    bullets: ['bullet1', 'bullet2', 'bullet3'],
  },
  {
    id: 'daily',
    image: 'daily',
    contentKey: 'daily',
    bullets: [
      { icon: RotateCw, textKey: 'routine' },
      { icon: Target, textKey: 'mission' },
      { icon: Lightbulb, textKey: 'reference' },
    ],
    useIconBullets: true,
  },
  {
    id: 'getStarted',
    icon: Rocket,
    iconColor: '#ec4899',
    iconBg: '#fce7f3',
    contentKey: 'getStarted',
  },
]

const TUTORIAL_COMPLETED_KEY = '@mandaact/tutorial_completed'
const getTutorialKey = (userId: string) => `@mandaact/tutorial_completed:${userId}`

export default function TutorialScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { width: screenWidth } = useWindowDimensions()
  const { isTablet, contentMaxWidth } = useResponsive()
  const scrollViewRef = useRef<ScrollView>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [interactionCompleted, setInteractionCompleted] = useState(false)

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
      scrollViewRef.current?.scrollTo({ x: nextStep * screenWidth, animated: true })
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1
      setCurrentStep(prevStep)
      scrollViewRef.current?.scrollTo({ x: prevStep * screenWidth, animated: true })
    }
  }

  const handleComplete = async () => {
    // Check if already completed to prevent duplicate XP and determine alert message
    const alreadyCompleted = await isTutorialCompleted(user?.id)

    if (user?.id) {
      if (!alreadyCompleted) {
        // Award 50 XP for tutorial completion
        try {
          await xpService.updateUserXP(user.id, 50)
        } catch (error) {
          console.warn('Failed to award tutorial XP:', error)
        }

        // Mark as completed for this user
        await AsyncStorage.setItem(getTutorialKey(user.id), 'true')
      }
    }
    await AsyncStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true')

    trackTutorialCompleted({
      completed_steps: tutorialSteps.length,
      total_steps: tutorialSteps.length,
      skipped: false,
    })

    // Show completion alert then navigate to CreateMandalart
    if (!alreadyCompleted) {
      Alert.alert(
        t('tutorial.completionReward.title'),
        t('tutorial.completionReward.message'),
        [
          {
            text: t('tutorial.completionReward.button'),
            onPress: () => {
              navigation.goBack()
              setTimeout(() => {
                navigation.navigate('CreateMandalart')
              }, 300)
            },
          },
        ]
      )
    } else {
      // Show standard completion message for re-visits
      Alert.alert(
        t('tutorial.completion.title'),
        t('tutorial.completion.message'),
        [
          {
            text: t('tutorial.completion.button'),
            onPress: () => {
              navigation.goBack()
              setTimeout(() => {
                navigation.navigate('CreateMandalart')
              }, 300)
            },
          },
        ]
      )
    }
  }

  const handleSkip = async () => {
    if (user?.id) {
      await AsyncStorage.setItem(getTutorialKey(user.id), 'true')
    }
    await AsyncStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true')

    trackTutorialCompleted({
      completed_steps: currentStep + 1,
      total_steps: tutorialSteps.length,
      skipped: true,
    })
    navigation.goBack()
  }

  const isLastStep = currentStep === tutorialSteps.length - 1
  const totalSteps = tutorialSteps.length

  // Responsive sizing
  const imageSizeMandalart = isTablet ? 220 : 180
  const imageSizeDaily = isTablet ? 400 : 320
  const iconSize = isTablet ? 64 : 48
  const iconContainerSize = isTablet ? 128 : 96
  const titleSize = isTablet ? 32 : 28  // Increased from 28:24
  const descriptionSize = isTablet ? 20 : 17 // Increased from 17:15
  const buttonMaxWidth = isTablet ? contentMaxWidth : 500

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }} edges={['top', 'left', 'right']}>
      {/* Header with Skip and Progress */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
        {/* Step Indicator */}
        <Text style={{ fontSize: 14, color: '#6b7280', fontFamily: 'Pretendard-Medium' }}>
          {t('tutorial.stepOf', { current: currentStep + 1, total: totalSteps })}
        </Text>

        {/* Skip Button */}
        <Pressable onPress={handleSkip} style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
          <Text style={{ color: '#6b7280', fontSize: 14, fontFamily: 'Pretendard-Medium' }}>
            {t('tutorial.skip')}
          </Text>
        </Pressable>
      </View>

      {/* Progress Bar */}
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <View style={{ height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
          <LinearGradient
            colors={['#2563eb', '#9333ea', '#db2777']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              height: '100%',
              borderRadius: 2,
              width: `${((currentStep + 1) / totalSteps) * 100}%`,
            }}
          />
        </View>
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        scrollEnabled={true}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
        onMomentumScrollEnd={(e) => {
          const newStep = Math.round(e.nativeEvent.contentOffset.x / screenWidth)
          setCurrentStep(newStep)
        }}
      >
        {tutorialSteps.map((step) => {
          const IconComponent = step.icon
          const hasImage = step.image && TUTORIAL_IMAGES[step.image]

          return (
            <View
              key={step.id}
              style={{ width: screenWidth, flex: 1, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' }}
            >
              {/* Card Container - 3 Zone Template */}
              <View
                style={{
                  width: '100%',
                  maxWidth: buttonMaxWidth,
                  maxWidth: buttonMaxWidth,
                  height: isTablet ? 620 : 540, // Increased from 520 to prevent text clipping
                  justifyContent: 'flex-start', // Top-aligned, zones handle spacing
                  backgroundColor: '#ffffff',
                  borderRadius: 20,
                  paddingVertical: 24,
                  paddingHorizontal: 20, // Reduced from 24 to give text more width
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                  borderWidth: 1,
                  borderColor: '#f3f4f6',
                }}
              >
                {/* ═══ ZONE 1: Visual Area (Fixed 240px) ═══ */}
                <View style={{ height: isTablet ? 300 : 240, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                  {step.id === 'mandalart' ? (
                    <InteractiveMandalartDemo
                      size={isTablet ? 200 : 160}
                      onInteractionComplete={async () => {
                        if (user?.id) {
                          const demoKey = `@mandaact/tutorial_demo_completed:${user.id}`
                          const hasDoneDemo = await AsyncStorage.getItem(demoKey)

                          if (!hasDoneDemo) {
                            setInteractionCompleted(true)
                            try {
                              await xpService.updateUserXP(user.id, 5)
                              await AsyncStorage.setItem(demoKey, 'true')
                            } catch (error) {
                              console.warn('Failed to award demo XP:', error)
                            }
                          }
                        }
                      }}
                    />
                  ) : hasImage ? (() => {
                    const isAppIcon = step.id === 'welcome'
                    const size = isAppIcon
                      ? isTablet ? 160 : 120 // App Icon: prominent but not overwhelming
                      : step.id === 'daily'
                        ? isTablet ? 300 : 250 // Daily: larger image in expanded zone
                        : isTablet ? 200 : 160
                    const radius = isAppIcon ? size * 0.22 : 0

                    return (
                      <Image
                        source={TUTORIAL_IMAGES[step.image!]}
                        style={{
                          width: size,
                          height: size,
                          borderRadius: radius,
                          ...(isAppIcon && {
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.12,
                            shadowRadius: 12,
                            elevation: 6,
                          })
                        }}
                        resizeMode="contain"
                      />
                    )
                  })()
                    : IconComponent ? (
                      <View
                        style={{
                          width: isTablet ? 160 : 120,
                          height: isTablet ? 160 : 120,
                          borderRadius: (isTablet ? 160 : 120) / 2,
                          backgroundColor: step.iconBg || '#fce7f3',
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: step.iconColor,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.1,
                          shadowRadius: 8,
                          elevation: 4,
                        }}
                      >
                        <IconComponent size={isTablet ? 80 : 60} color={step.iconColor} />
                      </View>
                    ) : null}
                </View>

                {/* ═══ ZONE 2: Text Area (Fixed 100px) ═══ */}
                <View style={{ height: isTablet ? 110 : 110, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 0 }}>
                  <Text
                    style={{
                      fontSize: titleSize,
                      color: '#111827',
                      textAlign: 'center',
                      marginBottom: 8,
                      fontFamily: 'Pretendard-Bold',
                    }}
                  >
                    {step.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: descriptionSize,
                      color: '#6b7280',
                      textAlign: 'center',
                      lineHeight: descriptionSize * 1.4,
                      fontFamily: 'Pretendard-Regular',
                    }}
                    numberOfLines={3}
                  >
                    {step.description}
                  </Text>
                </View>

                {/* ═══ ZONE 3: Info Box Area (Fixed 140px) ═══ */}
                <View style={{ height: isTablet ? 160 : 140, justifyContent: 'flex-start', paddingTop: 8 }}>
                  {step.bullets ? (
                    <View style={{ backgroundColor: '#f9fafb', borderRadius: 14, padding: 12, flex: 1 }}>
                      {step.bullets.map((bullet, bIndex) => {
                        if (step.useIconBullets && typeof bullet === 'object' && 'icon' in bullet) {
                          const BulletIcon = bullet.icon
                          return (
                            <View key={bIndex} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: bIndex < step.bullets!.length - 1 ? 10 : 0 }}>
                              <View style={{ width: isTablet ? 36 : 28, height: isTablet ? 36 : 28, borderRadius: isTablet ? 18 : 14, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginRight: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
                                <BulletIcon size={isTablet ? 20 : 14} color="#6b7280" />
                              </View>
                              <Text style={{ fontSize: isTablet ? 16 : 12, color: '#374151', flex: 1, fontFamily: 'Pretendard-Medium' }}>
                                {t(`tutorial.content.${step.contentKey}.${bullet.textKey}`)}
                              </Text>
                            </View>
                          )
                        }
                        return (
                          <View key={bIndex} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: bIndex < step.bullets!.length - 1 ? 10 : 0 }}>
                            <View style={{ width: isTablet ? 36 : 28, height: isTablet ? 36 : 28, borderRadius: isTablet ? 18 : 14, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                              <Text style={{ color: '#2563eb', fontSize: isTablet ? 16 : 12, fontFamily: 'Pretendard-Bold' }}>{bIndex + 1}</Text>
                            </View>
                            <Text style={{ fontSize: isTablet ? 16 : 12, color: '#374151', flex: 1, fontFamily: 'Pretendard-Medium' }}>
                              {typeof bullet === 'string' ? t(`tutorial.content.${step.contentKey}.${bullet}`) : ''}
                            </Text>
                          </View>
                        )
                      })}
                    </View>
                  ) : (
                    // Empty spacer to maintain zone height for steps without bullets
                    <View style={{ flex: 1 }} />
                  )}
                </View>
              </View>
            </View>
          )
        })}
      </ScrollView>

      {/* Progress Dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', paddingVertical: 16 }}>
        {tutorialSteps.map((_, index) => (
          <View
            key={index}
            style={{
              height: 8,
              borderRadius: 4,
              marginHorizontal: 4,
              backgroundColor: index === currentStep ? '#667eea' : '#d1d5db',
              width: index === currentStep ? 24 : 8,
            }}
          />
        ))}
      </View>

      {/* Navigation Buttons */}
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#f9fafb' }}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 12, maxWidth: buttonMaxWidth, alignSelf: 'center', width: '100%' }}>
            {currentStep > 0 && (
              <Pressable
                style={{
                  flex: 1,
                  borderRadius: 16,
                  paddingVertical: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                }}
                onPress={handlePrev}
              >
                <ChevronLeft size={20} color="#374151" />
                <Text style={{ color: '#374151', fontFamily: 'Pretendard-SemiBold', fontSize: 16, marginLeft: 4 }}>
                  {t('tutorial.previous')}
                </Text>
              </Pressable>
            )}

            {/* Gradient Border Next/Start Button */}
            <Pressable
              style={{ flex: 1 }}
              onPress={isLastStep ? handleComplete : handleNext}
            >
              <LinearGradient
                colors={['#2563eb', '#9333ea', '#db2777']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  borderRadius: 16,
                  padding: 2,
                }}
              >
                <View
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 14,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <GradientText
                    colors={['#2563eb', '#9333ea', '#db2777']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      fontFamily: 'Pretendard-Bold',
                      fontSize: 16,
                      marginRight: 4,
                    }}
                  >
                    {isLastStep ? t('tutorial.start') : t('tutorial.next')}
                  </GradientText>
                  {!isLastStep && <ChevronRight size={20} color="#9333ea" />}
                </View>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  )
}

// Check if tutorial has been completed for a specific user
export async function isTutorialCompleted(userId?: string): Promise<boolean> {
  if (!userId) {
    const value = await AsyncStorage.getItem(TUTORIAL_COMPLETED_KEY)
    return value === 'true'
  }

  const userValue = await AsyncStorage.getItem(getTutorialKey(userId))

  if (userValue !== null) {
    return userValue === 'true'
  }

  return false
}

// Reset tutorial status (for testing)
export async function resetTutorial(userId?: string): Promise<void> {
  await AsyncStorage.removeItem(TUTORIAL_COMPLETED_KEY)
  if (userId) {
    await AsyncStorage.removeItem(getTutorialKey(userId))
  }
}
