import {Coordinate} from 'ol/coordinate';
import {
  addFeatureToLayer,
  coordsFromLonLat,
  createCircleFeature,
  createCluster,
  createHull,
  createIconFeatureFromHtml,
  createLayer,
  getIcnFromTaxonomies,
} from './ol';
import {Feature} from 'ol';
import {Point} from 'ol/geom';
import {Circle, Style, Stroke, Fill} from 'ol/style';
import VectorLayer from 'ol/layer/Vector';
import {Cluster} from 'ol/source';
import VectorSource from 'ol/source/Vector';
import AnimatedCluster from 'ol-ext/layer/AnimatedCluster';
import {getClusterStyle} from './styles';
import SelectCluster from 'ol-ext/interaction/SelectCluster';
import {fromLonLat} from 'ol/proj';
import CircleStyle, {Options as CircleOptions} from 'ol/style/Circle';
import {CLUSTER_DISTANCE} from 'src/readonly/constants';

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
    const circleStyle = circleFeature.get('circleStyle') as CircleStyle;

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

  it('createHull: should create a SelectCluster with a Circle style', () => {
    const selectCluster = createHull();
    const circleStyle = selectCluster.getStyle() as Circle;

    expect(selectCluster).toBeInstanceOf(SelectCluster);
    expect(circleStyle.getRadius()).toBe(5);
    expect(circleStyle.getStroke().getColor()).toEqual('rgba(0,255,255,1)');
    expect(circleStyle.getStroke().getWidth()).toBe(1);
    expect(circleStyle.getFill().getColor()).toEqual('rgba(0,255,255,0.3)');
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
});
