import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

// Initialize Supabase
import './src/lib/supabase-init';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MandaAct Mobile</Text>
      <Text style={styles.subtitle}>React 19.1.0 + RN 0.81.5</Text>
      <Text style={styles.success}>✅ React 19 Migration Complete</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
  success: {
    fontSize: 16,
    color: '#10b981',
    marginTop: 16,
    fontWeight: '600',
  },
});
