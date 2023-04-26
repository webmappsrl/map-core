import {Coordinate} from 'ol/coordinate';
import {
  addFeatureToLayer,
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
  extentToLonLat,
  getIcnFromTaxonomies,
} from './ol';
import {Feature} from 'ol';
import {Point} from 'ol/geom';
import {Circle, Style, Stroke, Fill, Icon} from 'ol/style';
import VectorLayer from 'ol/layer/Vector';
import {Cluster} from 'ol/source';
import VectorSource from 'ol/source/Vector';
import AnimatedCluster from 'ol-ext/layer/AnimatedCluster';
import {getClusterStyle} from './styles';
import SelectCluster from 'ol-ext/interaction/SelectCluster';
import {fromLonLat, transformExtent} from 'ol/proj';
import CircleStyle, {Options as CircleOptions} from 'ol/style/Circle';
import {CLUSTER_DISTANCE} from 'src/readonly/constants';
import {startIconHtml, endIconHtml} from 'src/readonly/icons';
import {transform} from 'ol/proj';
import {Location} from '../types/location';

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
    node.setAttribute('id', 'canvas');
    document.body.appendChild(node);
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
    const extent3857 = [
      -13668484.8116725, 5694226.321756964, -13668132.624966632, 5694607.841694763,
    ];
    const extent4326 = [
      -123.1215834720188, 49.247593882736425, -123.11791852804199, 49.25182611562397,
    ];
    const transformedExtent = transformExtent(extent3857, 'EPSG:3857', 'EPSG:4326');
    expect(extentToLonLat(extent3857)).toEqual(transformedExtent);
  });
});
