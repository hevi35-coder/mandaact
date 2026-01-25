/**
 * EmptyState Component
 * 
 * Shows when user has no mandalarts yet
 */

import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Grid3X3 } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import Animated, { FadeInUp } from 'react-native-reanimated'
import type { EmptyStateProps } from './types'
import { ActiveEmptyState } from '../ui/ActiveEmptyState'

export function EmptyState({ onCreateNew, onShowTutorial }: EmptyStateProps) {
    const { t } = useTranslation()

    return (
        <ActiveEmptyState
            title={t('mandalart.list.empty.title')}
            description={t('mandalart.list.empty.description')}
            icon={Grid3X3}
            iconColor="#9333ea" // purple-600
            iconBgColor="#faf5ff" // purple-50
            benefits={[
                t('mandalart.list.empty.benefit1'),
                t('mandalart.list.empty.benefit2'),
                t('mandalart.list.empty.benefit3')
            ]}
            primaryActionLabel={t('mandalart.list.create')}
            secondaryActionLabel={t('mandalart.list.empty.guide')}
            onPrimaryAction={onCreateNew}
            onSecondaryAction={onShowTutorial}
        />
    )
}
