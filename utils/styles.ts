import convexHull from 'ol-ext/geom/ConvexHull';
import FlowLine from 'ol-ext/style/FlowLine';
import { FeatureLike } from 'ol/Feature';
import { Point, Polygon } from 'ol/geom';
import { Circle, Fill, RegularShape, Text } from 'ol/style';
import { default as Stroke, default as StrokeStyle } from 'ol/style/Stroke';
import Style from 'ol/style/Style';

import { DEF_LINE_COLOR, TRACK_ZINDEX } from '../readonly';
import { ILAYER } from '../types/layer';

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
 * @description
 * This is a JavaScript function that creates and returns an array of ol.style.Style objects that are used to style a line feature in an OpenLayers map.
 * The function takes an optional parameter color which is a string representing the color of the line. If no color is passed, the default color is set to '255, 177, 0', which is a yellow color.
 * The function then checks if the first character of the color string is '#', which indicates that the color is in hex format. If that's the case, it converts the hex color to RGB format.
 * The function then creates two ol.style.Style objects and sets their properties.
 * The first style has a white stroke with double the width of the second style's stroke and a higher z-index, so it will be drawn above the second style. The second style has the color passed as an argument or default color and has a strokeWidth, lineDash set to empty array, lineCap to round and zIndex of 50. It creates an instance of ol.style.Stroke to set stroke property of ol.style.Style object.
 * Finally, the function returns the array of ol.style.Style objects.
 *
 * @export
 * @param {string} [color]
 * @returns {*}  {Style[]}
 */
export function getLineStyle(color?: string): Style[] {
  const style: Style[] = [];
  const strokeWidth: number = 6;
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
  options = {...{minStrokeWidth: 3, maxStrokeWidth: 6}, ...options};
  const delta = (options.currentZoom - options.minZoom) / (options.maxZoom - options.minZoom);
  const newWidth =
    options.minStrokeWidth + (options.maxStrokeWidth - options.minStrokeWidth) * delta;

  options.strokeStyle.setWidth(newWidth);
}

export function getColorFromLayer(id: number, layers: ILAYER[] = []): string {
  const layer = layers.filter(l => +l.id === +id);
  return layer[0] && layer[0].style && layer[0].style.color ? layer[0].style.color : DEF_LINE_COLOR;
}

export function getClusterStyle(feature, resolution) {
  var size = feature.get('features').length;
  var style = null;
  var color = '41,128,185';
  var radius = Math.max(8, Math.min(size * 0.75, 20));
  var dashv = (2 * Math.PI * radius) / 6;
  var dash = [0, dashv, dashv, dashv, dashv, dashv, dashv];
  const prop = feature.getProperties();
  if (size === 1 && prop.features && prop.features[0] != null) {
    const icon = feature.getProperties().features[0];
    return icon.getStyle() || null;
  } else {
    style = new Style({
      image: new Circle({
        radius: radius,
        stroke: new Stroke({
          color: 'rgba(' + color + ',0.5)',
          width: 15,
          lineDash: dash,
          lineCap: 'butt',
        }),
        fill: new Fill({
          color: 'rgba(' + color + ',1)',
        }),
      }),
      text: new Text({
        text: size.toString(),
        font: 'bold 12px comic sans ms',
        //textBaseline: 'top',
        fill: new Fill({
          color: '#fff',
        }),
      }),
    });
  }
  return style;
}

export let currentCluster = null;

export function setCurrentCluster(cluster): void {
  currentCluster = cluster;
}

export function clusterHullStyle(cluster) {
  if (cluster != currentCluster) {
    return;
  }
  const originalFeatures = cluster.get('features');
  const points = originalFeatures.map(feature => feature.getGeometry().getCoordinates());
  return new Style({
    geometry: new Polygon([convexHull(points)]),
    fill: new Fill({
      color: 'rgba(255, 153, 0, 0.4)',
    }),
    stroke: new Stroke({
      color: 'rgba(204, 85, 0, 1)',
      width: 1.5,
    }),
  });
}

