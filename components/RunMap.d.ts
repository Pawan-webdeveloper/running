import { ComponentType } from 'react';

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

declare const RunMap: ComponentType<RunMapProps>;
export default RunMap;
