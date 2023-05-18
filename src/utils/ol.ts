import {filter} from 'rxjs/operators';
import {Feature, MapBrowserEvent} from 'ol';
import SelectCluster from 'ol-ext/interaction/SelectCluster';
import AnimatedCluster from 'ol-ext/layer/AnimatedCluster';
import Collection from 'ol/Collection';
import {Coordinate} from 'ol/coordinate';
import {buffer, extend, Extent} from 'ol/extent';
import {FeatureLike} from 'ol/Feature';
import MVT from 'ol/format/MVT';
import {Geometry, Point} from 'ol/geom';
import {defaults as defaultInteractions, Interaction} from 'ol/interaction';
import {DefaultsOptions} from 'ol/interaction/defaults';
import VectorLayer from 'ol/layer/Vector';
import VectorTileLayer from 'ol/layer/VectorTile';
import Map from 'ol/Map';
import {fromLonLat, toLonLat, transform, transformExtent} from 'ol/proj';
import {Cluster, XYZ} from 'ol/source';
import VectorSource from 'ol/source/Vector';
import VectorTileSource from 'ol/source/VectorTile';
import {getDistance, offset} from 'ol/sphere';
import {Circle, Fill, Icon, Stroke, Style} from 'ol/style';
import CircleStyle, {Options as CircleOptions} from 'ol/style/Circle';

import * as localforage from 'localforage';
import convexHull from 'ol-ext/geom/ConvexHull';
import Polygon from 'ol/geom/Polygon';
import {LoadFunction} from 'ol/Tile';
import {ALERT_POI_RADIUS, TRACK_ZINDEX} from '../readonly';
import {
  CLUSTER_DISTANCE,
  DEF_MAP_CLUSTER_CLICK_TOLERANCE,
  DEF_XYZ_URL,
  ICN_PATH,
} from '../readonly/constants';
import {Location} from '../types/location';
import {loadFeaturesXhr} from './httpRequest';
import {fromHEXToColor, getClusterStyle} from './styles';
import TileLayer from 'ol/layer/Tile';
import {ICONTROLSBUTTON, ICONTROLSTITLE} from '../types/model';

/**
 * @description
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
 * @description
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
  if (layer != null && layer.getSource() != null) {
    (layer.getSource() as any).addFeature(feature);
  }
}

/**
 * @description
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

/**
 * @description
 * Creates or updates a cluster layer with the given zIndex.
 *
 * @param {VectorLayer<Cluster> | null} clusterLayer - An optional VectorLayer<Cluster> object to update. If not provided, a new cluster layer with default values will be created.
 * @param {number} zIndex - The zIndex for the resulting cluster layer.
 *
 * @returns {VectorLayer<Cluster>} - The updated or newly created VectorLayer<Cluster> object.
 *
 * @default
 * Default values for a new cluster layer:
 * - AnimatedCluster with the following properties:
 *   - name: 'cluster'
 *   - animationDuration: 0
 *   - distance: CLUSTER_DISTANCE (default is 20)
 *   - source: A new VectorSource with an empty features array.
 *   - geometryFunction: A function that filters features with a 'Point' geometry type.
 *   - style: The getClusterStyle function.
 *   - updateWhileAnimating: true
 *   - updateWhileInteracting: true
 *   - zIndex: The provided zIndex value.
 */
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
        geometryFunction: (feature: Feature): Point => {
          return <Point>feature.getGeometry();
        },
      }),
      style: getClusterStyle,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      zIndex,
    });
  }
  return clusterLayer as VectorLayer<Cluster>;
}

/**
 * @description
 * Creates a SelectCluster object with a Circle style.
 *
 * @export
 * @returns {SelectCluster} - A new SelectCluster object with a default Circle style.
 *
 * @default
 * Default Circle style values:
 * - radius: 5
 * - stroke: A new Stroke object with the following properties:
 *   - color: 'rgba(0,255,255,1)'
 *   - width: 1
 * - fill: A new Fill object with the following property:
 *   - color: 'rgba(0,255,255,0.3)'
 */
