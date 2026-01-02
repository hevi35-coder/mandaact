import React, { useEffect, useRef, useState, useCallback } from 'react'
import { View, Text, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { Header } from '../components'
import { useCoachingStore, MandalartDraft, MandalartAction } from '../store/coachingStore'
import { coachingService } from '../services/coachingService'
import { useAuthStore } from '../store/authStore'
import { logger } from '../lib/logger'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/RootNavigator'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

export default function ConversationalCoachingScreen({ navigation: propNavigation }: { navigation: any }) {
    const { t, i18n } = useTranslation()
    const navigation = useNavigation<NavigationProp>()
    const { user } = useAuthStore()
    const {
        sessionId,
        currentStep,
        chatMessages,
        mandalartDraft,
        addChatMessage,
        startSession,
        commitCoachingResult,
        resetSession,
        syncStepFromServer
    } = useCoachingStore()

    // Stage labels mapping based on currentStep (v11.0 7-Step Silo)
    const getCurrentStageLabel = useCallback(() => {
        switch (currentStep) {
            case 1:
                return t('coaching.chat.stages.lifestyle', '라이프스타일 발견')
            case 2:
                return t('coaching.chat.stages.core_goal', '핵심 목표 설정')
            case 11:
                return t('coaching.chat.stages.resilience', '비상 대책 (Safety Net)')
            case 12:
                return t('coaching.chat.stages.finishing', '최종 점검')
            default:
                if (currentStep >= 3 && currentStep <= 10) {
                    return `세부목표 ${currentStep - 2} 설정`
                }
                return t('coaching.chat.stages.onboarding', '준비하기')
        }
    }, [currentStep, t])


    // Dynamic status text for the header subtitle (v9.6)
    // Dynamic status text for the header subtitle (v11.0)
    // Dynamic status text for the header subtitle (v11.1 12-Step Silo)
    const getCurrentStatusSubtitle = useCallback(() => {
        if (currentStep === 1) return t('coaching.chat.hints.lifestyle', '당신의 하루와 에너지를 들려주세요.')
        if (currentStep === 2) return mandalartDraft.center_goal ? '핵심 목표를 다듬는 중...' : t('coaching.chat.hints.goal', '가슴 뛰는 목표를 찾는 중...')

        // Steps 3-10: Sub-goals
        if (currentStep >= 3 && currentStep <= 10) {
            const subGoalIdx = currentStep - 2;
            return `세부목표 ${subGoalIdx} 설정 중... (${subGoalIdx}/8)`
        }

        if (currentStep === 11) return t('coaching.chat.hints.resilience', '힘든 날을 위한 안전망(Safety Net)을 만드는 중...')
        return t('coaching.chat.hints.general', '만다라트 완성을 앞두고 있어요!')
    }, [currentStep, mandalartDraft, t])


    const [inputText, setInputText] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isCommitting, setIsCommitting] = useState(false)
    const scrollViewRef = useRef<ScrollView>(null)
    const isInitializing = useRef(false)
    const inputRef = useRef<TextInput>(null)

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true })
        }, 100)
    }, [chatMessages])

    // Initialize session if not exists, or send greeting if empty
    useEffect(() => {
        if (!user?.id) return

        const initSession = async () => {
            // Guard against multiple initializations
            if (isInitializing.current) return

            if (!sessionId) {
                isInitializing.current = true
                await startSession(user.id, 'working_professional')
                // Check again if we already have messages before adding (safety)
                const currentMessages = useCoachingStore.getState().chatMessages
                if (currentMessages.length === 0) {
                    addChatMessage('assistant', t('coaching.chat.greeting'))
                }
                isInitializing.current = false
            } else if (chatMessages.length === 0) {
                isInitializing.current = true
                addChatMessage('assistant', t('coaching.chat.greeting'))
                isInitializing.current = false
            }
        }

        initSession()
    }, [sessionId, user?.id, t])

    const handleSend = async (messageOverride?: string) => {
        const finalMessage = (messageOverride || inputText).trim()
        if (!finalMessage || isLoading) return

        // CLEAR IMMEDIATELY AND SYNCHRONOUSLY
        setInputText('')
        inputRef.current?.setNativeProps({ text: '' }) // Force native clear
        inputRef.current?.clear()

        // Secondary safety clear after a short tick
        setTimeout(() => {
            inputRef.current?.setNativeProps({ text: '' })
            inputRef.current?.clear()
        }, 10)

        addChatMessage('user', finalMessage)
        setIsLoading(true)

        try {
            const response = await coachingService.chat({
                messages: [...chatMessages, { role: 'user', content: finalMessage }],
                currentDraft: mandalartDraft,
                language: i18n.language,
                step: currentStep, // explicit step passing
            }, sessionId)


            // Special check for successful 200 response that contains an error property
            if (response.error) {
                console.warn('AI Edge Function logic error:', response.error)
                addChatMessage('assistant', `[Debug Action Error] ${response.error} `)
                setIsLoading(false)
                return
            }

            let displayMessage = response.message
            // UI-side defense: if the message itself is a raw JSON string (e.g., parsing failed server-side)
            if (displayMessage && displayMessage.trim().startsWith('{')) {
                try {
                    const parsed = JSON.parse(displayMessage)
                    if (parsed.message) {
                        displayMessage = parsed.message
                    }
                } catch (e) {
                    // UI regex fallback for broken JSON
                    const messageMatch = displayMessage.match(/"message":\s*"([\s\S]*?)"/)
                    if (messageMatch) {
                        displayMessage = messageMatch[1].replace(/\\n/g, '\n')
                    }
                }
            }

            // Strip citations like [1], [1][3], [1,2] from display (v6.2)
            if (displayMessage) {
                // Remove citations
                displayMessage = displayMessage.replace(/\[\d+(?:,\s*\d+)*\]/g, '').trim()

                // Remove extra spaces but PRESERVE newlines (Important for formatting)
                // displayMessage = displayMessage.replace(/\s{2,}/g, ' ') 
            }

            // Support Split Bubbles (v11.2) - [SPLIT] tag from backend
            if (displayMessage.includes('[SPLIT]')) {
                const parts = displayMessage.split('[SPLIT]');
                parts.forEach((part) => {
                    const trimmedPart = part.trim();
                    if (trimmedPart) {
                        addChatMessage('assistant', trimmedPart);
                    }
                });
            } else {
                addChatMessage('assistant', displayMessage);
            }


            // Sync step state from server (v11.0)
            if (response.current_step && response.current_step !== currentStep) {
                // Determine if we have draft updates
                let draftToUpdate: Partial<MandalartDraft> = {};

                if (response.updated_draft) {
                    if (response.updated_draft.center_goal) draftToUpdate.center_goal = response.updated_draft.center_goal;
                    if (response.updated_draft.sub_goals) draftToUpdate.sub_goals = response.updated_draft.sub_goals;
                    if (response.updated_draft.actions) {
                        draftToUpdate.actions = (response.updated_draft.actions || []).map((a: any) => ({
                            ...a,
                            type: (a.type === 'habit' || a.type === 'task') ? a.type : 'task'
                        })) as MandalartAction[];
                    }
                    if (response.updated_draft.resilience_strategy || response.updated_draft.emergency_action) {
                        draftToUpdate.emergency_action = response.updated_draft.resilience_strategy || response.updated_draft.emergency_action;
                    }
                }

                syncStepFromServer(response.current_step, draftToUpdate)

                // AUTO-COMMIT if finalizing Step 12 (v11.3)
                if (currentStep >= 12 && response.next_step_ready) {
                    setTimeout(() => {
                        handleCommit();
                    }, 500); // Small delay to let user read the final message
                }
            } else if (response.updated_draft) {
                // Just update draft if step didn't change
                const draftToUpdate: Partial<MandalartDraft> = {};
                // ... (re-use logic or just rely on server sending full partial)
                if (response.updated_draft.sub_goals) draftToUpdate.sub_goals = response.updated_draft.sub_goals;
                // Ideally extract this mapping logic
                syncStepFromServer(currentStep, response.updated_draft)
            }

        } catch (error: any) {

            // MUST be console.warn to avoid the red screen overlay during development
            console.warn('AI Coaching fetch error:', error)

            // Safely handle object errors to avoid [object Object]
            const errorMsg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error))
            addChatMessage('assistant', `[Debug Error] ${errorMsg} `)
        } finally {
            setIsLoading(false)
        }
    }

    const handleCommit = async () => {
        if (!user?.id || isCommitting) return
        setIsCommitting(true)
        try {
            const mandalartId = await commitCoachingResult(user.id)
            if (mandalartId) {
                // Success! Alert user and navigate
                Alert.alert(
                    t('common.success'),
                    t('mandalart.create.success.created'),
                    [{
                        text: t('common.confirm'), onPress: () => {
                            resetSession()
                            navigation.replace('MandalartDetail', { id: mandalartId })
                        }
                    }]
                )
            } else {
                Alert.alert(t('common.error'), t('mandalart.create.errors.save'))
                console.error('Commit failed: no mandalartId returned')
            }
        } catch (error: any) {
            Alert.alert(t('common.error'), error?.message || t('mandalart.create.errors.save'))
            console.error('Failed to commit mandalart', error)
        } finally {
            setIsCommitting(false)
        }
    }

    const isCoachingComplete = currentStep >= 12;


    return (
        <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            <Header title={t('coaching.title')} showBackButton navigation={navigation} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                {/* Enhanced Draft & Progress Header */}
                <View style={{
                    backgroundColor: 'white',
                    paddingHorizontal: 16,
                    paddingTop: 16,
                    paddingBottom: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: '#f3f4f6',
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{
                                backgroundColor: '#6366f1',
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6,
                                marginRight: 8
                            }}>
                                <Text style={{ fontSize: 10, color: 'white', fontWeight: 'bold' }}>DRAFT</Text>
                            </View>
                            <Text style={{
                                fontSize: 13,
                                color: '#1f2937',
                                fontWeight: '700',
                                fontFamily: 'Pretendard-Bold'
                            }}>{getCurrentStageLabel()}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ fontSize: 10, color: '#9ca3af', marginRight: 4 }}>Powered by</Text>
                            <Text style={{ fontSize: 10, color: '#3b82f6', fontWeight: 'bold' }}>Perplexity AI</Text>
                        </View>
                    </View>

                    <Text style={{ fontSize: 16, color: '#111827', marginBottom: 12, fontWeight: '600' }} numberOfLines={1}>
                        {getCurrentStatusSubtitle()}
                    </Text>


                    <View style={{ height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                        <View style={{
                            height: '100%',
                            backgroundColor: '#6366f1',
                            width: `${Math.min(100, (currentStep / 12) * 100)}%`,
                            borderRadius: 3
                        }} />
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                        <Text style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'Pretendard-Regular' }}>
                            {t('coaching.chat.purpose', '대화하며 나의 만다라트가 완성됩니다')}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#6366f1', fontWeight: 'bold' }}>
                            {Math.round((Math.min(currentStep, 12) / 12) * 100)}%
                        </Text>
                    </View>

                </View>

                <ScrollView
                    ref={scrollViewRef}
                    style={{ flex: 1, paddingHorizontal: 16 }}
                    contentContainerStyle={{ paddingVertical: 20 }}
                    showsVerticalScrollIndicator={false}
                >
                    {chatMessages.map((msg, idx) => (
                        <MessageBubble key={idx} role={msg.role} content={msg.content} />
                    ))}
                    {isLoading && (
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            alignSelf: 'flex-start',
                            backgroundColor: '#f3f4f6',
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            borderRadius: 16,
                            borderTopLeftRadius: 0,
                            marginBottom: 16
                        }}>
                            <ActivityIndicator size="small" color="#6366f1" style={{ marginRight: 8 }} />
                            <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '500', fontFamily: 'Pretendard-Medium' }}>{t('coaching.chat.loading')}</Text>
                        </View>
                    )}

                    {/* Finalize CTA - Using a rock-solid solid background for maximum visibility */}
                    {isCoachingComplete && (
                        <View style={{
                            marginTop: 20,
                            marginBottom: 40,
                            paddingHorizontal: 16,
                        }}>
                            <Pressable
                                onPress={handleCommit}
                                disabled={isCommitting}
                                style={{
                                    width: '100%',
                                    height: 58,
                                    backgroundColor: isCommitting ? '#94a3b8' : '#10B981', // Solid Hex (Uppercase)
                                    borderRadius: 16,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'row',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.2,
                                    shadowRadius: 5,
                                    elevation: 6
                                }}
                            >
                                {isCommitting ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <>
                                        <Ionicons name="rocket" size={24} color="white" style={{ marginRight: 10 }} />
                                        <Text style={{
                                            color: '#FFFFFF',
                                            fontWeight: '900',
                                            fontSize: 18,
                                            fontFamily: 'Pretendard-Bold',
                                            textShadowColor: 'rgba(0,0,0,0.1)',
                                            textShadowOffset: { width: 0, height: 1 },
                                            textShadowRadius: 2
                                        }}>
                                            {'만다라트 완성하기 (Launch)'}
                                        </Text>
                                    </>
                                )}
                            </Pressable>
                            <Text style={{ textAlign: 'center', color: '#6b7280', fontSize: 13, marginTop: 14, fontWeight: '600', fontFamily: 'Pretendard-Medium' }}>
                                {'🚀 버튼을 누르면 나의 목표가 저장됩니다!'}
                            </Text>
                        </View>
                    )}
                </ScrollView>



                {/* Input Area */}
                <View style={{
                    backgroundColor: 'white',
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: 32,
                    borderTopWidth: 1,
                    borderTopColor: '#f3f4f6'
                }}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center', // Symmetry for single line
                        backgroundColor: '#f9fafb',
                        borderRadius: 24, // Slightly rounder for the smaller bar
                        borderWidth: 1,
                        borderColor: '#e5e7eb',
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        minHeight: 44 // Standard height for better proportion
                    }}>
                        <View style={{ flex: 1 }}>
                            <TextInput
                                ref={inputRef}
                                style={{
                                    maxHeight: 100,
                                    color: '#1f2937',
                                    fontSize: 15, // Slightly smaller for refinement
                                    paddingVertical: 8,
                                    paddingLeft: 4,
                                    fontFamily: 'Pretendard-Regular',
                                    textAlignVertical: 'center',
                                    includeFontPadding: false // Fix Android spacing
                                }}
                                // Fail-safe: Manually hide placeholder when text exists to prevent OS ghosting
                                placeholder={inputText ? "" : t('coaching.chat.placeholder')}
                                multiline
                                value={inputText}
                                onChangeText={(text) => {
                                    // Handle Enter key for multiline inputs on some platforms
                                    if (text.endsWith('\n') && !isLoading) {
                                        const cleanMsg = text.trim()
                                        if (cleanMsg) {
                                            handleSend(cleanMsg)
                                        } else {
                                            setInputText('')
                                            inputRef.current?.clear()
                                        }
                                    } else {
                                        setInputText(text)
                                    }
                                }}
                                editable={!isLoading}
                                placeholderTextColor="#9ca3af"
                                returnKeyType="send"
                                onSubmitEditing={() => {
                                    if (inputText.trim()) handleSend()
                                }}
                                onKeyPress={(e) => {
                                    if (e.nativeEvent.key === 'Enter' && !isLoading) {
                                        const msg = inputText.trim()
                                        if (msg) {
                                            handleSend(msg)
                                        }
                                        e.preventDefault()
                                    }
                                }}
                                blurOnSubmit={false}
                                selectionColor="#6366f1"
                            />
                        </View>
                        <View style={{
                            width: 40,
                            height: 40,
                            justifyContent: 'center',
                            alignItems: 'center',
                            flexShrink: 0,
                            marginLeft: 4,
                            zIndex: 100
                        }}>
                            {/* Wrapper View for solid background stability - Resized to 36x36 */}
                            <View style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: '#6366f1', // FORCED SOLID INDIGO
                                opacity: (inputText.length > 0 || isLoading) ? 1.0 : 0.4,
                                alignItems: 'center',
                                justifyContent: 'center',
                                elevation: 2,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.1,
                                shadowRadius: 2,
                                overflow: 'hidden'
                            }}>
                                <Pressable
                                    onPress={() => handleSend()}
                                    disabled={isLoading || !inputText.trim()}
                                    android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                                    style={({ pressed }) => ({
                                        flex: 1,
                                        width: '100%',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: pressed ? 'rgba(0,0,0,0.1)' : 'transparent'
                                    })}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Ionicons
                                            name="arrow-up"
                                            size={20} // Resized for balance
                                            color="white" // ALWAYS WHITE ON INDIGO
                                        />
                                    )}
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    )
}

