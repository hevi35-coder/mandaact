import React, { useEffect } from 'react'
import { View, Text, Pressable } from 'react-native'
import Animated, {
    FadeInUp,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { CheckCircle2, Circle, ChevronRight, Lock } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../navigation/RootNavigator'
import { NotificationPrimerModal } from './NotificationPrimerModal'
import { Alert, ToastAndroid, Platform } from 'react-native'

interface OnboardingItem {
    id: string
    titleKey: string
    isCompleted: boolean
    isLocked?: boolean
    onPress?: () => void
}

import { differenceInDays, parseISO } from 'date-fns'

interface OnboardingChecklistProps {
    hasCreatedGoal: boolean
    hasSetNotifications: boolean
    hasFirstAction: boolean
    hasCompletedTutorial?: boolean
    signupDate?: string | null
}

// Animated wrapper for individual checklist items
function AnimatedChecklistItem({
    item,
    isNextIncomplete,
    t,
}: {
    item: OnboardingItem
    isNextIncomplete: boolean
    t: (key: string) => string
}) {
    const pulseScale = useSharedValue(1)

    useEffect(() => {
        if (isNextIncomplete && !item.isCompleted && !item.isLocked) {
            // Subtle pulse animation for next incomplete item
            pulseScale.value = withRepeat(
                withSequence(
                    withTiming(1.02, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
                ),
                -1, // Repeat forever
                true
            )
        } else {
            pulseScale.value = withTiming(1, { duration: 200 })
        }
    }, [isNextIncomplete, item.isCompleted, item.isLocked])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }))

    return (
        <Animated.View style={animatedStyle}>
            <Pressable
                onPress={item.onPress}
                disabled={item.isCompleted}
                style={{
                    opacity: item.isCompleted ? 0.6 : 1,
                    paddingVertical: 10,
                    paddingHorizontal: isNextIncomplete ? 8 : 0,
                    backgroundColor: isNextIncomplete && !item.isCompleted ? '#f0f9ff' : 'transparent',
                    borderRadius: 10,
                    marginHorizontal: isNextIncomplete ? -8 : 0,
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ marginRight: 12 }}>
                        {item.isCompleted ? (
                            <CheckCircle2 size={22} color="#2563eb" />
                        ) : item.isLocked ? (
                            <Lock size={18} color="#9ca3af" />
                        ) : (
                            <Circle size={22} color={isNextIncomplete ? '#3b82f6' : '#d1d5db'} />
                        )}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text
                            style={{
                                fontSize: 15,
                                color: item.isCompleted
                                    ? '#9ca3af'
                                    : item.isLocked
                                        ? '#9ca3af'
                                        : isNextIncomplete
                                            ? '#1e40af'
                                            : '#111827',
                                fontFamily: item.isCompleted ? 'Pretendard-Regular' : 'Pretendard-Medium',
                                textDecorationLine: item.isCompleted ? 'line-through' : 'none',
                            }}
                        >
                            {t(item.titleKey)}
                        </Text>
                    </View>
                    {!item.isCompleted && item.onPress && !item.isLocked && (
                        <ChevronRight size={18} color={isNextIncomplete ? '#3b82f6' : '#9ca3af'} />
                    )}
                </View>
            </Pressable>
        </Animated.View>
    )
}

