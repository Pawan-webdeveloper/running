import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import RunMap from '../../components/RunMap';
import { useComprehensiveTracking, type Segment, type SegmentResult } from '../../hooks/useComprehensiveTracking';

interface MapCoordinate {
  latitude: number;
  longitude: number;
}

interface MapRegion extends MapCoordinate {
  latitudeDelta: number;
  longitudeDelta: number;
}

const DEMO_DISTANCE = {
  lat: 28.6139,
  lng: 77.209,
  altitude: 216,
  timestamp: Date.now(),
  accuracy: 5,
  speed: 0,
  heading: 0,
};

const MOCK_SEGMENTS: Segment[] = [
  {
    id: 'seg1',
    name: 'Central Park Loop',
    startLat: 28.6139,
    startLng: 77.209,
    endLat: 28.6180,
    endLng: 77.2150,
    distance: 800,
  },
];

export default function ActiveRunScreen() {
  const router = useRouter();

  const {
    isTracking,
    path,
    currentLocation,
    stats,
    activeSegment,
    error,
    gpsSignalStrength,
    inPrivacyZone,
    startTracking,
    stopTracking,
    pauseTracking,
    resumeTracking,
    formatDuration,
    formatPace,
  } = useComprehensiveTracking({
    enableAccelerometer: true,
    enableGyroscope: true,
    enableBarometer: true,
    enableSegmentDetection: true,
    segments: MOCK_SEGMENTS,
    privacyZones: [],
    onSegmentComplete: (result: SegmentResult) => {
      Alert.alert(
        'Segment Complete!',
        `You completed ${result.segment.name} in ${formatDuration(result.time)}!`,
        [{ text: 'Awesome!' }]
      );
    },
  });

  const [locationHint, setLocationHint] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const previewPoint = currentLocation
    ? { lat: currentLocation.lat, lng: currentLocation.lng }
    : null;

  const previewRegion: MapRegion = previewPoint
    ? {
        latitude: previewPoint.lat,
        longitude: previewPoint.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : {
        latitude: DEMO_DISTANCE.lat,
        longitude: DEMO_DISTANCE.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  const routeCoordinates: MapCoordinate[] = path.map((point) => ({
    latitude: point.lat,
    longitude: point.lng,
  }));

  useEffect(() => {
    if (error) {
      setLocationHint(null);
      return;
    }

    if (!currentLocation && !isTracking) {
      setLocationHint('Waiting for your current location. Enable GPS/location access and start the run when your device is ready.');
      return;
    }

    setLocationHint(null);
  }, [currentLocation, error, isTracking]);

  const handleStartRun = async () => {
    setIsPaused(false);
    await startTracking();
  };

  const handlePauseResume = () => {
    if (isPaused) {
      resumeTracking();
      setIsPaused(false);
    } else {
      pauseTracking();
      setIsPaused(true);
    }
  };

  const handleComplete = () => {
    setIsPaused(false);
    stopTracking();
    router.back();
  };

  const getGpsIndicatorColor = () => {
    switch (gpsSignalStrength) {
      case 'excellent':
        return '#22c55e';
      case 'good':
        return '#eab308';
      case 'poor':
        return '#ef4444';
      default:
        return '#666';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.closeButton}>X</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {isTracking
            ? isPaused
              ? 'Paused'
              : 'Running...'
            : 'Ready to Run'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.mainStat}>
          <Text style={styles.mainStatValue}>
            {(stats.distance / 1000).toFixed(2)}
          </Text>
          <Text style={styles.mainStatLabel}>km</Text>
        </View>

        <View style={styles.secondaryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDuration(stats.duration)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatPace(stats.currentPace)}</Text>
            <Text style={styles.statLabel}>Pace /km</Text>
          </View>
        </View>

        {stats.elevationGain > 0 && (
          <View style={styles.elevationStats}>
            <Text style={styles.elevationText}>
              {stats.elevationGain.toFixed(0)}m up
            </Text>
            <Text style={styles.elevationText}>
              {stats.elevationLoss.toFixed(0)}m down
            </Text>
          </View>
        )}
      </View>

      <View style={styles.mapCard}>
        <RunMap
          previewPoint={previewPoint}
          previewRegion={previewRegion}
          routeCoordinates={routeCoordinates}
        />

        <View style={styles.mapOverlay}>
          <View style={styles.mapOverlayTop}>
            <Text style={styles.mapOverlayTitle}>Live Map</Text>
            <View
              style={[
                styles.gpsIndicator,
                { backgroundColor: getGpsIndicatorColor() },
              ]}
            />
          </View>
          <Text style={styles.mapOverlaySubtitle}>
            {path.length} GPS points tracked
          </Text>
          {activeSegment && (
            <View style={styles.segmentBanner}>
              <Text style={styles.segmentBannerText}>
                {activeSegment.name}
              </Text>
            </View>
          )}
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!error && locationHint && (
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>{locationHint}</Text>
        </View>
      )}

      {stats.calories > 0 && (
        <View style={styles.caloriesContainer}>
          <Text style={styles.caloriesValue}>{stats.calories}</Text>
          <Text style={styles.caloriesLabel}>calories</Text>
        </View>
      )}

      {stats.steps > 0 && (
        <View style={styles.stepsContainer}>
          <Text style={styles.stepsValue}>{stats.steps}</Text>
          <Text style={styles.stepsLabel}>steps</Text>
        </View>
      )}

      {inPrivacyZone && (
        <View style={styles.privacyBanner}>
          <Text style={styles.privacyText}>Privacy zone active</Text>
        </View>
      )}

      <View style={styles.controls}>
        {!isTracking ? (
          <TouchableOpacity style={styles.startButton} onPress={handleStartRun}>
            <Text style={styles.startButtonText}>Start Run</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.activeControls}>
            <TouchableOpacity
              style={styles.pauseButton}
              onPress={handlePauseResume}
            >
              <Text style={styles.pauseButtonText}>
                {isPaused ? 'Resume' : 'Pause'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stopButton}
              onPress={handleComplete}
            >
              <Text style={styles.stopButtonText}>Finish Run</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FF6B35',
  },
  closeButton: {
    fontSize: 24,
    color: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  placeholder: {
    width: 24,
  },
  statsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  mainStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  mainStatValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#333',
  },
  mainStatLabel: {
    fontSize: 24,
    color: '#666',
    marginLeft: 8,
  },
  secondaryStats: {
    flexDirection: 'row',
    gap: 40,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  elevationStats: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 12,
  },
  elevationText: {
    fontSize: 14,
    color: '#666',
  },
  mapCard: {
    flex: 1,
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  mapOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  mapOverlayTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapOverlayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  gpsIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  mapOverlaySubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  segmentBanner: {
    marginTop: 8,
    backgroundColor: '#FC4C02',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  segmentBannerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 8,
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
  },
  hintContainer: {
    backgroundColor: '#fff4e5',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 8,
  },
  hintText: {
    color: '#a15c00',
    textAlign: 'center',
  },
  caloriesContainer: {
    position: 'absolute',
    top: 180,
    right: 30,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    boxShadow: '0px 8px 18px rgba(15, 23, 42, 0.10)',
    elevation: 3,
  },
  caloriesValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  caloriesLabel: {
    fontSize: 12,
    color: '#666',
  },
  stepsContainer: {
    position: 'absolute',
    top: 240,
    right: 30,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    boxShadow: '0px 8px 18px rgba(15, 23, 42, 0.10)',
    elevation: 3,
  },
  stepsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  stepsLabel: {
    fontSize: 12,
    color: '#666',
  },
  privacyBanner: {
    backgroundColor: '#fef3c7',
    padding: 12,
    marginHorizontal: 20,
    borderRadius: 8,
  },
  privacyText: {
    color: '#92400e',
    textAlign: 'center',
    fontWeight: '600',
  },
  controls: {
    padding: 20,
    paddingBottom: 40,
  },
  startButton: {
    backgroundColor: '#FF6B35',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  activeControls: {
    flexDirection: 'row',
    gap: 16,
  },
  pauseButton: {
    flex: 1,
    backgroundColor: '#eab308',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  pauseButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  stopButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
