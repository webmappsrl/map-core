import {Feature, MapBrowserEvent} from 'ol';
import SelectCluster from 'ol-ext/interaction/SelectCluster';
import AnimatedCluster from 'ol-ext/layer/AnimatedCluster';
import Collection from 'ol/Collection';
import {Coordinate} from 'ol/coordinate';
import {buffer, Extent} from 'ol/extent';
import {FeatureLike} from 'ol/Feature';
import MVT from 'ol/format/MVT';
import {Geometry, Point} from 'ol/geom';
import {defaults as defaultInteractions, Interaction} from 'ol/interaction';
import {DefaultsOptions} from 'ol/interaction/defaults';
import VectorLayer from 'ol/layer/Vector';
import VectorTileLayer from 'ol/layer/VectorTile';
import Map from 'ol/Map';
import {fromLonLat, toLonLat, transform, transformExtent} from 'ol/proj';
import {Cluster} from 'ol/source';
import VectorSource from 'ol/source/Vector';
import VectorTileSource from 'ol/source/VectorTile';
import {getDistance} from 'ol/sphere';
import {Circle, Fill, Icon, Stroke, Style} from 'ol/style';
import CircleStyle, {Options as CircleOptions} from 'ol/style/Circle';

import * as localforage from 'localforage';
import convexHull from 'ol-ext/geom/ConvexHull';
import Polygon from 'ol/geom/Polygon';
import {LoadFunction} from 'ol/Tile';
import {ALERT_POI_RADIUS, TRACK_ZINDEX} from '../readonly';
import {CLUSTER_DISTANCE, DEF_MAP_CLUSTER_CLICK_TOLERANCE, ICN_PATH} from '../readonly/constants';
import {ILocation} from '../types/location';
import {loadFeaturesXhr} from './httpRequest';
import {fromHEXToColor, getClusterStyle} from './styles';
/**
 * set all interaction of  map active.
 * [map](https://compodoc.app/guides/getting-started.html)
 * @property {import("/Users/bongiu/Documents/wm-webapp/src/app/shared/map-core/node_modules/ol/Map.js").Map} map Map.
 * @export
 * @param {Map} map
 */
export function activateInteractions(map: Map): void {
  map.getInteractions().forEach(i => i.setActive(true));
}

/**
 * add feature to the source of layer.
 *
 * @export
 * @param {VectorLayer<VectorSource<Geometry>>} layer
 * @param {Feature<Geometry>} feature
 */
export function addFeatureToLayer(
  layer: VectorLayer<VectorSource<Geometry>>,
  feature: Feature<Geometry>,
): void {
  if (layer != null) {
    layer.getSource().addFeature(feature);
  }
}
export let selectCluster = null;

/**
 * Create a circle Feature<Point> in lonLat coordinate.
 * @export
 * @param {Coordinate} lonLat
 * @param {CircleOptions} [options]
 * @returns {*}  {Feature<Point>}
 */
export function createCircleFeature(lonLat: Coordinate, options?: CircleOptions): Feature<Point> {
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
    style: new Style({
      image: new CircleStyle(options),
    }),
  });
  return circleFeature;
}

export function createCluster(
  clusterLayer: VectorLayer<Cluster> | null,
  zIndex: number,
): VectorLayer<Cluster> {
  if (clusterLayer == null) {
    clusterLayer = new AnimatedCluster({
      name: 'cluster',
      animationDuration: 0,
      source: new Cluster({
        distance: CLUSTER_DISTANCE,
        source: new VectorSource({
          features: [],
        }),
        geometryFunction: (feature: Feature): Point | null => {
          return feature.getGeometry().getType() === 'Point' ? <Point>feature.getGeometry() : null;
        },
      }),
      style: getClusterStyle,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      zIndex,
    });
  }
  return clusterLayer;
}

