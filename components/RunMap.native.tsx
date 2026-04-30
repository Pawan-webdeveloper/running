import Constants from 'expo-constants';
import { useEffect, useMemo, useRef } from 'react';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';

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

const MAPBOX_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ??
  Constants.expoConfig?.extra?.mapboxAccessToken ??
  '';

export default function RunMap({ previewPoint, previewRegion, routeCoordinates }: RunMapProps) {
  const mapRef = useRef<MapView | null>(null);
  const startPoint = routeCoordinates[0];
  const currentPoint = routeCoordinates[routeCoordinates.length - 1];

  const mapboxTileUrl = useMemo(() => {
    if (!MAPBOX_TOKEN) {
      return null;
    }

    return `https://api.mapbox.com/styles/v1/mapbox/navigation-day-v1/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`;
  }, []);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    if (routeCoordinates.length > 1) {
      mapRef.current.fitToCoordinates(routeCoordinates, {
        edgePadding: {
          top: 140,
          right: 60,
          bottom: 120,
          left: 60,
        },
        animated: true,
      });
      return;
    }

    mapRef.current.animateToRegion(previewRegion, 400);
  }, [previewRegion, routeCoordinates]);

  return (
    <MapView
      ref={mapRef}
      style={{ flex: 1 }}
      initialRegion={previewRegion}
      showsUserLocation
      showsMyLocationButton
      followsUserLocation
      showsCompass={false}
      toolbarEnabled={false}
      mapType={mapboxTileUrl ? 'none' : 'standard'}
    >
      {mapboxTileUrl ? (
        <UrlTile
          urlTemplate={mapboxTileUrl}
          maximumZ={18}
          flipY={false}
          tileSize={256}
          zIndex={-1}
        />
      ) : null}

      {routeCoordinates.length > 1 ? (
        <>
          <Polyline coordinates={routeCoordinates} strokeColor="rgba(255,255,255,0.95)" strokeWidth={10} />
          <Polyline coordinates={routeCoordinates} strokeColor="#FC4C02" strokeWidth={6} lineCap="round" lineJoin="round" />
        </>
      ) : null}

      {startPoint ? <Marker coordinate={startPoint} title="Start" pinColor="#22c55e" /> : null}

      {currentPoint ? (
        <Marker coordinate={currentPoint} title="Current position" pinColor="#FC4C02" />
      ) : previewPoint ? (
        <Marker
          coordinate={{
            latitude: previewPoint.lat,
            longitude: previewPoint.lng,
          }}
          title="Current location"
          pinColor="#FC4C02"
        />
      ) : null}
    </MapView>
  );
}
