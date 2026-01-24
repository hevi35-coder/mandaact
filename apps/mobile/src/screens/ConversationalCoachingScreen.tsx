import React, { useEffect, useRef, useState, useCallback } from 'react'
import { View, Text, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Keyboard, Modal, FlatList, Animated, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { Header } from '../components'
import { useCoachingStore, MandalartDraft, MandalartAction } from '../store/coachingStore'
import { coachingService } from '../services/coachingService'
import { useAuthStore } from '../store/authStore'
import { logger } from '../lib/logger'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { TransitionBanner } from '../components/TransitionBanner'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

export default function ConversationalCoachingScreen({ navigation: propNavigation }: { navigation: any }) {
    const { t, i18n } = useTranslation()
    const navigation = useNavigation<NavigationProp>()
    const insets = useSafeAreaInsets()
    const [isKeyboardVisible, setKeyboardVisible] = useState(false)
    const [isPreviewVisible, setIsPreviewVisible] = useState(false)
    const [expandedSubGoals, setExpandedSubGoals] = useState<number[]>([])


    useEffect(() => {
        const showSubscription = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => setKeyboardVisible(true)
        )
        const hideSubscription = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setKeyboardVisible(false)
        )

        return () => {
            showSubscription.remove()
            hideSubscription.remove()
        }
    }, [])
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
                return t('coaching.chat.stages.lifestyle', '라이프스타일 탐구')
            case 2:
                return t('coaching.chat.stages.core_goal', '핵심 목표 설정')
            case 11:
                return t('coaching.chat.stages.resilience', '비상 대책 (Safety Net)')
            case 12:
                return t('coaching.chat.stages.finishing', '최종 점검')
            default:
                if (currentStep >= 3 && currentStep <= 10) {
                    return t('coaching.chat.subGoalSetting', { index: currentStep - 2 })
                }
                return t('coaching.chat.stages.onboarding', '준비하기')
        }
    }, [currentStep, t])


    // Dynamic status text for the header subtitle (v9.6)
    // Dynamic status text for the header subtitle (v11.0)
    // Dynamic status text for the header subtitle (v11.1 12-Step Silo)
    const getCurrentStatusSubtitle = useCallback(() => {
        if (currentStep === 1) return t('coaching.chat.hints.lifestyle', '당신의 하루와 에너지를 들려주세요.')
        if (currentStep === 2) return mandalartDraft.center_goal ? t('coaching.chat.hints.refiningGoal', '핵심 목표를 다듬는 중...') : t('coaching.chat.hints.goal', '가슴 뛰는 목표를 찾는 중...')

        // Steps 3-10: Sub-goals
        if (currentStep >= 3 && currentStep <= 10) {
            const subGoalIdx = currentStep - 2;
            return t('coaching.chat.hints.subGoal', { index: subGoalIdx })
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

    // v17.0: History navigation state
    const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false)
    const [completedSessions, setCompletedSessions] = useState<{ id: string; center_goal: string; created_at: string }[]>([])
    const [isLoadingHistory, setIsLoadingHistory] = useState(false)

    // v18.2: Button-based step transition
    const [transitionReady, setTransitionReady] = useState(false)

    // v18.9: Sticky Readiness for Step 12
    const [hasSeenFinalizeInStep12, setHasSeenFinalizeInStep12] = useState(false);
    useEffect(() => {
        if (currentStep >= 12 && transitionReady) {
            setHasSeenFinalizeInStep12(true);
        }
    }, [currentStep, transitionReady]);

    // v18.6: Coaching Status Helpers
    const isCoachingComplete = currentStep >= 12 && (transitionReady || hasSeenFinalizeInStep12);

    // v18.9.5: Animation for the Final Launch Button (Premium 2.1 - Slide Up + Fade)
    const launchBtnOpacity = useRef(new Animated.Value(0)).current;
    const launchBtnTranslateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        if (isCoachingComplete) {
            console.log('[UI] Triggering Finalize Button Animation');

            // Entrance animation: Slide up and Fade in
            Animated.parallel([
                Animated.timing(launchBtnOpacity, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.spring(launchBtnTranslateY, {
                    toValue: 0,
                    friction: 7,
                    tension: 40,
                    useNativeDriver: true,
                })
            ]).start();

            // Pulse Loop
            Animated.loop(
                Animated.sequence([
                    Animated.timing(launchBtnOpacity, { toValue: 0.85, duration: 1500, useNativeDriver: true }),
                    Animated.timing(launchBtnOpacity, { toValue: 1, duration: 1500, useNativeDriver: true })
                ])
            ).start();

            // v18.9.5: More aggressive scroll to ensure button is seen
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 800);
        } else {
            launchBtnOpacity.setValue(0);
            launchBtnTranslateY.setValue(20);
        }
    }, [isCoachingComplete]);

    // Fetch completed coaching sessions for history navigation
    const fetchCompletedSessions = useCallback(async () => {
        if (!user?.id) return
        setIsLoadingHistory(true)
        try {
            const { data, error } = await supabase
                .from('coaching_sessions')
                .select('id, metadata, created_at')
                .eq('user_id', user.id)
                .eq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(10)

            if (error) throw error

            const sessions = (data || []).map(s => ({
                id: s.id,
                center_goal: s.metadata?.draft?.center_goal || s.metadata?.core_goal_summary?.goal || 'Unknown Goal',
                created_at: s.created_at
            }))
            setCompletedSessions(sessions)
        } catch (error) {
            console.error('Failed to fetch completed sessions:', error)
        } finally {
            setIsLoadingHistory(false)
        }
    }, [user?.id])

    const handleOpenHistory = useCallback(() => {
        fetchCompletedSessions()
        setIsHistoryModalVisible(true)
    }, [fetchCompletedSessions])

    const handleSelectSession = useCallback((selectedSessionId: string) => {
        setIsHistoryModalVisible(false)
        navigation.navigate('CoachingHistory', { sessionId: selectedSessionId })
    }, [navigation])

    // v18.4: Restore transition_ready state and draft from session metadata on screen focus
    useFocusEffect(
        useCallback(() => {
            const restoreSessionState = async () => {
                if (!sessionId) return;

                try {
                    const { data, error } = await supabase
                        .from('coaching_sessions')
                        .select('metadata')
                        .eq('id', sessionId)
                        .single();

                    console.log('[SessionRestore] sessionId:', sessionId);
                    console.log('[SessionRestore] metadata.transition_ready:', data?.metadata?.transition_ready);

                    // Restore transition state
                    if (data?.metadata?.transition_ready === true) {
                        console.log('[SessionRestore] Setting transitionReady to true');
                        setTransitionReady(true);
                        setTimeout(() => {
                            scrollViewRef.current?.scrollToEnd({ animated: true });
                        }, 300);
                    } else {
                        setTransitionReady(false);
                    }

                    // v18.5: Restore mandalartDraft from metadata.draft (Single Source of Truth)
                    if (data?.metadata?.draft) {
                        const serverDraft = data.metadata.draft;
                        const metadata = data.metadata;
                        console.log('[SessionRestore] Restoring draft - sub_goals:', serverDraft.sub_goals?.length, 'actions:', serverDraft.actions?.length);

                        // Use syncStepFromServer to update draft in store (includes lifestyle)
                        const restoredDraft = {
                            center_goal: serverDraft.center_goal || '',
                            center_goal_detail: serverDraft.center_goal_detail || '',
                            sub_goals: serverDraft.sub_goals || Array(8).fill(''),
                            sub_goals_detail: serverDraft.sub_goals_detail || Array(8).fill(''),
                            actions: serverDraft.actions || [],
                            emergency_action: serverDraft.emergency_action || '',
                            // v18.5: Lifestyle from metadata (Step 1 summary_data)
                            lifestyle_routine: metadata.lifestyle_routine || serverDraft.lifestyle_routine || '',
                            lifestyle_energy: metadata.lifestyle_energy || serverDraft.lifestyle_energy || ''
                        };
                        console.log('[SessionRestore] lifestyle_routine:', restoredDraft.lifestyle_routine?.substring(0, 50) || 'EMPTY');
                        console.log('[SessionRestore] emergency_action:', restoredDraft.emergency_action?.substring(0, 50) || 'EMPTY');
                        syncStepFromServer(currentStep, restoredDraft);
                    }
                } catch (err) {
                    console.error('Failed to restore session state:', err);
                }
            };

            restoreSessionState();
        }, [sessionId])
    );

    // Auto-scroll to bottom when messages or keyboard change
    useEffect(() => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true })
        }, 100)
    }, [chatMessages, isKeyboardVisible, transitionReady])

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
                    // v18.4: Handle {summary, detail} format
                    if (response.updated_draft.center_goal) {
                        const cg = response.updated_draft.center_goal;
                        draftToUpdate.center_goal = typeof cg === 'object' ? cg.summary || cg : cg;
                        if (typeof cg === 'object' && cg.detail) {
                            draftToUpdate.center_goal_detail = cg.detail;
                        }
                    }
                    if (response.updated_draft.sub_goals && Array.isArray(response.updated_draft.sub_goals)) {
                        draftToUpdate.sub_goals = response.updated_draft.sub_goals.map((sg: any) =>
                            typeof sg === 'object' ? sg.summary || sg : sg
                        );
                        draftToUpdate.sub_goals_detail = response.updated_draft.sub_goals.map((sg: any) =>
                            typeof sg === 'object' ? sg.detail || sg.summary || sg : sg
                        );
                    }
                    if (response.updated_draft.actions) {
                        draftToUpdate.actions = (response.updated_draft.actions || []).map((a: any) => ({
                            sub_goal: a.sub_goal || '',
                            content: a.content || a.title || a.summary || '',
                            summary: a.summary || a.content || a.title || '',
                            detail: a.detail || '',
                            type: ['routine', 'mission', 'reference'].includes(a.type) ? a.type : 'mission'
                        })) as MandalartAction[];
                    }
                    if (response.updated_draft.resilience_strategy || response.updated_draft.emergency_action) {
                        draftToUpdate.emergency_action = response.updated_draft.resilience_strategy || response.updated_draft.emergency_action;
                    }
                }

                syncStepFromServer(response.current_step, draftToUpdate)

                // AUTO-COMMIT if finalizing Step 12 (v11.3)
                // v18.9: Use transition_ready consistently
                if (currentStep >= 12 && response.transition_ready) {
                    setTimeout(() => {
                        handleCommit();
                    }, 1500); // Give user time to read the final celebration message
                }
            } else if (response.updated_draft) {
                // Update draft even if step didn't change (v17.0: Fix action sync)
                const draftToUpdate: Partial<MandalartDraft> = {};

                if (response.updated_draft.center_goal) {
                    // v18.4: Handle {summary, detail} format for center_goal
                    const cg = response.updated_draft.center_goal;
                    draftToUpdate.center_goal = typeof cg === 'object' ? cg.summary || cg : cg;
                    if (typeof cg === 'object' && cg.detail) {
                        draftToUpdate.center_goal_detail = cg.detail;
                    }
                }
                if (response.updated_draft.sub_goals && Array.isArray(response.updated_draft.sub_goals)) {
                    // v18.4: Extract summary and detail separately
                    draftToUpdate.sub_goals = response.updated_draft.sub_goals.map((sg: any) =>
                        typeof sg === 'object' ? sg.summary || sg : sg
                    );
                    draftToUpdate.sub_goals_detail = response.updated_draft.sub_goals.map((sg: any) =>
                        typeof sg === 'object' ? sg.detail || sg.summary || sg : sg
                    );
                }
                // v17.0: CRITICAL - Always sync actions from server response
                if (response.updated_draft.actions && Array.isArray(response.updated_draft.actions)) {
                    draftToUpdate.actions = response.updated_draft.actions.map((a: any) => ({
                        sub_goal: a.sub_goal || '',
                        content: a.content || a.title || a.summary || '',
                        // v18.4: Include summary and detail for preview
                        summary: a.summary || a.content || a.title || '',
                        detail: a.detail || '',
                        type: ['routine', 'mission', 'reference'].includes(a.type) ? a.type : 'mission'
                    })) as MandalartAction[];
                }
                if (response.updated_draft.emergency_action || response.updated_draft.resilience_strategy) {
                    draftToUpdate.emergency_action = response.updated_draft.emergency_action || response.updated_draft.resilience_strategy;
                }

                syncStepFromServer(currentStep, draftToUpdate);
            }

            // v18.2: Handle transition_ready signal from server
            setTransitionReady(!!response.transition_ready);

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

    const handleResetSession = useCallback(() => {
        Alert.alert(
            t('coaching.resetConfirmTitle', '코칭 초기화'),
            t('coaching.resetConfirmMessage', '코칭을 처음부터 다시 시작하시겠습니까? 현재 진행 중인 대화와 초안이 삭제됩니다.'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('coaching.reset', '초기화'),
                    style: 'destructive',
                    onPress: async () => {
                        resetSession()
                        // Optionally refresh the screen by re-triggering greeting
                        addChatMessage('assistant', t('coaching.chat.greeting'))
                    }
                }
            ]
        )
    }, [resetSession, t, addChatMessage])

    // v18.2: Handle user clicking "다음으로" button
    const handleForceNextStep = useCallback(async () => {
        if (!sessionId) return;

        // v18.9.6: Structural UX change - if we are moving to Step 12, keep the readiness active
        // so the 'Finalize' button appears immediately.
        const isEnteringStep12 = currentStep === 11;
        if (!isEnteringStep12) {
            setTransitionReady(false);
        }
        setIsLoading(true);

        try {
            const response = await coachingService.forceNextStep({
                currentStep,
            }, sessionId);

            if (response.success) {
                const newStep = response.current_step;

                // v18.2.1: Auto-trigger AI to start the new step (no confirmation needed)
                const nextStepResponse = await coachingService.chat({
                    messages: [...chatMessages, { role: 'user', content: '__STEP_TRANSITION__' }],
                    currentDraft: mandalartDraft,
                    language: i18n.language,
                    step: newStep,
                }, sessionId);

                if (nextStepResponse.message) {
                    addChatMessage('assistant', nextStepResponse.message);
                }

                // v19.9: Sync both step AND draft updates from chat response
                // This ensures TransitionBanner shows correct next step label
                let draftToUpdate: Partial<MandalartDraft> = {};
                if (nextStepResponse.updated_draft) {
                    if (nextStepResponse.updated_draft.center_goal) {
                        const cg = nextStepResponse.updated_draft.center_goal;
                        draftToUpdate.center_goal = typeof cg === 'object' ? cg.summary || cg : cg;
                        if (typeof cg === 'object' && cg.detail) {
                            draftToUpdate.center_goal_detail = cg.detail;
                        }
                    }
                    if (nextStepResponse.updated_draft.sub_goals && Array.isArray(nextStepResponse.updated_draft.sub_goals)) {
                        draftToUpdate.sub_goals = nextStepResponse.updated_draft.sub_goals.map((sg: any) =>
                            typeof sg === 'object' ? sg.summary || sg : sg
                        );
                    }
                    if (nextStepResponse.updated_draft.actions && Array.isArray(nextStepResponse.updated_draft.actions)) {
                        draftToUpdate.actions = nextStepResponse.updated_draft.actions.map((a: any) => ({
                            sub_goal: a.sub_goal || '',
                            content: a.content || a.title || a.summary || '',
                            summary: a.summary || a.content || a.title || '',
                            detail: a.detail || '',
                            type: ['routine', 'mission', 'reference'].includes(a.type) ? a.type : 'mission'
                        })) as MandalartAction[];
                    }
                }
                syncStepFromServer(newStep, draftToUpdate);

                // Handle transition_ready for the new step
                if (nextStepResponse.transition_ready) {
                    setTransitionReady(true);
                }
            }
        } catch (error: any) {
            console.error('Force next step failed:', error);
            addChatMessage('assistant', `[Error] ${error?.message || t('common.error')}`);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, currentStep, chatMessages, mandalartDraft, i18n.language, syncStepFromServer, addChatMessage]);


    // v18.2: Handle user clicking "더 이야기하기" button
    const handleContinueChat = useCallback(async () => {
        setTransitionReady(false);

        // v18.4: Clear transition_ready in session metadata
        if (sessionId) {
            try {
                const { data } = await supabase
                    .from('coaching_sessions')
                    .select('metadata')
                    .eq('id', sessionId)
                    .single();

                if (data?.metadata) {
                    await supabase
                        .from('coaching_sessions')
                        .update({ metadata: { ...data.metadata, transition_ready: false } })
                        .eq('id', sessionId);
                }
            } catch (err) {
                console.error('Failed to clear transition state:', err);
            }
        }

        // Focus input for user to continue typing
        inputRef.current?.focus();
    }, [sessionId]);




    return (
        <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            <Header
                title={t('coaching.title')}
                showBackButton
                navigation={navigation}
                rightElement={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {/* Reset Button - Starts session over */}
                        <Pressable
                            onPress={handleResetSession}
                            style={{
                                padding: 8,
                                backgroundColor: '#fee2e2',
                                borderRadius: 20
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        </Pressable>
                        {/* History Button - Shows past coaching sessions */}
                        <Pressable
                            onPress={handleOpenHistory}
                            style={{
                                padding: 8,
                                backgroundColor: '#f3f4f6',
                                borderRadius: 20
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="time-outline" size={20} color="#6b7280" />
                        </Pressable>
                        {/* Preview Button - Shows current draft */}
                        {mandalartDraft.center_goal && (
                            <Pressable
                                onPress={() => setIsPreviewVisible(true)}
                                style={{
                                    padding: 8,
                                    backgroundColor: '#f3f4f6',
                                    borderRadius: 20
                                }}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="list-outline" size={20} color="#6366f1" />
                            </Pressable>
                        )}
                    </View>
                }
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={0}
            >
                {/* Draft Summary Header - Option A (No sync issues) */}
                <View style={{
                    backgroundColor: 'white',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: '#f3f4f6',
                }}>
                    {/* Core Goal Row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <View style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: mandalartDraft.center_goal ? '#e0e7ff' : '#f3f4f6',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 8
                        }}>
                            <Ionicons
                                name={mandalartDraft.center_goal ? "disc-outline" : "help-circle-outline"}
                                size={14}
                                color={mandalartDraft.center_goal ? "#6366f1" : "#9ca3af"}
                            />
                        </View>
                        <Text style={{
                            fontSize: 15,
                            color: mandalartDraft.center_goal ? '#111827' : '#6b7280',
                            fontWeight: '700',
                            fontFamily: 'Pretendard-Bold',
                            flex: 1
                        }} numberOfLines={1}>
                            {mandalartDraft.center_goal || t('coaching.chat.status.notSet', '아직 목표가 설정되지 않았습니다')}
                        </Text>
                    </View>

                    {/* Stats Row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                                <Ionicons name="grid-outline" size={12} color="#10b981" style={{ marginRight: 4 }} />
                                <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '500', fontFamily: 'Pretendard-Medium' }}>
                                    {t('coaching.chat.status.subGoals', '세부목표')}
                                </Text>
                                <Text style={{ fontSize: 13, color: '#059669', fontWeight: '700', fontFamily: 'Pretendard-Bold', marginLeft: 4 }}>
                                    {(mandalartDraft.sub_goals || []).filter(g => g && g.trim()).length}/8
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="flash-outline" size={12} color="#6b7280" style={{ marginRight: 4 }} />
                                <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '500', fontFamily: 'Pretendard-Medium' }}>
                                    {t('coaching.chat.status.actions', '실천항목')}
                                </Text>
                                <Text style={{ fontSize: 13, color: '#4b5563', fontWeight: '600', fontFamily: 'Pretendard-SemiBold', marginLeft: 4 }}>
                                    {(mandalartDraft.actions || []).length}
                                </Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{
                                backgroundColor: '#ede9fe',
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 6,
                                flexDirection: 'row',
                                alignItems: 'center',
                                borderWidth: 0.5,
                                borderColor: '#ddd6fe'
                            }}>
                                <Text style={{ fontSize: 9, color: '#7c3aed', fontWeight: '800', fontFamily: 'Pretendard-Bold' }}>{t('coaching.chat.draft', '초안')}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <ScrollView
                    ref={scrollViewRef}
                    style={{ flex: 1, paddingHorizontal: 16 }}
                    contentContainerStyle={{ paddingVertical: 20 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    scrollEnabled={true}
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

                    {/* v18.7: Step Transition Banner - Only show when ready and NOT already complete */}
                    {/* v20.1: Only show from Step 3+ (sub-goal steps) since Step 1→2 flows naturally */}
                    {transitionReady && !isLoading && !isCoachingComplete && currentStep >= 2 && (
                        <View style={{ marginBottom: 20 }}>
                            <TransitionBanner
                                currentStep={currentStep}
                                onProceed={handleForceNextStep}
                                onContinue={handleContinueChat}
                                isLoading={isLoading}
                            />
                        </View>
                    )}

                    {/* Finalize CTA - Premium Refinement v18.6 */}
                    {isCoachingComplete && (
                        <Animated.View
                            style={{
                                marginHorizontal: 20,
                                marginBottom: 30,
                                opacity: launchBtnOpacity,
                                transform: [{ translateY: launchBtnTranslateY }]
                            }}
                        >
                            {/* Sophisticated Glow effect */}
                            <View style={{
                                position: 'absolute',
                                top: 5,
                                left: 25,
                                right: 25,
                                height: 58,
                                backgroundColor: '#10B981',
                                borderRadius: 20,
                                opacity: 0.3,
                                blurRadius: 20,
                            }} />

                            <Pressable
                                onPress={handleCommit}
                                disabled={isCommitting}
                                style={({ pressed }) => ({
                                    width: '100%',
                                    height: 64,
                                    borderRadius: 20,
                                    overflow: 'hidden',
                                    transform: [{ scale: pressed ? 0.98 : 1 }],
                                    elevation: 8,
                                    shadowColor: '#10B981',
                                    shadowOffset: { width: 0, height: 8 },
                                    shadowOpacity: 0.25,
                                    shadowRadius: 12,
                                })}
                            >
                                <LinearGradient
                                    colors={isCommitting ? ['#94a3b8', '#64748b'] : ['#10B981', '#059669']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={{
                                        flex: 1,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexDirection: 'row',
                                        paddingHorizontal: 20,
                                    }}
                                >
                                    {isCommitting ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <>
                                            <View style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 12,
                                                backgroundColor: 'rgba(255,255,255,0.2)',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                marginRight: 14
                                            }}>
                                                <Ionicons name="rocket" size={20} color="white" />
                                            </View>
                                            <View>
                                                <Text style={{
                                                    color: '#FFFFFF',
                                                    fontSize: 18,
                                                    fontFamily: 'Pretendard-Bold',
                                                    letterSpacing: -0.5,
                                                }}>
                                                    {t('coaching.finalize.button', '만다라트 완성 및 시작')}
                                                </Text>
                                                <Text style={{
                                                    color: 'rgba(255,255,255,0.8)',
                                                    fontSize: 11,
                                                    fontFamily: 'Pretendard-Medium',
                                                    marginTop: 1,
                                                }}>
                                                    SYSTEM LAUNCH
                                                </Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" style={{ marginLeft: 'auto' }} />
                                        </>
                                    )}
                                </LinearGradient>
                            </Pressable>

                            <View style={{ marginTop: 16, alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', opacity: 0.7 }}>
                                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#10B981', marginRight: 6 }} />
                                    <Text style={{
                                        color: '#4b5563',
                                        fontSize: 12,
                                        fontFamily: 'Pretendard-Medium'
                                    }}>
                                        {t('coaching.finalize.instruction', '버튼을 누르면 나의 목표 시스템이 생성됩니다!')}
                                    </Text>
                                </View>
                            </View>
                        </Animated.View>
                    )}
                </ScrollView>



                {/* Input Area */}
                <View style={{
                    backgroundColor: 'white',
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: isKeyboardVisible ? 8 : Math.max(insets.bottom, 12),
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
                                        if (cleanMsg.length > 0) {
                                            // v18.9: If user says something "create" related at step 12, force readiness if not already
                                            if (currentStep >= 12 && !transitionReady) {
                                                const lowerMsg = cleanMsg.toLowerCase();
                                                if (lowerMsg.includes('생성') || lowerMsg.includes('확정') || lowerMsg.includes('끝') || lowerMsg.includes('완료')) {
                                                    setTransitionReady(true);
                                                }
                                            }
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

            {/* Draft Preview Modal */}
            <Modal
                visible={isPreviewVisible}
                animationType="slide"
                transparent={true}
                presentationStyle="overFullScreen"
                statusBarTranslucent={true}
                onRequestClose={() => setIsPreviewVisible(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'white',
                    paddingTop: Math.max(insets.top, 47), // Force fallback for iOS if inset is 0
                    paddingBottom: insets.bottom
                }}>
                    {/* Modal Header */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16,
                        height: 64, // Increased height
                        borderBottomWidth: 1,
                        borderBottomColor: '#f3f4f6',
                        backgroundColor: 'white'
                    }}>
                        <View style={{ width: 40 }} />
                        <Text
                            style={{
                                fontSize: 18,
                                fontFamily: 'Pretendard-Bold',
                                color: '#1f2937',
                                flex: 1,
                                textAlign: 'center'
                            }}
                            numberOfLines={1}
                        >
                            {t('mandalart.modal.preview.title', '만다라트 미리보기')}
                        </Text>
                        <Pressable
                            onPress={() => setIsPreviewVisible(false)}
                            style={{ padding: 8, width: 40, alignItems: 'flex-end' }}
                        >
                            <Ionicons name="close" size={24} color="#6b7280" />
                        </Pressable>
                    </View>

                    {/* Compact Accordion List */}
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ padding: 16 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Compact Core Goal */}
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'flex-start',
                            backgroundColor: '#1e40af',
                            borderRadius: 12,
                            padding: 14,
                            marginBottom: 12
                        }}>
                            <View style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 12,
                                marginTop: 2
                            }}>
                                <Ionicons name="flag" size={18} color="white" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: 'Pretendard-Medium', marginBottom: 2 }}>
                                    {t('coaching.chat.status.coreGoal', 'CORE GOAL')}
                                </Text>
                                <Text style={{ fontSize: 15, color: 'white', fontFamily: 'Pretendard-Bold' }} numberOfLines={2}>
                                    {mandalartDraft?.center_goal || t('coaching.step2.placeholder', '목표가 설정되지 않았습니다')}
                                </Text>
                                {/* v18.0: Show detail if different from summary */}
                                {mandalartDraft?.center_goal_detail && mandalartDraft.center_goal_detail !== mandalartDraft.center_goal && (
                                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontFamily: 'Pretendard-Regular', marginTop: 4, lineHeight: 17 }}>
                                        {mandalartDraft.center_goal_detail}
                                    </Text>
                                )}
                            </View>
                        </View>

                        {/* Lifestyle Summary (from Step 1) */}
                        {(mandalartDraft?.lifestyle_routine || mandalartDraft?.lifestyle_energy) && (
                            <View style={{
                                backgroundColor: '#f0fdf4',
                                borderRadius: 12,
                                padding: 14,
                                marginBottom: 12,
                                borderWidth: 1,
                                borderColor: '#86efac'
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                    <Ionicons name="leaf-outline" size={16} color="#16a34a" />
                                    <Text style={{ fontSize: 12, color: '#16a34a', fontFamily: 'Pretendard-SemiBold', marginLeft: 6 }}>
                                        {t('coaching.preview.lifestyle', '라이프스타일')}
                                    </Text>
                                </View>
                                {mandalartDraft?.lifestyle_routine && (
                                    <View style={{ marginBottom: 6 }}>
                                        <Text style={{ fontSize: 11, color: '#64748b', fontFamily: 'Pretendard-Medium' }}>
                                            {t('coaching.preview.routine', '일과')}
                                        </Text>
                                        <Text style={{ fontSize: 13, color: '#1e293b', fontFamily: 'Pretendard-Regular', lineHeight: 18 }}>
                                            {mandalartDraft.lifestyle_routine}
                                        </Text>
                                    </View>
                                )}
                                {mandalartDraft?.lifestyle_energy && (
                                    <View>
                                        <Text style={{ fontSize: 11, color: '#64748b', fontFamily: 'Pretendard-Medium' }}>
                                            {t('coaching.preview.energy', '에너지/컨디션')}
                                        </Text>
                                        <Text style={{ fontSize: 13, color: '#1e293b', fontFamily: 'Pretendard-Regular', lineHeight: 18 }}>
                                            {mandalartDraft.lifestyle_energy}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Sub-goals Accordion */}
                        <View style={{ marginBottom: 12 }}>
                            {(mandalartDraft?.sub_goals || []).map((subGoal, idx) => {
                                if (!subGoal) return null;
                                const actions = (mandalartDraft?.actions || []).filter(a => a.sub_goal === subGoal);
                                const actionCount = actions.length;
                                const isExpanded = expandedSubGoals.includes(idx);

                                return (
                                    <View key={idx} style={{ marginBottom: 8 }}>
                                        <Pressable
                                            onPress={() => {
                                                setExpandedSubGoals(prev =>
                                                    prev.includes(idx)
                                                        ? prev.filter(i => i !== idx)
                                                        : [...prev, idx]
                                                );
                                            }}
                                            style={{
                                                backgroundColor: isExpanded ? '#f8fafc' : 'white',
                                                borderRadius: 14,
                                                padding: 16,
                                                borderWidth: 1,
                                                borderColor: isExpanded ? '#6366f1' : '#e5e7eb',
                                                shadowColor: '#000',
                                                shadowOffset: { width: 0, height: 1 },
                                                shadowOpacity: isExpanded ? 0.05 : 0,
                                                shadowRadius: 2,
                                                elevation: isExpanded ? 2 : 0
                                            }}
                                        >
                                            {/* Sub-goal Header Row */}
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <View style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: 12,
                                                    backgroundColor: isExpanded ? '#6366f1' : '#f1f5f9',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    marginRight: 10
                                                }}>
                                                    <Text style={{
                                                        color: isExpanded ? 'white' : '#64748b',
                                                        fontSize: 11,
                                                        fontFamily: 'Pretendard-Bold'
                                                    }}>
                                                        {idx + 1}
                                                    </Text>
                                                </View>

                                                <View style={{ flex: 1 }}>
                                                    {/* v18.4: Summary in bold, detail below in gray */}
                                                    <Text style={{
                                                        fontSize: 14,
                                                        fontFamily: 'Pretendard-Bold',
                                                        color: '#1e293b',
                                                        lineHeight: 20,
                                                    }}>
                                                        {subGoal}
                                                    </Text>
                                                    {mandalartDraft?.sub_goals_detail?.[idx] &&
                                                        mandalartDraft.sub_goals_detail[idx] !== subGoal && (
                                                            <Text style={{
                                                                fontSize: 12,
                                                                fontFamily: 'Pretendard-Regular',
                                                                color: '#64748b',
                                                                lineHeight: 16,
                                                                marginTop: 2,
                                                            }} numberOfLines={2}>
                                                                {mandalartDraft.sub_goals_detail[idx]}
                                                            </Text>
                                                        )}
                                                </View>

                                                <View style={{
                                                    backgroundColor: actionCount > 0 ? '#f0fdf4' : '#fff7ed',
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 3,
                                                    borderRadius: 6,
                                                    marginHorizontal: 8,
                                                    borderWidth: 0.5,
                                                    borderColor: actionCount > 0 ? '#dcfce7' : '#ffedd5'
                                                }}>
                                                    <Text style={{
                                                        fontSize: 10,
                                                        color: actionCount > 0 ? '#16a34a' : '#ea580c',
                                                        fontFamily: 'Pretendard-Medium'
                                                    }}>
                                                        {actionCount}
                                                    </Text>
                                                </View>

                                                <Ionicons
                                                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                                    size={18}
                                                    color={isExpanded ? '#6366f1' : '#94a3b8'}
                                                />
                                            </View>

                                            {/* In-place Action Items */}
                                            {isExpanded && (
                                                <View style={{
                                                    marginTop: 14,
                                                    paddingTop: 14,
                                                    borderTopWidth: 1,
                                                    borderTopColor: '#f1f5f9'
                                                }}>
                                                    {actions.length > 0 ? (
                                                        actions.map((action, aIdx) => (
                                                            <View key={aIdx} style={{
                                                                flexDirection: 'row',
                                                                marginBottom: 8,
                                                                alignItems: 'flex-start'
                                                            }}>
                                                                <View style={{
                                                                    width: 4,
                                                                    height: 4,
                                                                    borderRadius: 2,
                                                                    backgroundColor: '#cbd5e1',
                                                                    marginTop: 7,
                                                                    marginRight: 10
                                                                }} />
                                                                <View style={{ flex: 1 }}>
                                                                    {/* v18.4: Summary in bold, detail below in gray */}
                                                                    <Text style={{
                                                                        fontSize: 13,
                                                                        color: '#1e293b',
                                                                        fontFamily: 'Pretendard-SemiBold',
                                                                        lineHeight: 18,
                                                                    }}>
                                                                        {action.summary || action.content}
                                                                    </Text>
                                                                    {action.detail && action.detail !== (action.summary || action.content) && (
                                                                        <Text style={{
                                                                            fontSize: 11,
                                                                            color: '#64748b',
                                                                            fontFamily: 'Pretendard-Regular',
                                                                            lineHeight: 15,
                                                                            marginTop: 2,
                                                                        }} numberOfLines={2}>
                                                                            {action.detail}
                                                                        </Text>
                                                                    )}
                                                                </View>
                                                            </View>
                                                        ))
                                                    ) : (
                                                        <Text style={{
                                                            fontSize: 12,
                                                            color: '#94a3b8',
                                                            fontStyle: 'italic',
                                                            fontFamily: 'Pretendard-Regular',
                                                            textAlign: 'center',
                                                            paddingVertical: 4
                                                        }}>
                                                            {t('mandalart.plan.no_actions', '실천항목이 아직 없습니다')}
                                                        </Text>
                                                    )}
                                                </View>
                                            )}
                                        </Pressable>
                                    </View>
                                );
                            })}
                        </View>

                        {/* Emergency Actions (from Step 11) */}
                        {mandalartDraft?.emergency_action && (
                            <View style={{
                                backgroundColor: '#fef2f2',
                                borderRadius: 12,
                                padding: 14,
                                marginBottom: 12,
                                borderWidth: 1,
                                borderColor: '#fca5a5'
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                    <Ionicons name="shield-checkmark-outline" size={16} color="#dc2626" />
                                    <Text style={{ fontSize: 12, color: '#dc2626', fontFamily: 'Pretendard-SemiBold', marginLeft: 6 }}>
                                        {t('coaching.preview.emergency', '비상대책')}
                                    </Text>
                                </View>
                                <Text style={{ fontSize: 13, color: '#1e293b', fontFamily: 'Pretendard-Regular', lineHeight: 18 }}>
                                    {mandalartDraft.emergency_action}
                                </Text>
                            </View>
                        )}

                        {/* Empty State */}
                        {(!mandalartDraft?.sub_goals || mandalartDraft.sub_goals.filter(Boolean).length === 0) && (
                            <View style={{
                                alignItems: 'center',
                                paddingVertical: 32,
                                paddingHorizontal: 20
                            }}>
                                <Ionicons name="layers-outline" size={40} color="#d1d5db" />
                                <Text style={{
                                    fontSize: 14,
                                    color: '#9ca3af',
                                    marginTop: 10,
                                    textAlign: 'center',
                                    fontFamily: 'Pretendard-Medium'
                                }}>
                                    {t('mandalart.plan.empty', '아직 작성된 내용이 없습니다.')}
                                </Text>
                            </View>
                        )}

                        <View style={{ height: 8 }} />
                    </ScrollView>

                    {/* Close Button */}
                    <View style={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 }}>
                        <Pressable
                            onPress={() => setIsPreviewVisible(false)}
                            style={{
                                backgroundColor: '#6366f1',
                                paddingHorizontal: 24,
                                paddingVertical: 14,
                                borderRadius: 16,
                                alignItems: 'center'
                            }}
                        >
                            <Text style={{ color: 'white', fontFamily: 'Pretendard-Bold', fontSize: 16 }}>
                                {t('common.close', '닫기')}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Coaching History Selector Modal */}
            <Modal
                visible={isHistoryModalVisible}
                animationType="slide"
                transparent={true}
                presentationStyle="overFullScreen"
                statusBarTranslucent={true}
                onRequestClose={() => setIsHistoryModalVisible(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'white',
                    paddingTop: Math.max(insets.top, 47),
                    paddingBottom: insets.bottom
                }}>
                    {/* Modal Header */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16,
                        height: 64,
                        borderBottomWidth: 1,
                        borderBottomColor: '#f3f4f6'
                    }}>
                        <View style={{ width: 40 }} />
                        <Text style={{ fontSize: 18, fontFamily: 'Pretendard-Bold', color: '#1f2937', flex: 1, textAlign: 'center' }}>
                            {t('coaching.history.title', '이전 코칭 대화')}
                        </Text>
                        <Pressable
                            onPress={() => setIsHistoryModalVisible(false)}
                            style={{ padding: 8, width: 40, alignItems: 'flex-end' }}
                        >
                            <Ionicons name="close" size={24} color="#6b7280" />
                        </Pressable>
                    </View>

                    {/* Session List */}
                    {isLoadingHistory ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <ActivityIndicator size="large" color="#6366f1" />
                        </View>
                    ) : completedSessions.length === 0 ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                            <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
                            <Text style={{
                                fontSize: 16,
                                color: '#9ca3af',
                                marginTop: 12,
                                textAlign: 'center',
                                fontFamily: 'Pretendard-Medium'
                            }}>
                                {t('coaching.history.empty', '완료된 코칭 세션이 없습니다.')}
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={completedSessions}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ padding: 16 }}
                            renderItem={({ item }) => (
                                <Pressable
                                    onPress={() => handleSelectSession(item.id)}
                                    style={{
                                        backgroundColor: 'white',
                                        borderRadius: 16,
                                        padding: 16,
                                        marginBottom: 12,
                                        borderWidth: 1,
                                        borderColor: '#e5e7eb',
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 2,
                                        elevation: 1
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 12,
                                            backgroundColor: '#ede9fe',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: 12
                                        }}>
                                            <Ionicons name="chatbubble" size={20} color="#6366f1" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{
                                                fontSize: 15,
                                                fontFamily: 'Pretendard-SemiBold',
                                                color: '#1f2937',
                                                marginBottom: 4
                                            }} numberOfLines={2}>
                                                {item.center_goal}
                                            </Text>
                                            <Text style={{
                                                fontSize: 12,
                                                color: '#9ca3af',
                                                fontFamily: 'Pretendard-Regular'
                                            }}>
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                                    </View>
                                </Pressable>
                            )}
                        />
                    )}
                </View>
            </Modal >
        </View >
    )
}

