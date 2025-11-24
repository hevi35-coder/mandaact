import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  useAuthStore,
  getUserLevel,
  getXPProgress,
  getAchievements,
  getUserAchievements,
  getActiveMultipliers,
  getCurrentStreak,
  UserLevel,
  Achievement,
  UserAchievement,
  XPMultiplier,
} from '@mandaact/shared';

export default function StatsScreen() {
  const user = useAuthStore((state) => state.user);
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [activeMultipliers, setActiveMultipliers] = useState<XPMultiplier[]>([]);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load all data
  const loadData = async () => {
    if (!user) return;

    try {
      // Parallel fetch all data
      const [level, achievements, userAchs, multipliers, streak] = await Promise.all([
        getUserLevel(user.id),
        getAchievements(),
        getUserAchievements(user.id),
        getActiveMultipliers(user.id),
        getCurrentStreak(user.id),
      ]);

      setUserLevel(level);
      setAllAchievements(achievements);
      setUserAchievements(userAchs);
      setActiveMultipliers(multipliers);
      setCurrentStreak(streak);
    } catch (error) {
      console.error('Failed to load stats:', error);
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

  // Calculate XP progress
  const xpProgress = userLevel ? getXPProgress(userLevel) : null;
  const unlockedBadgeIds = new Set(userAchievements.map((ua) => ua.achievement_id));
  const unlockedCount = userAchievements.length;
  const totalCount = allAchievements.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>통계</Text>
        <Text style={styles.subtitle}>성장 기록</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* User Level Card */}
        <View style={styles.section}>
          <View style={styles.levelCard}>
            <View style={styles.levelHeader}>
              <View>
                <Text style={styles.levelTitle}>
                  {userLevel?.nickname || user?.email?.split('@')[0] || '사용자'}
                </Text>
                <Text style={styles.levelSubtitle}>Level {userLevel?.level || 0}</Text>
              </View>
              <View style={styles.xpBadge}>
                <Text style={styles.xpBadgeText}>{userLevel?.total_xp || 0} XP</Text>
              </View>
            </View>

            {xpProgress && (
              <View style={styles.progressSection}>
                <View style={styles.progressInfo}>
                  <Text style={styles.progressText}>
                    {xpProgress.currentLevelXP} / {xpProgress.nextLevelXP} XP
                  </Text>
                  <Text style={styles.progressPercentage}>
                    {Math.round(xpProgress.progress)}%
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${xpProgress.progress}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressHint}>
                  다음 레벨까지 {xpProgress.nextLevelXP - xpProgress.currentLevelXP} XP
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Streak Card */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>🔥 연속 실천</Text>
            </View>
            <View style={styles.streakContent}>
              <Text style={styles.streakNumber}>{currentStreak}</Text>
              <Text style={styles.streakLabel}>일 연속</Text>
            </View>
          </View>
        </View>

        {/* Active Multipliers */}
        {activeMultipliers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ 활성 부스터</Text>
            {activeMultipliers.map((multiplier) => (
              <View key={multiplier.id} style={styles.multiplierCard}>
                <View style={styles.multiplierContent}>
                  <Text style={styles.multiplierTitle}>
                    {getMultiplierLabel(multiplier.multiplier_type)}
                  </Text>
                  <Text style={styles.multiplierValue}>
                    {multiplier.multiplier_value}x
                  </Text>
                </View>
                <Text style={styles.multiplierExpiry}>
                  {formatExpiryDate(multiplier.active_until)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Badges Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏆 뱃지 컬렉션</Text>
            <Text style={styles.sectionSubtitle}>
              {unlockedCount}/{totalCount}
            </Text>
          </View>
          <View style={styles.badgeGrid}>
            {allAchievements.map((achievement) => {
              const isUnlocked = unlockedBadgeIds.has(achievement.id);
              return (
                <View
                  key={achievement.id}
                  style={[
                    styles.badgeItem,
                    !isUnlocked && styles.badgeItemLocked,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeIcon,
                      !isUnlocked && styles.badgeIconLocked,
                    ]}
                  >
                    {achievement.icon}
                  </Text>
                  <Text
                    style={[
                      styles.badgeTitle,
                      !isUnlocked && styles.badgeTitleLocked,
                    ]}
                    numberOfLines={2}
                  >
                    {achievement.title}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getMultiplierLabel(type: string): string {
  switch (type) {
    case 'weekend_bonus':
      return '주말 보너스';
    case 'comeback_bonus':
      return '컴백 보너스';
    case 'level_milestone':
      return '레벨업 보너스';
    case 'perfect_week':
      return '완벽한 주';
    default:
      return type;
  }
}

function formatExpiryDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}일 남음`;
  } else if (hours > 0) {
    return `${hours}시간 남음`;
  } else {
    return '곧 만료';
  }
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  levelCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  levelSubtitle: {
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
  progressSection: {
    marginTop: 4,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  progressHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 6,
  },
  streakContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#f97316',
    marginBottom: 4,
  },
  streakLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  multiplierCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  multiplierContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  multiplierTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#78350f',
  },
  multiplierValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#92400e',
  },
  multiplierExpiry: {
    fontSize: 12,
    color: '#92400e',
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  badgeItem: {
    width: '25%',
    padding: 8,
    alignItems: 'center',
  },
  badgeItemLocked: {
    opacity: 0.4,
  },
  badgeIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  badgeIconLocked: {
    opacity: 0.5,
  },
  badgeTitle: {
    fontSize: 11,
    textAlign: 'center',
    color: '#374151',
  },
  badgeTitleLocked: {
    color: '#9ca3af',
  },
});
