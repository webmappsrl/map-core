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