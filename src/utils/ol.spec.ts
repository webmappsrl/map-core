import {Coordinate} from 'ol/coordinate';
import {
  addFeatureToLayer,
  arrayExtend,
  buildTileLayers,
  calculateNearestPoint,
  calculateRotation,
  circularPolygon,
  coordsFromLonLat,
  coordsToLonLat,
  createCircleFeature,
  createCluster,
  createHull,
  createIconFeatureFromHtml,
  createIconFromHtmlAndGeometry,
  createLayer,
  distanceBetweenCoordinates,
  distanceBetweenPoints,
  extentFromLonLat,
  extentToLonLat,
  getCluster,
  getIcnFromTaxonomies,
  initInteractions,
  initVectorTileLayer,
  intersectionBetweenArrays,
  isCluster,
  nearestFeatureOfCluster,
  nearestFeatureOfCooridinate,
  nearestFeatureOfLayer,
  removeFeatureFromLayer,
  toDegrees,
  toRadians,
} from './ol';
import {MapBrowserEvent, View, Map} from 'ol';
import {Geometry, Point, Polygon} from 'ol/geom';
import {Style, Stroke, Fill, Icon} from 'ol/style';
import VectorLayer from 'ol/layer/Vector';
import {Cluster} from 'ol/source';
import VectorSource from 'ol/source/Vector';
import AnimatedCluster from 'ol-ext/layer/AnimatedCluster';
import {getClusterStyle} from './styles';
import SelectCluster from 'ol-ext/interaction/SelectCluster';
import {CLUSTER_DISTANCE} from 'src/readonly/constants';
import {startIconHtml, endIconHtml} from 'src/readonly/icons';
import {transform} from 'ol/proj';
import {Location} from '../types/location';
import {Extent} from 'ol/extent';
import {FeatureLike} from 'ol/Feature';
import VectorTileLayer from 'ol/layer/VectorTile';
import Feature from 'ol/Feature';

