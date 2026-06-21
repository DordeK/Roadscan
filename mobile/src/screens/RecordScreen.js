import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Share,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { v4 as uuidv4 } from 'uuid';

import { startRecording, stopRecording } from '../services/recording';
import { saveRecordingSession, getRecordingSessions, deleteRecordingSession } from '../services/storage';
import AccelerationGraph from '../components/AccelerationGraph';
import { V_SPIKE_DOWN_MS2, V_SPIKE_UP_MS2 } from '../constants/detection';

const MAX_SAMPLES = 12000; // ~10 min at 20 Hz
const GRAPH_SAMPLES = 100;
// Label window: mark ±LABEL_HALF_WIN samples around each press as pothole
const LABEL_HALF_WIN = 8;

export default function RecordScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0); // seconds
  const [sampleCount, setSampleCount] = useState(0);
  const [labelCount, setLabelCount] = useState(0);
  const [graphSamples, setGraphSamples] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [markFlash, setMarkFlash] = useState(false);

  // Refs for closure access in recording callback
  const samplesRef = useRef([]);
  const labelsRef = useRef([]); // array of { sampleIndex, t }
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const graphBufRef = useRef([]);

  const loadSessions = useCallback(async () => {
    const s = await getRecordingSessions();
    setSessions(s);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions])
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleStart = () => {
    samplesRef.current = [];
    labelsRef.current = [];
    graphBufRef.current = [];
    setDuration(0);
    setSampleCount(0);
    setLabelCount(0);
    setGraphSamples([]);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    startRecording((sample) => {
      samplesRef.current.push(sample);
      const count = samplesRef.current.length;

      // Update graph buffer
      const g = [...graphBufRef.current, sample].slice(-GRAPH_SAMPLES);
      graphBufRef.current = g;

      // Throttle state updates to every 5 samples (~4/sec) to avoid excessive re-renders
      if (count % 5 === 0) {
        setSampleCount(count);
        setGraphSamples([...g]);
      }

      // Auto-stop at max samples
      if (count >= MAX_SAMPLES) {
        handleStop(true);
      }
    });

    setIsRecording(true);
  };

  const handleStop = useCallback(async (autoStopped = false) => {
    stopRecording();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);

    const samples = samplesRef.current;
    const labels = labelsRef.current;

    if (samples.length < 10) {
      if (autoStopped) return;
      Alert.alert('Too short', 'Recording must have at least 10 samples.');
      return;
    }

    const session = {
      id: uuidv4(),
      startedAt: startTimeRef.current,
      endedAt: Date.now(),
      sampleCount: samples.length,
      labelCount: labels.length,
      samples,
      labels,
    };

    try {
      await saveRecordingSession(session);
      await loadSessions();
      if (autoStopped) {
        Alert.alert('Auto-stopped', 'Max recording length (10 min) reached. Session saved.');
      }
    } catch (err) {
      Alert.alert('Save failed', err.message);
    }
  }, [loadSessions]);

  const handleMarkPothole = () => {
    if (!isRecording) return;
    const idx = Math.max(0, samplesRef.current.length - 1);
    labelsRef.current.push({ sampleIndex: idx, t: Date.now() });
    setLabelCount(labelsRef.current.length);
    // Flash feedback
    setMarkFlash(true);
    setTimeout(() => setMarkFlash(false), 300);
  };

  const handleExport = async (session) => {
    // Build a label set: sampleIndex → 1 if within LABEL_HALF_WIN of any label
    const labelSet = new Set();
    session.labels.forEach(({ sampleIndex }) => {
      for (let i = Math.max(0, sampleIndex - LABEL_HALF_WIN); i <= Math.min(session.samples.length - 1, sampleIndex + LABEL_HALF_WIN); i++) {
        labelSet.add(i);
      }
    });

    const header = 't,ax_g,ay_g,az_g,vert_accel_ms2,delta_ms2,pothole_label';
    const rows = session.samples.map((s, i) =>
      `${s.t},${s.ax.toFixed(5)},${s.ay.toFixed(5)},${s.az.toFixed(5)},${s.vertAccel.toFixed(4)},${s.delta.toFixed(4)},${labelSet.has(i) ? 1 : 0}`
    );
    const csv = [header, ...rows].join('\n');

    const sessionDate = new Date(session.startedAt).toISOString().replace(/[:.]/g, '-');
    try {
      await Share.share({
        title: `pothole_training_${sessionDate}.csv`,
        message: csv,
      });
    } catch (err) {
      Alert.alert('Export failed', err.message);
    }
  };

  const handleDelete = (session) => {
    Alert.alert(
      'Delete session',
      `Delete session from ${formatDate(session.startedAt)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteRecordingSession(session.id);
            await loadSessions();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Training Data Recorder</Text>
      <Text style={styles.subtitle}>Collect labeled accelerometer data for ML training</Text>

      {/* Duration + sample counter */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{formatDuration(duration)}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{sampleCount}</Text>
          <Text style={styles.statLabel}>Samples</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#F44336' }]}>{labelCount}</Text>
          <Text style={styles.statLabel}>Potholes marked</Text>
        </View>
      </View>

      {/* Live graph while recording */}
      {isRecording && (
        <AccelerationGraph
          samples={graphSamples}
          detections={[]}
          downThreshold={V_SPIKE_DOWN_MS2}
          upThreshold={V_SPIKE_UP_MS2}
        />
      )}

      {/* MARK POTHOLE — big prominent button */}
      {isRecording && (
        <TouchableOpacity
          style={[styles.markBtn, markFlash && styles.markBtnFlash]}
          onPress={handleMarkPothole}
          activeOpacity={0.7}
        >
          <Text style={styles.markBtnIcon}>⚠️</Text>
          <Text style={styles.markBtnText}>MARK POTHOLE</Text>
          <Text style={styles.markBtnSub}>Tap when going over a pothole</Text>
        </TouchableOpacity>
      )}

      {/* Start / Stop button */}
      <TouchableOpacity
        style={[styles.toggleBtn, isRecording ? styles.toggleStop : styles.toggleStart]}
        onPress={isRecording ? () => handleStop(false) : handleStart}
        activeOpacity={0.8}
      >
        <Text style={styles.toggleBtnText}>
          {isRecording ? '⏹  STOP & SAVE' : '⏺  START RECORDING'}
        </Text>
      </TouchableOpacity>

      {/* Max duration warning */}
      {isRecording && (
        <Text style={styles.hint}>Auto-stops at 10 min · {MAX_SAMPLES - sampleCount} samples remaining</Text>
      )}

      {/* Saved sessions */}
      {sessions.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Saved Sessions</Text>
          {sessions.map((s) => (
            <View key={s.id} style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <Text style={styles.sessionDate}>{formatDate(s.startedAt)}</Text>
                <Text style={styles.sessionDuration}>{formatDuration(Math.floor((s.endedAt - s.startedAt) / 1000))}</Text>
              </View>
              <View style={styles.sessionMeta}>
                <Text style={styles.sessionMetaText}>{s.sampleCount} samples</Text>
                <Text style={[styles.sessionMetaText, { color: '#F44336' }]}>{s.labelCount} potholes labeled</Text>
              </View>
              <View style={styles.sessionActions}>
                <TouchableOpacity style={styles.exportBtn} onPress={() => handleExport(s)}>
                  <Text style={styles.exportBtnText}>Export CSV</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(s)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      {sessions.length === 0 && !isRecording && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyText}>No sessions yet</Text>
          <Text style={styles.emptySubtext}>
            Start a recording, drive over potholes, and tap the button to label them.{'\n'}
            Export as CSV to use for ML model training.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatDate(ts) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
    fontSize: 24,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
  },
  subtitle: {
    color: '#555',
    fontSize: 13,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statNumber: {
    color: '#2196F3',
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    color: '#555',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  markBtn: {
    backgroundColor: '#7B1010',
    borderRadius: 16,
    paddingVertical: 28,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#F44336',
  },
  markBtnFlash: {
    backgroundColor: '#F44336',
  },
  markBtnIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  markBtnText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  markBtnSub: {
    color: '#FF9999',
    fontSize: 12,
    marginTop: 4,
  },
  toggleBtn: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleStart: {
    backgroundColor: '#1E4D1E',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  toggleStop: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#555',
  },
  toggleBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hint: {
    color: '#444',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  sessionCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sessionDate: {
    color: '#CCC',
    fontSize: 14,
    fontWeight: '600',
  },
  sessionDuration: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  sessionMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  sessionMetaText: {
    color: '#666',
    fontSize: 12,
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 10,
  },
  exportBtn: {
    flex: 1,
    backgroundColor: '#0D2A40',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  exportBtnText: {
    color: '#2196F3',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#555',
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
    gap: 10,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    color: '#555',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#444',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
