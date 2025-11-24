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
  Switch,
} from 'react-native';
import {
  useAuthStore,
  fetchMandalarts,
  toggleMandalartActive,
  Mandalart,
} from '@mandaact/shared';

export default function MandalartScreen() {
  const user = useAuthStore((state) => state.user);
  const [mandalarts, setMandalarts] = useState<Mandalart[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  // Load mandalarts
  const loadMandalarts = async () => {
    if (!user) return;

    try {
      const data = await fetchMandalarts(user.id);
      setMandalarts(data);
    } catch (error) {
      console.error('Failed to load mandalarts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMandalarts();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMandalarts();
  };

  const handleToggleActive = async (id: string, currentIsActive: boolean) => {
    if (togglingIds.has(id)) return;

    setTogglingIds((prev) => new Set(prev).add(id));

    try {
      const result = await toggleMandalartActive(id, !currentIsActive);
      if (result.success && result.mandalart) {
        setMandalarts((prev) =>
          prev.map((m) => (m.id === id ? result.mandalart! : m))
        );
      }
    } catch (error) {
      console.error('Failed to toggle active:', error);
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>만다라트</Text>
          <Text style={styles.subtitle}>목표 관리 • {mandalarts.length}개</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {mandalarts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>만다라트가 없습니다</Text>
            <Text style={styles.emptyText}>
              웹에서 만다라트를 생성하고{'\n'}모바일에서 확인해보세요
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {mandalarts.map((mandalart) => (
              <TouchableOpacity
                key={mandalart.id}
                style={[
                  styles.mandalartCard,
                  !mandalart.is_active && styles.mandalartCardInactive,
                ]}
                onPress={() => {
                  // TODO: Navigate to detail screen
                  console.log('Navigate to detail:', mandalart.id);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardTextContainer}>
                    <Text
                      style={[
                        styles.cardTitle,
                        !mandalart.is_active && styles.cardTitleInactive,
                      ]}
                      numberOfLines={2}
                    >
                      {mandalart.title}
                    </Text>
                    <Text
                      style={[
                        styles.cardDescription,
                        !mandalart.is_active && styles.cardDescriptionInactive,
                      ]}
                      numberOfLines={2}
                    >
                      핵심 목표: {mandalart.center_goal}
                    </Text>
                  </View>
                  <View
                    style={styles.switchContainer}
                    onStartShouldSetResponder={() => true}
                  >
                    <Switch
                      value={mandalart.is_active}
                      onValueChange={() =>
                        handleToggleActive(mandalart.id, mandalart.is_active)
                      }
                      disabled={togglingIds.has(mandalart.id)}
                      trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                      thumbColor={mandalart.is_active ? '#3b82f6' : '#f3f4f6'}
                      ios_backgroundColor="#d1d5db"
                    />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
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
  listContainer: {
    padding: 16,
  },
  mandalartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  mandalartCardInactive: {
    opacity: 0.6,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  cardTitleInactive: {
    color: '#6b7280',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  cardDescriptionInactive: {
    color: '#9ca3af',
  },
  switchContainer: {
    marginLeft: 8,
  },
});
