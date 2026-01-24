/**
 * NicknameModal Component
 * 
 * Modal for editing user nickname
 */

import React, { useState, useCallback, useEffect } from 'react'
import { View, Text, Modal, Pressable, TextInput, Alert } from 'react-native'
import { X } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { setCachedGamificationNickname, statsKeys } from '../../hooks/useStats'
import {
    validateNickname,
    NICKNAME_ERRORS,
} from '@mandaact/shared'
import type { NicknameModalProps } from './types'

export function NicknameModal({
    visible,
    currentNickname,
    onClose,
}: NicknameModalProps) {
    const { t } = useTranslation()
    const { user } = useAuthStore()
    const queryClient = useQueryClient()

    const [newNickname, setNewNickname] = useState(currentNickname)
    const [nicknameError, setNicknameError] = useState('')
    const [nicknameSaving, setNicknameSaving] = useState(false)

    // Reset state when modal opens
    useEffect(() => {
        if (visible) {
            setNewNickname(currentNickname)
            setNicknameError('')
        }
    }, [visible, currentNickname])

    const handleSave = useCallback(async () => {
        if (!user) return

        // Validate
        const validation = validateNickname(newNickname)
        if (!validation.isValid) {
            const errorKey = validation.errorCode ? NICKNAME_ERRORS[validation.errorCode] : null
            setNicknameError(errorKey ? t(errorKey) : '')
            return
        }

        // Check if unchanged
        if (newNickname === currentNickname) {
            onClose()
            return
        }

        setNicknameSaving(true)
        setNicknameError('')

        try {
            // Check if nickname is already taken
            const { data: existing } = await supabase
                .from('user_levels')
                .select('nickname')
                .ilike('nickname', newNickname)
                .neq('user_id', user.id)
                .maybeSingle()

            if (existing) {
                setNicknameError(t(NICKNAME_ERRORS.ALREADY_TAKEN))
                setNicknameSaving(false)
                return
            }

            // Update nickname
            const { error: updateError } = await supabase
                .from('user_levels')
                .upsert(
                    { user_id: user.id, nickname: newNickname },
                    { onConflict: 'user_id' }
                )

            if (updateError) throw updateError

            setCachedGamificationNickname(queryClient, user.id, newNickname)
            void queryClient.invalidateQueries({ queryKey: statsKeys.gamification(user.id) })

            // Close and show success
            onClose()
            Alert.alert(t('common.confirm'), t('home.nickname.changed'))
        } catch (err) {
            console.error('Nickname update error:', err)
            setNicknameError(t(NICKNAME_ERRORS.UPDATE_ERROR))
        } finally {
            setNicknameSaving(false)
        }
    }, [user, newNickname, currentNickname, onClose, queryClient, t])

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/50 justify-center items-center px-6">
                <View className="bg-white rounded-xl w-full max-w-sm p-6">
                    {/* Header */}
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-lg font-bold text-gray-900">
                            {t('home.nickname.title')}
                        </Text>
                        <Pressable
                            onPress={onClose}
                            className="p-1 rounded-full active:bg-gray-100"
                        >
                            <X size={20} color="#6b7280" />
                        </Pressable>
                    </View>

                    {/* Description */}
                    <Text className="text-sm text-gray-500 mb-4">
                        {t('home.nickname.description')}
                    </Text>

                    {/* Input */}
                    <View className="mb-4">
                        <Text className="text-sm font-medium text-gray-700 mb-2">
                            {t('home.nickname.label')}
                        </Text>
                        <TextInput
                            value={newNickname}
                            onChangeText={setNewNickname}
                            placeholder={t('home.nickname.placeholder')}
                            maxLength={12}
                            editable={!nicknameSaving}
                            className="border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                            placeholderTextColor="#9ca3af"
                        />
                        <Text className="text-xs text-gray-400 mt-1 ml-1">
                            {t('home.nickname.hint')}
                        </Text>
                        {nicknameError ? (
                            <Text className="text-sm text-red-500 mt-2">{nicknameError}</Text>
                        ) : null}
                    </View>

                    {/* Buttons */}
                    <View className="gap-y-3">
                        <Pressable
                            onPress={handleSave}
                            disabled={nicknameSaving}
                            className={`py-3 rounded-lg items-center ${nicknameSaving ? 'bg-gray-400' : 'bg-gray-900'
                                }`}
                        >
                            <Text className="text-white font-semibold">
                                {nicknameSaving ? t('home.nickname.saving') : t('home.nickname.save')}
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={onClose}
                            disabled={nicknameSaving}
                            className="py-3 rounded-lg items-center border border-gray-300"
                        >
                            <Text className="text-gray-700 font-semibold">
                                {t('home.nickname.cancel')}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    )
}