function OnboardingChecklistWithModal(props: OnboardingChecklistProps) {
    const { t } = useTranslation()
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
    const [showNotificationModal, setShowNotificationModal] = React.useState(false)

    const [localNotificationEnabled, setLocalNotificationEnabled] = React.useState(false)

    const isNotificationCompleted = props.hasSetNotifications || localNotificationEnabled
    const isTutorialCompleted = props.hasCompletedTutorial ?? false

    // Expiration Logic: Hide if > 7 days since signup
    const isExpired = React.useMemo(() => {
        if (!props.signupDate) return false
        try {
            const signup = parseISO(props.signupDate) // Supabase returns ISO string
            const now = new Date()
            const daysSinceSignup = differenceInDays(now, signup)
            return daysSinceSignup > 7
        } catch (e) {
            console.error('Invalid signup date format', e)
            return false
        }
    }, [props.signupDate])

    const items: OnboardingItem[] = [
        {
            id: 'guide',
            titleKey: 'onboarding.guide',
            isCompleted: isTutorialCompleted,
            onPress: () => {
                if (!isTutorialCompleted) {
                    // @ts-ignore
                    navigation.navigate('Tutorial')
                }
            },
        },
        {
            id: 'create_goal',
            titleKey: 'onboarding.createGoal',
            isCompleted: props.hasCreatedGoal,
            onPress: () => {
                if (!props.hasCreatedGoal) {
                    // @ts-ignore
                    navigation.navigate('CreateMandalart')
                }
            },
        },
        {
            id: 'notification',
            titleKey: 'onboarding.notification',
            isCompleted: isNotificationCompleted,
            onPress: () => {
                if (!isNotificationCompleted) {
                    setShowNotificationModal(true)
                }
            }
        },
        {
            id: 'first_action',
            titleKey: 'onboarding.firstAction',
            isCompleted: props.hasFirstAction,
            isLocked: !props.hasCreatedGoal,
            onPress: () => {
                if (!props.hasCreatedGoal) {
                    if (Platform.OS === 'android') {
                        ToastAndroid.show(t('onboarding.lockedAlert'), ToastAndroid.SHORT)
                    } else {
                        Alert.alert(t('common.notice', '알림'), t('onboarding.lockedAlert'))
                    }
                    return
                }

                if (!props.hasFirstAction) {
                    // @ts-ignore
                    navigation.navigate('Main', { screen: 'Today' })
                }
            }
        },
    ]

    const completedCount = items.filter(i => i.isCompleted).length
    const totalCount = items.length
    const progress = (completedCount / totalCount) * 100

    // Find the next incomplete item (excluding locked)
    const nextIncompleteIndex = items.findIndex(i => !i.isCompleted && !i.isLocked)

    // Hide if all completed OR expiration period passed
    if (completedCount === totalCount || isExpired) return null

    return (
        <>
            {/* Gradient Border Container */}
            <Animated.View
                entering={FadeInUp.delay(200).duration(400)}
                style={{
                    borderRadius: 18,
                    padding: 2, // Border width
                    marginBottom: 20,
                }}
            >
                <LinearGradient
                    colors={['#3b82f6', '#8b5cf6', '#ec4899']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                        borderRadius: 18,
                        padding: 2,
                    }}
                >
                    <View
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: 16,
                            padding: 20,
                        }}
                    >
                        {/* Header */}
                        <View style={{ marginBottom: 16 }}>
                            <Text
                                style={{
                                    fontSize: 18,
                                    color: '#111827',
                                    marginBottom: 4,
                                    fontFamily: 'Pretendard-Bold',
                                }}
                            >
                                {t('onboarding.title', 'Welcome to MandaAct!')}
                            </Text>
                            <Text
                                style={{
                                    fontSize: 14,
                                    color: '#6b7280',
                                    fontFamily: 'Pretendard-Regular',
                                }}
                            >
                                {t('onboarding.subtitle', 'Complete these steps to get started.')}
                            </Text>
                        </View>

                        {/* Progress Bar */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <View
                                style={{
                                    flex: 1,
                                    height: 6,
                                    backgroundColor: '#e5e7eb',
                                    borderRadius: 3,
                                    overflow: 'hidden',
                                    marginRight: 12,
                                }}
                            >
                                <LinearGradient
                                    colors={['#3b82f6', '#8b5cf6']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={{
                                        height: '100%',
                                        width: `${progress}%`,
                                        borderRadius: 3,
                                    }}
                                />
                            </View>
                            <Text
                                style={{
                                    fontSize: 13,
                                    fontFamily: 'Pretendard-Bold',
                                    color: '#3b82f6',
                                }}
                            >
                                {completedCount}/{totalCount}
                            </Text>
                        </View>

                        {/* Checklist Items */}
                        <View style={{ gap: 4 }}>
                            {items.map((item, index) => (
                                <AnimatedChecklistItem
                                    key={item.id}
                                    item={item}
                                    isNextIncomplete={index === nextIncompleteIndex}
                                    t={t}
                                />
                            ))}
                        </View>
                    </View>
                </LinearGradient>
            </Animated.View>

            <NotificationPrimerModal
                visible={showNotificationModal}
                onClose={() => setShowNotificationModal(false)}
                onSuccess={() => {
                    setLocalNotificationEnabled(true)
                }}
            />
        </>
    )
}

export { OnboardingChecklistWithModal as OnboardingChecklist }
