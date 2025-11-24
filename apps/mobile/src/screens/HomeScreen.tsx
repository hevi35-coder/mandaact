import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import {
  useAuthStore,
  getUserLevel,
  getXPProgress,
  getCurrentStreak,
  fetchTodayActions,
  UserLevel,
  ActionWithContext,
} from '@mandaact/shared';

type RootStackParamList = {
  TodayTab: undefined;
  MandalartTab: undefined;
  StatsTab: undefined;
};

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const user = useAuthStore((state) => state.user);

  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [todayActions, setTodayActions] = useState<ActionWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load dashboard data
  const loadData = async () => {
    if (!user) return;

    try {
      const [level, streak, actions] = await Promise.all([
        getUserLevel(user.id),
        getCurrentStreak(user.id),
        fetchTodayActions(user.id, new Date()),
      ]);

      setUserLevel(level);
      setCurrentStreak(streak);
      setTodayActions(actions);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate today's progress
  const checkedCount = todayActions.filter((a) => a.is_checked).length;
  const totalCount = todayActions.length;
  const todayProgress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  // Calculate XP progress
  const xpProgress = userLevel ? getXPProgress(userLevel) : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>홈</Text>
          <Text style={styles.subtitle}>성장 대시보드</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* User Profile Card */}
        <View style={styles.section}>
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {userLevel?.nickname || user?.email?.split('@')[0] || '사용자'}
                </Text>
                <Text style={styles.profileLevel}>Level {userLevel?.level || 0}</Text>
              </View>
              <View style={styles.xpBadge}>
                <Text style={styles.xpBadgeText}>{userLevel?.total_xp || 0} XP</Text>
              </View>
            </View>

            {xpProgress && (
              <View style={styles.xpProgressSection}>
                <View style={styles.xpProgressInfo}>
                  <Text style={styles.xpProgressText}>
                    {xpProgress.currentLevelXP} / {xpProgress.nextLevelXP} XP
                  </Text>
                  <Text style={styles.xpProgressPercentage}>
                    {Math.round(xpProgress.progress)}%
                  </Text>
                </View>
                <View style={styles.xpProgressBarContainer}>
                  <View
                    style={[
                      styles.xpProgressBar,
                      { width: `${xpProgress.progress}%` },
                    ]}
                  />
                </View>
                <Text style={styles.xpProgressHint}>
                  다음 레벨까지 {xpProgress.nextLevelXP - xpProgress.currentLevelXP} XP
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Today's Progress & Streak */}
        <View style={styles.section}>
          <View style={styles.statsRow}>
            {/* Today's Progress */}
            <View style={[styles.statCard, styles.statCardLeft]}>
              <Text style={styles.statLabel}>오늘의 진행률</Text>
              <Text style={styles.statNumber}>{Math.round(todayProgress)}%</Text>
              <Text style={styles.statDetail}>
                {checkedCount}/{totalCount} 완료
              </Text>
            </View>

            {/* Streak */}
            <View style={[styles.statCard, styles.statCardRight]}>
              <Text style={styles.statLabel}>연속 실천</Text>
              <View style={styles.streakContent}>
                <Text style={styles.streakIcon}>🔥</Text>
                <Text style={styles.statNumber}>{currentStreak}</Text>
              </View>
              <Text style={styles.statDetail}>일 연속</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>빠른 실행</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('TodayTab')}
            >
              <Text style={styles.quickActionIcon}>✅</Text>
              <Text style={styles.quickActionText}>실천하러 가기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('MandalartTab')}
            >
              <Text style={styles.quickActionIcon}>🎯</Text>
              <Text style={styles.quickActionText}>만다라트 관리</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('StatsTab')}
            >
              <Text style={styles.quickActionIcon}>📊</Text>
              <Text style={styles.quickActionText}>통계 보기</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Motivational Message */}
        <View style={styles.section}>
          <View style={styles.motivationCard}>
            <Text style={styles.motivationIcon}>
              {getMotivationIcon(todayProgress)}
            </Text>
            <Text style={styles.motivationText}>
              {getMotivationMessage(todayProgress, checkedCount)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getMotivationIcon(progress: number): string {
  if (progress >= 80) return '🎉';
  if (progress >= 50) return '💪';
  if (progress >= 20) return '🌱';
  return '🚀';
}

function getMotivationMessage(progress: number, checkedCount: number): string {
  if (progress >= 100) return '완벽합니다! 오늘의 모든 실천을 완료했어요! 🎉';
  if (progress >= 80) return '거의 다 왔어요! 조금만 더 힘내세요! 💪';
  if (progress >= 50) return '절반 이상 완료! 좋은 페이스입니다! 👍';
  if (checkedCount > 0) return '좋은 시작이에요! 계속 실천해보세요! 🌱';
  return '오늘도 함께 성장해요! 실천을 시작해보세요! 🚀';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  profileLevel: {
    fontSize: 16,
    color: '#6b7280',
  },
  xpBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  xpBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  xpProgressSection: {
    marginTop: 4,
  },
  xpProgressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  xpProgressText: {
    fontSize: 14,
    color: '#6b7280',
  },
  xpProgressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  xpProgressBarContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpProgressBar: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  xpProgressHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  statCardLeft: {},
  statCardRight: {},
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statDetail: {
    fontSize: 12,
    color: '#6b7280',
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakIcon: {
    fontSize: 24,
  },
  quickActions: {
    gap: 12,
  },
  quickActionButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quickActionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  motivationCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  motivationIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  motivationText: {
    fontSize: 16,
    color: '#78350f',
    textAlign: 'center',
    lineHeight: 22,
  },
});
