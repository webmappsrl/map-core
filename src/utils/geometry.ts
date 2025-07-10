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

export function convertFeatureToWebMercator(feature: WmFeature<LineString>): WmFeature<LineString> | null {
  const geometry = feature?.geometry;
  if(!geometry) return null;

  const format = new GeoJSON();
  const geometryOl = format.readGeometry(geometry);

  // Trasforma da EPSG:4326 (WGS84) a EPSG:3857 (Web Mercator)
  geometryOl.transform('EPSG:4326', 'EPSG:3857');

  // Crea una nuova feature per evitare mutazioni
  const newFeature: WmFeature<LineString> = {
    ...feature,
    geometry: format.writeGeometryObject(geometryOl) as LineString
  };

  return newFeature;
}
