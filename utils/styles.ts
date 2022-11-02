import FlowLine from 'ol-ext/style/FlowLine';
import Stroke from 'ol/style/Stroke';
import Style, {StyleLike} from 'ol/style/Style';
import StrokeStyle from 'ol/style/Stroke';
import {DEF_LINE_COLOR, TRACK_ZINDEX} from '../readonly';
import {FeatureLike} from 'ol/Feature';
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

export function getLineStyle(color?: string): Style[] {
  const style: Style[] = [];
  const strokeWidth: number = 3;
  const strokeOpacity: number = 1;
  const lineDash: Array<number> = [];
  const lineCap: CanvasLineCap = 'round';
  const zIndex: number = 50;

  if (!color) color = '255, 177, 0';
  if (color[0] === '#') {
    color =
      parseInt(color.substring(1, 3), 16) +
      ', ' +
      parseInt(color.substring(3, 5), 16) +
      ', ' +
      parseInt(color.substring(5, 7), 16);
  }
  color = 'rgba(' + color + ',' + strokeOpacity + ')';

  style.push(
    new Style({
      stroke: new Stroke({
        color: 'rgba(255, 255, 255, 0.9)',
        width: strokeWidth * 2,
      }),
      zIndex: zIndex + 1,
    }),
  );

  style.push(
    new Style({
      stroke: new Stroke({
        color,
        width: strokeWidth,
        lineDash,
        lineCap,
      }),
      zIndex: zIndex + 2,
    }),
  );

  return style;
}

export function getFlowStyle(orangeTreshold = 800, redTreshold = 1500) {
  return new FlowLine({
    lineCap: 'butt',
    color: function (f, step) {
      const geometry = f.getGeometry().getCoordinates();
      const position = +(geometry.length * step).toFixed();
      const currentLocation = geometry[position];
      let currentAltitude = 100;
      try {
        currentAltitude = currentLocation[2];
      } catch (_) {}

      if (currentAltitude >= orangeTreshold && currentAltitude < redTreshold) {
        return 'orange';
      }
      if (currentAltitude >= redTreshold) {
        return 'red';
      }
      return 'green';
    },
    width: 10,
  });
}

export interface handlingStrokeStyleWidthOptions {
  currentZoom: number;
  maxStrokeWidth?: number;
  maxZoom: number;
  minStrokeWidth?: number;
  minZoom: number;
  strokeStyle: StrokeStyle;
}
export function handlingStrokeStyleWidth(options: handlingStrokeStyleWidthOptions): void {
  options = {...{minStrokeWidth: 0.1, maxStrokeWidth: 5}, ...options};
  const delta = (options.currentZoom - options.minZoom) / (options.maxZoom - options.minZoom);
  const newWidth =
    options.minStrokeWidth + (options.maxStrokeWidth - options.minStrokeWidth) * delta;

  options.strokeStyle.setWidth(newWidth);
}

export function getColorFromLayer(id: number, layers: ILAYER[] = []): string {
  const layer = layers.filter(l => +l.id === +id);
  return layer[0] && layer[0].style && layer[0].style.color ? layer[0].style.color : DEF_LINE_COLOR;
}

export function styleLowCoreFn(feature: FeatureLike) {
  const properties = feature.getProperties();
  const layers: number[] = JSON.parse(properties.layers);
  let strokeStyle: StrokeStyle = new StrokeStyle();

  if (this._currentLayer != null) {
    const currentIDLayer = +this._currentLayer.id;
    if (layers.indexOf(currentIDLayer) >= 0) {
      strokeStyle.setColor(this._currentLayer.style.color ?? this._defaultFeatureColor);
    } else {
      strokeStyle.setColor('rgba(0,0,0,0)');
    }
  } else {
    const layerId = +layers[0];
    strokeStyle.setColor(getColorFromLayer(layerId, this.conf.layers));
  }
  const opt: handlingStrokeStyleWidthOptions = {
    strokeStyle,
    minZoom: this.conf.minZoom,
    maxZoom: this.conf.maxZoom,
    minStrokeWidth: this.conf.minStrokeWidth,
    maxStrokeWidth: this.conf.maxStrokeWidth,
    currentZoom: this.map.getView().getZoom(),
  };
  handlingStrokeStyleWidth(opt);

  let style = new Style({
    stroke: strokeStyle,
    zIndex: TRACK_ZINDEX,
  });
  return style;
}
export function styleLowFn(conf: any, currentZoom: number) {
  return styleLowCoreFn.bind({conf, currentZoom}) as StyleLike;
}