export function createHull(map: Map) {
  var img = new Circle({
    radius: 5,
    stroke: new Stroke({
      color: 'rgba(0,255,255,1)',
      width: 1,
    }),
    fill: new Fill({
      color: 'rgba(0,255,255,0.3)',
    }),
  });
  var style = new Style({
    image: img,
    // Draw a link beetween points (or not)
    stroke: new Stroke({
      color: '#fff',
      width: 1,
    }),
  });
  selectCluster = new SelectCluster({
    // Point radius: to calculate distance between the features
    pointRadius: 34,
    circleMaxObjects: 20,
    // spiral: false,
    autoClose: true,
    animate: true,
    name: 'selectCluster',
    // Feature style when it springs apart
    featureStyle: function () {
      return [style];
    },
    style: function (f, res) {
      var cluster = f.get('features');
      if (cluster.length > 1) {
        var s = [getClusterStyle(f, res)];
        if (convexHull) {
          var coords = [];
          for (let i = 0; i < cluster.length; i++)
            coords.push(cluster[i].getGeometry().getFirstCoordinate());
          var chull = convexHull(coords);
          s.push(
            new Style({
              stroke: new Stroke({color: 'rgba(0,0,192,0.5)', width: 2}),
              fill: new Fill({color: 'rgba(0,0,192,0.3)'}),
              geometry: new Polygon([chull]),
              zIndex: 1,
            }),
          );
        }
        return s;
      } else {
        const selectedFeature = cluster[0];
        const prop = selectedFeature.getProperties().properties;
        const color = prop.color || 'darkorange';
        const namedPoiColor = fromHEXToColor[color] || 'darkorange';
        if (prop.svgIcon != null) {
          const src = `data:image/svg+xml;utf8,${prop.svgIcon
            .replaceAll(`<circle fill="${'darkorange'}"`, '<circle fill="white" ')
            .replaceAll(`<g fill="white"`, `<g fill="${namedPoiColor || 'darkorange'}" `)}`;
          return new Style({
            image: new Icon({
              anchor: [0.5, 0.5],
              scale: 1,
              src,
            }),
          });
        } else {
          const icn = getIcnFromTaxonomies(prop.taxonomyIdentifiers);
          return new Style({
            image: new Icon({
              anchor: [0.5, 0.5],
              scale: 0.5,
              src: `${ICN_PATH}/${icn}_selected.png`,
            }),
          });
        }
      }
    },
  });
  selectCluster.setActive(false);
  map.addInteraction(selectCluster);
}
export function getIcnFromTaxonomies(taxonomyIdentifiers: string[]): string {
  const excludedIcn = ['theme_ucvs'];
  const res = taxonomyIdentifiers.filter(
    p => excludedIcn.indexOf(p) === -1 && p.indexOf('poi_type') > -1,
  );
  return res.length > 0 ? res[0] : taxonomyIdentifiers[0];
}
export function createLayer(layer: VectorLayer<VectorSource>, zIndex: number) {
  if (!layer) {
    layer = new VectorLayer({
      source: new VectorSource({
        features: [],
      }),
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      zIndex,
    });
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

export function isCluster(
  layer: VectorLayer<Cluster>,
  evt: MapBrowserEvent<UIEvent>,
  map: Map,
): boolean {
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
export function getCluster(
  layer: VectorLayer<Cluster>,
  evt: MapBrowserEvent<UIEvent>,
  map: Map,
): Feature<Geometry>[] {
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

  return features;
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
  layer: VectorLayer<any>,
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
  layer: VectorLayer<any>,
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

export function removeFeatureFromLayer(layer: VectorLayer<any>, feature: Feature<Geometry>): void {
  const source = layer.getSource();
  if (source.hasFeature(feature)) {
    source.removeFeature(feature);
  }
}
export function initInteractions(opt?: DefaultsOptions): Collection<Interaction> {
  if (opt == null) {
    opt = {
      doubleClickZoom: false,
      dragPan: true,
      mouseWheelZoom: true,
      pinchRotate: false,
      altShiftDragRotate: false,
    };
  }
  return defaultInteractions(opt);
}

/**
 * Initialize a specific layer with interactive data
 *
 * @returns the created layer
 */
export function initVectorTileLayer(
  url: any,
  styleFn: (feature: FeatureLike) => Style,
  tileLoadFn: LoadFunction,
  preload = false,
): VectorTileLayer {
  if (!url) {
    return;
  }

  const layer = new VectorTileLayer({
    zIndex: TRACK_ZINDEX,
    preload: preload ? Infinity : 0,
    renderMode: 'vector',
    renderBuffer: 512,
    source: new VectorTileSource({
      format: new MVT(),
      url: url,
      overlaps: true,
      tileSize: 128,
      tileLoadFunction: tileLoadFn,
    }),
    style: styleFn,
  });
  return layer;
}

export function tileLoadFn(tile: any, url: string) {
  // startTime(url);
  localforage.getItem(url).then(cached => {
    tile.setLoader(
      loadFeaturesXhr(
        url,
        tile.getFormat(),
        tile.extent,
        tile.resolution,
        tile.projection,
        tile.onLoad.bind(tile),
        tile.onError.bind(tile),
        cached,
      ),
    );
  });
}

export function lowTileLoadFn(tile: any, url: string) {
  // startTime(url);
  let cached = null;
  try {
    cached = localStorage.getItem(url);
  } catch (e) {
    console.warn(e);
    cached = null;
  }
  if (cached != null) {
    tile.setLoader(
      loadFeaturesXhr(
        url,
        tile.getFormat(),
        tile.extent,
        tile.resolution,
        tile.projection,
        tile.onLoad.bind(tile),
        tile.onError.bind(tile),
        cached,
      ),
    );
  } else {
    tileLoadFn(tile, url);
  }
}
export function clearLayer(layer: VectorLayer<any>): void {
  if (layer != null && layer.getSource != null) {
    layer.getSource().clear();
  }
}

export function changedLayer(layer: VectorLayer<any>): void {
  if (layer != null && layer.getSource() != null) {
    layer.getSource().changed();
    layer.changed();
  }
}

export function calculateNearestPoint(
  location: ILocation,
  layer: VectorLayer<VectorSource>,
  alertPoiRadius = ALERT_POI_RADIUS,
): Feature<Geometry> | null {
  const feature: VectorSource<Geometry> = layer?.getSource();
  if (feature) {
    const coord: Coordinate = [location.longitude, location.latitude];
    const nFeature = feature.getClosestFeatureToCoordinate(coord);
    if (nFeature != null) {
      const nFeatureCoords = nFeature.getGeometry();
      const distanceFromUser = getDistance(
        coord,
        toLonLat((nFeatureCoords as Point).getCoordinates()),
      );
      if (distanceFromUser > alertPoiRadius) {
        return null;
      }
      const oldProperties = nFeature.getProperties();
      nFeature.setProperties({...oldProperties, ...{distance_from_user: distanceFromUser}});
      return nFeature;
    }
  }
  return null;
}
