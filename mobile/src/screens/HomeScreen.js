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
import { logPothole, mlPredict } from '../services/api';
import { getDeviceUuid, getSettings } from '../services/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startSurfaceLogging, stopSurfaceLogging, pushSurfaceSample } from '../services/surfaceLogger';
import { requestNotificationPermissions, scheduleDemoAlert } from '../services/notifications';
import AccelerationGraph from '../components/AccelerationGraph';
import { V_SPIKE_DOWN_MS2, V_SPIKE_UP_MS2 } from '../constants/detection';

const MAX_GRAPH_SAMPLES = 100;

function DemoAlertButton() {
  const [countdown, setCountdown] = useState(null);

  const handlePress = async () => {
    await scheduleDemoAlert(10);
    setCountdown(10);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); return null; }
        return c - 1;
      });
    }, 1000);
  };

  return (
    <TouchableOpacity
      style={[styles.demoBtn, countdown !== null && styles.demoBtnActive]}
      onPress={handlePress}
      disabled={countdown !== null}
      activeOpacity={0.6}
    >
      <Text style={styles.demoBtnText}>
        {countdown !== null ? `⚠️  ${countdown}s` : ''}
      </Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [settings, setSettings] = useState(null);
  const [todayCount, setTodayCount] = useState(0);
  const [lastDetection, setLastDetection] = useState(null);
  const [mlResult, setMlResult] = useState(null);
  const [graphSamples, setGraphSamples] = useState([]);
  const [graphDetections, setGraphDetections] = useState([]);
  const [currentSurface, setCurrentSurface] = useState(null);
  const graphSamplesRef = useRef([]);
  const graphDetectionsRef = useRef([]);
  const deviceUuidRef = useRef(null);
  const todayCountRef = useRef(0);

  // Keep ref in sync with state for the closure in startDetection callback
  useEffect(() => { todayCountRef.current = todayCount; }, [todayCount]);

  // Load settings and device UUID, then auto-start monitoring
  useEffect(() => {
    (async () => {
      await AsyncStorage.removeItem('@pothole_tracker/settings');
      await requestNotificationPermissions();
      const s = await getSettings();
      setSettings(s);
      deviceUuidRef.current = await getDeviceUuid();
      await startMonitoring();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const startMonitoring = async () => {
    setIsStarting(true);
    try {
      await loadAlertSound();
      const success = await startLocationTracking();
      if (!success) {
        Alert.alert(
          'Permission Required',
          'Location permission is required to monitor for potholes. Please enable it in Settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      const currentSettings = await getSettings();
      startDetection({
        sensitivity: currentSettings.sensitivity ?? 'normal',
        mlPredict,
        onData: ({ vertAccel, delta, isMoving, ax_g, ay_g, az_g }) => {
          const next = [...graphSamplesRef.current, { vertAccel, delta, isMoving, ax_g, ay_g, az_g }].slice(-MAX_GRAPH_SAMPLES);
          graphSamplesRef.current = next;
          setGraphSamples([...next]);
          pushSurfaceSample(vertAccel);
        },
        onDetect: async ({ severity, gForce }) => {
          const idx = Math.max(0, graphSamplesRef.current.length - 1);
          const nextDet = [...graphDetectionsRef.current, { sampleIndex: idx }].slice(-20);
          graphDetectionsRef.current = nextDet;
          setGraphDetections([...nextDet]);
          setLastDetection({ severity, gForce, time: new Date() });
          setMlResult(null);
          setTodayCount((c) => c + 1);

          const window = graphSamplesRef.current.slice(-20).map((s) => ({
            vert_accel_ms2: s.vertAccel,
            delta_ms2:      s.delta,
            ax_g:           s.ax_g ?? 0,
            ay_g:           s.ay_g ?? 0,
            az_g:           s.az_g ?? -1,
          }));
          if (window.length >= 20) {
            mlPredict(window)
              .then((r) => setMlResult(r))
              .catch((err) => console.warn('[HomeScreen] mlPredict failed:', err.message));
          }

          try {
            const loc = await getCurrentLocation();
            if (!loc || !deviceUuidRef.current) return;
            await logPothole(deviceUuidRef.current, loc.latitude, loc.longitude, severity, gForce);
          } catch (err) {
            console.warn('[HomeScreen] logPothole failed:', err.message);
          }
        },
      });

      startSurfaceLogging(deviceUuidRef.current, ({ surfaceType, confidence }) => {
        setCurrentSurface({ type: surfaceType, confidence });
      });
      setIsMonitoring(true);
    } catch (err) {
      console.error('[home] Start monitoring failed:', err.message, err.stack);
      Alert.alert('Error', 'Could not start monitoring: ' + err.message);
    } finally {
      setIsStarting(false);
    }
  };

  const handleToggleMonitoring = async () => {
    if (isMonitoring) {
      stopDetection();
      stopSurfaceLogging();
      await stopLocationTracking();
      await unloadAlertSound();
      setIsMonitoring(false);
      setMlResult(null);
      return;
    }
    await startMonitoring();
  };

  const severityColor = (s) =>
    s === 'high' ? '#F44336' : s === 'medium' ? '#FF9800' : '#4CAF50';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status */}
      <View style={[styles.statusBadge, isMonitoring ? styles.statusActive : styles.statusInactive]}>
        {isStarting
          ? <ActivityIndicator color="#4CAF50" size="small" style={{ marginRight: 8 }} />
          : <View style={[styles.statusDot, isMonitoring ? styles.dotActive : styles.dotInactive]} />
        }
        <Text style={[styles.statusText, isMonitoring ? styles.statusTextActive : styles.statusTextInactive]}>
          {isStarting ? 'Starting…' : isMonitoring ? 'Active — Monitoring' : 'Inactive'}
        </Text>
      </View>

      {/* <TouchableOpacity
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
      </TouchableOpacity> */}

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

      {/* Acceleration graph — always visible */}
      <AccelerationGraph
        samples={graphSamples}
        detections={graphDetections}
        downThreshold={V_SPIKE_DOWN_MS2}
        upThreshold={V_SPIKE_UP_MS2}
      />

      {/* Road surface card */}
      <View style={styles.surfaceCard}>
        <Text style={styles.surfaceLabel}>Road Surface</Text>
        {currentSurface ? (
          <View style={styles.surfaceRow}>
            <Text style={styles.surfaceType}>
              {currentSurface.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </Text>
            <View style={styles.surfaceConfBg}>
              <View style={[styles.surfaceConfFill, { width: `${currentSurface.confidence}%` }]} />
            </View>
            <Text style={styles.surfaceConf}>{currentSurface.confidence}%</Text>
          </View>
        ) : (
          <Text style={styles.surfaceWaiting}>
            {isMonitoring ? 'Classifying…' : 'Waiting for data'}
          </Text>
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

          {/* ML confidence badge */}
          {mlResult ? (
            <View style={[styles.mlBadge, { backgroundColor: mlResult.is_pothole ? '#0D2A10' : '#2A1A0D' }]}>
              <View style={[styles.mlDot, { backgroundColor: mlResult.is_pothole ? '#4CAF50' : '#FF9800' }]} />
              <Text style={[styles.mlBadgeText, { color: mlResult.is_pothole ? '#4CAF50' : '#FF9800' }]}>
                ML: {mlResult.is_pothole ? 'Confirmed' : 'Uncertain'} · {(mlResult.probability * 100).toFixed(0)}% · {mlResult.confidence}
              </Text>
            </View>
          ) : (
            <View style={styles.mlBadge}>
              <ActivityIndicator size="small" color="#444" style={{ marginRight: 6 }} />
              <Text style={styles.mlBadgeText}>ML analysis…</Text>
            </View>
          )}
        </View>
      )}

      {/* Demo button */}
      <DemoAlertButton />

      {/* Description — hidden for clean demo */}
      {/* <View style={styles.infoCard}>
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
      </View> */}
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
  mlBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#1E1E1E',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
    alignSelf: 'flex-start',
  },
  mlDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mlBadgeText: {
    color: '#666',
    fontSize: 11,
    fontWeight: '500',
  },
  surfaceCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  surfaceLabel: {
    color: '#666',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  surfaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  surfaceType: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  surfaceConfBg: {
    width: 60,
    height: 4,
    backgroundColor: '#2A2A2A',
    borderRadius: 2,
    overflow: 'hidden',
  },
  surfaceConfFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  surfaceConf: {
    color: '#555',
    fontSize: 12,
    width: 32,
    textAlign: 'right',
  },
  surfaceWaiting: {
    color: '#444',
    fontSize: 13,
    fontStyle: 'italic',
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
  demoBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  demoBtnActive: {
    backgroundColor: 'transparent',
  },
  demoBtnText: {
    color: '#333',
    fontSize: 12,
  },
});
