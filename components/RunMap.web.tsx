import Constants from 'expo-constants';
import { useMemo, useState } from 'react';

type MapCoordinate = {
  latitude: number;
  longitude: number;
};

type PreviewPoint = {
  lat: number;
  lng: number;
} | null;

type MapRegion = MapCoordinate & {
  latitudeDelta: number;
  longitudeDelta: number;
};

type RunMapProps = {
  previewPoint: PreviewPoint;
  previewRegion: MapRegion;
  routeCoordinates: MapCoordinate[];
};

type Bounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

const MAPBOX_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ??
  Constants.expoConfig?.extra?.mapboxAccessToken ??
  '';

function getBounds(previewRegion: MapRegion): Bounds {
  const lonDelta = previewRegion.longitudeDelta * 3.2;
  const latDelta = previewRegion.latitudeDelta * 3.2;

  return {
    left: previewRegion.longitude - lonDelta,
    right: previewRegion.longitude + lonDelta,
    top: previewRegion.latitude + latDelta,
    bottom: previewRegion.latitude - latDelta,
  };
}

function projectCoordinate(point: MapCoordinate, bounds: Bounds) {
  const x = ((point.longitude - bounds.left) / (bounds.right - bounds.left)) * 100;
  const y = ((bounds.top - point.latitude) / (bounds.top - bounds.bottom)) * 100;

  return {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
  };
}

function buildPolylinePoints(routeCoordinates: MapCoordinate[], bounds: Bounds) {
  return routeCoordinates
    .map((point) => {
      const projected = projectCoordinate(point, bounds);
      return `${projected.x},${projected.y}`;
    })
    .join(' ');
}

function getZoomLevel(region: MapRegion) {
  const latDelta = Math.max(region.latitudeDelta, 0.0008);
  const zoom = Math.log2(360 / latDelta) - 1.4;
  return Math.max(10, Math.min(17, zoom));
}

function buildStaticMapUrl(region: MapRegion) {
  if (!MAPBOX_TOKEN) {
    return null;
  }

  const zoom = getZoomLevel(region).toFixed(2);
  const center = `${region.longitude},${region.latitude},${zoom},0`;
  return `https://api.mapbox.com/styles/v1/mapbox/navigation-day-v1/static/${center}/1200x900?access_token=${MAPBOX_TOKEN}`;
}

function getFallbackRoadPath(offset: number) {
  return `M -10 ${18 + offset} C 10 ${8 + offset}, 22 ${30 + offset}, 40 ${24 + offset} S 74 ${10 + offset}, 110 ${30 + offset}`;
}

