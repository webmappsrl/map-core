import {transform, transformExtent} from 'ol/proj';

import {Coordinate} from 'ol/coordinate';
import {Extent} from 'ol/extent';
import {ILocation} from './types/location';

export function styleJsonFn(vectorLayerUrl: string) {
  return {
    version: 8,
    name: 'tracks',
    metadata: {'maputnik:renderer': 'ol'},
    sources: {
      tracks1: {
        type: 'vector',
        url: vectorLayerUrl,
      },
    },
    sprite: '',
    glyphs: 'https://orangemug.github.io/font-glyphs/glyphs/{fontstack}/{range}.pbf',
    layers: [
      {
        id: 'EEA',
        type: 'line',
        source: 'tracks',
        'source-layer': 'tracks',
        filter: ['all', ['==', 'cai_scale', 'EEA']],
        layout: {'line-join': 'round', 'line-cap': 'round', visibility: 'visible'},
        paint: {
          'line-color': 'rgba(255, 0, 218, 0.8)',
          'line-width': {
            stops: [
              [10, 1],
              [20, 10],
            ],
          },
          'line-dasharray': [0.001, 2],
        },
      },
      {
        id: 'EE',
        type: 'line',
        source: 'tracks',
        'source-layer': 'tracks',
        filter: ['all', ['==', 'cai_scale', 'EE']],
        layout: {'line-join': 'round', 'line-cap': 'round'},
        paint: {
          'line-color': 'rgba(255, 57, 0, 0.8)',
          'line-width': {
            stops: [
              [10, 1],
              [20, 10],
            ],
          },
          'line-dasharray': [0.01, 2],
        },
      },
      {
        id: 'E',
        type: 'line',
        source: 'tracks',
        'source-layer': 'tracks',
        filter: ['all', ['==', 'cai_scale', 'E']],
        layout: {'line-join': 'round', 'line-cap': 'round'},
        paint: {
          'line-color': 'rgba(255, 57, 0, 0.8)',
          'line-width': {
            stops: [
              [10, 1],
              [20, 10],
            ],
          },
          'line-dasharray': [2, 2],
        },
      },
      {
        id: 'T',
        type: 'line',
        source: 'tracks',
        'source-layer': 'tracks',
        filter: ['all', ['==', 'cai_scale', 'T']],
        layout: {'line-join': 'round', 'line-cap': 'round', visibility: 'visible'},
        paint: {
          'line-color': 'rgba(255, 57, 0, 0.8)',
          'line-width': {
            stops: [
              [10, 1],
              [20, 10],
            ],
          },
        },
      },
      {
        id: 'ref',
        type: 'symbol',
        source: 'tracks',
        'source-layer': 'tracks',
        minzoom: 10,
        maxzoom: 16,
        layout: {
          'text-field': '{ref}',
          visibility: 'visible',
          'symbol-placement': 'line',
          'text-size': 12,
          'text-allow-overlap': true,
        },
        paint: {'text-color': 'rgba(255, 57, 0,0.8)'},
      },
    ],
    id: '63fa0rhhq',
  };
}

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
