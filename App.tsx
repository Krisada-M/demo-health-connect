import React, { useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  HealthLayer,
  getDateRangeForLastDays,
  getUserMessage,
  normalizeError,
  safeStringify,
  sumActiveCalories,
  sumDailySteps,
  sumDistance,
} from './src/health/HealthLayer';

export default function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${msg}`, ...prev]);
  };

  const handleRequestPermissions = async () => {
    setLoading(true);
    addLog('Connecting health...');
    try {
      const result = await HealthLayer.ensurePermissions({
        steps: { read: true },
        activeCaloriesBurned: { read: true },
        distance: { read: true },
      });
      addLog(`Permission status: ${result.status}`);
    } catch (e: any) {
      const info = normalizeError(e);
      addLog(`${info.code}: ${getUserMessage(info)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReadSteps = async () => {
    setLoading(true);
    addLog('Reading steps (last 7 days)...');
    try {
      const range = getDateRangeForLastDays(7);
      const dailySteps = await HealthLayer.readDailySteps(range);
      const total = sumDailySteps(dailySteps);
      addLog(`Total steps: ${total}`);
      addLog(`Daily: ${safeStringify(dailySteps)}`);
    } catch (e: any) {
      const info = normalizeError(e);
      addLog(`${info.code}: ${getUserMessage(info)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReadActivity = async () => {
    setLoading(true);
    addLog('Reading activity (last 7 days)...');
    try {
      const range = getDateRangeForLastDays(7);
      const daily = await HealthLayer.readDailyActivity(range);
      const totalCalories = sumActiveCalories(daily);
      const totalDistance = sumDistance(daily);
      addLog(`Active calories (kcal): ${totalCalories}`);
      addLog(`Distance (m): ${totalDistance}`);
      addLog(`Daily: ${safeStringify(daily)}`);
    } catch (e: any) {
      const info = normalizeError(e);
      addLog(`${info.code}: ${getUserMessage(info)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReadAll = async () => {
    setLoading(true);
    addLog('Reading steps + activity (last 7 days)...');
    try {
      const range = getDateRangeForLastDays(7);
      const [dailySteps, dailyActivity] = await Promise.all([
        HealthLayer.readDailySteps(range),
        HealthLayer.readDailyActivity(range),
      ]);
      const totalSteps = sumDailySteps(dailySteps);
      const totalCalories = sumActiveCalories(dailyActivity);
      const totalDistance = sumDistance(dailyActivity);
      addLog(`Total steps: ${totalSteps}`);
      addLog(`Active calories (kcal): ${totalCalories}`);
      addLog(`Distance (m): ${totalDistance}`);
      addLog(`Steps daily: ${safeStringify(dailySteps)}`);
      addLog(`Activity daily: ${safeStringify(dailyActivity)}`);
    } catch (e: any) {
      const info = normalizeError(e);
      addLog(`${info.code}: ${getUserMessage(info)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Health Connect Demo</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRequestPermissions}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Connect Health</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary, loading && styles.buttonDisabled]}
          onPress={handleReadSteps}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Read Steps (7d)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonTertiary, loading && styles.buttonDisabled]}
          onPress={handleReadActivity}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Read Activity (7d)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonAll, loading && styles.buttonDisabled]}
          onPress={handleReadAll}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Read All (7d)</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />}

      <View style={styles.logContainer}>
        <Text style={styles.logTitle}>Logs (Newest Top)</Text>
        <ScrollView style={styles.logScroll} contentContainerStyle={styles.logContent}>
          {logs.length === 0 ? (
            <Text style={styles.emptyText}>No data yet.</Text>
          ) : (
            logs.map((log, index) => (
              <Text key={index} style={styles.logItem} selectable>
                {log}
              </Text>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  controls: {
    padding: 20,
    gap: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#34C759',
  },
  buttonTertiary: {
    backgroundColor: '#FF9500',
  },
  buttonAll: {
    backgroundColor: '#5856D6',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 10,
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  logTitle: {
    padding: 12,
    backgroundColor: '#F9F9F9',
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  logScroll: {
    flex: 1,
  },
  logContent: {
    padding: 12,
  },
  logItem: {
    fontSize: 13,
    fontFamily: 'Menlo', // Monospace if available
    marginBottom: 8,
    color: '#333',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});
