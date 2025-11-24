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
import {
  useAuthStore,
  fetchTodayActions,
  checkAction,
  uncheckAction,
  formatDateString,
  ActionWithContext,
} from '@mandaact/shared';

export default function TodayScreen() {
  const user = useAuthStore((state) => state.user);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [actions, setActions] = useState<ActionWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingActions, setCheckingActions] = useState<Set<string>>(new Set());

  // Load actions
  const loadActions = async () => {
    if (!user) return;

    try {
      const data = await fetchTodayActions(user.id, selectedDate);
      setActions(data);
    } catch (error) {
      console.error('Failed to load actions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadActions();
  }, [user, selectedDate]);

  const onRefresh = () => {
    setRefreshing(true);
    loadActions();
  };

  const handleToggleCheck = async (action: ActionWithContext) => {
    if (!user) return;
    if (checkingActions.has(action.id)) return;

    setCheckingActions((prev) => new Set(prev).add(action.id));

    try {
      if (action.is_checked && action.check_id) {
        // Uncheck
        const result = await uncheckAction(action.check_id);
        if (result.success) {
          setActions((prev) =>
            prev.map((a) =>
              a.id === action.id ? { ...a, is_checked: false, check_id: undefined } : a
            )
          );
        }
      } else {
        // Check
        const result = await checkAction(user.id, action.id);
        if (result.success && result.checkId) {
          setActions((prev) =>
            prev.map((a) =>
              a.id === action.id ? { ...a, is_checked: true, check_id: result.checkId } : a
            )
          );
        }
      }
    } catch (error) {
      console.error('Failed to toggle check:', error);
    } finally {
      setCheckingActions((prev) => {
        const next = new Set(prev);
        next.delete(action.id);
        return next;
      });
    }
  };

  // Group actions by mandalart
  const actionsByMandalart = actions.reduce((groups, action) => {
    const mandalartId = action.sub_goal.mandalart.id;
    if (!groups[mandalartId]) {
      groups[mandalartId] = {
        mandalart: action.sub_goal.mandalart,
        actions: [],
      };
    }
    groups[mandalartId].actions.push(action);
    return groups;
  }, {} as Record<string, { mandalart: any; actions: ActionWithContext[] }>);

  const checkedCount = actions.filter((a) => a.is_checked).length;
  const totalCount = actions.length;
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>오늘의 실천</Text>
        <Text style={styles.subtitle}>{formatDateString(selectedDate)}</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {checkedCount}/{totalCount} 완료
          </Text>
          <Text style={styles.progressPercentage}>{progress}%</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {totalCount === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>실천 항목이 없습니다</Text>
            <Text style={styles.emptyText}>
              만다라트를 생성하고{'\n'}실천 항목을 추가해보세요
            </Text>
          </View>
        ) : (
          Object.values(actionsByMandalart).map((group) => (
            <View key={group.mandalart.id} style={styles.mandalartGroup}>
              <View style={styles.mandalartHeader}>
                <Text style={styles.mandalartTitle}>{group.mandalart.center_goal}</Text>
              </View>

              {group.actions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={styles.actionItem}
                  onPress={() => handleToggleCheck(action)}
                  disabled={checkingActions.has(action.id)}
                >
                  <View style={styles.actionContent}>
                    <View
                      style={[
                        styles.checkbox,
                        action.is_checked && styles.checkboxChecked,
                      ]}
                    >
                      {action.is_checked && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                    <View style={styles.actionText}>
                      <Text
                        style={[
                          styles.actionTitle,
                          action.is_checked && styles.actionTitleChecked,
                        ]}
                      >
                        {action.title}
                      </Text>
                      <Text style={styles.actionSubgoal}>
                        {action.sub_goal.title}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.actionMeta}>
                    <View style={[styles.typeBadge, getTypeBadgeStyle(action.type)]}>
                      <Text style={styles.typeBadgeText}>
                        {getTypeLabel(action.type)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
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

function getTypeBadgeStyle(type: string) {
  switch (type) {
    case 'routine':
      return { backgroundColor: '#dbeafe' };
    case 'mission':
      return { backgroundColor: '#fef3c7' };
    case 'reference':
      return { backgroundColor: '#f3e8ff' };
    default:
      return { backgroundColor: '#e5e7eb' };
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
  progressContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
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
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  mandalartGroup: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  mandalartHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  mandalartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  actionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    color: '#1f2937',
    marginBottom: 2,
  },
  actionTitleChecked: {
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  actionSubgoal: {
    fontSize: 12,
    color: '#6b7280',
  },
  actionMeta: {
    marginLeft: 12,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
});