describe('ol', () => {
  it('addFeatureToLayer: should add a feature to the given layer', () => {
    const layer = new VectorLayer<VectorSource<Point>>({
      source: new VectorSource<Point>(),
    });
    const feature = new Feature<Point>({
      geometry: new Point([0, 0]),
    });

    addFeatureToLayer(layer, feature);
    expect(layer.getSource().getFeatures()).toContain(feature);
  });

  it('addFeatureToLayer: should not throw an error if layer is null', () => {
    const feature = new Feature<Point>({
      geometry: new Point([0, 0]),
    });
    expect(() => addFeatureToLayer(null, feature)).not.toThrow();
  });

  it('createCircleFeature: should return a Feature<Point> object', () => {
    const lonlat: Coordinate = [16, 48];
    const circleFeature = createCircleFeature(lonlat);

    expect(circleFeature).toBeInstanceOf(Feature);
    expect(circleFeature.getGeometry()).toBeInstanceOf(Point);
  });

  it('createCircleFeature: should return a circle feature with default style values', () => {
    const lonlat: Coordinate = [16, 48];
    const circleFeature = createCircleFeature(lonlat);
    const circleStyle = circleFeature.get('style').getImage();

    expect(circleStyle.getRadius()).toBe(15);
    expect(circleStyle.getFill().getColor()).toBe('#3399CC');
    expect(circleStyle.getStroke().getColor()).toBe('#fff');
  });

  it('createCluster: should return the clusterLayer with the specified zIndex', () => {
    const zIndex = 10;
    const clusterLayer = new VectorLayer<Cluster>({
      source: new Cluster({source: new VectorSource({features: []})}),
      zIndex,
    });
    const resultClusterLayer = createCluster(clusterLayer, zIndex);

    expect(resultClusterLayer).toBe(clusterLayer);
    expect(resultClusterLayer.getZIndex()).toBe(zIndex);
  });

  it('createCluster: should create a clusterLayer with default values when not provided', () => {
    const zIndex = 10;
    const clusterLayer = createCluster(null, zIndex);
    const clusterSource = clusterLayer.getSource();
    const vectorSource = clusterSource.getSource();

    expect(clusterLayer).toBeInstanceOf(AnimatedCluster);
    expect(clusterLayer.getZIndex()).toBe(zIndex);
    expect(clusterSource.getDistance()).toBe(CLUSTER_DISTANCE);
    expect(vectorSource.getFeatures().length).toBe(0);
    expect(clusterLayer.getStyle()).toBe(getClusterStyle);
  });

  it('createHull: should create a SelectCluster', () => {
    //TODO add possible implementation of further tests, such as the circle style creation test
    const selectCluster = createHull();

    expect(selectCluster).toBeInstanceOf(SelectCluster);
  });

  it('getIcnFromTaxonomies: should return the first non-excluded taxonomy identifier with "poi_type"', () => {
    const taxonomies = ['theme_ucvs', 'poi_type_1', 'poi_type_2', 'other_taxonomy'];
    const expectedResult = 'poi_type_1';
    const result = getIcnFromTaxonomies(taxonomies);

    expect(result).toBe(expectedResult);
  });

  it('getIcnFromTaxonomies: should return the first taxonomy identifier if no "poi_type" is found', () => {
    const taxonomies = ['theme_ucvs', 'other_taxonomy_1', 'other_taxonomy_2'];
    const expectedResult = 'theme_ucvs';
    const result = getIcnFromTaxonomies(taxonomies);

    expect(result).toBe(expectedResult);
  });

  it('getIcnFromTaxonomies: should return an empty string if taxonomyIdentifiers is an empty array', () => {
    const taxonomies: string[] = [];
    const expectedResult = undefined;
    const result = getIcnFromTaxonomies(taxonomies);

    expect(result).toBe(expectedResult);
  });

  it('createLayer: should create a new VectorLayer with the given zIndex if the layer is not provided', () => {
    const zIndex = 10;
    const layer = createLayer(null, zIndex);

    expect(layer).toBeInstanceOf(VectorLayer);
    expect(layer.getSource()).toBeInstanceOf(VectorSource);
    expect(layer.getUpdateWhileAnimating()).toBe(true);
    expect(layer.getUpdateWhileInteracting()).toBe(true);
    expect(layer.getZIndex()).toBe(zIndex);
  });

  it('createLayer: should return the provided layer if it is not null', () => {
    const existingLayer = new VectorLayer({
      source: new VectorSource(),
    });
    const zIndex = 10;
    const layer = createLayer(existingLayer, zIndex);

    expect(layer).toBe(existingLayer);
    expect(layer.getZIndex()).not.toBe(zIndex);
  });

  it('createIconFeatureFromHtml: should create a new feature with the icon', () => {
    const lonlat: Coordinate = [16, 48];
    const node = document.createElement('canvas');
    document.body.appendChild(node);
    node.setAttribute('id', 'canvas');
    const feature = createIconFeatureFromHtml(startIconHtml, lonlat);
    const featureStyle: any = feature.getStyle();
    const featureStyleImage = featureStyle.getImage();

    expect(feature).toBeInstanceOf(Feature);
    expect(featureStyle.getZIndex()).toBe(999999999);
    expect(featureStyleImage).toBeInstanceOf(Icon);
    expect(featureStyleImage.getOpacity()).toBe(1);
    expect(feature.getGeometry()).toBeInstanceOf(Point);
  });

  it('createIconFromHtmlAndGeometry: should create Icon from html and geometry', () => {
    const lonlat: Coordinate = [16, 48];
    const node = document.createElement('canvas');
    node.setAttribute('id', 'ol-map');
    document.body.appendChild(node);
    const style = createIconFromHtmlAndGeometry(endIconHtml, lonlat);
    const styleImage = style.getImage();
    const geometry = style.getGeometry() as Point;

    expect(style).toBeInstanceOf(Style);
    expect(styleImage).toBeInstanceOf(Icon);
    expect(styleImage.getImageSize()).toEqual([32, 32]);
    expect(styleImage.getOpacity()).toBe(1);
    expect(style.getZIndex()).toBe(999999999);
    expect(style.getGeometry()).toBeInstanceOf(Point);
    expect(geometry.getCoordinates()).toEqual(lonlat);
  });

  it('coordsToLonLat: should transform EPSG:3857 coordinates to [lon, lat] (EPSG:4326)', () => {
    const epsg3857Coords: Coordinate = [2761667.630858837, 6252061.358379299];
    const expectedEpsg4326Coords: Coordinate = transform(epsg3857Coords, 'EPSG:3857', 'EPSG:4326');
    const transformedCoords = coordsToLonLat(epsg3857Coords);

    expect(transformedCoords[0]).toBeCloseTo(expectedEpsg4326Coords[0], 3);
    expect(transformedCoords[1]).toBeCloseTo(expectedEpsg4326Coords[1], 3);
  });

  it('coordsFromLonLat: should transform [lon, lat] (EPSG:4326) coordinates to EPSG:3857', () => {
    const epsg4326Coords: Coordinate = [24.831, 49.988];
    const expectedEpsg3857Coords: Coordinate = transform(epsg4326Coords, 'EPSG:4326', 'EPSG:3857');
    const transformedCoords = coordsFromLonLat(epsg4326Coords);

    expect(transformedCoords[0]).toBeCloseTo(expectedEpsg3857Coords[0], 3);
    expect(transformedCoords[1]).toBeCloseTo(expectedEpsg3857Coords[1], 3);
  });

  it('distanceBetweenPoints: should return the correct distance in meters between two locations', () => {
    const point1: Location = {
      latitude: 48.8566,
      longitude: 2.3522,
    };
    const point2: Location = {
      latitude: 51.5074,
      longitude: -0.1278,
    };
    const expectedDistance = 343556.06034104095;
    const calculatedDistance = distanceBetweenPoints(point1, point2);

    expect(calculatedDistance).toBeCloseTo(expectedDistance, 1);
  });

  it('distanceBetweenCoordinates: returns the distance between two points', () => {
    const c1 = [0, 0];
    const c2 = [3, 4];

    expect(distanceBetweenCoordinates(c1, c2)).toEqual(5);
  });

  it('distanceBetweenCoordinates: returns 0 when the points are the same', () => {
    const c1 = [1, 2];
    const c2 = [1, 2];

    expect(distanceBetweenCoordinates(c1, c2)).toEqual(0);
  });

  it('extentToLonLat: transforms an EPSG:3857 extent to EPSG:4326', () => {
    const expectedExtent4326: Extent = [
      -123.1215834720188, 49.247593882736425, -123.11791852804199, 49.25182611562397,
    ];
    const extent3857: Extent = [
      -13705831.977766663, 6316977.796643729, -13705423.998069376, 6317699.543413695,
    ];
    const transformedExtent = extentToLonLat(extent3857);
    const precision = 10;

    expect(transformedExtent[0]).toBeCloseTo(expectedExtent4326[0], precision);
    expect(transformedExtent[1]).toBeCloseTo(expectedExtent4326[1], precision);
    expect(transformedExtent[2]).toBeCloseTo(expectedExtent4326[2], precision);
    expect(transformedExtent[3]).toBeCloseTo(expectedExtent4326[3], precision);
  });

  it('extentFromLonLat: transforms an EPSG:4326 extent to EPSG:3857', () => {
    const extent4326: Extent = [
      -123.1215834720188, 49.247593882736425, -123.11791852804199, 49.25182611562397,
    ];
    const expectedExtent3857: Extent = [
      -13705831.977766663, 6316977.796643729, -13705423.998069376, 6317699.543413695,
    ];
    const transformedExtent = extentFromLonLat(extent4326);

    expect(transformedExtent).toEqual(expectedExtent3857);
  });

  it('isCluster: should return true if a cluster is present at the event location', () => {
    const map = new Map({
      view: new View({
        center: [0, 0],
        zoom: 4,
      }),
    });
    const features = [new Feature(new Point([1, 1])), new Feature(new Point([1.0001, 1.0001]))];
    const layerSource = new VectorSource({features});
    const clusterSource = new Cluster({source: layerSource});
    const layer = new VectorLayer({source: clusterSource});
    const evt = new MapBrowserEvent('click', map, new UIEvent('click'));
    evt.coordinate = [1, 1];

    expect(isCluster(layer, evt, map)).toBe(true);
  });

  it('isCluster: should return false if no cluster is present at the event location', () => {
    const map = new Map({
      view: new View({
        center: [0, 0],
        zoom: 4,
      }),
    });
    const features = [new Feature(new Point([1, 1]))];
    const layerSource = new VectorSource({features});
    const clusterSource = new Cluster({source: layerSource});
    const layer = new VectorLayer({source: clusterSource});
    const evt = new MapBrowserEvent('click', map, new UIEvent('click'));
    evt.coordinate = [10, 10];

    expect(isCluster(layer, evt, map)).toBe(false);
  });

  it('getCluster: should return an array of clustered features at the given location', () => {
    const point1 = new Feature(new Point([0, 0]));
    const point2 = new Feature(new Point([0, 0]));
    const point3 = new Feature(new Point([10, 10]));
    const source = new VectorSource({
      features: [point1, point2, point3],
    });
    const clusterSource = new Cluster({
      source: source,
      distance: 20,
    });
    const layer = new VectorLayer({
      source: clusterSource,
    });
    const map = new Map({
      target: 'map',
      layers: [layer],
      view: new View({
        center: [0, 0],
        zoom: 5,
      }),
    });
    const evt = new MapBrowserEvent('click', map, new UIEvent('click'));
    evt.coordinate = [0, 0];
    const cluster = getCluster(layer, evt, map);

    expect(cluster.length).toEqual(3);
    expect(cluster).toContain(point1);
    expect(cluster).toContain(point2);
  });

  it('intersectionBetweenArrays: returns an array with common elements from both arrays', () => {
    const array1 = [1, 2, 3, 4];
    const array2 = [3, 4, 5, 6];
    const expectedIntersection = [3, 4];
    const intersection = intersectionBetweenArrays(array1, array2);

    expect(intersection).toEqual(expectedIntersection);
  });

  it('intersectionBetweenArrays: returns an empty array if no common elements are found', () => {
    const array1 = [1, 2, 3, 4];
    const array2 = [5, 6, 7, 8];
    const expectedIntersection: any[] = [];
    const intersection = intersectionBetweenArrays(array1, array2);

    expect(intersection).toEqual(expectedIntersection);
  });

  it('intersectionBetweenArrays: returns an array with duplicate elements removed', () => {
    const array1 = [1, 2, 3, 3, 4, 4];
    const array2 = [3, 4, 4, 5, 6];
    const expectedIntersection = [3, 4];
    const intersection = intersectionBetweenArrays(array1, array2);

    expect(intersection).toEqual(expectedIntersection);
  });

  it('nearestFeatureOfCooridinate: returns the nearest feature to the given coordinate', () => {
    const features: Feature<Geometry>[] = [
      new Feature({
        geometry: new Point([-123.1187, 49.2468]),
        name: 'feature 1',
      }),
      new Feature({
        geometry: new Point([-123.1219, 49.2482]),
        name: 'feature 2',
      }),
      new Feature({
        geometry: new Point([-123.1241, 49.2506]),
        name: 'feature 3',
      }),
    ];
    const coordinate: Coordinate = [-123.123, 49.249];
    const nearestFeature = nearestFeatureOfCooridinate(features, coordinate);

    expect(nearestFeature.get('name')).toEqual('feature 2');
  });

  it('nearestFeatureOfLayer: should return the nearest feature to the clicked coordinate', () => {
    const point1 = new Feature(new Point([0, 0]));
    const point2 = new Feature(new Point([10, 10]));
    const point3 = new Feature(new Point([20, 20]));
    const source = new VectorSource({
      features: [point1, point2, point3],
    });
    const layer = new VectorLayer({
      source: source,
    });
    const map = new Map({
      target: 'map',
      layers: [layer],
      view: new View({
        center: [0, 0],
        zoom: 1,
      }),
    });
    const evt = new MapBrowserEvent('click', map, new UIEvent('click'));
    evt.coordinate = [10, 10];
    const nearestFeature = nearestFeatureOfLayer(layer, evt, map);

    expect(nearestFeature).toBe(point2);
  });

  it('nearestFeatureOfCluster: should return the nearest feature from a cluster or a single feature source', () => {
    const point1 = new Feature(new Point([0, 0]));
    const point2 = new Feature(new Point([10, 10]));
    const point3 = new Feature(new Point([20, 20]));
    const source = new VectorSource({
      features: [point1, point2, point3],
    });
    const clusterSource = new Cluster({
      source: source,
      distance: 5,
    });
    const layer = new VectorLayer({
      source: clusterSource,
    });
    const map = new Map({
      target: 'map',
      layers: [layer],
      view: new View({
        center: [0, 0],
        zoom: 1,
      }),
    });
    const evt = new MapBrowserEvent('click', map, new UIEvent('click'));
    evt.coordinate = [10, 10];
    const nearestFeature = nearestFeatureOfCluster(layer, evt, map);

    expect(nearestFeature).toBe(point2);
  });

  it('removeFeatureFromLayer: removes the feature from the layer source', () => {
    const source = new VectorSource();
    const layer = new VectorLayer({source});
    const coordinates = [0, 0];
    const feature = new Feature(new Point(coordinates));
    source.addFeature(feature);

    removeFeatureFromLayer(layer, feature);

    expect(source.getFeatures()).not.toContain(feature);
  });

  it('initInteractions: returns a collection of interactions', () => {
    const interactions = initInteractions();
    expect(interactions.getLength()).toBeGreaterThan(0);
  });

  it('initVectorTileLayer: should return a VectorTileLayer object', () => {
    const url = 'http://mytileserver.com/{z}/{x}/{y}.pbf';
    const styleFn = (feature: FeatureLike) => {
      return new Style({
        fill: new Fill({
          color: 'red',
        }),
        stroke: new Stroke({
          color: '#fff',
          width: 4,
        }),
      });
    };
    const tileLoadFn = () => {};
    const layer = initVectorTileLayer(url, styleFn, tileLoadFn);
    const failedLayer = initVectorTileLayer(undefined, styleFn, tileLoadFn);

    expect(failedLayer).toBeUndefined();
    expect(layer).toBeDefined();
    expect(layer instanceof VectorTileLayer).toBeTrue();
  });

  it('calculateNearestPoint: should return the nearest feature within the alertPoiRadius', () => {
    const userLocation = {
      latitude: 0,
      longitude: 0,
    };
    const point1 = new Feature(new Point([0, 0]));
    const point2 = new Feature(new Point([0.001, 0.001]));
    const point3 = new Feature(new Point([0.002, 0.002]));
    const source = new VectorSource({
      features: [point1, point2, point3],
    });
    const layer = new VectorLayer({
      source: source,
    });
    const alertPoiRadius = 200;
    const nearestFeature = calculateNearestPoint(userLocation, layer, alertPoiRadius);

    expect(nearestFeature).toEqual(point1);
    expect(nearestFeature.get('distance_from_user')).toBeLessThanOrEqual(alertPoiRadius);
  });

  it('calculateRotation: should calculate the correct rotation angle between two coordinates', () => {
    const firstCoordinate = [10, 10];
    const secondCoordinate = [5, 5];
    const expectedRotation = Math.atan2(1, 1);

    const rotation = calculateRotation(firstCoordinate, secondCoordinate);
    expect(rotation).toEqual(expectedRotation);
  });

  it('calculateRotation: should calculate the correct rotation angle between two identical coordinates', () => {
    const firstCoordinate = [0, 0];
    const secondCoordinate = [0, 0];
    const expectedRotation = Math.atan2(0, 0);
    const rotation = calculateRotation(firstCoordinate, secondCoordinate);

    expect(rotation).toBeCloseTo(expectedRotation);
  });

  it('circularPolygon: should create a circular polygon', () => {
    const center = [12.4924, 41.8902];
    const radius = 1000;
    const n = 64;
    const circularPoly = circularPolygon(center, radius, n);

    expect(circularPoly).toBeInstanceOf(Polygon);
  });

  it('toDegrees: should convert radians to degrees', () => {
    const radians = Math.PI / 4;
    const expectedResult = 45;
    const degrees = toDegrees(radians);

    expect(degrees).toBeCloseTo(expectedResult, 6);
  });

  it('toDegrees: should return 0 degrees for 0 radians', () => {
    const radians = 0;
    const expectedResult = 0;
    const degrees = toDegrees(radians);

    expect(degrees).toBe(expectedResult);
  });

  it('toDegrees: should return 180 degrees for PI radians', () => {
    const radians = Math.PI;
    const expectedResult = 180;
    const degrees = toDegrees(radians);

    expect(degrees).toBe(expectedResult);
  });

  it('arrayExtend: should extend array with elements', () => {
    const originalArray = [1, 2, 3];
    const data = 4;
    const expectedResult = [1, 2, 3, 4];

    arrayExtend(originalArray, data);

    expect(originalArray).toEqual(expectedResult);
  });

  it('arrayExtend: should extend array with another array', () => {
    const originalArray = [1, 2, 3];
    const data = [4, 5, 6];
    const expectedResult = [1, 2, 3, 4, 5, 6];

    arrayExtend(originalArray, data);

    expect(originalArray).toEqual(expectedResult);
  });

  it('arrayExtend: should not modify the original array if data is an empty array', () => {
    const originalArray = [1, 2, 3];
    const data = [];
    const expectedResult = [1, 2, 3];

    arrayExtend(originalArray, data);

    expect(originalArray).toEqual(expectedResult);
  });

  it('buildTileLayers: should build tile layers correctly', () => {
    const tiles = [
      {layer1: 'https://example.com/layer1/{z}/{x}/{y}.png'},
      {layer2: 'https://example.com/layer2/{z}/{x}/{y}.png'},
    ];

    const expectedResult = tiles.map((tile, index) => ({
      preload: Infinity,
      visible: index === 0,
      zIndex: index,
      className: Object.keys(tile)[0],
      url: Object.values(tile)[0],
    }));

    const result = buildTileLayers(tiles).map(tileLayer => ({
      preload: tileLayer.getPreload(),
      visible: tileLayer.getVisible(),
      zIndex: tileLayer.getZIndex(),
      className: tileLayer.getClassName(),
      url: tileLayer.getSource().getUrls()[0],
    }));

    expect(result).toEqual(expectedResult);
  });

  it('toRadians: should convert degrees to radians correctly', () => {
    const testCases = [
      {degrees: 0, radians: 0},
      {degrees: 45, radians: Math.PI / 4},
      {degrees: 90, radians: Math.PI / 2},
      {degrees: 180, radians: Math.PI},
      {degrees: 360, radians: 2 * Math.PI},
    ];

    for (const testCase of testCases) {
      const result = toRadians(testCase.degrees);
      expect(result).toBeCloseTo(testCase.radians, 10);
    }
  });
});
