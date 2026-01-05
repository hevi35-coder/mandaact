import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    Pressable,
    Modal,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Header } from '../components';
import { supabase } from '../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';

type RootStackParamList = {
    CoachingHistory: { sessionId: string };
};

type HistoryRouteProp = RouteProp<RootStackParamList, 'CoachingHistory'>;

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface MandalartAction {
    sub_goal: string;
    content: string;
    type?: 'habit' | 'task';
}

interface MandalartDraft {
    center_goal: string;
    sub_goals: string[];
    actions: MandalartAction[];
    emergency_action?: string;
}

export default function CoachingHistoryScreen() {
    const navigation = useNavigation();
    const route = useRoute<HistoryRouteProp>();
    const { sessionId } = route.params;
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const scrollRef = useRef<ScrollView>(null);

    const [messages, setMessages] = useState<Message[]>([]);
    const [mandalartDraft, setMandalartDraft] = useState<MandalartDraft | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);
    const [expandedSubGoals, setExpandedSubGoals] = useState<number[]>([]);

    useEffect(() => {
        fetchHistory();
    }, [sessionId]);

    const fetchHistory = async () => {
        try {
            setIsLoading(true);

            // Fetch both chat history and mandalart draft
            const { data, error: fetchError } = await supabase
                .from('coaching_answers')
                .select('step_key, answer_json')
                .eq('session_id', sessionId)
                .in('step_key', ['chat_history', 'mandalart_draft']);

            if (fetchError) throw fetchError;

            if (data) {
                const chatData = data.find(d => d.step_key === 'chat_history');
                const draftData = data.find(d => d.step_key === 'mandalart_draft');

                if (chatData?.answer_json && Array.isArray(chatData.answer_json)) {
                    setMessages(chatData.answer_json);
                }

                if (draftData?.answer_json) {
                    setMandalartDraft(draftData.answer_json as MandalartDraft);
                }
            }
        } catch (err: any) {
            console.error('Failed to fetch coaching history:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={{ marginTop: 16, color: '#6b7280', fontFamily: 'Pretendard-Medium' }}>
                    {t('common.loading')}
                </Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            <Header
                title={t('coaching.history.title', 'Coaching History')}
                showBackButton
                navigation={navigation}
                rightElement={
                    mandalartDraft ? (
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
                    ) : null
                }
            />

            {/* Draft Preview Modal */}
            <Modal
                visible={isPreviewVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setIsPreviewVisible(false)}
            >
                <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
                    {/* Header */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16,
                        height: 56,
                        borderBottomWidth: 1,
                        borderBottomColor: '#f3f4f6'
                    }}>
                        <Text style={{ fontSize: 18, fontFamily: 'Pretendard-Bold', color: '#1f2937' }}>
                            {t('mandalart.modal.preview.title', 'Mandalart Preview')}
                        </Text>
                        <Pressable
                            onPress={() => setIsPreviewVisible(false)}
                            style={{ padding: 8 }}
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
                            alignItems: 'center',
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
                                marginRight: 12
                            }}>
                                <Ionicons name="flag" size={18} color="white" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: 'Pretendard-Medium', marginBottom: 2 }}>
                                    CORE GOAL
                                </Text>
                                <Text style={{ fontSize: 15, color: 'white', fontFamily: 'Pretendard-Bold' }} numberOfLines={2}>
                                    {mandalartDraft?.center_goal || t('coaching.step2.placeholder', 'Not set')}
                                </Text>
                            </View>
                        </View>

                        {/* Sub-goals Accordion */}
                        <View style={{ marginBottom: 12 }}>
                            {mandalartDraft?.sub_goals.map((subGoal, idx) => {
                                if (!subGoal) return null;
                                const actions = mandalartDraft.actions.filter(a => a.sub_goal === subGoal);
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

                                                <Text style={{
                                                    flex: 1,
                                                    fontSize: 14,
                                                    fontFamily: 'Pretendard-SemiBold',
                                                    color: '#1e293b',
                                                    lineHeight: 20
                                                }}>
                                                    {subGoal}
                                                </Text>

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
                                                                <Text style={{
                                                                    fontSize: 13,
                                                                    color: '#475569',
                                                                    flex: 1,
                                                                    lineHeight: 18,
                                                                    fontFamily: 'Pretendard-Regular'
                                                                }}>
                                                                    {action.content}
                                                                </Text>
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
                                                            {t('mandalart.plan.no_actions', 'No actions defined')}
                                                        </Text>
                                                    )}
                                                </View>
                                            )}
                                        </Pressable>
                                    </View>
                                );
                            })}
                        </View>

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
                                    {t('mandalart.plan.empty', 'No data available.')}
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
                                {t('common.close')}
                            </Text>
                        </Pressable>
                    </View>
                </SafeAreaView>
            </Modal>

            <ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20 }}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            >
                {messages.length === 0 ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 }}>
                        <Text style={{ color: '#9ca3af', fontFamily: 'Pretendard-Regular' }}>
                            {t('coaching.history.empty', 'No conversation history found.')}
                        </Text>
                    </View>
                ) : (
                    messages.map((msg, index) => (
                        <MessageBubble key={index} role={msg.role} content={msg.content} />
                    ))
                )}

                {/* Safe area bottom padding */}
                <View style={{ height: insets.bottom + 20 }} />
            </ScrollView>
        </View>
    );
}

const MessageBubble = React.memo(({ role, content }: { role: 'user' | 'assistant' | 'system', content: string }) => {
    const isAI = role === 'assistant';
    if (role === 'system') return null;

    const renderContent = (text: string) => {
        if (!text) return null;

        // Pre-process: ensure bullet points summarized in one line are forced into new lines (v12.2)
        let processedText = text;
        if (isAI) {
            // Force newline before bullet points if missing
            processedText = text.replace(/([.!?]|[^-\n])\s*- /g, '$1\n- ');
        }

        const paragraphs = processedText.split(/\n+/);
        return paragraphs.map((paragraph, pIdx) => {
            const trimmedParagraph = paragraph.trim();
            if (!trimmedParagraph) return null;
            const parts = trimmedParagraph.split(/(\*\*.*?\*\*)/g);
            return (
                <View key={pIdx} style={{ marginBottom: pIdx < paragraphs.length - 1 ? 12 : 0 }}>
                    <Text
                        style={{
                            fontSize: 15,
                            lineHeight: 24,
                            color: isAI ? '#1f2937' : 'white',
                            fontFamily: 'Pretendard-Regular'
                        }}
                    >
                        {parts.map((part, index) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return (
                                    <Text key={index} style={{ fontFamily: 'Pretendard-Bold', fontWeight: '700' }}>
                                        {part.slice(2, -2)}
                                    </Text>
                                );
                            }
                            return part;
                        })}
                    </Text>
                </View>
            );
        });
    };

    return (
        <View style={{
            alignSelf: isAI ? 'flex-start' : 'flex-end',
            maxWidth: '85%',
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'flex-end'
        }}>
            <View style={{
                backgroundColor: isAI ? 'white' : '#6366f1',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 20,
                borderBottomLeftRadius: isAI ? 4 : 20,
                borderBottomRightRadius: isAI ? 20 : 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
                borderWidth: isAI ? 1 : 0,
                borderColor: '#f3f4f6'
            }}>
                {renderContent(content)}
            </View>
        </View>
    );
});