export function createHull(): any {
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

  const selectCluster = new SelectCluster({
    // Point radius: to calculate distance between the features
    pointRadius: 34,
    circleMaxObjects: 4,
    maxObjects: 4,
    spiral: false,
    autoClose: true,
    animate: true,
    name: 'selectCluster',
    // Feature style when it springs apart
    style: function (f: any, res: any) {
      var cluster = f.get('features');
      if (cluster != null) {
        if (cluster.length > 1) {
          var s = [];
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
          }
        }
      }
    },
  });
  return selectCluster;
}

/**
 * @description
 * Returns an icon identifier from the given taxonomy identifiers.
 *
 * @export
 * @param {string[]} taxonomyIdentifiers - An array of taxonomy identifiers to search for an icon identifier.
 * @returns {string} - The first non-excluded taxonomy identifier with "poi_type" in it, the first taxonomy identifier if no "poi_type" is found, or an empty string if taxonomyIdentifiers is an empty array.
 *
 * Excluded taxonomy identifiers:
 * - 'theme_ucvs'
 */
export function getIcnFromTaxonomies(taxonomyIdentifiers: string[]): string {
  const excludedIcn = ['theme_ucvs'];
  const res = taxonomyIdentifiers?.filter(
    p => excludedIcn.indexOf(p) === -1 && p.indexOf('poi_type') > -1,
  );
  return res?.length > 0 ? res[0] : taxonomyIdentifiers[0];
}

/**
 * @description
 * Creates a VectorLayer with the given zIndex if the layer is not provided or returns the provided layer if it is not null.
 *
 * @export
 * @param {VectorLayer<VectorSource> | null} layer - The vector layer to be returned if not null.
 * @param {number} zIndex - The zIndex for the new VectorLayer if the layer is not provided.
 * @returns {VectorLayer<VectorSource>} - The provided VectorLayer if not null, or a new VectorLayer with the given zIndex.
 */
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

/**
 * @description
 * Creates an OpenLayers Feature with an icon style based on an HTML string (SVG).
 *
 * @param {string} html - The HTML string (SVG) to be used as the icon source.
 * @param {Coordinate} position - The coordinate ([longitude, latitude]) where the icon feature should be placed.
 * @returns {Feature} - An OpenLayers Feature with the icon style created from the provided HTML (SVG).
 *
 * @example
 * const svgHtml = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="16" fill="blue"/></svg>';
 * const coordinates: Coordinate = [16, 48];
 * const iconFeature = createIconFeatureFromHtml(svgHtml, coordinates);
 */
