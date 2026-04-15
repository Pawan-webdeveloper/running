import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

interface TrackingPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

export default function ActiveRunScreen() {
  const router = useRouter();
  const [path, setPath] = useState<TrackingPoint[]>([]);
  const [distance, setDistance] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentPace, setCurrentPace] = useState(0);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastPointsRef = useRef<{ distance: number; time: number }[]>([]);

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPace = (paceSecPerKm: number): string => {
    if (!paceSecPerKm || !isFinite(paceSecPerKm)) return '--:--';
    const mins = Math.floor(paceSecPerKm / 60);
    const secs = Math.floor(paceSecPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startTracking = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        return;
      }

      setIsTracking(true);
      setPath([]);
      setDistance(0);
      setElapsedTime(0);
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (loc) => {
          const newPoint: TrackingPoint = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            timestamp: loc.timestamp,
          };

          setPath((prev) => {
            const newPath = [...prev, newPoint];
            if (newPath.length >= 2) {
              const lastPoint = newPath[newPath.length - 2];
              const dist = calculateDistance(lastPoint.lat, lastPoint.lng, newPoint.lat, newPoint.lng);
              const timeDiff = (newPoint.timestamp - lastPoint.timestamp) / 1000;

              setDistance((d) => d + dist);

              if (timeDiff > 0 && dist > 0) {
                const pace = (timeDiff / 60) / (dist / 1000);
                lastPointsRef.current.push({ distance: dist, time: timeDiff });
                if (lastPointsRef.current.length > 10) {
                  lastPointsRef.current.shift();
                }

                const last500m = lastPointsRef.current.slice(-10);
                const totalDist = last500m.reduce((sum, p) => sum + p.distance, 0);
                const totalTime = last500m.reduce((sum, p) => sum + p.time, 0);

                if (totalDist > 0) {
                  const rollingPace = (totalTime / 60) / (totalDist / 1000);
                  setCurrentPace(rollingPace);
                }
              }
            }
            return newPath;
          });
        }
      );
    } catch (err) {
      console.error('Tracking error:', err);
      setError('Failed to start tracking');
    }
  }, []);

  const stopTracking = useCallback(() => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const handleComplete = () => {
    stopTracking();
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isTracking ? 'Running...' : 'Ready to Run'}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.mainStat}>
          <Text style={styles.mainStatValue}>{(distance / 1000).toFixed(2)}</Text>
          <Text style={styles.mainStatLabel}>km</Text>
        </View>

        <View style={styles.secondaryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDuration(elapsedTime)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatPace(currentPace)}</Text>
            <Text style={styles.statLabel}>Pace /km</Text>
          </View>
        </View>
      </View>

      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapText}>📍 Live Map</Text>
        <Text style={styles.mapSubtext}>{path.length} GPS points tracked</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.controls}>
        {!isTracking ? (
          <TouchableOpacity style={styles.startButton} onPress={startTracking}>
            <Text style={styles.startButtonText}>▶ Start Run</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.stopButton} onPress={handleComplete}>
            <Text style={styles.stopButtonText}>■ Finish Run</Text>
          </TouchableOpacity>
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
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    margin: 20,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapText: {
    fontSize: 24,
    marginBottom: 8,
  },
  mapSubtext: {
    fontSize: 14,
    color: '#999',
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
  stopButton: {
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
