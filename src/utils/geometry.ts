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

export function calculatePointsDistance (coord1: Coordinate, coord2: Coordinate): number {
  let dx: number = coord1[0] - coord2[0];
  let dy: number = coord1[1] - coord2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

export function convertFeatureToEpsg3857(feature: WmFeature<LineString>): WmFeature<LineString> | null {
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
