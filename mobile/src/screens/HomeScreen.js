import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { startDetection, stopDetection } from '../services/detection';
import { startLocationTracking, stopLocationTracking, getCurrentLocation } from '../services/location';
import { loadAlertSound, unloadAlertSound } from '../services/audio';
import { logPothole } from '../services/api';
import { getDeviceUuid, getSettings } from '../services/storage';

export default function HomeScreen() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [settings, setSettings] = useState(null);
  const [todayCount, setTodayCount] = useState(0);
  const [lastDetection, setLastDetection] = useState(null);
  const deviceUuidRef = useRef(null);
  const todayCountRef = useRef(0);

  // Keep ref in sync with state for the closure in startDetection callback
  useEffect(() => { todayCountRef.current = todayCount; }, [todayCount]);

  // Load settings and device UUID once
  useEffect(() => {
    (async () => {
      const s = await getSettings();
      setSettings(s);
      deviceUuidRef.current = await getDeviceUuid();
    })();
  }, []);

  // Reload settings when screen comes into focus (user may have changed them)
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const s = await getSettings();
        setSettings(s);
      })();
    }, [isMonitoring])
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isMonitoring) {
        stopDetection();
        stopLocationTracking();
        unloadAlertSound();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleMonitoring = async () => {
    if (isMonitoring) {
      stopDetection();
      await stopLocationTracking();
      await unloadAlertSound();
      setIsMonitoring(false);
      return;
    }

    setIsStarting(true);
    try {
      console.log('[home] Loading alert sound...');
      await loadAlertSound();
      console.log('[home] Starting location tracking...');
      const success = await startLocationTracking();
      console.log('[home] Location tracking started:', success);
      if (!success) {
        Alert.alert(
          'Permission Required',
          'Location permission is required to monitor for potholes. Please enable it in Settings.',
          [{ text: 'OK' }]
        );
        setIsStarting(false);
        return;
      }

      console.log('[home] Starting detection...');
      const currentSettings = await getSettings();
      startDetection({
        sensitivity: currentSettings.sensitivity ?? 'normal',
        onDetect: async ({ severity, gForce }) => {
          setLastDetection({ severity, gForce, time: new Date() });
          setTodayCount((c) => c + 1);

          try {
            const loc = await getCurrentLocation();
            console.log('[HomeScreen] location for save:', loc, 'deviceUuid:', deviceUuidRef.current);
            if (!loc) {
              console.warn('[HomeScreen] no location available, skipping save');
              return;
            }
            if (!deviceUuidRef.current) {
              console.warn('[HomeScreen] no device UUID, skipping save');
              return;
            }
            console.log('[HomeScreen] saving pothole to DB...', { severity, gForce });
            const result = await logPothole(
              deviceUuidRef.current,
              loc.latitude,
              loc.longitude,
              severity,
              gForce
            );
            console.log('[HomeScreen] saved OK:', result);
          } catch (err) {
            console.warn('[HomeScreen] logPothole failed:', err.message, err.response?.status, err.response?.data);
          }
        },
      });

      setIsMonitoring(true);
    } catch (err) {
      console.error('[home] Start monitoring failed:', err.message, err.stack);
      Alert.alert('Error', 'Could not start monitoring: ' + err.message);
    } finally {
      setIsStarting(false);
    }
  };

  const severityColor = (s) =>
    s === 'high' ? '#F44336' : s === 'medium' ? '#FF9800' : '#4CAF50';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Title */}
      <Text style={styles.title}>Pothole Tracker</Text>
      <Text style={styles.subtitle}>Road hazard detection & alerts</Text>

      {/* Toggle button */}
      <TouchableOpacity
        style={[styles.toggleBtn, isMonitoring ? styles.toggleBtnActive : styles.toggleBtnInactive]}
        onPress={handleToggleMonitoring}
        disabled={isStarting}
        activeOpacity={0.8}
      >
        {isStarting ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : (
          <>
            <Text style={styles.toggleBtnText}>
              {isMonitoring ? 'STOP MONITORING' : 'START MONITORING'}
            </Text>
            <Text style={styles.toggleBtnIcon}>{isMonitoring ? '⏹' : '▶'}</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Status */}
      <View style={[styles.statusBadge, isMonitoring ? styles.statusActive : styles.statusInactive]}>
        <View style={[styles.statusDot, isMonitoring ? styles.dotActive : styles.dotInactive]} />
        <Text style={[styles.statusText, isMonitoring ? styles.statusTextActive : styles.statusTextInactive]}>
          {isMonitoring ? 'Active — Monitoring for potholes' : 'Inactive'}
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{todayCount}</Text>
          <Text style={styles.statLabel}>Detected today</Text>
        </View>
        {lastDetection && (
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: severityColor(lastDetection.severity) }]}>
              {lastDetection.gForce.toFixed(2)}G
            </Text>
            <Text style={styles.statLabel}>Last impact</Text>
          </View>
        )}
      </View>

      {/* Last detection pill */}
      {lastDetection && (
        <View style={[styles.lastDetectionBanner, { borderColor: severityColor(lastDetection.severity) }]}>
          <Text style={styles.lastDetectionLabel}>Last detection</Text>
          <Text style={[styles.lastDetectionSeverity, { color: severityColor(lastDetection.severity) }]}>
            {lastDetection.severity.toUpperCase()} — {lastDetection.gForce.toFixed(2)} G
          </Text>
          <Text style={styles.lastDetectionTime}>
            {lastDetection.time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Text>
        </View>
      )}

      {/* Description */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How it works</Text>
        <Text style={styles.infoText}>
          When active, the app uses your phone's accelerometer to detect sudden vertical impacts — the signature of a pothole.
        </Text>
        <Text style={styles.infoText}>
          Each detection is logged to the server with your GPS coordinates, helping build a shared road-hazard map.
        </Text>
        <Text style={styles.infoText}>
          As you drive, the app checks for known potholes ahead and plays an audio alert when you're within the warning distance.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
  },
  subtitle: {
    color: '#666',
    fontSize: 14,
    marginBottom: 28,
  },
  toggleBtn: {
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    gap: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  toggleBtnInactive: {
    backgroundColor: '#1E6B2E',
  },
  toggleBtnActive: {
    backgroundColor: '#8B1A1A',
  },
  toggleBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  toggleBtnIcon: {
    fontSize: 18,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 28,
    gap: 8,
  },
  statusActive: {
    backgroundColor: '#0D3B1A',
  },
  statusInactive: {
    backgroundColor: '#1A1A1A',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#4CAF50',
  },
  dotInactive: {
    backgroundColor: '#555',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusTextActive: {
    color: '#4CAF50',
  },
  statusTextInactive: {
    color: '#555',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    color: '#2196F3',
    fontSize: 32,
    fontWeight: '700',
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  lastDetectionBanner: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 3,
  },
  lastDetectionLabel: {
    color: '#666',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  lastDetectionSeverity: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  lastDetectionTime: {
    color: '#555',
    fontSize: 12,
  },
  infoCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 18,
    gap: 10,
  },
  infoTitle: {
    color: '#CCC',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    color: '#666',
    fontSize: 13,
    lineHeight: 20,
  },
});
