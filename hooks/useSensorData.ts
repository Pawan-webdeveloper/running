import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

export interface AccelerometerData {
  x: number;
  y: number;
  z: number;
}

export interface GyroscopeData {
  x: number;
  y: number;
  z: number;
}

export interface BarometerData {
  pressure: number;
  relativeAltitude: number;
}

export function useSensorData(onAccelerometer?: (data: AccelerometerData) => void) {
  const accelerometerSubRef = useRef<any>(null);
  const gyroscopeSubRef = useRef<any>(null);
  const barometerSubRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      accelerometerSubRef.current?.remove();
      gyroscopeSubRef.current?.remove();
      barometerSubRef.current?.remove();
    };
  }, []);

  return { onAccelerometer };
}

export function useBarometer() {
  const [pressure, setPressure] = useState(0);
  const [relativeAltitude, setRelativeAltitude] = useState(0);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      subscriptionRef.current?.remove();
    };
  }, []);

  return { pressure, relativeAltitude };
}

export interface PrivacyZoneConfig {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
}

export class PrivacyZoneManager {
  private zones: PrivacyZoneConfig[] = [];
  private listeners: Set<(zone: PrivacyZoneConfig | null) => void> = new Set();

  constructor(zones: PrivacyZoneConfig[] = []) {
    this.zones = zones;
  }

  addZone(zone: PrivacyZoneConfig): void {
    this.zones.push(zone);
  }

  removeZone(zoneId: string): void {
    this.zones = this.zones.filter((z) => z.id !== zoneId);
  }

  checkLocation(lat: number, lng: number): PrivacyZoneConfig | null {
    for (const zone of this.zones) {
      if (!zone.isActive) continue;

      const distance = this.calculateDistance(
        lat,
        lng,
        zone.latitude,
        zone.longitude
      );

      if (distance < zone.radiusMeters) {
        return zone;
      }
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

  subscribe(callback: (zone: PrivacyZoneConfig | null) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}

export class ActivityRecorder {
  private path: any[] = [];
  private startTime: number = 0;
  private pausedDuration: number = 0;
  private pauseStartTime: number | null = null;
  private isPaused: boolean = false;

  start(): void {
    this.startTime = Date.now();
    this.path = [];
    this.pausedDuration = 0;
    this.isPaused = false;
  }

  pause(): void {
    if (!this.isPaused) {
      this.pauseStartTime = Date.now();
      this.isPaused = true;
    }
  }

  resume(): void {
    if (this.isPaused && this.pauseStartTime) {
      this.pausedDuration += Date.now() - this.pauseStartTime;
      this.pauseStartTime = null;
      this.isPaused = false;
    }
  }

  addPoint(point: any): void {
    if (!this.isPaused) {
      this.path.push(point);
    }
  }

  getPath(): any[] {
    return this.path;
  }

  getTotalDuration(): number {
    let total = Date.now() - this.startTime;
    if (this.isPaused && this.pauseStartTime) {
      total -= Date.now() - this.pauseStartTime;
    }
    return total - this.pausedDuration;
  }

  getTotalDistance(): number {
    let total = 0;
    for (let i = 1; i < this.path.length; i++) {
      const prev = this.path[i - 1];
      const curr = this.path[i];
      total += this.calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    }
    return total;
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

  toGPX(): string {
    let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n';
    gpx += '<gpx version="1.1" creator="RunZilla">\n<trk>\n<name>RunZilla Activity</name>\n<trkseg>\n';
    
    for (const point of this.path) {
      gpx += `<trkpt lat="${point.lat}" lon="${point.lng}">\n`;
      if (point.altitude) {
        gpx += `<ele>${point.altitude}</ele>\n`;
      }
      gpx += `<time>${new Date(point.timestamp).toISOString()}</time>\n`;
      gpx += '</trkpt>\n';
    }
    
    gpx += '</trkseg>\n</trk>\n</gpx>';
    return gpx;
  }
}