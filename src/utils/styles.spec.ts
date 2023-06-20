import {
  buildRefStyle,
  buildStartEndIcons,
  clusterHullStyle,
  getClusterStyle,
  getColorFromLayer,
  getFlowStyle,
  getLineStyle,
  setCurrentCluster,
  styleCoreFn,
  styleFn,
  styleHighFn,
  styleJsonFn,
  styleLowFn,
} from './styles';
import FlowLine from 'ol-ext/style/FlowLine';
import {ILAYER} from '../types/layer';
import {DEF_LINE_COLOR, TRACK_ZINDEX} from 'src/readonly';
import {Style, Circle, Stroke, Fill, Text, RegularShape} from 'ol/style';
import {LineString, Point, Polygon} from 'ol/geom';
import {Feature} from 'ol';
import {FeatureLike} from 'ol/Feature';

describe('styles', () => {
  it('styleJsonFn: should return a Mapbox Style JSON object with the provided vectorLayerUrl', () => {
    const vectorLayerUrl = 'https://example.com/vector-layer-url';
    const styleJson = styleJsonFn(vectorLayerUrl);

    expect(typeof styleJson).toBe('object');
    expect(styleJson.hasOwnProperty('version')).toBe(true);
    expect(styleJson.hasOwnProperty('name')).toBe(true);
    expect(styleJson.hasOwnProperty('metadata')).toBe(true);
    expect(styleJson.hasOwnProperty('sources')).toBe(true);
    expect(styleJson.hasOwnProperty('layers')).toBe(true);
    expect(styleJson.sources.tracks1.url).toEqual(vectorLayerUrl);
  });

  it('getLineStyle: should return an array of Style objects with expected properties', () => {
    const color = '#FFB100';
    const styles = getLineStyle(color);

    expect(Array.isArray(styles)).toBe(true);
    expect(styles.length).toBe(2);
    expect(styles[0] instanceof Style).toBe(true);
    expect(styles[0].getStroke() instanceof Stroke).toBe(true);
    expect(styles[0].getStroke().getColor()).toEqual('rgba(255, 255, 255, 0.9)');
    expect(styles[0].getStroke().getWidth()).toEqual(12);
    expect(styles[0].getZIndex()).toEqual(51);
    expect(styles[1] instanceof Style).toBe(true);
    expect(styles[1].getStroke() instanceof Stroke).toBe(true);
    expect(styles[1].getStroke().getColor()).toEqual('rgba(255, 177, 0,1)');
    expect(styles[1].getStroke().getWidth()).toEqual(6);
    expect(styles[1].getStroke().getLineDash()).toEqual([]);
    expect(styles[1].getStroke().getLineCap()).toEqual('round');
    expect(styles[1].getZIndex()).toEqual(52);
  });

  it('getFlowStyle: should return a FlowLine object', () => {
    const flowStyle = getFlowStyle();

    expect(flowStyle instanceof FlowLine).toBeTruthy();
  });

  it('getColorFromLayer: should return the color property of the layer with the specified ID', () => {
    const layers: ILAYER[] = [
      {
        id: '1',
        style: {color: 'red'},
        bbox: [0, 0, 0, 0],
        behaviour: {},
        data_use_bbox: false,
        data_use_only_my_data: false,
        description: '',
        name: '',
        subtitle: '',
        title: '',
      },
      {
        id: '2',
        style: {color: 'blue'},
        bbox: [0, 0, 0, 0],
        behaviour: {},
        data_use_bbox: false,
        data_use_only_my_data: false,
        description: '',
        name: '',
        subtitle: '',
        title: '',
      },
    ];

    const color = getColorFromLayer(1, layers);

    expect(color).toEqual('red');
  });

  it('getColorFromLayer: should return the default line color if the layer with the specified ID is not found', () => {
    const layers: ILAYER[] = [
      {
        id: '1',
        style: {color: 'red'},
        bbox: [0, 0, 0, 0],
        behaviour: {},
        data_use_bbox: false,
        data_use_only_my_data: false,
        description: '',
        name: '',
        subtitle: '',
        title: '',
      },
      {
        id: '2',
        style: {color: 'blue'},
        bbox: [0, 0, 0, 0],
        behaviour: {},
        data_use_bbox: false,
        data_use_only_my_data: false,
        description: '',
        name: '',
        subtitle: '',
        title: '',
      },
    ];
    const color = getColorFromLayer(3, layers);

    expect(color).toEqual(DEF_LINE_COLOR);
  });

  it('getColorFromLayer: should return the default line color if the layers array is empty', () => {
    const layers: ILAYER[] = [
      {
        id: '1',
        style: {color: 'red'},
        bbox: [0, 0, 0, 0],
        behaviour: {},
        data_use_bbox: false,
        data_use_only_my_data: false,
        description: '',
        name: '',
        subtitle: '',
        title: '',
      },
      {
        id: '2',
        style: {color: 'blue'},
        bbox: [0, 0, 0, 0],
        behaviour: {},
        data_use_bbox: false,
        data_use_only_my_data: false,
        description: '',
        name: '',
        subtitle: '',
        title: '',
      },
    ];
    const color = getColorFromLayer(1);

    expect(color).toEqual(DEF_LINE_COLOR);
  });

  it('getClusterStyle: should return a Style object for a cluster with multiple features', () => {
    const mockFeature = {
      get: (propName: string) => {
        if (propName === 'features') {
          return [1, 2, 3];
        }
        return null;
      },
      getProperties: () => ({
        features: [
          {
            getStyle: () => null,
          },
        ],
      }),
    };
    const style = getClusterStyle(mockFeature as any, 1);

    expect(style).toBeInstanceOf(Style);
    expect(style.getImage()).toBeInstanceOf(Circle);
    expect(style.getText()).toBeInstanceOf(Text);
  });

  it('getClusterStyle: should return a Style object for a cluster with a single feature', () => {
    const mockFeature = {
      get: (propName: string) => {
        if (propName === 'features') {
          return [1];
        }
        return null;
      },
      getProperties: () => ({
        features: [
          {
            getStyle: () => new Style({}),
          },
        ],
      }),
    };
    const style = getClusterStyle(mockFeature as any, 1);

    expect(style).toBeInstanceOf(Style);
  });

  it('getClusterStyle: should return null if a cluster has a single feature without a style', () => {
    const mockFeature = {
      get: (propName: string) => {
        if (propName === 'features') {
          return [1];
        }
        return null;
      },
      getProperties: () => ({
        features: [
          {
            getStyle: () => null,
          },
        ],
      }),
    };
    const style = getClusterStyle(mockFeature as any, 1);

    expect(style).toBeNull();
  });

  it('clusterHullStyle: should return a Style object for the cluster hull', () => {
    setCurrentCluster(null);
    const mockCluster = {
      get: (propName: string) => {
        if (propName === 'features') {
          return [
            new Feature(new Point([0, 0])),
            new Feature(new Point([1, 1])),
            new Feature(new Point([2, 0])),
          ];
        }
        return null;
      },
    };

    setCurrentCluster(mockCluster as any);
    const style = clusterHullStyle(mockCluster as any);

    expect(style).toBeInstanceOf(Style);
    expect(style.getGeometry()).toBeInstanceOf(Polygon);
    expect(style.getFill()).toBeInstanceOf(Fill);
    expect(style.getStroke()).toBeInstanceOf(Stroke);
  });

  it('clusterHullStyle: should return undefined if the cluster is not equal to the currentCluster or null', () => {
    const mockCluster = {
      get: (propName: string) => {
        if (propName === 'features') {
          return [];
        }
        return null;
      },
    };

    const style = clusterHullStyle(mockCluster as any);

    expect(style).toBeUndefined();
  });

  it('styleCoreFn: should return an array of Style objects for the given feature', () => {
    const mockContext = {
      currentLayer: null,
      conf: {
        minZoom: 1,
        maxZoom: 20,
        maxStrokeWidth: 5,
      },
      minStrokeWidth: 1,
      map: {
        getView: () => ({
          getZoom: () => 10,
        }),
      },
    };
    const feature = new Feature(
      new LineString([
        [0, 0],
        [1, 1],
        [2, 0],
      ]),
    );
    feature.setProperties({layers: JSON.stringify([1])});

    const styles = styleCoreFn.call(mockContext, feature as FeatureLike);

    expect(styles).toBeInstanceOf(Array);
    expect(styles.length).toBeGreaterThan(0);
    styles.forEach(style => {
      expect(style).toBeInstanceOf(Style);
    });
  });

  it('buildRefStyle: should return a Style object with a Text object for a given feature with a ref property', () => {
    const mockContext = {
      conf: {
        ref_on_track_show: true,
      },
      _defaultFeatureColor: '#000000',
    };
    const feature = new Feature(new Point([0, 0]));
    feature.setProperties({ref: 'A'});
    const style = buildRefStyle.call(mockContext, feature);
    const text = style.getText();

    expect(style).toBeInstanceOf(Style);
    expect(text).toBeInstanceOf(Text);
    expect(text.getText()).toEqual('A');
  });

  it('buildRefStyle: should return a Style object with an empty Text object for a feature without a ref property', () => {
    const mockContext = {
      conf: {
        ref_on_track_show: true,
      },
      _defaultFeatureColor: '#000000',
    };
    const feature = new Feature(new Point([0, 0]));
    feature.setProperties({});
    const style = buildRefStyle.call(mockContext, feature);
    const text = style.getText();

    expect(style).toBeInstanceOf(Style);
    expect(text).toBeInstanceOf(Text);
    expect(text.getText()).toEqual('');
  });

  it('buildStartEndIcons: should return an array of two Style objects for start and end point icons', () => {
    const geometry = new LineString([
      [0, 0],
      [1, 1],
      [2, 0],
    ]);
    const styles = buildStartEndIcons(geometry.getFlatCoordinates());
    const startPoint = styles[0].getGeometry();
    const endPoint = styles[1].getGeometry();
    const startImage = styles[0].getImage();
    const endImage = styles[1].getImage();

    expect(styles[0]).toBeInstanceOf(Style);
    expect(styles[1]).toBeInstanceOf(Style);
    expect(startPoint).toBeInstanceOf(Point);
    expect(endPoint).toBeInstanceOf(Point);
    expect(startImage).toBeInstanceOf(RegularShape);
    expect(endImage).toBeInstanceOf(RegularShape);
  });

  it('styleLowFn: should return a Style object for the given feature object with a lower zIndex', () => {
    const TRACK_ZINDEX = 490;
    const context = {
      conf: {
        minZoom: 0,
        maxZoom: 20,
        minStrokeWidth: 5,
        maxStrokeWidth: 6,
      },
      map: {
        getView: () => ({
          getZoom: () => 10,
        }),
      },
    };
    const feature = new Feature(
      new LineString([
        [0, 0],
        [1, 1],
        [2, 0],
      ]),
    );
    feature.setProperties({
      layers: JSON.stringify([1]),
    });
    const lowStyle = styleLowFn.bind(context)(feature);

    expect(lowStyle[0].getZIndex()).toBe(TRACK_ZINDEX + 1);

    const strokeWidth = lowStyle[0].getStroke().getWidth();
    expect(strokeWidth).toBe(context.conf.minStrokeWidth + 1);
  });

  it('styleHighFn: should return a Style object for the given feature object with a higher zIndex', () => {
    const TRACK_ZINDEX = 491;
    const context = {
      conf: {
        minZoom: 0,
        maxZoom: 20,
        minStrokeWidth: 5,
        maxStrokeWidth: 6,
      },
      map: {
        getView: () => ({
          getZoom: () => 10,
        }),
      },
    };
    const feature = new Feature(
      new LineString([
        [0, 0],
        [1, 1],
        [2, 0],
      ]),
    );
    feature.setProperties({
      layers: JSON.stringify([1]),
    });

    const highStyle = styleHighFn.bind(context)(feature);

    expect(highStyle[0].getZIndex()).toBe(TRACK_ZINDEX);

    const strokeWidth = highStyle[0].getStroke().getWidth();
    expect(strokeWidth).toBe(context.conf.minStrokeWidth + 1);
  });

  it('styleFn: should return a Style object for the given feature object with the stroke style based on the current layer configuration and a zIndex value of TRACK_ZINDEX + 1', () => {
    const context = {
      currentLayer: null,
      conf: {
        minZoom: 0,
        maxZoom: 20,
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
        ],
      },
      map: {
        getView: () => ({
          getZoom: () => 10,
        }),
      },
    };
    context.conf.layers = [
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
    ];
    const feature = new Feature(
      new LineString([
        [0, 0],
        [1, 1],
        [2, 0],
      ]),
    );
    feature.setProperties({
      layers: JSON.stringify([1]),
    });
    const style = styleFn.bind(context)(feature);
    const strokeColor = style[0].getStroke().getColor();
    const expectedColor = 'red';

    expect(style[0].getZIndex()).toBe(TRACK_ZINDEX + 1);
    expect(strokeColor).toEqual(expectedColor);
  });
});