const MessageBubble = React.memo(({ role, content }: { role: 'user' | 'assistant' | 'system', content: string }) => {
    const isAI = role === 'assistant'

    if (role === 'system') return null

    // Helper to parse **bold** markdown and handle paragraphs (v6.3 + iOS text selection)
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
                    {parts.map((part, index) => {
                        if (!part) return null;

                        if (part.startsWith('**') && part.endsWith('**')) {
                            const boldText = part.slice(2, -2);
                            return (
                                <TextInput
                                    key={index}
                                    multiline
                                    editable={false}
                                    scrollEnabled={false}
                                    value={boldText}
                                    style={{
                                        fontSize: 15,
                                        lineHeight: 22,
                                        color: isAI ? '#1f2937' : 'white',
                                        fontFamily: 'Pretendard-Bold',
                                        fontWeight: 'bold',
                                        padding: 0,
                                        margin: 0,
                                        backgroundColor: 'transparent',
                                    }}
                                />
                            );
                        }
                        return (
                            <TextInput
                                key={index}
                                multiline
                                editable={false}
                                scrollEnabled={false}
                                value={part}
                                style={{
                                    fontSize: 15,
                                    lineHeight: 22,
                                    color: isAI ? '#1f2937' : 'white',
                                    fontFamily: 'Pretendard-Regular',
                                    padding: 0,
                                    margin: 0,
                                    backgroundColor: 'transparent',
                                }}
                            />
                        );
                    })}
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
                paddingVertical: 12,
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
                {renderContent(content)}
            </View>
        </View>
    )
})
