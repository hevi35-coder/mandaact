import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
} from 'react-native'
import { X, Check, Lightbulb, Sparkles, RefreshCcw, ChevronDown, ChevronUp, PlusCircle } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { useTranslation } from 'react-i18next'
import { coachingService } from '../services/coachingService'

interface SubGoalModalV2Props {
  visible: boolean
  onClose: () => void
  initialTitle: string
  onSave: (title: string, description?: string) => void
  coreGoal: string
  existingSubGoals?: string[]  // NEW: Already selected sub-goals to exclude from suggestions
}

const cleanKeyword = (keyword: string): string => {
  if (!keyword) return '';
  return keyword
    .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]+$/, '') // Remove trailing symbols/punctuation
    .replace(/\s*[(\[{]$/, '') // Remove trailing open brackets/braces
    .replace(/\s*[(\[{][^)\]}]*$/, '') // Remove hanging open brackets that aren't closed
    .trim();
};

export default function SubGoalModalV2({
  visible,
  onClose,
  initialTitle,
  onSave,
  coreGoal,
  existingSubGoals = [],
}: SubGoalModalV2Props) {
  const { t, i18n } = useTranslation()
  const [title, setTitle] = useState('')
  const [suggestions, setSuggestions] = useState<{ keyword: string; description: string }[]>([])
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [isGuideExpanded, setIsGuideExpanded] = useState(false)

  // Animation for loading spinner
  const [spinValue] = useState(new Animated.Value(0))

  useEffect(() => {
    if (isSuggesting || processingSuggestion !== null) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start()
    } else {
      spinValue.setValue(0)
    }
  }, [isSuggesting, processingSuggestion])

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  })

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle)
    }
  }, [visible, initialTitle])

  /* State */
  const [processingSuggestion, setProcessingSuggestion] = useState<number | null>(null);

  const fetchSuggestions = async () => {
    if (!coreGoal || isSuggesting) return

    setIsSuggesting(true)

    // Add a 20-second timeout to avoid hanging UI
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), 20000)
    )

    try {
      const result = await Promise.race([
        coachingService.suggestSubGoals({
          coreGoal,
          language: i18n.language,
          existingSubGoals,  // Pass already-selected sub-goals for exclusion
        }),
        timeoutPromise
      ]) as any

      console.log('[SubGoalModalV2] Raw AI response:', JSON.stringify(result, null, 2));

      // coachingService.suggestSubGoals already returns the sub_goals array
      // So result IS the array, not an object with sub_goals property
      const subGoals = Array.isArray(result) ? result : (result.sub_goals || result || []);

      console.log('[SubGoalModalV2] SubGoals array:', JSON.stringify(subGoals, null, 2));

      // Map to UI format
      const cleanedSuggestions = subGoals.map((item: any) => {
        console.log('[SubGoalModalV2] Processing item:', item);
        return {
          keyword: item.keyword || item.title || '',
          description: item.description || item.reason || ''
        };
      });

      console.log('[SubGoalModalV2] Cleaned suggestions:', cleanedSuggestions);
      setSuggestions(cleanedSuggestions)
    } catch (err: any) {
      console.error('Failed to fetch sub-goal suggestions:', err)
      if (err.message === 'TIMEOUT') {
        // Handle timeout specifically
      }
      setSuggestions([])
    } finally {
      setIsSuggesting(false)
    }
  }

  const handleSave = () => {
    onSave(title)
    onClose()
  }

  const handleApplySuggestion = async (keyword: string, description: string, index: number) => {
    // v21.4: Direct application from structured data (Speed & Reliability Fix)
    console.log('[SubGoalModalV2] handleApplySuggestion called with:', keyword, description);
    try {
      setProcessingSuggestion(index);

      const cleanedKeyword = cleanKeyword(keyword);

      console.log('[SubGoalModalV2] Applying values - keyword:', cleanedKeyword, 'desc:', description);

      setTitle(cleanedKeyword);

      console.log('[SubGoalModalV2] Calling onSave with keyword and description...');
      await onSave(cleanedKeyword, description);
      console.log('[SubGoalModalV2] onSave completed successfully');

      onClose();
    } catch (e: any) {
      console.error("[SubGoalModalV2] Save failed:", e);
      onClose();
    } finally {
      setProcessingSuggestion(null);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={onClose}
        >
          <Pressable
            className="bg-white rounded-t-3xl max-h-[90%]"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between p-5 border-b border-gray-100">
              <View className="flex-row items-center">
                <Pressable onPress={onClose} className="p-1 mr-3 rounded-full active:bg-gray-100">
                  <X size={24} color="#374151" />
                </Pressable>
                <Text className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Pretendard-Bold' }}>
                  {t('mandalart.subGoalEdit.title')}
                </Text>
              </View>
              <Pressable
                onPress={handleSave}
                className="rounded-2xl overflow-hidden"
              >
                <LinearGradient
                  colors={['#2563eb', '#9333ea', '#db2777']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16 }}
                >
                  <Text className="text-white font-bold" style={{ fontFamily: 'Pretendard-Bold' }}>{t('common.done')}</Text>
                </LinearGradient>
              </Pressable>
            </View>

            <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
              {/* Sub Goal Title Input */}
              <View className="mb-6">
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t('mandalart.modal.subGoal.subGoalPlaceholder')}
                  className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-lg text-gray-900"
                  placeholderTextColor="#9ca3af"
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                  style={{
                    fontFamily: 'Pretendard-SemiBold',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.02,
                    shadowRadius: 2,
                    elevation: 1
                  }}
                />
              </View>

              {/* Goal Writing Guide (Collapsible) */}
              <View className="bg-blue-50/50 rounded-3xl mb-6 border border-blue-100/50 overflow-hidden">
                <Pressable
                  onPress={() => setIsGuideExpanded(!isGuideExpanded)}
                  className="p-5 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center">
                    <View className="bg-blue-100 p-2 rounded-xl mr-3">
                      <Lightbulb size={18} color="#2563eb" />
                    </View>
                    <Text
                      className="text-lg font-bold text-blue-900"
                      style={{ fontFamily: 'Pretendard-Bold' }}
                    >
                      {t('mandalart.modal.subGoal.guide.title')}
                    </Text>
                  </View>
                  {isGuideExpanded ? (
                    <ChevronUp size={20} color="#2563eb" />
                  ) : (
                    <ChevronDown size={20} color="#2563eb" />
                  )}
                </Pressable>

                {isGuideExpanded && (
                  <View className="px-5 pb-5 gap-y-4">
                    {[1, 2, 3].map((num) => (
                      <View key={num} className="flex-row items-start">
                        <View className="w-1.5 h-1.5 rounded-full bg-blue-300 mt-2 mr-3" />
                        <View className="flex-1">
                          <Text
                            className="text-[15px] font-bold text-blue-900 mb-0.5"
                            style={{ fontFamily: 'Pretendard-Bold' }}
                          >
                            {t(`mandalart.modal.subGoal.guide.tip${num}_title`)}
                          </Text>
                          <Text className="text-[13px] text-blue-800/70 leading-5" style={{ fontFamily: 'Pretendard-Medium' }}>
                            {t(`mandalart.modal.subGoal.guide.tip${num}_desc`)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* AI Recommendations Section */}
              <View className="bg-purple-50/50 rounded-3xl p-5 border border-purple-100/50">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="bg-purple-100 p-2 rounded-xl mr-3">
                      <Sparkles size={18} color="#9333ea" />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-lg font-bold text-purple-950"
                        numberOfLines={1}
                        style={{ fontFamily: 'Pretendard-Bold' }}
                      >
                        {t('mandalart.modal.subGoal.aiSuggest.title')}
                      </Text>
                      <Text className="text-[12px] text-purple-400 font-medium" style={{ fontFamily: 'Pretendard-Medium' }}>
                        {t('mandalart.modal.subGoal.aiSuggest.subtitle')}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={fetchSuggestions}
                    disabled={isSuggesting}
                    className="ml-2 px-4 py-2 bg-purple-600 rounded-xl active:bg-purple-700 disabled:bg-purple-300"
                  >
                    {isSuggesting ? (
                      <Text className="text-purple-200 font-bold text-sm" style={{ fontFamily: 'Pretendard-Bold' }}>
                        분석 중...
                      </Text>
                    ) : (
                      <Text className="text-white font-bold text-sm" style={{ fontFamily: 'Pretendard-Bold' }}>
                        {t('mandalart.modal.subGoal.aiSuggest.getHelp')}
                      </Text>
                    )}
                  </Pressable>
                </View>

                {(isSuggesting || suggestions.length > 0) && (
                  <View className="gap-y-3 mt-4">
                    {isSuggesting ? (
                      <View className="py-8 items-center justify-center">
                        <Animated.View style={{ transform: [{ rotate: spin }], marginBottom: 12, opacity: 0.5 }}>
                          <RefreshCcw size={24} color="#9333ea" />
                        </Animated.View>
                        <Text className="text-sm text-purple-400 font-medium" style={{ fontFamily: 'Pretendard-Medium' }}>
                          {t('mandalart.modal.subGoal.aiSuggest.loading')}
                        </Text>
                      </View>
                    ) : suggestions.length > 0 ? (
                      <>
                        {suggestions.slice(0, 3).map((suggestion, index) => {
                          const itemDescription = suggestion.description;
                          const itemKeyword = suggestion.keyword;

                          if (!itemDescription) return null;

                          const isProcessing = processingSuggestion === index;

                          const isBestMatch = index === 0;

                          return (
                            <Pressable
                              key={index}
                              onPress={() => !isProcessing && handleApplySuggestion(itemKeyword, itemDescription, index)}
                              className={`bg-white border rounded-2xl overflow-hidden active:opacity-90 ${isProcessing ? 'border-purple-300' : 'border-purple-100/50'
                                }`}
                              style={{
                                shadowColor: '#9333ea',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.04,
                                shadowRadius: 10,
                                elevation: 2,
                              }}
                            >
                              <LinearGradient
                                colors={isProcessing ? ['#faf5ff', '#f3e8ff'] : ['#ffffff', '#fafaff']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                className="px-4 pt-4 pb-3"
                              >
                                {isProcessing ? (
                                  <View className="flex-row items-center justify-center py-2">
                                    <Animated.View style={{ transform: [{ rotate: spin }], marginRight: 12 }}>
                                      <RefreshCcw size={18} color="#9333ea" />
                                    </Animated.View>
                                    <Text className="text-purple-600 font-bold text-sm" style={{ fontFamily: 'Pretendard-Bold' }}>
                                      {t('mandalart.modal.subGoal.aiSuggest.applying') || '생성된 계획 적용 중...'}
                                    </Text>
                                  </View>
                                ) : (
                                  <View className="flex-row items-start">
                                    <View className="flex-1">
                                      <View className="flex-row items-center mb-2 flex-wrap gap-y-1">
                                        <View className="bg-purple-100/80 px-3 py-1.5 rounded-lg border border-purple-200 mr-2">
                                          <Text className="text-[13px] text-purple-700 font-bold" style={{ fontFamily: 'Pretendard-Bold' }}>
                                            {cleanKeyword(itemKeyword)}
                                          </Text>
                                        </View>
                                        {isBestMatch && (
                                          <View className="bg-purple-600 px-2 py-0.5 rounded-full shadow-sm">
                                            <Text className="text-[10px] text-white font-bold" style={{ fontFamily: 'Pretendard-Bold' }}>
                                              ✨ 추천
                                            </Text>
                                          </View>
                                        )}
                                      </View>
                                      <Text
                                        className="text-[15px] text-gray-800 leading-6"
                                        style={{ fontFamily: 'Pretendard-Medium' }}
                                      >
                                        {itemDescription}
                                      </Text>
                                    </View>
                                    <View className="ml-3 mt-1 bg-purple-50 p-1.5 rounded-full">
                                      <PlusCircle size={20} color="#9333ea" />
                                    </View>
                                  </View>
                                )}
                              </LinearGradient>
                            </Pressable>
                          );
                        })}
                      </>
                    ) : null}
                  </View>
                )}
              </View>

              {/* Bottom padding for safe area */}
              <View className="h-10" />
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal >
  )
}