export function createIconFeatureFromHtml(html: string, position: Coordinate): Feature<Point> {
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
 * @description
 * Creates an OpenLayers Style object with an Icon created from an SVG string and a geometry.
 *
 * @param {string} html - The SVG string representing the icon.
 * @param {Coordinate} position - The coordinate of the icon's position (default: [0, 0]).
 * @returns {Style} The resulting OpenLayers Style object with the Icon and specified geometry.
 *
 * @example
 * const svgString = '<svg width="32" height="32">...</svg>';
 * const coord: Coordinate = [12.34, 56.78];
 * const iconStyle = createIconFromHtmlAndGeometry(svgString, coord);
 */
export function createIconFromHtmlAndGeometry(html: string, position: Coordinate): Style {
  const canvas = <HTMLCanvasElement>document.getElementById('ol-map');
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

  const style = new Style({
    geometry: new Point(position),
    image: new Icon({
      anchor: [0.5, 0.5],
      img: img,
      imgSize: [32, 32],
      opacity: 1,
    }),
    zIndex: 999999999,
  });

  return style;
}

/**
 * @description
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
 * @description
 * Transforms a set of [lon, lat](EPSG:4326) coordinates to EPSG:3857.
 *
 * @param coordinates - The [lon, lat](EPSG:4326) coordinates.
 * @returns The transformed [lon, lat](EPSG:3857) coordinates.
 *
 * @example
 * const coords4326: Coordinate = [-123.121583, 49.247593];
 * const coords3857 = coordsFromLonLat(coords4326);
 */
export function coordsFromLonLat(coordinates: Coordinate): Coordinate {
  return transform(coordinates, 'EPSG:4326', 'EPSG:3857');
}

export function deactivateInteractions(map: Map): void {
  map.getInteractions().forEach(i => i.setActive(false));
}

/**
 * @description
 * Calculates the distance in meters between two locations.
 *
 * @param point1 - The first location.
 * @param point2 - The second location.
 *
 * @returns The distance between the two locations in meters.
 *
 * @example
 * const point1: Location = { latitude: 40.712776, longitude: -74.005974 };
 * const point2: Location = { latitude: 37.7749, longitude: -122.419416 };
 * const distance = distanceBetweenPoints(point1, point2);
 */
export function distanceBetweenPoints(point1: Location, point2: Location): number {
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

/**
 * @description
 * Calculates the Euclidean distance between two coordinates in 2D space.
 *
 * @param c1 The first coordinate, as a tuple of two numbers [x, y].
 * @param c2 The second coordinate, as a tuple of two numbers [x, y].
 *
 * @returns The distance between the two coordinates.
 */
export function distanceBetweenCoordinates(c1: Coordinate, c2: Coordinate) {
  return Math.sqrt(Math.pow(c1[0] - c2[0], 2) + Math.pow(c1[1] - c2[1], 2));
}

/**
 * @description
 * Transforms a set of [minLon, minLat, maxLon, maxLat](EPSG:4326) extent coordinates to EPSG:3857.
 *
 * @param extent - The [minLon, minLat, maxLon, maxLat](EPSG:4326) extent coordinates.
 *
 * @returns The transformed [minLon, minLat, maxLon, maxLat](EPSG:3857) extent coordinates.
 *
 * @example
 * const extent4326: Extent = [-123.121583, 49.247593, -123.117918, 49.251826];
 * const extent3857 = extentFromLonLat(extent4326);
 */
export function extentToLonLat(extent: Extent): Extent {
  return transformExtent(extent, 'EPSG:3857', 'EPSG:4326');
}

/**
 * @description
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
 * @description
 * Determines if a cluster is present at the given MapBrowserEvent location.
 *
 * @param layer - The VectorLayer<Cluster> to search for clusters.
 * @param evt - The MapBrowserEvent<UIEvent> representing the event location.
 * @param map - The Map instance to retrieve the view and resolution.
 *
 * @returns true if a cluster is present, false otherwise.
 *
 * @example
 * const isClusterPresent = isCluster(layer, evt, map);
 * if (isClusterPresent) {
 *   // Handle cluster-related actions
 * }
 */
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

/**
 * @description
 * Retrieves an array of clustered features at a given MapBrowserEvent location.
 *
 * @param layer - The VectorLayer<Cluster> to search for clusters.
 * @param evt - The MapBrowserEvent<UIEvent> representing the event location.
 * @param map - The Map instance to retrieve the view and resolution.
 *
 * @returns An array of clustered Feature<Geometry> objects.
 *
 * @example
 * const clusteredFeatures = getCluster(layer, evt, map);
 * clusteredFeatures.forEach(feature => {
 *   // Handle the feature
 * });
 */
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

/**
 * @description
 * Returns the intersection of two arrays.
 *
 * @param a The first array.
 * @param b The second array.
 *
 * @returns An array containing the elements that are present in both input arrays.
 *
 * @example
 * const a = [1, 2, 3, 4];
 * const b = [3, 4, 5, 6];
 * const intersection = intersectionBetweenArrays(a, b);
 * console.log(intersection); // Output: [3, 4]
 */
export function intersectionBetweenArrays(a: any[], b: any[]): any[] {
  var setA = new Set(a);
  var setB = new Set(b);
  var intersection = new Set([...setA].filter(x => setB.has(x)));
  return Array.from(intersection);
}

/**
 * @description
 * Returns the nearest feature from a list of features to a given coordinate
 *
 * @param features List of features to search through
 * @param coordinate The coordinate to find the nearest feature to
 *
 * @returns The nearest feature to the given coordinate
 */
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

/**
 * @description
 * Get the nearest feature to a given coordinate on a vector layer
 *
 * @param layer The vector layer to search for features
 * @param evt The map browser event containing the clicked coordinate
 * @param map The map object containing the layer and view
 *
 * @returns The nearest feature to the clicked coordinate
 *
 * @example
 * const nearest = nearestFeatureOfLayer(vectorLayer, mapBrowserEvent, map);
 */
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

/**
 * @description
 * Given a layer and a map event, returns the nearest feature from a cluster or a single feature source.
 *
 * @param layer The layer containing the source
 * @param evt The map event that triggered the search
 * @param map The map instance
 *
 * @returns The nearest feature to the event coordinate
 */
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

/**
 * @description
 * Remove a feature from a vector layer
 *
 * @param layer the vector layer to remove the feature from
 * @param feature the feature to remove from the layer
 */
export function removeFeatureFromLayer(layer: VectorLayer<any>, feature: Feature<Geometry>): void {
  const source = layer.getSource();
  if (source.hasFeature(feature)) {
    source.removeFeature(feature);
  }
}

/**
 * @description
 * Initializes interactions for an OpenLayers map with the given options.
 *
 * @param opt an optional object of type DefaultsOptions, containing options for the interactions.
 * If null, default options will be used.
 *
 * @returns a collection of interactions for the OpenLayers map
 */
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
 * @description
 * Initializes a vector tile layer with a given URL, style function, and tile load function.
 *
 * @param url the URL of the vector tile server
 * @param styleFn the style function to apply to the features
 * @param tileLoadFn the function to load the vector tile data
 * @param preload if true, preloads all tiles in the viewport at the current resolution
 *
 * @returns the initialized vector tile layer
 */
export function initVectorTileLayer(
  url: any,
  styleFn: (feature: FeatureLike) => [Style] | Style,
  tileLoadFn: LoadFunction,
  preload = false,
): VectorTileLayer {
  if (!url) {
    return;
  }

  const layer = new VectorTileLayer({
    zIndex: TRACK_ZINDEX,
    renderMode: 'vector',
    renderBuffer: 2048,
    source: new VectorTileSource({
      format: new MVT(),
      url: url,
      overlaps: false,
      tileLoadFunction: tileLoadFn,
    }),
    style: styleFn,
  });
  return layer;
}

/**
 * @description
 * Builds an array of TileLayers from an array of tile URLs.
 * const tiles = [
 * { osm: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png' }
 * { hot: 'https://tile-{a-c}.openstreetmap.fr/hot/{z}/{x}/{y}.png' }
 * ];
 * const tileLayers = _buildTileLayers(tiles);
 *
 * @param tiles An array of objects containing the tile name and URL.
 * @returns An array of TileLayers.
 */
export function buildTileLayers(tiles: (ICONTROLSTITLE | ICONTROLSBUTTON)[]): TileLayer<XYZ>[] {
  /**
   * @description
   * Initialize the base source of the map
   *
   * @returns the XYZ source to use
   */
  const initBaseSource = (tile: string): XYZ => {
    if (tile === '') {
      return null;
    }
    return new XYZ({
      url: tile,
      cacheSize: 50000,
    });
  };
  const tilesMap = tiles
    .filter(tile => tile.type === 'button')
    .map((tile: ICONTROLSBUTTON, index) => {
      return new TileLayer({
        preload: Infinity,
        source: initBaseSource(tile.url),
        visible: index === 0,
        zIndex: index,
        className: Object.keys(tile)[0],
        properties: {...tile},
      });
    }) ?? [
    new TileLayer({
      preload: Infinity,
      source: initBaseSource(DEF_XYZ_URL),
      visible: true,
      zIndex: 0,
      className: 'webmapp',
    }),
  ];
  return tilesMap;
}
/**
 * @description
 * Custom tile loading function to handle caching of tiles using LocalForage.
 *
 * @param tile The tile object that is being loaded
 * @param url The URL from which the tile is to be fetched
 *
 * @example
 * const vectorTileSource = new VectorTileSource({
 *   format: new MVT(),
 *   url: 'https://example.com/tiles/{z}/{x}/{y}.pbf',
 *   tileLoadFunction: tileLoadFn,
 * });
 */
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
        cached as string,
      ),
    );
  });
}

