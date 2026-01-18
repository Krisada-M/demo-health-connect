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
import { clearStepData, readSteps7d, requestPermissions, safeStringify, writeStepData } from './src/health/healthClient';

export default function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${msg}`, ...prev]);
  };

  const handleRequestPermissions = async () => {
    setLoading(true);
    addLog('Requesting permissions...');
    try {
      await requestPermissions();
      addLog('Permission request completed.');
    } catch (e: any) {
      addLog(`Permission Error: ${e.message || 'unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReadSteps = async () => {
    setLoading(true);
    addLog('Reading steps (last 7 days)...');
    try {
      const data = await readSteps7d();
      addLog(`Result: ${data.summary}`);
      addLog(`Raw: ${safeStringify(data.raw)}`);
    } catch (e: any) {
      addLog(`Read Error: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const handleWriteSteps = async () => {
    setLoading(true);
    addLog('Writing sample step data...');
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // 1 hour ago
      const endTime = now.toISOString();
      
      await writeStepData(1, startTime, endTime);
      addLog('Successfully wrote 10 steps');
    } catch (e: any) {
      addLog(`Write Error: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSteps = async () => {
    setLoading(true);
    addLog('Clearing step data (last 30 days)...');
    try {
      await clearStepData();
      addLog('Successfully cleared step data');
    } catch (e: any) {
      addLog(`Clear Error: ${e.message || e}`);
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
          <Text style={styles.buttonText}>1. Request Permissions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary, loading && styles.buttonDisabled]}
          onPress={handleReadSteps}
          disabled={loading}
        >
          <Text style={styles.buttonText}>2. Read Steps (7d)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonTertiary, loading && styles.buttonDisabled]}
          onPress={handleWriteSteps}
          disabled={loading}
        >
          <Text style={styles.buttonText}>3. Write Sample Steps</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonQuaternary, loading && styles.buttonDisabled]}
          onPress={handleClearSteps}
          disabled={loading}
        >
          <Text style={styles.buttonText}>4. Clear Step Data</Text>
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
  buttonQuaternary: {
    backgroundColor: '#FF3B30',
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
