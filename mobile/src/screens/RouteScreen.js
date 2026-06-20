import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as Location from 'expo-location';

import { geocodeAddress, getRoute, haversineDistance, getPotholesAlongRoute } from '../services/mapbox';
import { getNearbyPotholes } from '../services/api';

const SEVERITY_COLORS = {
  low: '#4CAF50',
  medium: '#FF9800',
  high: '#F44336',
};

function severityColor(severity) {
  return SEVERITY_COLORS[severity] ?? '#FF9800';
}

export default function RouteScreen() {
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [routeCoords, setRouteCoords] = useState(null);   // [{ latitude, longitude }]
  const [potholes, setPotholes] = useState([]);            // pothole objects along route
  const [fromCoord, setFromCoord] = useState(null);        // { lat, lng }
  const [toCoord, setToCoord] = useState(null);            // { lat, lng }

  const [locating, setLocating] = useState(false);
  const mapRef = useRef(null);

  const handleUseMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      // Reverse geocode to get a human-readable label
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      const label = place
        ? [place.street, place.city].filter(Boolean).join(', ') || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
        : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      setFromText(label);
      // Store coords directly so we skip geocoding for the "From" field
      setFromCoord({ lat: latitude, lng: longitude });
    } catch (err) {
      Alert.alert('Error', 'Could not get your location.');
    } finally {
      setLocating(false);
    }
  };

  const handleFindRoute = async () => {
    const fromTrimmed = fromText.trim();
    const toTrimmed = toText.trim();
    if (!fromTrimmed || !toTrimmed) {
      Alert.alert('Missing input', 'Please enter both a From and a To location.');
      return;
    }

    setLoading(true);
    setError(null);
    setRouteCoords(null);
    setPotholes([]);

    try {
      // 1. Geocode addresses (skip From if we already have coords from "Use my location")
      const [fromResult, toResult] = await Promise.all([
        fromCoord ? Promise.resolve(fromCoord) : geocodeAddress(fromTrimmed),
        geocodeAddress(toTrimmed),
      ]);

      if (!fromResult) {
        setError(`Could not find location: "${fromTrimmed}"`);
        return;
      }
      if (!toResult) {
        setError(`Could not find location: "${toTrimmed}"`);
        return;
      }

      setFromCoord(fromResult);
      setToCoord(toResult);

      // 2. Fetch route
      const coords = await getRoute(fromResult.lat, fromResult.lng, toResult.lat, toResult.lng);
      setRouteCoords(coords);

      // 3. Compute bounding box centre + radius for the potholes query
      const lats = coords.map((c) => c.latitude);
      const lngs = coords.map((c) => c.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      // Half-diagonal of the bounding box in metres (generous — we'll filter further below)
      const halfDiagM = Math.ceil(
        haversineDistance(minLat, minLng, maxLat, maxLng) / 2
      );
      const queryRadius = Math.max(halfDiagM, 200); // at least 200 m

      // 4. Fetch all potholes inside that bounding-box circle, then filter to ≤50 m of route
      const nearbyRaw = await getNearbyPotholes(centerLat, centerLng, queryRadius);
      const nearbyList = Array.isArray(nearbyRaw) ? nearbyRaw : (nearbyRaw?.data ?? []);
      const along = getPotholesAlongRoute(coords, nearbyList);
      setPotholes(along);

      // 5. Fit map to show the whole route
      if (mapRef.current && coords.length > 0) {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
          animated: true,
        });
      }
    } catch (err) {
      console.warn('[RouteScreen] error:', err.message);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGoogleMaps = () => {
    if (!fromCoord || !toCoord) return;
    const url =
      `https://www.google.com/maps/dir/?api=1` +
      `&origin=${fromCoord.lat},${fromCoord.lng}` +
      `&destination=${toCoord.lat},${toCoord.lng}` +
      `&travelmode=driving`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Error', 'Could not open Google Maps.')
    );
  };

  const hasRoute = routeCoords && routeCoords.length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Input panel ── */}
      <View style={styles.inputPanel}>
        <Text style={styles.panelTitle}>Plan a Route</Text>

        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>From</Text>
          <TextInput
            style={styles.textInput}
            value={fromText}
            onChangeText={(t) => { setFromText(t); setFromCoord(null); }}
            placeholder="Starting location"
            placeholderTextColor="#555"
            returnKeyType="next"
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.locateBtn}
            onPress={handleUseMyLocation}
            disabled={loading || locating}
          >
            {locating
              ? <ActivityIndicator size="small" color="#2196F3" />
              : <Text style={styles.locateBtnText}>📍</Text>
            }
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>To</Text>
          <TextInput
            style={styles.textInput}
            value={toText}
            onChangeText={setToText}
            placeholder="Destination"
            placeholderTextColor="#555"
            returnKeyType="search"
            onSubmitEditing={handleFindRoute}
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          style={[styles.findBtn, loading && styles.findBtnDisabled]}
          onPress={handleFindRoute}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.findBtnText}>FIND ROUTE</Text>
          )}
        </TouchableOpacity>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}
      </View>

      {/* ── Map ── */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: 48.8566,
            longitude: 2.3522,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          userInterfaceStyle="dark"
        >
          {hasRoute && (
            <Polyline
              coordinates={routeCoords}
              strokeColor="#2196F3"
              strokeWidth={4}
            />
          )}

          {potholes.map((p, idx) => {
            const lat = p.lat ?? p.latitude;
            const lng = p.lng ?? p.longitude;
            const color = severityColor(p.severity);
            return (
              <Marker
                key={p.id ?? idx}
                coordinate={{ latitude: lat, longitude: lng }}
                title={`${(p.severity ?? 'unknown').toUpperCase()} severity`}
                description={p.g_force ? `${Number(p.g_force).toFixed(2)} G` : undefined}
                pinColor={color}
              />
            );
          })}
        </MapView>
      </View>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <Text style={styles.potholeCount}>
          {hasRoute
            ? `${potholes.length} pothole${potholes.length !== 1 ? 's' : ''} on this route`
            : 'Enter locations and tap Find Route'}
        </Text>

        <TouchableOpacity
          style={[styles.mapsBtn, !hasRoute && styles.mapsBtnDisabled]}
          onPress={handleOpenGoogleMaps}
          disabled={!hasRoute}
          activeOpacity={0.8}
        >
          <Text style={styles.mapsBtnText}>OPEN IN GOOGLE MAPS</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },

  // ── Input panel ──
  inputPanel: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  panelTitle: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  inputLabel: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    width: 38,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginLeft: 38,
    marginVertical: 2,
  },
  locateBtn: {
    padding: 6,
  },
  locateBtnText: {
    fontSize: 18,
  },
  findBtn: {
    backgroundColor: '#2196F3',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  findBtnDisabled: {
    opacity: 0.5,
  },
  findBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  errorText: {
    color: '#F44336',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },

  // ── Map ──
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },

  // ── Footer ──
  footer: {
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 14,
    gap: 10,
  },
  potholeCount: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
  },
  mapsBtn: {
    backgroundColor: '#1E6B2E',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  mapsBtnDisabled: {
    opacity: 0.4,
  },
  mapsBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
