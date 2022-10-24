import {transform, transformExtent} from 'ol/proj';

import {Coordinate} from 'ol/coordinate';
import {Extent} from 'ol/extent';
import {Feature} from 'ol';
import Geometry from 'ol/geom/Geometry';
import {ILocation} from '../types/location';
import Point from 'ol/geom/Point';

/**
 * Transform a set of EPSG:3857 coordinates in [lon, lat](EPSG:4326)
 *
 * @param coordinates the EPSG:3857 coordinates
 *
 * @returns the coordinates [lon, lat](EPSG:4326)
 */
export function coordsToLonLat(coordinates: Coordinate): Coordinate {
  return transform(coordinates, 'EPSG:3857', 'EPSG:4326');
}

/**
 * Transform a set of [lon, lat](EPSG:4326) coordinates in EPSG:3857
 *
 * @param coordinates the [lon, lat](EPSG:4326) coordinates
 *
 * @returns the coordinates [lon, lat](EPSG:4326)
 */
export function coordsFromLonLat(coordinates: Coordinate): Coordinate {
  return transform(coordinates, 'EPSG:4326', 'EPSG:3857');
}

/**
 * Transform a set of EPSG:3857 extent in [minLon, minLat, maxLon, maxLat](EPSG:4326)
 *
 * @param extent the EPSG:3857 extent
 *
 * @returns the extent [minLon, minLat, maxLon, maxLat](EPSG:4326)
 */
export function extentToLonLat(extent: Extent): Extent {
  return transformExtent(extent, 'EPSG:3857', 'EPSG:4326');
}

/**
 * Transform a set of [minLon, minLat, maxLon, maxLat](EPSG:4326) coordinates in EPSG:3857
 *
 * @param extent the [minLon, minLat, maxLon, maxLat](EPSG:4326) extent
 *
 * @returns the extent [minLon, minLat, maxLon, maxLat](EPSG:4326)
 */
export function extentFromLonLat(extent: Extent): Extent {
  return transformExtent(extent, 'EPSG:4326', 'EPSG:3857');
}

/**
 * Return the distance in meters between two locations
 *
 * @param point1 the first location
 * @param point2 the second location
 */
export function getDistanceBetweenPoints(point1: ILocation, point2: ILocation): number {
  const earthRadius: number = 6371e3;
  const lat1: number = (point1.latitude * Math.PI) / 180;
  const lat2: number = (point2.latitude * Math.PI) / 180;
  const lon1: number = (point1.longitude * Math.PI) / 180;
  const lon2: number = (point2.longitude * Math.PI) / 180;
  const dlat: number = lat2 - lat1;
  const dlon: number = lon2 - lon1;

  const a: number =
    Math.sin(dlat / 2) * Math.sin(dlat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) * Math.sin(dlon / 2);
  const c: number = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

export function distanceBetweenCoordinates(c1: Coordinate, c2: Coordinate) {
  return Math.sqrt(Math.pow(c1[0] - c2[0], 2) + Math.pow(c1[1] - c2[1], 2));
}

export function intersectionBetweenArrays(a: any[], b: any[]): any[] {
  var setA = new Set(a);
  var setB = new Set(b);
  var intersection = new Set([...setA].filter(x => setB.has(x)));
  return Array.from(intersection);
}

export function getNearestFeatureByCooridinate(
  features: Feature<Geometry>[],
  coordinate: Coordinate,
): Feature<Geometry> {
  let ret: Feature<Geometry> = features[0];
  let minDistance = Number.MAX_VALUE;
  features.forEach(feature => {
    const geom = feature.getGeometry() as Point;
    const distance = distanceBetweenCoordinates(geom.getFlatCoordinates(), coordinate);
    if (distance < minDistance) {
      minDistance = distance;
      ret = feature;
    }
  });
  return ret;
}
