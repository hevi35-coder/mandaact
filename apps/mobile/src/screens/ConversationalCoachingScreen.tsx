import React, { useState, useRef, useEffect } from 'react'
import { View, Text, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { Header } from '../components'
import { useCoachingStore, MandalartDraft, MandalartAction } from '../store/coachingStore'
import { coachingService } from '../services/coachingService'
import { useAuthStore } from '../store/authStore'
import { logger } from '../lib/logger'

export default function ConversationalCoachingScreen({ navigation }: { navigation: any }) {
    const { t } = useTranslation()
    const { user } = useAuthStore()
    const {
        sessionId,
        chatMessages,
        mandalartDraft,
        slotsFilled,
        addChatMessage,
        updateMandalartDraft,
        setSlotsFilled,
        startSession
    } = useCoachingStore()

    const [inputText, setInputText] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const scrollViewRef = useRef<ScrollView>(null)

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true })
        }, 100)
    }, [chatMessages])

    // Initialize session if not exists, or send greeting if empty
    useEffect(() => {
        if (!user?.id) return

        if (!sessionId) {
            startSession(user.id, 'working_professional').then(() => {
                addChatMessage('assistant', t('coaching.chat.greeting'))
            })
        } else if (chatMessages.length === 0) {
            // Session exists but no messages yet (newly started from gate)
            addChatMessage('assistant', t('coaching.chat.greeting'))
        }
    }, [sessionId, user?.id, t, chatMessages.length])

    const handleSend = async () => {
        if (!inputText.trim() || isLoading) return

        const userMessage = inputText.trim()
        setInputText('')
        addChatMessage('user', userMessage)
        setIsLoading(true)

        try {
            const response = await coachingService.chat({
                messages: [...chatMessages, { role: 'user', content: userMessage }],
                currentDraft: mandalartDraft
            }, sessionId)

            // Special check for successful 200 response that contains an error property
            if (response.error) {
                console.warn('AI Edge Function logic error:', response.error)
                addChatMessage('assistant', `[Debug Action Error] ${response.error}`)
                setIsLoading(false)
                return
            }

            addChatMessage('assistant', response.message)

            if (response.updated_draft) {
                // Cast actions to MandalartAction[] to satisfy TS
                const actions = (response.updated_draft.actions || []).map((a: any) => ({
                    ...a,
                    type: (a.type === 'habit' || a.type === 'task') ? a.type : 'task'
                })) as MandalartAction[]

                updateMandalartDraft({
                    center_goal: response.updated_draft.center_goal,
                    sub_goals: response.updated_draft.sub_goals,
                    actions: actions,
                    emergency_action: response.updated_draft.emergency_action
                })
            }

            if (response.slots_filled) {
                setSlotsFilled(response.slots_filled)
            }

        } catch (error: any) {
            // MUST be console.warn to avoid the red screen overlay during development
            console.warn('AI Coaching fetch error:', error)

            // Safely handle object errors to avoid [object Object]
            const errorMsg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error))
            addChatMessage('assistant', `[Debug Error] ${errorMsg}`)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            <Header title={t('coaching.title')} showBackButton navigation={navigation} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                {/* Progress Preview */}
                <View style={{
                    backgroundColor: 'white',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: '#f3f4f6',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1
                }}>
                    <View style={{ flex: 1, marginRight: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={{
                                fontSize: 10,
                                color: '#9ca3af',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                letterSpacing: 1
                            }}>{t('coaching.chat.mandalartDraft')}</Text>
                            <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 6 }}>
                                <Text style={{ fontSize: 8, color: '#3b82f6', fontWeight: 'bold' }}>{t('coaching.chat.aiPowered')}</Text>
                            </View>
                        </View>
                        <Text style={{ fontSize: 14, color: '#1f2937', fontWeight: '600' }} numberOfLines={1}>
                            {mandalartDraft.center_goal || t('coaching.step2.placeholder')}
                        </Text>
                    </View>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#f9fafb',
                        paddingHorizontal: 8,
                        paddingVertical: 6,
                        borderRadius: 20
                    }}>
                        {slotsFilled.map((slot) => (
                            <View key={slot} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1', marginLeft: 6 }} />
                        ))}
                        {Array.from({ length: Math.max(0, 4 - slotsFilled.length) }).map((_, i) => (
                            <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#e5e7eb', marginLeft: 6 }} />
                        ))}
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
                                onChangeText={(text) => setInputText(text)}
                                editable={!isLoading}
                                placeholderTextColor="#9ca3af"
                                returnKeyType="send"
                                onSubmitEditing={handleSend}
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
                                    onPress={handleSend}
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
                    {content}
                </Text>
            </View>
        </View>
    )
})
