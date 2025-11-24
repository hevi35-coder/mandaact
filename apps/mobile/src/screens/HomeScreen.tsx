import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useAuthStore } from '@mandaact/shared';

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  const handleSignOut = async () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      {
        text: '취소',
        style: 'cancel',
      },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>MandaAct Mobile</Text>
          <Text style={styles.subtitle}>React Native Home Screen</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>로그인 계정</Text>
          <Text style={styles.infoValue}>{user?.email}</Text>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusIcon}>✅</Text>
          <Text style={styles.statusTitle}>Phase 3 완료</Text>
          <Text style={styles.statusText}>
            React Navigation 설정 완료{'\n'}
            Auth Store 연동 완료{'\n'}
            로그인/로그아웃 기능 작동
          </Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSignOut}>
          <Text style={styles.buttonText}>로그아웃</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            React 18.3.1 + RN 0.76.5 + Expo SDK 52
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  statusIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#065f46',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#047857',
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 'auto',
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
