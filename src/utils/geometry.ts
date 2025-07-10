import {Coordinate} from "ol/coordinate";
import {WmFeature} from "@wm-types/feature";
import {LineString} from "geojson";
import {GeoJSON} from 'ol/format';

export function getClosestPoint(feature: WmFeature<LineString>, coordinates: Coordinate): Coordinate | null {
  const geometry = feature?.geometry;
  if(!geometry) return null;

  const format = new GeoJSON();
  const geometryOl = format.readGeometry(geometry);

  return geometryOl.getClosestPoint(coordinates);
}

export function calculateDistance(point1: Coordinate, point2: Coordinate): number {
  const dx = point1[0] - point2[0];
  const dy = point1[1] - point2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