function FallbackMap({
  routePolylinePoints,
  startPoint,
  currentPoint,
}: {
  routePolylinePoints: string;
  startPoint: { x: number; y: number } | null;
  currentPoint: { x: number; y: number } | null;
}) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={styles.mapSvg}>
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbfbf8" />
          <stop offset="55%" stopColor="#f2f1ec" />
          <stop offset="100%" stopColor="#e8e6dd" />
        </linearGradient>
        <linearGradient id="park" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#dfead6" />
          <stop offset="100%" stopColor="#c8ddb8" />
        </linearGradient>
        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(110,110,110,0.06)" strokeWidth="0.35" />
        </pattern>
      </defs>

      <rect x="0" y="0" width="100" height="100" fill="url(#bg)" />
      <rect x="0" y="0" width="100" height="100" fill="url(#grid)" />
      <path d="M 72 6 C 86 18, 86 36, 80 50 C 74 64, 78 80, 92 98" fill="none" stroke="#b8d8ef" strokeWidth="8" strokeLinecap="round" opacity="0.7" />
      <ellipse cx="22" cy="70" rx="18" ry="12" fill="url(#park)" opacity="0.9" />
      <ellipse cx="84" cy="22" rx="12" ry="8" fill="url(#park)" opacity="0.75" />
      <path d={getFallbackRoadPath(0)} fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="5" strokeLinecap="round" />
      <path d={getFallbackRoadPath(0)} fill="none" stroke="#d7d0c6" strokeWidth="2.1" strokeLinecap="round" />
      <path d={getFallbackRoadPath(18)} fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="4.2" strokeLinecap="round" />
      <path d={getFallbackRoadPath(18)} fill="none" stroke="#d9d3ca" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M 18 -10 C 28 18, 26 40, 16 110" fill="none" stroke="rgba(255,255,255,0.88)" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M 18 -10 C 28 18, 26 40, 16 110" fill="none" stroke="#ded8cf" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M 56 -10 C 66 12, 62 42, 56 110" fill="none" stroke="rgba(255,255,255,0.88)" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M 56 -10 C 66 12, 62 42, 56 110" fill="none" stroke="#ddd7cd" strokeWidth="1.2" strokeLinecap="round" />

      {routePolylinePoints ? (
        <>
          <polyline
            points={routePolylinePoints}
            fill="none"
            stroke="rgba(255,255,255,0.98)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={routePolylinePoints}
            fill="none"
            stroke="#FC4C02"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : null}

      {startPoint ? <circle cx={startPoint.x} cy={startPoint.y} r="2.3" fill="#22C55E" stroke="#fff" strokeWidth="0.9" /> : null}
      {currentPoint ? <circle cx={currentPoint.x} cy={currentPoint.y} r="2.7" fill="#FC4C02" stroke="#fff" strokeWidth="1" /> : null}
    </svg>
  );
}

export default function RunMap({ previewPoint, previewRegion, routeCoordinates }: RunMapProps) {
  const [didImageFail, setDidImageFail] = useState(false);
  const bounds = useMemo(() => getBounds(previewRegion), [previewRegion]);
  const routePolylinePoints = routeCoordinates.length > 1 ? buildPolylinePoints(routeCoordinates, bounds) : '';
  const startPoint = routeCoordinates[0] ? projectCoordinate(routeCoordinates[0], bounds) : null;
  const currentPoint = routeCoordinates.length > 0
    ? projectCoordinate(routeCoordinates[routeCoordinates.length - 1], bounds)
    : previewPoint
      ? projectCoordinate({ latitude: previewPoint.lat, longitude: previewPoint.lng }, bounds)
      : null;

  const staticMapUrl = useMemo(() => buildStaticMapUrl(previewRegion), [previewRegion]);
  const showFallback = !staticMapUrl || didImageFail;

  return (
    <div style={styles.container}>
      {showFallback ? (
        <FallbackMap routePolylinePoints={routePolylinePoints} startPoint={startPoint} currentPoint={currentPoint} />
      ) : (
        <>
          <img
            alt="Live run map"
            src={staticMapUrl}
            style={styles.mapImage}
            onError={() => setDidImageFail(true)}
          />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={styles.routeOverlay}>
            {routePolylinePoints ? (
              <>
                <polyline
                  points={routePolylinePoints}
                  fill="none"
                  stroke="rgba(255,255,255,0.98)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points={routePolylinePoints}
                  fill="none"
                  stroke="#FC4C02"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            ) : null}
            {startPoint ? <circle cx={startPoint.x} cy={startPoint.y} r="2.3" fill="#22C55E" stroke="#fff" strokeWidth="0.9" /> : null}
            {currentPoint ? <circle cx={currentPoint.x} cy={currentPoint.y} r="2.7" fill="#FC4C02" stroke="#fff" strokeWidth="1" /> : null}
          </svg>
        </>
      )}

      <div style={styles.bottomFade} />
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    background: '#f3f2ec',
  } as const,
  mapSvg: {
    width: '100%',
    height: '100%',
    display: 'block',
  } as const,
  mapImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  } as const,
  routeOverlay: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  } as const,
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '24%',
    background: 'linear-gradient(to top, rgba(243,242,236,0.82), rgba(243,242,236,0))',
    pointerEvents: 'none',
  } as const,
};