export function styleCoreFn(feature: FeatureLike) {
  const properties = feature.getProperties();
  const geometry:any  = (feature.getGeometry() as any).getFlatCoordinates();
  const layers: number[] = JSON.parse(properties.layers);
  let strokeStyle: StrokeStyle = new StrokeStyle();

  if (this.currentLayer != null) {
    const currentIDLayer = +this.currentLayer.id;
    if (layers.indexOf(currentIDLayer) >= 0) {
      const color = this.currentLayer.style.color ?? DEF_LINE_COLOR;
      strokeStyle.setColor(color);
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
    minStrokeWidth: this.minStrokeWidth,
    maxStrokeWidth: this.conf.maxStrokeWidth,
    currentZoom: this.map.getView().getZoom(),
  };
  handlingStrokeStyleWidth(opt);

  let styles = [new Style({
    stroke: strokeStyle,
    zIndex: TRACK_ZINDEX + 1,
  })];
  if(this.conf.start_end_icons_show && this.map.getView().getZoom() > this.conf.start_end_icons_min_zoom) {
    styles = [...styles, ...buildStartEndIcons(geometry)];
  }
  if(this.conf.ref_on_track_show && this.map.getView().getZoom() > this.conf.ref_on_track_min_zoom) {
    styles = [...styles, buildRefStyle.bind(this)(feature)];
  }
  return styles;
}
export function buildRefStyle(feature): Style {
  const properties = feature.getProperties();
  let text = new Text({
    text: properties.ref != null && this.conf.ref_on_track_show ? properties.ref : '',
    font: 'bold 12px "Open Sans", "Arial Unicode MS", "sans-serif"',
    placement: 'point',
    rotateWithView: true,
    overflow: true,
    maxAngle: Math.PI / 16,
    fill: new Fill({
      color: this._defaultFeatureColor,
    }),
    stroke: new Stroke({
      color: '#fff',
      width: 4,
    }),
  });

  return new Style({
    zIndex: TRACK_ZINDEX + 1,
    text,
  });
}
export function buildStartEndIcons(geometry): Style[] {
  const start = [geometry[0],geometry[1]];
  const end = [geometry[geometry.length -2],geometry[geometry.length -1]];

  return [
    new Style({
      geometry: new Point(start),
      image: new RegularShape({
        fill: new Fill({
         color: 'green'
        }),
        stroke: new Stroke({
          color: 'white'
         }),
         points: 6,
         radius: 6,
      }),
      zIndex: TRACK_ZINDEX + 2,}),
      new Style({
        geometry: new Point(end),
        image: new RegularShape({
          fill: new Fill({
           color: 'red'
          }),
          stroke: new Stroke({
            color: 'white'
           }),
           points: 6,
           radius: 10,
           angle: 0,
        }),
        zIndex: TRACK_ZINDEX + 1,
      })
  ]
}
export function styleLowFn(feature: FeatureLike) {
  this.TRACK_ZINDEX = TRACK_ZINDEX + 1;
  this.minStrokeWidth = this.conf.minStrokeWidth + 1;
  return styleCoreFn.bind(this)(feature);
}

export function styleHighFn(feature: FeatureLike) {
  this.TRACK_ZINDEX = TRACK_ZINDEX;
  this.minStrokeWidth = this.conf.minStrokeWidth + 1;
  return styleCoreFn.bind(this)(feature);
}

export function styleFn(feature: FeatureLike) {
  const properties = feature.getProperties();
  const layers: number[] = JSON.parse(properties.layers);
  let strokeStyle: StrokeStyle = new StrokeStyle();

  if (this.currentLayer != null) {
    const currentIDLayer = +this.currentLayer.id;
    if (layers.indexOf(currentIDLayer) >= 0) {
      strokeStyle.setColor(this.currentLayer.style.color ?? this._defaultFeatureColor);
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

  let styles = [new Style({
    stroke: strokeStyle,
    zIndex: TRACK_ZINDEX + 1,
  })];

  return styles;
}

export const fromNameToHEX = {
  'aliceblue': '#f0f8ff',
  'antiquewhite': '#faebd7',
  'aqua': '#00ffff',
  'aquamarine': '#7fffd4',
  'azure': '#f0ffff',
  'beige': '#f5f5dc',
  'bisque': '#ffe4c4',
  'black': '#000000',
  'blanchedalmond': '#ffebcd',
  'blue': '#0000ff',
  'blueviolet': '#8a2be2',
  'brown': '#a52a2a',
  'burlywood': '#deb887',
  'cadetblue': '#5f9ea0',
  'chartreuse': '#7fff00',
  'chocolate': '#d2691e',
  'coral': '#ff7f50',
  'cornflowerblue': '#6495ed',
  'cornsilk': '#fff8dc',
  'crimson': '#dc143c',
  'cyan': '#00ffff',
  'darkblue': '#00008b',
  'darkcyan': '#008b8b',
  'darkgoldenrod': '#b8860b',
  'darkgray': '#a9a9a9',
  'darkgreen': '#006400',
  'darkgrey': '#a9a9a9',
  'darkkhaki': '#bdb76b',
  'darkmagenta': '#8b008b',
  'darkolivegreen': '#556b2f',
  'darkorange': '#ff8c00',
  'darkorchid': '#9932cc',
  'darkred': '#8b0000',
  'darksalmon': '#e9967a',
  'darkseagreen': '#8fbc8f',
  'darkslateblue': '#483d8b',
  'darkslategray': '#2f4f4f',
  'darkslategrey': '#2f4f4f',
  'darkturquoise': '#00ced1',
  'darkviolet': '#9400d3',
  'deeppink': '#ff1493',
  'deepskyblue': '#00bfff',
  'dimgray': '#696969',
  'dimgrey': '#696969',
  'dodgerblue': '#1e90ff',
  'firebrick': '#b22222',
  'floralwhite': '#fffaf0',
  'forestgreen': '#228b22',
  'fuchsia': '#ff00ff',
  'gainsboro': '#dcdcdc',
  'ghostwhite': '#f8f8ff',
  'goldenrod': '#daa520',
  'gold': '#ffd700',
  'gray': '#808080',
  'green': '#008000',
  'greenyellow': '#adff2f',
  'grey': '#808080',
  'honeydew': '#f0fff0',
  'hotpink': '#ff69b4',
  'indianred': '#cd5c5c',
  'indigo': '#4b0082',
  'ivory': '#fffff0',
  'khaki': '#f0e68c',
  'lavenderblush': '#fff0f5',
  'lavender': '#e6e6fa',
  'lawngreen': '#7cfc00',
  'lemonchiffon': '#fffacd',
  'lightblue': '#add8e6',
  'lightcoral': '#f08080',
  'lightcyan': '#e0ffff',
  'lightgoldenrodyellow': '#fafad2',
  'lightgray': '#d3d3d3',
  'lightgreen': '#90ee90',
  'lightgrey': '#d3d3d3',
  'lightpink': '#ffb6c1',
  'lightsalmon': '#ffa07a',
  'lightseagreen': '#20b2aa',
  'lightskyblue': '#87cefa',
  'lightslategray': '#778899',
  'lightslategrey': '#778899',
  'lightsteelblue': '#b0c4de',
  'lightyellow': '#ffffe0',
  'lime': '#00ff00',
  'limegreen': '#32cd32',
  'linen': '#faf0e6',
  'magenta': '#ff00ff',
  'maroon': '#800000',
  'mediumaquamarine': '#66cdaa',
  'mediumblue': '#0000cd',
  'mediumorchid': '#ba55d3',
  'mediumpurple': '#9370db',
  'mediumseagreen': '#3cb371',
  'mediumslateblue': '#7b68ee',
  'mediumspringgreen': '#00fa9a',
  'mediumturquoise': '#48d1cc',
  'mediumvioletred': '#c71585',
  'midnightblue': '#191970',
  'mintcream': '#f5fffa',
  'mistyrose': '#ffe4e1',
  'moccasin': '#ffe4b5',
  'navajowhite': '#ffdead',
  'navy': '#000080',
  'oldlace': '#fdf5e6',
  'olive': '#808000',
  'olivedrab': '#6b8e23',
  'orange': '#ffa500',
  'orangered': '#ff4500',
  'orchid': '#da70d6',
  'palegoldenrod': '#eee8aa',
  'palegreen': '#98fb98',
  'paleturquoise': '#afeeee',
  'palevioletred': '#db7093',
  'papayawhip': '#ffefd5',
  'peachpuff': '#ffdab9',
  'peru': '#cd853f',
  'pink': '#ffc0cb',
  'plum': '#dda0dd',
  'powderblue': '#b0e0e6',
  'purple': '#800080',
  'rebeccapurple': '#663399',
  'red': '#ff0000',
  'rosybrown': '#bc8f8f',
  'royalblue': '#4169e1',
  'saddlebrown': '#8b4513',
  'salmon': '#fa8072',
  'sandybrown': '#f4a460',
  'seagreen': '#2e8b57',
  'seashell': '#fff5ee',
  'sienna': '#a0522d',
  'silver': '#c0c0c0',
  'skyblue': '#87ceeb',
  'slateblue': '#6a5acd',
  'slategray': '#708090',
  'slategrey': '#708090',
  'snow': '#fffafa',
  'springgreen': '#00ff7f',
  'steelblue': '#4682b4',
  'tan': '#d2b48c',
  'teal': '#008080',
  'thistle': '#d8bfd8',
  'tomato': '#ff6347',
  'turquoise': '#40e0d0',
  'violet': '#ee82ee',
  'wheat': '#f5deb3',
  'white': '#ffffff',
  'whitesmoke': '#f5f5f5',
  'yellow': '#ffff00',
  'yellowgreen': '#9acd32',
};

export const fromHEXToColor = {
  '#f0f8ff': 'aliceblue',
  '#faebd7': 'antiquewhite',
  '#00ffff': 'cyan',
  '#7fffd4': 'aquamarine',
  '#f0ffff': 'azure',
  '#f5f5dc': 'beige',
  '#ffe4c4': 'bisque',
  '#000000': 'black',
  '#ffebcd': 'blanchedalmond',
  '#0000ff': 'blue',
  '#8a2be2': 'blueviolet',
  '#a52a2a': 'brown',
  '#deb887': 'burlywood',
  '#5f9ea0': 'cadetblue',
  '#7fff00': 'chartreuse',
  '#d2691e': 'chocolate',
  '#ff7f50': 'coral',
  '#6495ed': 'cornflowerblue',
  '#fff8dc': 'cornsilk',
  '#dc143c': 'crimson',
  '#00008b': 'darkblue',
  '#008b8b': 'darkcyan',
  '#b8860b': 'darkgoldenrod',
  '#a9a9a9': 'darkgrey',
  '#006400': 'darkgreen',
  '#bdb76b': 'darkkhaki',
  '#8b008b': 'darkmagenta',
  '#556b2f': 'darkolivegreen',
  '#ff8c00': 'darkorange',
  '#9932cc': 'darkorchid',
  '#8b0000': 'darkred',
  '#e9967a': 'darksalmon',
  '#8fbc8f': 'darkseagreen',
  '#483d8b': 'darkslateblue',
  '#2f4f4f': 'darkslategrey',
  '#00ced1': 'darkturquoise',
  '#9400d3': 'darkviolet',
  '#ff1493': 'deeppink',
  '#00bfff': 'deepskyblue',
  '#696969': 'dimgrey',
  '#1e90ff': 'dodgerblue',
  '#b22222': 'firebrick',
  '#fffaf0': 'floralwhite',
  '#228b22': 'forestgreen',
  '#ff00ff': 'magenta',
  '#dcdcdc': 'gainsboro',
  '#f8f8ff': 'ghostwhite',
  '#daa520': 'goldenrod',
  '#ffd700': 'gold',
  '#808080': 'grey',
  '#008000': 'green',
  '#adff2f': 'greenyellow',
  '#f0fff0': 'honeydew',
  '#ff69b4': 'hotpink',
  '#cd5c5c': 'indianred',
  '#4b0082': 'indigo',
  '#fffff0': 'ivory',
  '#f0e68c': 'khaki',
  '#fff0f5': 'lavenderblush',
  '#e6e6fa': 'lavender',
  '#7cfc00': 'lawngreen',
  '#fffacd': 'lemonchiffon',
  '#add8e6': 'lightblue',
  '#f08080': 'lightcoral',
  '#e0ffff': 'lightcyan',
  '#fafad2': 'lightgoldenrodyellow',
  '#d3d3d3': 'lightgrey',
  '#90ee90': 'lightgreen',
  '#ffb6c1': 'lightpink',
  '#ffa07a': 'lightsalmon',
  '#20b2aa': 'lightseagreen',
  '#87cefa': 'lightskyblue',
  '#778899': 'lightslategrey',
  '#b0c4de': 'lightsteelblue',
  '#ffffe0': 'lightyellow',
  '#00ff00': 'lime',
  '#32cd32': 'limegreen',
  '#faf0e6': 'linen',
  '#800000': 'maroon',
  '#66cdaa': 'mediumaquamarine',
  '#0000cd': 'mediumblue',
  '#ba55d3': 'mediumorchid',
  '#9370db': 'mediumpurple',
  '#3cb371': 'mediumseagreen',
  '#7b68ee': 'mediumslateblue',
  '#00fa9a': 'mediumspringgreen',
  '#48d1cc': 'mediumturquoise',
  '#c71585': 'mediumvioletred',
  '#191970': 'midnightblue',
  '#f5fffa': 'mintcream',
  '#ffe4e1': 'mistyrose',
  '#ffe4b5': 'moccasin',
  '#ffdead': 'navajowhite',
  '#000080': 'navy',
  '#fdf5e6': 'oldlace',
  '#808000': 'olive',
  '#6b8e23': 'olivedrab',
  '#ffa500': 'orange',
  '#ff4500': 'orangered',
  '#da70d6': 'orchid',
  '#eee8aa': 'palegoldenrod',
  '#98fb98': 'palegreen',
  '#afeeee': 'paleturquoise',
  '#db7093': 'palevioletred',
  '#ffefd5': 'papayawhip',
  '#ffdab9': 'peachpuff',
  '#cd853f': 'peru',
  '#ffc0cb': 'pink',
  '#dda0dd': 'plum',
  '#b0e0e6': 'powderblue',
  '#800080': 'purple',
  '#663399': 'rebeccapurple',
  '#ff0000': 'red',
  '#bc8f8f': 'rosybrown',
  '#4169e1': 'royalblue',
  '#8b4513': 'saddlebrown',
  '#fa8072': 'salmon',
  '#f4a460': 'sandybrown',
  '#2e8b57': 'seagreen',
  '#fff5ee': 'seashell',
  '#a0522d': 'sienna',
  '#c0c0c0': 'silver',
  '#87ceeb': 'skyblue',
  '#6a5acd': 'slateblue',
  '#708090': 'slategrey',
  '#fffafa': 'snow',
  '#00ff7f': 'springgreen',
  '#4682b4': 'steelblue',
  '#d2b48c': 'tan',
  '#008080': 'teal',
  '#d8bfd8': 'thistle',
  '#ff6347': 'tomato',
  '#40e0d0': 'turquoise',
  '#ee82ee': 'violet',
  '#f5deb3': 'wheat',
  '#ffffff': 'white',
  '#f5f5f5': 'whitesmoke',
  '#ffff00': 'yellow',
  '#9acd32': 'yellowgreen',
};
