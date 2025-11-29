import React, { useState, useRef } from 'react'
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
} from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import AsyncStorage from '@react-native-async-storage/async-storage'

import type { RootStackParamList } from '../navigation/RootNavigator'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// Tutorial steps
const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    icon: Target,
    iconColor: '#2563eb',
    iconBg: '#eff6ff',
    title: 'MandaAct에 오신 것을\n환영합니다!',
    description:
      '만다라트와 함께 체계적인 목표 관리를 시작하세요.\n작은 실천들이 모여 큰 변화를 만듭니다.',
  },
  {
    id: 'mandalart',
    icon: Grid3x3,
    iconColor: '#8b5cf6',
    iconBg: '#f3e8ff',
    title: '만다라트란?',
    description:
      '9x9 격자에 핵심 목표와 세부 목표,\n구체적인 실천 항목을 배치하는\n목표 관리 프레임워크입니다.',
    bullets: [
      '중앙: 핵심 목표 (1개)',
      '주변 8칸: 세부 목표 (8개)',
      '각 세부 목표: 실천 항목 (각 8개, 총 64개)',
    ],
  },
  {
    id: 'create',
    icon: Sparkles,
    iconColor: '#ec4899',
    iconBg: '#fce7f3',
    title: '3가지 생성 방식',
    description: '편한 방법으로 만다라트를 만들어보세요.',
    bullets: [
      { icon: Camera, text: '이미지 업로드: 사진에서 텍스트 추출' },
      { icon: ImageIcon, text: '텍스트 붙여넣기: 복사한 텍스트로 생성' },
      { icon: FileText, text: '직접 입력: 하나씩 직접 입력' },
    ],
    useIconBullets: true,
  },
  {
    id: 'daily',
    icon: CheckCircle,
    iconColor: '#22c55e',
    iconBg: '#dcfce7',
    title: '오늘의 실천',
    description: '오늘 할 일을 확인하고 체크하세요.',
    bullets: [
      { icon: RotateCw, text: '루틴: 반복되는 습관 (체크 가능)' },
      { icon: Target, text: '미션: 달성해야 할 목표 (체크 가능)' },
      { icon: Lightbulb, text: '참고: 마음가짐/참고사항 (체크 불가)' },
    ],
    useIconBullets: true,
  },
  {
    id: 'gamification',
    icon: Award,
    iconColor: '#f59e0b',
    iconBg: '#fef3c7',
    title: '레벨업',
    description:
      '실천할 때마다 XP를 획득합니다.\n레벨업도 하고 배지도 획득하세요!',
    bullets: [
      '다양한 보너스로 XP 최대 3.5배',
      '다양한 배지 수집',
    ],
  },
  {
    id: 'stats',
    icon: TrendingUp,
    iconColor: '#06b6d4',
    iconBg: '#cffafe',
    title: 'AI 리포트',
    description: 'AI 리포트로 맞춤 피드백을 받으세요.',
    bullets: [
      '만다라트 목표 진단 및 개선 제안',
      '7일간 실천 데이터 분석 및 개선 제안',
    ],
  },
  {
    id: 'notification',
    icon: Bell,
    iconColor: '#ef4444',
    iconBg: '#fee2e2',
    title: '알림 설정',
    description:
      '실천 리마인더로\n목표를 잊지 않도록 도와드립니다.\n설정에서 원하는 시간에 알림을 받으세요.',
  },
]

const TUTORIAL_COMPLETED_KEY = '@mandaact/tutorial_completed'

export default function TutorialScreen() {
  const navigation = useNavigation<NavigationProp>()
  const scrollViewRef = useRef<ScrollView>(null)
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
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
    navigation.goBack()
  }

  const handleSkip = async () => {
    await AsyncStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true')
    navigation.goBack()
  }

  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Skip Button */}
      <View className="flex-row justify-end px-4 py-2">
        <Pressable onPress={handleSkip} className="px-4 py-2">
          <Text className="text-gray-500">건너뛰기</Text>
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
        {TUTORIAL_STEPS.map((step, _index) => {
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
                <View className="bg-gray-50 rounded-2xl p-4">
                  {step.bullets.map((bullet, bIndex) => {
                    if (step.useIconBullets && typeof bullet === 'object' && 'icon' in bullet) {
                      const BulletIcon = bullet.icon
                      return (
                        <View key={bIndex} className="flex-row items-center mb-2">
                          <BulletIcon size={16} color="#6b7280" />
                          <Text className="text-sm text-gray-700 flex-1 ml-2">{bullet.text}</Text>
                        </View>
                      )
                    }
                    return (
                      <View key={bIndex} className="flex-row items-start mb-2">
                        <Text className="text-primary mr-2">•</Text>
                        <Text className="text-sm text-gray-700 flex-1">{typeof bullet === 'string' ? bullet : ''}</Text>
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
        {TUTORIAL_STEPS.map((_, index) => (
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
            <Text className="text-gray-700 font-medium ml-1">이전</Text>
          </Pressable>
        )}

        <Pressable
          className={`flex-1 bg-primary rounded-xl py-4 flex-row items-center justify-center ${
            currentStep === 0 ? 'flex-[2]' : ''
          }`}
          onPress={isLastStep ? handleComplete : handleNext}
        >
          <Text className="text-white font-medium mr-1">
            {isLastStep ? '시작하기' : '다음'}
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
