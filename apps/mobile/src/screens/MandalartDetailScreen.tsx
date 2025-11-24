import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import {
  useAuthStore,
  fetchMandalartWithDetails,
  MandalartWithDetails,
} from '@mandaact/shared';

type RootStackParamList = {
  MandalartDetail: { id: string };
};

type MandalartDetailRouteProp = RouteProp<RootStackParamList, 'MandalartDetail'>;

export default function MandalartDetailScreen() {
  const route = useRoute<MandalartDetailRouteProp>();
  const navigation = useNavigation<NavigationProp<any>>();
  const user = useAuthStore((state) => state.user);

  const { id } = route.params;
  const [mandalart, setMandalart] = useState<MandalartWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSubGoalId, setExpandedSubGoalId] = useState<string | null>(null);

  // Load mandalart details
  const loadData = async () => {
    if (!user || !id) return;

    try {
      const data = await fetchMandalartWithDetails(id);
      setMandalart(data);
    } catch (error) {
      console.error('Failed to load mandalart details:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const toggleSubGoal = (subGoalId: string) => {
    setExpandedSubGoalId((prev) => (prev === subGoalId ? null : subGoalId));
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

  if (!mandalart) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>만다라트를 찾을 수 없습니다</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Sort sub_goals by position
  const sortedSubGoals = [...mandalart.sub_goals].sort((a, b) => a.position - b.position);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {mandalart.title}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Center Goal Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>핵심 목표</Text>
          <View style={styles.centerGoalCard}>
            <Text style={styles.centerGoalText}>{mandalart.center_goal}</Text>
          </View>
        </View>

        {/* Sub Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>세부 목표 ({sortedSubGoals.length}개)</Text>
          <View style={styles.subGoalsList}>
            {sortedSubGoals.map((subGoal) => {
              const isExpanded = expandedSubGoalId === subGoal.id;
              const sortedActions = [...(subGoal.actions || [])].sort(
                (a, b) => a.position - b.position
              );

              return (
                <View key={subGoal.id} style={styles.subGoalCard}>
                  <TouchableOpacity
                    style={styles.subGoalHeader}
                    onPress={() => toggleSubGoal(subGoal.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.subGoalHeaderLeft}>
                      <View style={styles.positionBadge}>
                        <Text style={styles.positionBadgeText}>{subGoal.position}</Text>
                      </View>
                      <Text style={styles.subGoalTitle} numberOfLines={2}>
                        {subGoal.title}
                      </Text>
                    </View>
                    <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.actionsContainer}>
                      <Text style={styles.actionsTitle}>실천 항목 ({sortedActions.length}개)</Text>
                      {sortedActions.length === 0 ? (
                        <View style={styles.emptyActions}>
                          <Text style={styles.emptyActionsText}>실천 항목이 없습니다</Text>
                        </View>
                      ) : (
                        <View style={styles.actionsList}>
                          {sortedActions.map((action) => (
                            <View key={action.id} style={styles.actionItem}>
                              <View style={styles.actionHeader}>
                                <Text style={styles.actionPosition}>{action.position}</Text>
                                <Text style={styles.actionTitle}>{action.title}</Text>
                              </View>
                              <View style={styles.actionMeta}>
                                <View style={[styles.typeBadge, getTypeBadgeStyle(action.type)]}>
                                  <Text style={[styles.typeBadgeText, getTypeBadgeTextStyle(action.type)]}>
                                    {getTypeLabel(action.type)}
                                  </Text>
                                </View>
                                {action.frequency && (
                                  <Text style={styles.frequencyText}>
                                    {getFrequencyLabel(action.frequency)}
                                  </Text>
                                )}
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Summary Card */}
        <View style={styles.section}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>전체 요약</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{sortedSubGoals.length}</Text>
                <Text style={styles.summaryLabel}>세부목표</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {sortedSubGoals.reduce((sum, sg) => sum + (sg.actions?.length || 0), 0)}
                </Text>
                <Text style={styles.summaryLabel}>실천 항목</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'routine':
      return '루틴';
    case 'mission':
      return '미션';
    case 'reference':
      return '참고';
    default:
      return type;
  }
}

function getFrequencyLabel(frequency: string): string {
  switch (frequency) {
    case 'daily':
      return '매일';
    case 'weekly':
      return '주간';
    case 'monthly':
      return '월간';
    default:
      return frequency;
  }
}

function getTypeBadgeStyle(type: string) {
  switch (type) {
    case 'routine':
      return { backgroundColor: '#dbeafe', borderColor: '#3b82f6' };
    case 'mission':
      return { backgroundColor: '#fef3c7', borderColor: '#f59e0b' };
    case 'reference':
      return { backgroundColor: '#f3e8ff', borderColor: '#a855f7' };
    default:
      return { backgroundColor: '#f3f4f6', borderColor: '#d1d5db' };
  }
}

function getTypeBadgeTextStyle(type: string) {
  switch (type) {
    case 'routine':
      return { color: '#1e40af' };
    case 'mission':
      return { color: '#92400e' };
    case 'reference':
      return { color: '#6b21a8' };
    default:
      return { color: '#6b7280' };
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerBackButton: {
    marginRight: 12,
    padding: 4,
  },
  headerBackText: {
    fontSize: 24,
    color: '#3b82f6',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
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
  centerGoalCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 24,
    borderWidth: 2,
    borderColor: '#3b82f6',
    alignItems: 'center',
  },
  centerGoalText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e40af',
    textAlign: 'center',
    lineHeight: 28,
  },
  subGoalsList: {
    gap: 12,
  },
  subGoalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  subGoalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  subGoalHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  positionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  positionBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subGoalTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  expandIcon: {
    fontSize: 14,
    color: '#6b7280',
  },
  actionsContainer: {
    padding: 16,
    paddingTop: 0,
    backgroundColor: '#f9fafb',
  },
  actionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
  },
  emptyActions: {
    padding: 24,
    alignItems: 'center',
  },
  emptyActionsText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  actionsList: {
    gap: 8,
  },
  actionItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  actionPosition: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6b7280',
    marginRight: 8,
    marginTop: 2,
  },
  actionTitle: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
  actionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  frequencyText: {
    fontSize: 11,
    color: '#6b7280',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
});
