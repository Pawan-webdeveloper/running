import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import * as Location from 'expo-location';

export interface TrackingPoint {
  lat: number;
  lng: number;
  altitude: number;
  timestamp: number;
  accuracy: number;
  speed: number;
  heading: number;
  altitudeAccuracy?: number;
}

export interface SensorData {
  accelerometer: { x: number; y: number; z: number } | null;
  gyroscope: { x: number; y: number; z: number } | null;
  barometer: { pressure: number; relativeAltitude: number } | null;
}

export interface EnhancedTrackingPoint extends TrackingPoint {
  sensorData: SensorData;
  smoothed: boolean;
}

export interface TrackingStats {
  distance: number;
  duration: number;
  avgPace: number;
  currentPace: number;
  avgSpeed: number;
  currentSpeed: number;
  elevationGain: number;
  elevationLoss: number;
  currentAltitude: number;
  calories: number;
  steps: number;
}

export interface Segment {
  id: string;
  name: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  distance: number;
}

export interface SegmentResult {
  segment: Segment;
  time: number;
  rank: number;
  pr: boolean;
}

export interface PrivacyZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

interface GpsSmoothenerConfig {
  maxAccuracyThreshold: number;
  duplicateDistanceThreshold: number;
  KalmanProcessNoise: number;
  KalmanMeasurementNoise: number;
}

const DEFAULT_SMOOTHENER_CONFIG: GpsSmoothenerConfig = {
  maxAccuracyThreshold: 50,
  duplicateDistanceThreshold: 0.5,
  KalmanProcessNoise: 0.00001,
  KalmanMeasurementNoise: 0.0001,
};

class KalmanFilter {
  private q: number;
  private r: number;
  private x: number;
  private p: number;
  private k: number;

  constructor(processNoise = 0.00001, measurementNoise = 0.0001) {
    this.q = processNoise;
    this.r = measurementNoise;
    this.x = 0;
    this.p = 1;
    this.k = 0;
  }

  update(measurement: number): number {
    this.k = this.p + this.q;
    this.p = (1 - this.k / (this.k + this.r)) * this.p;
    this.x = this.x + (measurement - this.x) * this.k;
    return this.x;
  }

  reset(): void {
    this.x = 0;
    this.p = 1;
    this.k = 0;
  }
}

class GPXDataProcessor {
  private latFilter: KalmanFilter;
  private lngFilter: KalmanFilter;
  private altFilter: KalmanFilter;
  private config: GpsSmoothenerConfig;
  private lastPoint: TrackingPoint | null = null;

  constructor(config: GpsSmoothenerConfig = DEFAULT_SMOOTHENER_CONFIG) {
    this.config = config;
    this.latFilter = new KalmanFilter(config.KalmanProcessNoise, config.KalmanMeasurementNoise);
    this.lngFilter = new KalmanFilter(config.KalmanProcessNoise, config.KalmanMeasurementNoise);
    this.altFilter = new KalmanFilter(config.KalmanProcessNoise, config.KalmanMeasurementNoise);
  }

  processPoint(rawPoint: TrackingPoint): EnhancedTrackingPoint | null {
    if (rawPoint.accuracy > this.config.maxAccuracyThreshold) {
      return null;
    }

    if (this.lastPoint) {
      const dist = this.calculateDistance(
        this.lastPoint.lat,
        this.lastPoint.lng,
        rawPoint.lat,
        rawPoint.lng
      );
      if (dist < this.config.duplicateDistanceThreshold) {
        return null;
      }
    }

    const smoothedLat = this.latFilter.update(rawPoint.lat);
    const smoothedLng = this.lngFilter.update(rawPoint.lng);
    const smoothedAlt = this.altFilter.update(rawPoint.altitude);

    const processedPoint: EnhancedTrackingPoint = {
      ...rawPoint,
      lat: smoothedLat,
      lng: smoothedLng,
      altitude: smoothedAlt,
      smoothed: true,
      sensorData: {
        accelerometer: null,
        gyroscope: null,
        barometer: null,
      },
    };

    this.lastPoint = rawPoint;
    return processedPoint;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  reset(): void {
    this.latFilter.reset();
    this.lngFilter.reset();
    this.altFilter.reset();
    this.lastPoint = null;
  }
}

class SegmentDetector {
  private segments: Segment[] = [];
  private activeSegment: Segment | null = null;
  private segmentStartPoint: TrackingPoint | null = null;

