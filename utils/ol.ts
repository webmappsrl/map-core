import {Extent, buffer} from 'ol/extent';
import {Feature, MapBrowserEvent} from 'ol';
import {fromLonLat, transform, transformExtent} from 'ol/proj';

import {Coordinate} from 'ol/coordinate';
import {CLUSTER_DISTANCE, DEF_MAP_CLUSTER_CLICK_TOLERANCE} from '../constants';
import Geometry from 'ol/geom/Geometry';
import {ILocation} from '../types/location';
import Map from 'ol/Map';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {Cluster} from 'ol/source';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import Text from 'ol/style/Text';
import Icon from 'ol/style/Icon';
import {Options as CircleOptions} from 'ol/style/Circle';
export function activateInteractions(map: Map): void {
  map.getInteractions().forEach(i => i.setActive(true));
}

export function addFeatureToLayer(layer: VectorLayer, feature: Feature<Geometry>): void {
  if (layer != null) {
    layer.getSource().addFeature(feature);
  }
}

export function createCircleFeature(lonLat: Coordinate, options?: CircleOptions): Feature {
  if (options == null) {
    options = {
      radius: 15,
      stroke: new Stroke({
        color: '#fff',
      }),
      fill: new Fill({
        color: '#3399CC',
      }),
    };
  }
  const circleFeature = new Feature({
    geometry: new Point(coordsFromLonLat(lonLat)),
  });
  circleFeature.setStyle(
    new Style({
      image: new CircleStyle(options),
    }),
  );

  return circleFeature;
}

export function createCluster(clusterLayer: VectorLayer, zIndex: number, map: Map): VectorLayer {
  if (!clusterLayer) {
    clusterLayer = new VectorLayer({
      source: new Cluster({
        distance: CLUSTER_DISTANCE,
        source: new VectorSource({
          features: [],
        }),
        geometryFunction: (feature: Feature): Point | null => {
          return feature.getGeometry().getType() === 'Point' ? <Point>feature.getGeometry() : null;
        },
      }),
      style: function (feature) {
        const size = feature.get('features').length;
        let style = styleCache[size];
        if (size === 1) {
          const icon = feature.getProperties().features[0];
          return icon.getStyle() || null;
        }
        if (!style) {
          style = new Style({
            image: new CircleStyle({
              radius: 15,
              stroke: new Stroke({
                color: '#fff',
              }),
              fill: new Fill({
                color: '#3399CC',
              }),
            }),
            text: new Text({
              text: `${size}`,
              scale: 1.5,
              fill: new Fill({
                color: '#fff',
              }),
              font: '30px',
            }),
          });
          styleCache[size] = style;
        }
        return style;
      },
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      zIndex,
    });

    map.addLayer(clusterLayer);
    const styleCache = {};
  }
  return clusterLayer;
}

export function createLayer(layer: VectorLayer, zIndex: number, map: Map) {
  if (!layer) {
    layer = new VectorLayer({
      source: new VectorSource({
        features: [],
      }),
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      zIndex,
    });
    if (map != null) {
      map.addLayer(layer);
    }
  }
  return layer;
}

export function createIconFeatureFromHtml(html: string, position: Coordinate): Feature {
  const canvas = <HTMLCanvasElement>document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const DOMURL = window.URL;
  const img = new Image();
  const svg = new Blob([html], {
    type: 'image/svg+xml',
  });
  const url = DOMURL.createObjectURL(svg);
  img.onload = () => {
    ctx.drawImage(img, 0, 0);
    DOMURL.revokeObjectURL(url);
  };
  img.src = url;
  img.crossOrigin == 'Anonymous';
  const feature = new Feature({
    geometry: new Point(fromLonLat(position)),
  });
  const style = new Style({
    image: new Icon({
      anchor: [0.5, 0.5],
      img: img,
      imgSize: [32, 32],
      opacity: 1,
    }),
    zIndex: 999999999,
  });
  feature.setStyle(style);

  return feature;
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

export function deactivateInteractions(map: Map): void {
  map.getInteractions().forEach(i => i.setActive(false));
}

/**
 * Return the distance in meters between two locations
 *
 * @param point1 the first location
 * @param point2 the second location
 */
export function distanceBetweenPoints(point1: ILocation, point2: ILocation): number {
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

export function isCluster(layer: VectorLayer, evt: MapBrowserEvent<UIEvent>, map: Map): boolean {
  const precision = map.getView().getResolution() * DEF_MAP_CLUSTER_CLICK_TOLERANCE;
  const features: Feature<Geometry>[] = [];
  const clusterSource = layer?.getSource() ?? (null as any);
  const layerSource = clusterSource?.getSource();

  if (layer && layerSource) {
    layerSource.forEachFeatureInExtent(
      buffer(
        [evt.coordinate[0], evt.coordinate[1], evt.coordinate[0], evt.coordinate[1]],
        precision,
      ),
      feature => {
        features.push(feature);
      },
    );
  }

  return features.length > 1;
}

export function intersectionBetweenArrays(a: any[], b: any[]): any[] {
  var setA = new Set(a);
  var setB = new Set(b);
  var intersection = new Set([...setA].filter(x => setB.has(x)));
  return Array.from(intersection);
}

export function nearestFeatureOfCooridinate(
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

export function nearestFeatureOfLayer(
  layer: VectorLayer,
  evt: MapBrowserEvent<UIEvent>,
  map: Map,
): Feature<Geometry> {
  const precision = map.getView().getResolution() * DEF_MAP_CLUSTER_CLICK_TOLERANCE;
  let nearestFeature = null;
  const features: Feature<Geometry>[] = [];

  if (layer && layer.getSource()) {
    layer
      .getSource()
      .forEachFeatureInExtent(
        buffer(
          [evt.coordinate[0], evt.coordinate[1], evt.coordinate[0], evt.coordinate[1]],
          precision,
        ),
        feature => {
          features.push(feature);
        },
      );
  }

  if (features.length > 0) {
    nearestFeature = nearestFeatureOfCooridinate(features, evt.coordinate);
  }

  return nearestFeature;
}

export function nearestFeatureOfCluster(
  layer: VectorLayer,
  evt: MapBrowserEvent<UIEvent>,
  map: Map,
): Feature<Geometry> {
  const precision = map.getView().getResolution() * DEF_MAP_CLUSTER_CLICK_TOLERANCE;
  let nearestFeature = null;
  const features: Feature<Geometry>[] = [];
  const clusterSource = layer?.getSource() ?? (null as any);
  const layerSource = clusterSource?.getSource();

  if (layer && layerSource) {
    layerSource.forEachFeatureInExtent(
      buffer(
        [evt.coordinate[0], evt.coordinate[1], evt.coordinate[0], evt.coordinate[1]],
        precision,
      ),
      feature => {
        features.push(feature);
      },
    );
  }

  if (features.length) {
    nearestFeature = nearestFeatureOfCooridinate(features, evt.coordinate);
  }

  return nearestFeature;
}

export function removeFeatureFromLayer(layer: VectorLayer, feature: Feature<Geometry>): void {
  const source = layer.getSource();
  if (source.hasFeature(feature)) {
    source.removeFeature(feature);
  }
}
