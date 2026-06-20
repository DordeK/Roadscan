import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Text as SvgText, Rect, Circle } from 'react-native-svg';

const GRAPH_WIDTH = 320;
const GRAPH_HEIGHT = 120;
const Y_RANGE = 6; // ±6 m/s² visible range
const PADDING = { top: 8, bottom: 18, left: 28, right: 8 };

const PLOT_W = GRAPH_WIDTH - PADDING.left - PADDING.right;
const PLOT_H = GRAPH_HEIGHT - PADDING.top - PADDING.bottom;

function toY(value) {
  // Map m/s² value to SVG Y coordinate
  const clamped = Math.max(-Y_RANGE, Math.min(Y_RANGE, value));
  return PADDING.top + PLOT_H / 2 - (clamped / Y_RANGE) * (PLOT_H / 2);
}

function toX(index, total) {
  return PADDING.left + (index / (total - 1)) * PLOT_W;
}

export default function AccelerationGraph({ samples, detections, downThreshold, upThreshold }) {
  if (!samples || samples.length < 2) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Vertical acceleration — waiting for data...</Text>
        <View style={styles.placeholder} />
      </View>
    );
  }

  // Build polyline points for vertAccel
  const vertPoints = samples
    .map((s, i) => `${toX(i, samples.length).toFixed(1)},${toY(s.vertAccel).toFixed(1)}`)
    .join(' ');

  // Detection markers (red dots at the sample index where detection happened)
  const detectionDots = detections.map((d, i) => ({
    cx: toX(d.sampleIndex, samples.length),
    cy: toY(samples[d.sampleIndex]?.vertAccel ?? 0),
    key: i,
  }));

  const zeroY = toY(0);
  const downY = toY(-downThreshold);
  const upY = toY(upThreshold);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Vertical acceleration (m/s²)</Text>
      <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT}>
        {/* Background */}
        <Rect x={PADDING.left} y={PADDING.top} width={PLOT_W} height={PLOT_H} fill="#111" rx={4} />

        {/* Zero line */}
        <Line x1={PADDING.left} y1={zeroY} x2={PADDING.left + PLOT_W} y2={zeroY} stroke="#333" strokeWidth={1} />

        {/* Down threshold */}
        <Line x1={PADDING.left} y1={downY} x2={PADDING.left + PLOT_W} y2={downY} stroke="#F44336" strokeWidth={1} strokeDasharray="4,3" opacity={0.7} />
        <SvgText x={PADDING.left + PLOT_W - 2} y={downY - 2} fill="#F44336" fontSize={8} textAnchor="end">{`-${downThreshold.toFixed(1)}`}</SvgText>

        {/* Up threshold */}
        <Line x1={PADDING.left} y1={upY} x2={PADDING.left + PLOT_W} y2={upY} stroke="#4CAF50" strokeWidth={1} strokeDasharray="4,3" opacity={0.7} />
        <SvgText x={PADDING.left + PLOT_W - 2} y={upY + 8} fill="#4CAF50" fontSize={8} textAnchor="end">{`+${upThreshold.toFixed(1)}`}</SvgText>

        {/* Y axis labels */}
        <SvgText x={PADDING.left - 2} y={toY(Y_RANGE) + 4} fill="#555" fontSize={8} textAnchor="end">{`+${Y_RANGE}`}</SvgText>
        <SvgText x={PADDING.left - 2} y={zeroY + 4} fill="#555" fontSize={8} textAnchor="end">0</SvgText>
        <SvgText x={PADDING.left - 2} y={toY(-Y_RANGE) + 4} fill="#555" fontSize={8} textAnchor="end">{`-${Y_RANGE}`}</SvgText>

        {/* Acceleration line */}
        <Polyline points={vertPoints} fill="none" stroke="#2196F3" strokeWidth={1.5} />

        {/* Detection markers */}
        {detectionDots.map((d) => (
          <Circle key={d.key} cx={d.cx} cy={d.cy} r={4} fill="#FF9800" opacity={0.9} />
        ))}
      </Svg>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
          <Text style={styles.legendText}>vert. accel</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
          <Text style={styles.legendText}>down threshold</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>up threshold</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
          <Text style={styles.legendText}>detection</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  label: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  placeholder: {
    height: GRAPH_HEIGHT,
    backgroundColor: '#111',
    borderRadius: 4,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#666',
    fontSize: 10,
  },
});