  setSegments(segments: Segment[]): void {
    this.segments = segments;
  }

  checkForSegmentEntry(point: TrackingPoint): Segment | null {
    if (this.activeSegment) return null;

    for (const segment of this.segments) {
      const distToStart = this.calculateDistance(
        point.lat,
        point.lng,
        segment.startLat,
        segment.startLng
      );
      if (distToStart < 50) {
        this.activeSegment = segment;
        this.segmentStartPoint = point;
        return segment;
      }
    }
    return null;
  }

  checkForSegmentExit(point: TrackingPoint): SegmentResult | null {
    if (!this.activeSegment || !this.segmentStartPoint) return null;

    const distToEnd = this.calculateDistance(
      point.lat,
      point.lng,
      this.activeSegment.endLat,
      this.activeSegment.endLng
    );

    if (distToEnd < 30) {
      const segmentTime =
        (point.timestamp - this.segmentStartPoint.timestamp) / 1000;
      const result: SegmentResult = {
        segment: this.activeSegment,
        time: segmentTime,
        rank: 0,
        pr: false,
      };
      this.activeSegment = null;
      this.segmentStartPoint = null;
      return result;
    }
    return null;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

interface UseComprehensiveTrackingOptions {
  enableAccelerometer?: boolean;
  enableGyroscope?: boolean;
  enableBarometer?: boolean;
  enableSegmentDetection?: boolean;
  segments?: Segment[];
  privacyZones?: PrivacyZone[];
  onSegmentComplete?: (result: SegmentResult) => void;
  onPrivacyZoneEnter?: (zone: PrivacyZone) => void;
  onPrivacyZoneExit?: (zone: PrivacyZone) => void;
}

export function useComprehensiveTracking(options: UseComprehensiveTrackingOptions = {}) {
  const {
    enableAccelerometer = true,
    enableGyroscope = true,
    enableBarometer = true,
    enableSegmentDetection = false,
    segments = [],
    privacyZones = [],
    onSegmentComplete,
    onPrivacyZoneEnter,
    onPrivacyZoneExit,
  } = options;

  const [isTracking, setIsTracking] = useState(false);
  const [path, setPath] = useState<EnhancedTrackingPoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<EnhancedTrackingPoint | null>(null);
  const [stats, setStats] = useState<TrackingStats>({
    distance: 0,
    duration: 0,
    avgPace: 0,
    currentPace: 0,
    avgSpeed: 0,
    currentSpeed: 0,
    elevationGain: 0,
    elevationLoss: 0,
    currentAltitude: 0,
    calories: 0,
    steps: 0,
  });
  const [sensorData, setSensorData] = useState<SensorData>({
    accelerometer: null,
    gyroscope: null,
    barometer: null,
  });
  const [activeSegment, setActiveSegment] = useState<Segment | null>(null);
  const [segmentResults, setSegmentResults] = useState<SegmentResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUsingDemo, setIsUsingDemo] = useState(false);
  const [inPrivacyZone, setInPrivacyZone] = useState<PrivacyZone | null>(null);
  const [gpsSignalStrength, setGpsSignalStrength] = useState<'excellent' | 'good' | 'poor'>('good');

  const locationSubscription = useRef<Location.LocationSubscription | { remove?: () => void } | null>(null);
  const webWatchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastPointsRef = useRef<{ distance: number; time: number }[]>([]);
  const stepsRef = useRef(0);
  const lastAltitudeRef = useRef<number | null>(null);

  const gpsProcessor = useRef(new GPXDataProcessor());
  const segmentDetector = useRef(new SegmentDetector());

  const accelerometerRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const gyroscopeRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const barometerRef = useRef<{ pressure: number; relativeAltitude: number } | null>(null);

  useEffect(() => {
    segmentDetector.current.setSegments(segments);
  }, [segments]);

  const calculateCalories = useCallback(
    (distanceMeters: number, durationSeconds: number, avgHeartRate?: number): number => {
      const MET = 9.8;
      const weightKg = 70;
      const hours = durationSeconds / 3600;
      return Math.round(MET * weightKg * hours);
    },
    []
  );

  const formatDuration = useCallback((seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const formatPace = useCallback((paceSecPerKm: number): string => {
    if (!paceSecPerKm || !isFinite(paceSecPerKm)) return '--:--';
    const mins = Math.floor(paceSecPerKm / 60);
    const secs = Math.floor(paceSecPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const processNewPoint = useCallback(
    (rawPoint: TrackingPoint) => {
      const processedPoint = gpsProcessor.current.processPoint(rawPoint);
      if (!processedPoint) return;

      processedPoint.sensorData = {
        accelerometer: accelerometerRef.current,
        gyroscope: gyroscopeRef.current,
        barometer: barometerRef.current,
      };

      setCurrentLocation(processedPoint);

      if (enableAccelerometer && accelerometerRef.current) {
        const accelMagnitude = Math.sqrt(
          Math.pow(accelerometerRef.current.x, 2) +
            Math.pow(accelerometerRef.current.y, 2) +
            Math.pow(accelerometerRef.current.z, 2)
        );
        if (accelMagnitude > 12) {
          stepsRef.current += 1;
        }
      }

      setPath((prev) => {
        const newPath = [...prev, processedPoint];

        if (newPath.length >= 2) {
          const lastPoint = newPath[newPath.length - 2];
          const R = 6371000;
          const dLat = ((processedPoint.lat - lastPoint.lat) * Math.PI) / 180;
          const dLng = ((processedPoint.lng - lastPoint.lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lastPoint.lat * Math.PI) / 180) *
              Math.cos((processedPoint.lat * Math.PI) / 180) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const dist = R * c;
          const timeDiff = (processedPoint.timestamp - lastPoint.timestamp) / 1000;

          if (rawPoint.accuracy < 10) {
            setGpsSignalStrength('excellent');
          } else if (rawPoint.accuracy < 25) {
            setGpsSignalStrength('good');
          } else {
            setGpsSignalStrength('poor');
          }

          setStats((prevStats) => {
            let elevationGain = prevStats.elevationGain;
            let elevationLoss = prevStats.elevationLoss;

            if (
              enableBarometer &&
              lastAltitudeRef.current !== null &&
              processedPoint.altitude > lastAltitudeRef.current
            ) {
              elevationGain += processedPoint.altitude - lastAltitudeRef.current;
            } else if (
              enableBarometer &&
              lastAltitudeRef.current !== null &&
              processedPoint.altitude < lastAltitudeRef.current
            ) {
              elevationLoss += lastAltitudeRef.current - processedPoint.altitude;
            }
            lastAltitudeRef.current = processedPoint.altitude;

            if (timeDiff > 0 && dist > 0) {
              lastPointsRef.current.push({ distance: dist, time: timeDiff });
              if (lastPointsRef.current.length > 10) {
                lastPointsRef.current.shift();
              }

              const last500m = lastPointsRef.current.slice(-10);
              const totalDist = last500m.reduce((sum, p) => sum + p.distance, 0);
              const totalTime = last500m.reduce((sum, p) => sum + p.time, 0);

              const currentPace = totalDist > 0 ? (totalTime / 60) / (totalDist / 1000) : 0;
              const currentSpeed = totalDist > 0 ? (totalDist / 1000) / (totalTime / 3600) : 0;

              const totalDuration = (Date.now() - startTimeRef.current) / 1000;
              const totalDistance = prevStats.distance + dist;
              const avgPace = totalDistance > 0 ? (totalDuration / 60) / (totalDistance / 1000) : 0;
              const avgSpeed = totalDistance > 0 ? (totalDistance / 1000) / (totalDuration / 3600) : 0;

              const calories = calculateCalories(
                totalDistance,
                totalDuration
              );

              return {
                ...prevStats,
                distance: prevStats.distance + dist,
                duration: totalDuration,
                avgPace,
                currentPace,
                avgSpeed,
                currentSpeed,
                elevationGain,
                elevationLoss,
                currentAltitude: processedPoint.altitude,
                calories,
                steps: stepsRef.current,
              };
            }

            return prevStats;
          });
        }

        return newPath;
      });

      if (enableSegmentDetection) {
        const enteredSegment = segmentDetector.current.checkForSegmentEntry(processedPoint);
        if (enteredSegment) {
          setActiveSegment(enteredSegment);
        }

        const segmentResult = segmentDetector.current.checkForSegmentExit(processedPoint);
        if (segmentResult) {
          setSegmentResults((prev) => [...prev, segmentResult]);
          setActiveSegment(null);
          onSegmentComplete?.(segmentResult);
        }
      }

      if (privacyZones.length > 0) {
        for (const zone of privacyZones) {
          const distToZone = Math.sqrt(
            Math.pow((processedPoint.lat - zone.latitude) * 111000, 2) +
              Math.pow(
                (processedPoint.lng - zone.longitude) * 111000 * Math.cos(processedPoint.lat * (Math.PI / 180)),
                2
              )
          );
          if (distToZone < zone.radiusMeters) {
            if (!inPrivacyZone || inPrivacyZone.id !== zone.id) {
              setInPrivacyZone(zone);
              onPrivacyZoneEnter?.(zone);
            }
          } else if (inPrivacyZone && inPrivacyZone.id === zone.id) {
            setInPrivacyZone(null);
            onPrivacyZoneExit?.(zone);
          }
        }
      }
    },
    [
      enableAccelerometer,
      enableBarometer,
      enableSegmentDetection,
      privacyZones,
      inPrivacyZone,
      onSegmentComplete,
      onPrivacyZoneEnter,
      onPrivacyZoneExit,
      calculateCalories,
    ]
  );

  const clearTrackingResources = useCallback(() => {
    if (locationSubscription.current) {
      if (typeof locationSubscription.current.remove === 'function') {
        locationSubscription.current.remove();
      }
      locationSubscription.current = null;
    }
    if (webWatchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(webWatchIdRef.current);
      webWatchIdRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTracking = useCallback(async () => {
    try {
      clearTrackingResources();
      gpsProcessor.current.reset();
      segmentDetector.current.setSegments(segments);
      
      setPath([]);
      setStats({
        distance: 0,
        duration: 0,
        avgPace: 0,
        currentPace: 0,
        avgSpeed: 0,
        currentSpeed: 0,
        elevationGain: 0,
        elevationLoss: 0,
        currentAltitude: 0,
        calories: 0,
        steps: 0,
      });
      setError(null);
      setSegmentResults([]);
      setActiveSegment(null);
      setInPrivacyZone(null);
      lastPointsRef.current = [];
      stepsRef.current = 0;
      lastAltitudeRef.current = null;
      setIsUsingDemo(false);

      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          setError('Live location is not supported in this browser. Open the app on a real phone or a browser with GPS access.');
          setIsTracking(false);
          return;
        }

        setIsTracking(true);
        startTimeRef.current = Date.now();

        timerRef.current = setInterval(() => {
          setStats((prev) => ({
            ...prev,
            duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
          }));
        }, 1000);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            processNewPoint({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              altitude: position.coords.altitude ?? 0,
              timestamp: position.timestamp,
              accuracy: position.coords.accuracy ?? 100,
              speed: position.coords.speed ?? 0,
              heading: position.coords.heading ?? 0,
              altitudeAccuracy: position.coords.altitudeAccuracy ?? undefined,
            });
          },
          () => undefined,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );

        webWatchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            setIsUsingDemo(false);
            setError(null);
            processNewPoint({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              altitude: position.coords.altitude ?? 0,
              timestamp: position.timestamp,
              accuracy: position.coords.accuracy ?? 100,
              speed: position.coords.speed ?? 0,
              heading: position.coords.heading ?? 0,
              altitudeAccuracy: position.coords.altitudeAccuracy ?? undefined,
            });
          },
          (geoError) => {
            if (geoError.code === geoError.PERMISSION_DENIED) {
              setError('Browser location permission denied');
            } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
              setError('Current live location is unavailable. Turn on device GPS and try again.');
            } else if (geoError.code === geoError.TIMEOUT) {
              setError('Timed out while trying to get your live location. Move to an open area and try again.');
            } else {
              setError('Unable to start live browser location tracking.');
            }
            clearTrackingResources();
            setIsTracking(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        return;
      }

      setIsTracking(true);
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        setStats((prev) => ({
          ...prev,
          duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
        }));
      }, 1000);

      const locationOptions: Location.LocationOptions = {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 2,
      };

      locationSubscription.current = await Location.watchPositionAsync(
        locationOptions,
        (location) => {
          const point: TrackingPoint = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            altitude: location.coords.altitude ?? 0,
            timestamp: location.timestamp,
            accuracy: location.coords.accuracy ?? 100,
            speed: location.coords.speed ?? 0,
            heading: location.coords.heading ?? 0,
            altitudeAccuracy: location.coords.altitudeAccuracy ?? undefined,
          };
          processNewPoint(point);
        }
      );
    } catch (err) {
      console.error('Tracking error:', err);
      setError('Failed to start tracking');
      setIsTracking(false);
      clearTrackingResources();
    }
  }, [clearTrackingResources, processNewPoint, segments]);

  const stopTracking = useCallback(() => {
    clearTrackingResources();
    setIsTracking(false);
  }, [clearTrackingResources]);

  const pauseTracking = useCallback(() => {
    if (locationSubscription.current) {
      if (typeof locationSubscription.current.remove === 'function') {
        locationSubscription.current.remove();
      }
      locationSubscription.current = null;
    }
    if (webWatchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(webWatchIdRef.current);
      webWatchIdRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resumeTracking = useCallback(async () => {
    if (!isTracking) return;

    try {
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          setError('Live location is not supported in this browser. Open the app on a real phone or a browser with GPS access.');
          return;
        }

        webWatchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            setIsUsingDemo(false);
            setError(null);
            processNewPoint({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              altitude: position.coords.altitude ?? 0,
              timestamp: position.timestamp,
              accuracy: position.coords.accuracy ?? 100,
              speed: position.coords.speed ?? 0,
              heading: position.coords.heading ?? 0,
              altitudeAccuracy: position.coords.altitudeAccuracy ?? undefined,
            });
          },
          (geoError) => {
            if (geoError.code === geoError.PERMISSION_DENIED) {
              setError('Browser location permission denied');
            } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
              setError('Current live location is unavailable. Turn on device GPS and resume when ready.');
            } else if (geoError.code === geoError.TIMEOUT) {
              setError('Timed out while resuming live location tracking.');
            } else {
              setError('Unable to continue live browser location tracking.');
            }
            if (webWatchIdRef.current !== null && navigator.geolocation) {
              navigator.geolocation.clearWatch(webWatchIdRef.current);
              webWatchIdRef.current = null;
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );

        timerRef.current = setInterval(() => {
          setStats((prev) => ({
            ...prev,
            duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
          }));
        }, 1000);
        return;
      }

      const locationOptions: Location.LocationOptions = {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 2,
      };

      locationSubscription.current = await Location.watchPositionAsync(
        locationOptions,
        (location) => {
          const point: TrackingPoint = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            altitude: location.coords.altitude ?? 0,
            timestamp: location.timestamp,
            accuracy: location.coords.accuracy ?? 100,
            speed: location.coords.speed ?? 0,
            heading: location.coords.heading ?? 0,
            altitudeAccuracy: location.coords.altitudeAccuracy ?? undefined,
          };
          processNewPoint(point);
        }
      );

      timerRef.current = setInterval(() => {
        setStats((prev) => ({
          ...prev,
          duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
        }));
      }, 1000);
    } catch (err) {
      console.error('Resume tracking error:', err);
      setError('Failed to resume live tracking');
    }
  }, [isTracking, processNewPoint]);

  useEffect(() => {
    return () => {
      clearTrackingResources();
    };
  }, [clearTrackingResources]);

  return {
    isTracking,
    path,
    currentLocation,
    stats,
    sensorData,
    activeSegment,
    segmentResults,
    error,
    isUsingDemo,
    gpsSignalStrength,
    inPrivacyZone,
    startTracking,
    stopTracking,
    pauseTracking,
    resumeTracking,
    formatDuration,
    formatPace,
  };
}