const MessageBubble = React.memo(({ role, content }: { role: 'user' | 'assistant' | 'system', content: string }) => {
    const isAI = role === 'assistant'

    if (role === 'system') return null

    // Helper to parse **bold** markdown and handle paragraphs (v6.3)
    const renderContent = (text: string) => {
        if (!text) return null;

        // Split by single or double newlines to handle paragraphs
        const paragraphs = text.split(/\n+/);

        return paragraphs.map((paragraph, pIdx) => {
            const trimmedParagraph = paragraph.trim();
            if (!trimmedParagraph) return null;

            // Split by ** markers for bolding within the paragraph
            const parts = trimmedParagraph.split(/(\*\*.*?\*\*)/g);

            return (
                <View key={pIdx} style={{ marginBottom: pIdx < paragraphs.length - 1 ? 8 : 0 }}>
                    <Text
                        style={{
                            fontSize: 15,
                            lineHeight: 22,
                            color: isAI ? '#1f2937' : 'white',
                            fontFamily: 'Pretendard-Regular'
                        }}
                    >
                        {parts.map((part, index) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                const boldText = part.slice(2, -2);
                                return (
                                    <Text
                                        key={index}
                                        style={{
                                            fontWeight: 'bold',
                                            fontFamily: 'Pretendard-Bold'
                                        }}
                                    >
                                        {boldText}
                                    </Text>
                                );
                            }
                            return <Text key={index}>{part}</Text>;
                        })}
                    </Text>
                </View>
            );
        });
    };

    return (
        <View style={{
            marginBottom: 20,
            maxWidth: '85%',
            alignSelf: isAI ? 'flex-start' : 'flex-end'
        }}>
            <View style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                borderTopLeftRadius: isAI ? 4 : 20,
                borderTopRightRadius: isAI ? 20 : 4,
                backgroundColor: isAI ? 'white' : '#6366f1',
                borderWidth: isAI ? 1 : 0,
                borderColor: '#e5e7eb',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1
            }}>
                <Text
                    style={{
                        fontSize: 15,
                        lineHeight: 22,
                        color: isAI ? '#1f2937' : 'white',
                        fontFamily: 'Pretendard-Regular'
                    }}
                >
                    {renderContent(content)}
                </Text>
            </View>
        </View>
    )
})