/**
 * @description
 * Function to load a low-resolution tile from local storage cache if available, or load from URL otherwise.
 *
 * @param tile - The tile object to load.
 * @param url - The URL to load the tile from if not found in cache.
 *
 * @example
 * lowTileLoadFn(tile, 'https://example.com/tile.png');
 */
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

/**
 * @description
 * Calculate the nearest point (feature) to the given location on a vector layer.
 * If the distance from the user to the nearest point is greater than the alertPoiRadius,
 * the function returns null.
 *
 * @param location The user's location as an object with latitude and longitude properties
 * @param layer The vector layer containing features to search
 * @param alertPoiRadius The radius (in meters) within which to search for the nearest point (default: ALERT_POI_RADIUS)
 *
 * @returns The nearest feature to the user's location within the alertPoiRadius or null if not found
 *
 * @example
 * const nearestFeature = calculateNearestPoint(userLocation, vectorLayer, 500);
 */
export function calculateNearestPoint(
  location: Location,
  layer: VectorLayer<VectorSource>,
  alertPoiRadius = ALERT_POI_RADIUS,
): Feature<Geometry> | null {
  const feature: VectorSource<Geometry> = layer?.getSource();
  if (feature && location) {
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

/**
 * @description
 * Calculates the rotation angle (in radians) between two coordinates.
 *
 * @param first The first coordinate [x, y].
 * @param second The second coordinate [x, y].
 * @returns The rotation angle in radians.
 *
 * @example
 * const firstCoordinate = [0, 0];
 * const secondCoordinate = [1, 1];
 * const rotation = calculateRotation(firstCoordinate, secondCoordinate);
 */
export function calculateRotation(first, second): number {
  const firstX = first[0];
  const firstY = first[1];
  const secondX = second[0];
  const secondY = second[1];
  const temp = [firstX - secondX, firstY - secondY];
  //const temp = [secondX - firstX, secondY - firstY];
  return Math.atan2(temp[0], temp[1]);
}
export function flatten(arr) {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
  }, []);
}

/**
 * @description
 * Create an approximation of a circle on the surface of a sphere.
 *
 * @param {import("../coordinate.js").Coordinate} center Center (`[lon, lat]` in degrees).
 * @param {number} radius The great-circle distance from the center to
 *     the polygon vertices in meters.
 * @param {number} [n] Optional number of vertices for the resulting
 *     polygon. Default is `32`.
 * @param {number} [sphereRadius] Optional radius for the sphere (defaults to
 *     the Earth's mean radius using the WGS84 ellipsoid).
 * @return {Polygon} The "circular" polygon.
 * @api
 */
export function circularPolygon(center, radius, n?, sphereRadius?) {
  n = n ? n : 32;
  /** @type {Array<number>} */
  const flatCoordinates = [];
  for (let i = 0; i < n; ++i) {
    const of = offset(center, radius, (2 * Math.PI * i) / n, sphereRadius);
    arrayExtend(flatCoordinates, fromLonLat(of));
  }
  flatCoordinates.push(flatCoordinates[0], flatCoordinates[1]);
  return new Polygon(flatCoordinates, 'XY', [flatCoordinates.length]);
}

/**
 * @description
 * Converts radians to to degrees.
 *
 * @param {number} angleInRadians Angle in radians.
 *
 * @return {number} Angle in degrees.
 */
export function toDegrees(angleInRadians) {
  return (angleInRadians * 180) / Math.PI;
}

/**
 * @description
 * Converts degrees to radians.
 *
 * @param {number} angleInDegrees Angle in degrees.
 *
 * @return {number} Angle in radians.
 */
export function toRadians(angleInDegrees) {
  return (angleInDegrees * Math.PI) / 180;
}

/**
 * @param {Array<VALUE>} arr The array to modify.
 * @param {!Array<VALUE>|VALUE} data The elements or arrays of elements to add to arr.
 * @template VALUE
 */
export function arrayExtend(arr, data) {
  const extension = Array.isArray(data) ? data : [data];
  const length = extension.length;
  for (let i = 0; i < length; i++) {
    arr[arr.length] = extension[i];
  }
}
