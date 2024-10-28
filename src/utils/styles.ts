import convexHull from 'ol-ext/geom/ConvexHull';
import FlowLine from 'ol-ext/style/FlowLine';
import Feature, {FeatureLike} from 'ol/Feature';
import {LineString, Point, Polygon} from 'ol/geom';
import {Circle, Fill, Icon, RegularShape, Text} from 'ol/style';
import {default as Stroke, default as StrokeStyle} from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import GeoJSON from 'ol/format/GeoJSON';
import {DEF_LINE_COLOR, TRACK_DIRECTIVE_ZINDEX, TRACK_ZINDEX} from '../readonly';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import RenderFeature, {toFeature} from 'ol/render/Feature';
import {Coordinate} from 'ol/coordinate';
import {containsCoordinate} from 'ol/extent';
import {ILAYER} from 'map-core/types/layer';

export interface handlingStrokeStyleWidthOptions {
  currentZoom: number;
  maxStrokeWidth?: number;
  maxZoom: number;
  minStrokeWidth?: number;
  minZoom: number;
  strokeStyle: StrokeStyle;
}

export function animateFeatureFn(mythis: any, feature: Feature, color, next = true) {
  function getAnimationStrokeStyle() {
    return new Style({
      stroke: new Stroke({
        color: hexToRgba(color ?? 'rgba(255, 255, 255, 0.9)'),
        width: 2,
        lineDash: [10, 20],
        lineDashOffset: feature.get('dashOffset'),
      }),
    });
  }
  var outlineStroke = new Style({
    stroke: new Stroke({
      color: [25, 25, 255, 0.8],
      width: 2,
    }),
  });
  function getStyle() {
    return [outlineStroke, getAnimationStrokeStyle()];
  }
  feature.setStyle(getStyle);
  setInterval(() => {
    let offset = feature.get('dashOffset') ?? 0;
    offset = offset == 8 ? 0 : next ? offset - 1 : offset + 1;
    feature.set('dashOffset', offset);
  }, 100);
  mythis.animatedLayer.getSource().addFeature(feature);
}

export function buildArrowStyle(
  lineString: LineString,
  opt: any = {
    featureStrokeColor: 'rgba(255, 255, 255, 0.9)',
    map: this.map,
    width: 3,
    circle: false,
  },
): Style[] {
  let size = 85;
  let scale = 0.2 - (17 - opt.map.getView().getZoom()) / 75;
  scale += opt.width / 60;
  let styles: Style[] = [];
  let mapSize: number[] = opt.map.getSize();
  let extent = null;
  let splitPoints = [];
  let n = 0;
  const resolution = opt.map.getView().getResolution();
  let properties = lineString.getProperties();
  if (properties.stroke_color && properties.stroke_color != '') {
    opt.featureStrokeColor = properties.stroke_color;
  }
  // TODO: momentaneo da eliminare quando tutte le app sono rigenerate
  if (properties.strokecolor && properties.strokecolor != '') {
    opt.featureStrokeColor = properties.strokecolor;
  }
  if (properties['layers'] != null) {
    const layers: number[] = JSON.parse(properties['layers']);
    const layerId = +layers[0];
    const color = getColorFromLayer(layerId, this.conf.layers);
    if (properties.stroke_color == null && properties.strokecolor == null) {
      opt.featureStrokeColor = color;
    }
  }
  try {
    n = lineString.getLength() / (size * resolution);
  } catch (e) {
    console.warn('WARNING: wrong geometry in feature ' + properties);
    return styles;
  }
  if (n < 2) return styles;
  if (n > 1000000) {
    n = Math.sqrt(n / 100);
    extent = opt.map.getView().calculateExtent([mapSize[0] * n, mapSize[1] * n]);
    splitPoints = splitLineString(lineString, size * resolution * n, {
      extent: extent,
      vertices: false,
    });
    lineString = new LineString(splitPoints);
  }
  extent = opt.map.getView().calculateExtent([mapSize[0] + size * 2, mapSize[1] + size * 2]);
  splitPoints = splitLineString(lineString, size * resolution, {
    alwaysUp: false,
    midPoints: true,
    extent: extent,
  });
  splitPoints.forEach(point => {
    styles.push(
      new Style({
        geometry: new Point([point[0], point[1]]),
        image: new Icon({
          src: 'map-core/assets/line-icon-arrow.png',
          scale: scale,
          rotation: point[2],
          color: opt.featureStrokeColor,
          rotateWithView: true,
        }),
        zIndex: TRACK_DIRECTIVE_ZINDEX + 10,
      }),
    );
    if (opt != null && opt.circle) {
      styles.push(
        new Style({
          geometry: new Point([point[0], point[1]]),
          image: new Circle({
            fill: new Fill({color: 'white'}), // Il colore della freccia
            radius: 10, // La dimensione del triangolo
            rotation: point[2] + Math.PI, // Orientamento della freccia
          }),
          zIndex: TRACK_DIRECTIVE_ZINDEX + 9,
        }),
      );
    }
  });

  return styles;
}

/**
 * @description
 * Builds a reference point style for a given feature.
 * This function takes a feature object and generates a new Style object for the reference point, based on
 * the 'ref' property in the feature's properties and the configuration settings for reference points.
 *
 * If the feature has a 'ref' property and the 'ref_on_track_show' configuration option is set to true, a new
 * Text object will be generated with the text value of the 'ref' property. The font, placement, and other
 * styling options for the Text object will be set based on the configuration settings.
 *
 * If the feature does not have a 'ref' property or the 'ref_on_track_show' configuration option is set to
 * false, the function will return a new Style object with an empty Text object and default styling options.
 *
 * Note that this function is bound to a `this` context, so the calling object should be of the correct type.
 *
 * @param feature - The feature object to generate a reference point style for.
 * @returns A new Style object for the reference point.
 *
 * @example
 * const feature = new Feature(new Point([0, 0]));
 * feature.setProperties({ref: 'A'});
 * const style = buildRefStyle.bind(this)(feature);
 */
export function buildRefStyle(
  lineString: LineString,
  opt: any = {map: this.map, featureStrokeColor: 'rgba(255, 255, 255, 0.9)'},
): Style[] {
  let size = 450;
  let styles: Style[] = [];
  let splitPoints = [];
  let mapSize: number[] = opt.map.getSize();
  let n = 0;
  let extent = null;
  const resolution = opt.map.getView().getResolution();
  const properties = lineString.getProperties();
  if (properties['layers'] != null) {
    const layers: number[] = JSON.parse(properties['layers']);
    const layerId = +layers[0];
    const color = getColorFromLayer(layerId, this.conf.layers);
    opt.featureStrokeColor =
      properties.strokeColor && properties.strokeColor != '' ? properties.strokeColor : color;
  }
  try {
    n = lineString.getLength() / (size * resolution);
  } catch (e) {
    console.warn('WARNING: wrong geometry in feature ' + properties);
    return styles;
  }
  if (n > 1000000) {
    n = Math.sqrt(n / 100);
    extent = this._view.calculateExtent([mapSize[0] * n, mapSize[1] * n]);
    splitPoints = this._splitLineString(lineString, size * resolution * n, {
      extent: extent,
      vertices: false,
    });
    lineString = new LineString(splitPoints);
  }
  extent = opt.map.getView().calculateExtent([mapSize[0] + size * 2, mapSize[1] + size * 2]);
  splitPoints = splitLineString(lineString, size * resolution, {
    alwaysUp: false,
    midPoints: true,
    extent: extent,
  });
  splitPoints.forEach(point => {
    if (Math.abs(point[2]) > Math.PI / 2) point[2] += Math.PI;
    styles.push(
      new Style({
        geometry: new Point([point[0], point[1]]),
        text: new Text({
          font: 'bold 14px "Open Sans", "Arial Unicode MS", "sans-serif"',
          placement: 'point',
          rotateWithView: false, //true,
          rotation: 0, //point[2],
          text: properties.ref != null && this.conf.ref_on_track_show ? properties.ref : '',
          overflow: false,
          // textBaseline: "bottom",
          fill: new Fill({
            color: opt.featureStrokeColor,
          }),
          stroke: new Stroke({
            color: '#fff',
            width: 4,
          }),
        }),
        zIndex: TRACK_DIRECTIVE_ZINDEX + 11,
      }),
    );
  });

  return styles;
}

/**
 * @description
 * Builds start and end point icons for a given geometry.
 * This function takes a geometry object and generates a new array of Style objects for the start and end point icons.
 * The start point icon is a green hexagon shape and the end point icon is a red hexagon shape with a larger radius.
 * Both icons are centered on the first and last points of the geometry, respectively.
 *
 * Note that this function does not handle any error checking or validation on the input geometry object. It is
 * assumed that the geometry object is a valid format and can be used to generate point icons.
 *
 * @param geometry - The geometry object to generate start and end point icons for.
 * @returns An array of new Style objects for the start and end point icons.
 *
 * @example
 * const geometry = new LineString([[0, 0], [1, 1], [2, 0]]);
 * const styles = buildStartEndIcons(geometry);
 * // styles will contain an array of 2 Style objects for the start and end point icons.
 */
export function buildStartEndIcons(geometry: string | any[]): Style[] {
  const start = [geometry[0], geometry[1]];
  const end = [geometry[geometry.length - 2], geometry[geometry.length - 1]];

  return [
    new Style({
      geometry: new Point(start),
      image: new RegularShape({
        fill: new Fill({
          color: 'green',
        }),
        stroke: new Stroke({
          color: 'white',
        }),
        points: 6,
        radius: 6,
      }),
      zIndex: TRACK_ZINDEX + 2,
    }),
    new Style({
      geometry: new Point(end),
      image: new RegularShape({
        fill: new Fill({
          color: 'red',
        }),
        stroke: new Stroke({
          color: 'white',
        }),
        points: 6,
        radius: 10,
        angle: 0,
      }),
      zIndex: TRACK_ZINDEX + 1,
    }),
  ];
}

/**
 * @description
 * Returns the style for a cluster hull based on its features' geometries.
 *
 * @param cluster - The cluster object to style.
 * @returns A new Style object for the cluster hull.
 *
 * @example
 * const cluster = new Cluster({
 *   features: [
 *     new Feature(new Point([0, 0])),
 *     new Feature(new Point([1, 1])),
 *     new Feature(new Point([2, 0]))
 *   ]
 * });
 * const style = clusterHullStyle(cluster);
 */
export function clusterHullStyle(cluster) {
  if (cluster != currentCluster || cluster == null) {
    return;
  }
  const originalFeatures = cluster.get('features');
  const points = originalFeatures.map(
    (feature: {
      getGeometry: () => {(): any; new (): any; getCoordinates: {(): any; new (): any}};
    }) => feature.getGeometry().getCoordinates(),
  );
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

/**
 * @description
 * This function generates and returns an OpenLayers style object based on the features and resolution provided.
 * The style object is applied to cluster features on an OpenLayers map.
 *
 * @param {object} feature - An object representing a cluster feature, containing the following methods:
 *                            - get: a function that takes a string as an argument and returns the value of the property with that name
 *                            - getProperties: a function that returns an object containing the feature's properties
 * @param {*} resolution - The current resolution of the map. This parameter is not used in the function, but it can be useful for custom styling based on zoom level.
 *
 * @returns {Style} An OpenLayers Style object that can be used to style cluster features on an OpenLayers map.
 */
export function getClusterStyle(
  feature: {
    get: (arg0: string) => {(): any; new (): any; length: any};
    getProperties: () => {(): any; new (): any; features: any[]};
  },
  resolution: any,
) {
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

/**
 * @description
 * This function takes a layer ID and an optional array of layer objects (ILAYER[]). It searches for the layer with the
 * specified ID within the layers array and returns the color property of the layer's style object.
 * If the layer is not found, the function returns the default line color (DEF_LINE_COLOR).
 * @export
 * @param {number} id - The ID of the layer whose color should be retrieved.
 * @param {ILAYER[]} [layers=[]] - An optional array of layer objects. If not provided, an empty array will be used.
 * @returns {string} - The color property of the layer's style object, or the default line color if the layer is not found.
 * @example
 * // Example usage with an array of layer objects
 * const layers = [
 * {id: 1, style: {color: 'red'}},
 * {id: 2, style: {color: 'blue'}}
 * ];
 * const color = getColorFromLayer(1, layers); // Returns 'red'
 * // Example usage without an array of layer objects
 * const color = getColorFromLayer(1); // Returns DEF_LINE_COLOR
 */
export function getColorFromLayer(id: number, layers: ILAYER[] = []): string {
  const layer = layers.filter(l => +l.id === +id);
  return layer[0] && layer[0].style && layer[0].style['color']
    ? layer[0].style['color']
    : DEF_LINE_COLOR;
}

/**
 * @description
 * This function creates and returns an ol-ext/style/FlowLine style object that represents a flow-style line in an OpenLayers map.
 * The function takes two optional parameters, orangeTreshold and redTreshold, which are numeric values representing altitude thresholds.
 * If these parameters are not provided, their default values are set to 800 and 1500, respectively.
 *
 * The function initializes a FlowLine object with the following properties:
 *  - lineCap: 'butt'
 *  - color: a function that takes a feature 'f' and a step value as arguments, calculates the current altitude based on the feature's geometry and step value, and returns a color ('green', 'orange', or 'red') depending on the altitude.
 *  - width: 10
 *
 * @export
 * @param {number} [orangeTreshold=800] - The altitude threshold for the orange color.
 * @param {number} [redTreshold=1500] - The altitude threshold for the red color.
 * @returns {FlowLine} A FlowLine style object with the specified properties.
 * @example
 * const flowStyle = getFlowStyle();
 * const customFlowStyle = getFlowStyle(900, 1800);
 */
export function getFlowStyle(orangeTreshold = 800, redTreshold = 1500) {
  return new FlowLine({
    lineCap: 'butt',
    color: function (
      f: {getGeometry: () => {(): any; new (): any; getCoordinates: {(): any; new (): any}}},
      step: number,
    ) {
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

export function getLineStringFromRenderFeature(rfeature: RenderFeature): LineString {
  const flatCoordinates: number[] = rfeature.getFlatCoordinates();

  // Crea la LineString dalle coordinate piatte
  const lineString = new LineString([]);
  lineString.setFlatCoordinates('XY', flatCoordinates);
  return lineString;
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
export function getLineStyle(color = '255, 177, 0', linestring?: any): Style[] {
  const style: Style[] = [];
  const strokeWidth: number = 6;
  const strokeOpacity: number = 1;
  const lineDash: Array<number> = [];
  const lineCap: CanvasLineCap = 'round';

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
      zIndex: TRACK_DIRECTIVE_ZINDEX + 1,
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
      zIndex: TRACK_DIRECTIVE_ZINDEX + 2,
    }),
  );
  if (this != null && this.mapCmp != null) {
    style.push(
      ...buildArrowStyle.bind(this)(linestring, {
        featureStrokeColor: color,
        width: 2,
        map: this.mapCmp.map,
        circle: true,
      }),
    );
  }

  return style;
}

export function handlingStrokeStyleWidth(options: handlingStrokeStyleWidthOptions): void {
  options = {...{minStrokeWidth: 3, maxStrokeWidth: 6}, ...options};
  const delta = (options.currentZoom - options.minZoom) / (options.maxZoom - options.minZoom);
  const newWidth =
    options.minStrokeWidth + (options.maxStrokeWidth - options.minStrokeWidth) * delta;

  options.strokeStyle?.setWidth(newWidth);
}

export function hexToRgba(hex: string): [number, number, number, number] {
  const bigint = parseInt(hex.substring(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b, 1];
}

export function setCurrentCluster(cluster: null): void {
  currentCluster = cluster;
}

export function splitLineString(
  geometry: LineString,
  minSegmentLength: number,
  options: any,
): Array<any> {
  let calculatePointsDistance = (coord1: Coordinate, coord2: Coordinate): number => {
    let dx: number = coord1[0] - coord2[0];
    let dy: number = coord1[1] - coord2[1];
    return Math.sqrt(dx * dx + dy * dy);
  };

  let calculateSplitPointCoords = (
    startNode: Coordinate,
    nextNode: Coordinate,
    distanceBetweenNodes: number,
    distanceToSplitPoint: number,
  ): Coordinate => {
    let d: number = distanceToSplitPoint / distanceBetweenNodes;
    let x: number = nextNode[0] + (startNode[0] - nextNode[0]) * d;
    let y: number = nextNode[1] + (startNode[1] - nextNode[1]) * d;
    return [x, y];
  };

  let calculateAngle = (startNode: Coordinate, nextNode: Coordinate, alwaysUp: boolean): number => {
    let x: number = nextNode[0] - startNode[0];
    let y: number = nextNode[1] - startNode[1];
    let angle: number = Math.atan2(y, x);
    if (!alwaysUp) {
      angle =
        y < 0 && x < 0
          ? angle * -1
          : y < 0 && x == 0
          ? Math.PI * 2 - angle
          : y < 0 && x > 0
          ? angle * -1
          : angle * -1;
    }
    return angle;
  };

  let splitPoints: Array<any> = [];
  let coords: any = geometry.getCoordinates();
  if (coords.length === 0) {
    return;
  }
  let coordIndex: number = 0;
  let startPoint: Coordinate = coords[coordIndex];
  let nextPoint: Coordinate = coords[coordIndex + 1];
  let angle: number = options.vertices || calculateAngle(startPoint, nextPoint, options.alwaysUp);

  let n: number = Math.ceil(geometry.getLength() / minSegmentLength);
  let segmentLength: number = geometry.getLength() / n;
  let midPoints: boolean = options.midPoints && !options.vertices;
  let currentSegmentLength: number = midPoints ? segmentLength / 2 : segmentLength;

  for (let i = 0; i <= n; i++) {
    let distanceBetweenPoints: number = calculatePointsDistance(startPoint, nextPoint);
    currentSegmentLength += distanceBetweenPoints;

    if (currentSegmentLength < segmentLength) {
      coordIndex++;
      if (coordIndex < coords.length - 1) {
        startPoint = coords[coordIndex];
        nextPoint = coords[coordIndex + 1];
        angle = options.vertices || calculateAngle(startPoint, nextPoint, options.alwaysUp);
        if (
          options.vertices &&
          (!options.extent || containsCoordinate(options.extent, startPoint))
        ) {
          splitPoints.push(startPoint);
        }
        i--;
        continue;
      } else {
        if (!midPoints) {
          let splitPointCoords: Coordinate = nextPoint;
          if (!options.extent || containsCoordinate(options.extent, splitPointCoords)) {
            if (!options.vertices) {
              splitPointCoords.push(angle);
            }
            splitPoints.push(splitPointCoords);
          }
        }
        break;
      }
    } else {
      let distanceToSplitPoint: number = currentSegmentLength - segmentLength;
      let splitPointCoords: Coordinate = calculateSplitPointCoords(
        startPoint,
        nextPoint,
        distanceBetweenPoints,
        distanceToSplitPoint,
      );
      startPoint = splitPointCoords;
      if (!options.extent || containsCoordinate(options.extent, splitPointCoords)) {
        if (!options.vertices) {
          splitPointCoords.push(angle);
        }
        splitPoints.push(splitPointCoords);
      }
      currentSegmentLength = 0;
    }
  }

  return splitPoints;
}

/**
 * @description
 * Core function for generating feature styles.
 * This function takes a FeatureLike object and generates an array of Style objects based on its properties
 * and geometry. It first extracts the feature's properties, geometry and layer IDs from the FeatureLike object,
 * and then calculates the appropriate stroke color based on the current layer selection or layer ID.
 *
 * The function then uses the `handlingStrokeStyleWidth` function to adjust the stroke width based on the current
 * zoom level of the map. Finally, it generates an array of Style objects for the feature, including the main
 * stroke style, and any additional start/end icons or reference point styles based on configuration options.
 *
 * Note that this function is bound to a `this` context, so the calling object should be of the correct type.
 *
 * @param feature - The feature object to generate a style for.
 * @returns An array of new Style objects for the given feature.
 * @example
 * const feature = new Feature(new LineString([[0, 0], [1, 1], [2, 0]]));
 * const styles = styleCoreFn(feature);
 */
export function styleCoreFn(this: any, feature: RenderFeature, routing?: boolean) {
  const properties = feature.getProperties();
  let maxWidth = this.conf.maxStrokeWidth;
  let minStrokeWidth = this.minStrokeWidth;
  let enableRouting = false;
  const geometry: any = (feature.getGeometry() as any).getFlatCoordinates();
  const layers: number[] = properties['layers'] ? JSON.parse(properties['layers']) : [];
  const currentZoom = this.map.getView().getZoom();
  let strokeStyle = cacheStyle['noColor'];
  let featureStrokeColor =
    properties.stroke_color && properties.stroke_color != '' ? properties.stroke_color : null;
  // TODO: da eliminare quando tutte le app sono rigenerate
  if (properties.strokecolor != null) {
    featureStrokeColor = properties.strokecolor;
  }
  if (featureStrokeColor) {
    if (cacheStyle[featureStrokeColor] != null) {
      strokeStyle = cacheStyle[featureStrokeColor];
    } else if (featureStrokeColor != null) {
      cacheStyle[featureStrokeColor] = new StrokeStyle();
      cacheStyle[featureStrokeColor].setColor(featureStrokeColor);
      strokeStyle = cacheStyle[featureStrokeColor];
    }
  }
  if (this.currentLayer != null) {
    const currentIDLayer = +this.currentLayer.id;
    if (layers.indexOf(currentIDLayer) >= 0) {
      const color = this.currentLayer?.style?.color;
      if (color != null) {
        cacheStyle[currentIDLayer] = new StrokeStyle();
        cacheStyle[currentIDLayer].setColor(color);
        strokeStyle = cacheStyle[featureStrokeColor] ?? cacheStyle[currentIDLayer];
      } else if (strokeStyle == cacheStyle['noColor']) {
        strokeStyle = cacheStyle['red'];
      }
    } else {
      strokeStyle = cacheStyle['noColor'];
    }
    enableRouting =
      routing &&
      this.currentLayer != null &&
      this.currentLayer.edges != null &&
      this.currentTrack != null;
    if (enableRouting) {
      minStrokeWidth += 2;
      maxWidth = 40;

      if (this.animatedLayer == null) {
        this.animatedLayer = new VectorLayer({
          source: new VectorSource({
            format: new GeoJSON(),
          }),
          zIndex: 100,
          updateWhileAnimating: true,
          updateWhileInteracting: true,
        });
        this.map.addLayer(this.animatedLayer);
      }
      const edges = this.currentLayer.edges;
      const currentTrackOfLayer = properties.id;
      if (currentTrackID != this.currentTrack.properties.id) {
        currentTrackID = this.currentTrack.properties.id;
        if (this.animatedLayer != null) {
          this.animatedLayer.getSource().clear();
        }
      }
      if (edges[currentTrackID] != null) {
        const edgesOfCurrentTrack = edges[currentTrackID];
        const nextIndex = edgesOfCurrentTrack.next.indexOf(currentTrackOfLayer);
        minStrokeWidth += 2;
        if (nextIndex > -1) {
          const nextColor = nextColors[nextIndex % nextColors.length];
          strokeStyle.setColor(nextColor);
          animateFeatureFn(this, toFeature(feature), nextColor);
        }
        const prevIndex = edgesOfCurrentTrack.prev.indexOf(currentTrackOfLayer);
        if (prevIndex > -1) {
          const prevColor = prevColors[prevIndex % prevColors.length];
          strokeStyle.setColor(prevColor);
          animateFeatureFn(this, toFeature(feature), prevColor, false);
        }
        if (currentTrackOfLayer === currentTrackID) {
          strokeStyle = cacheStyle['red'];
        }
      }
    } else {
      currentTrackID = null;
      if (this.animatedLayer != null) {
        this.animatedLayer.getSource().clear();
      }
    }
  } else if (featureStrokeColor == null) {
    const layerId = +layers[0];
    const color = getColorFromLayer(layerId, this.conf.layers);
    if (cacheStyle[color] != null) {
      strokeStyle = cacheStyle[color];
    } else {
      cacheStyle[color] = new StrokeStyle({color});
      strokeStyle = cacheStyle[color];
    }
  }

  if (this.filters != null && this.filters.filterTracks.length > 0) {
    this.filters.filterTracks.forEach(filter => {
      if (filter.type === 'slider') {
        const identifierValue = properties[filter.identifier];
        if (identifierValue != null) {
          if (
            (filter.lower != null && identifierValue < filter.lower) ||
            (filter.upper != null && identifierValue > filter.upper)
          ) {
            strokeStyle = cacheStyle['noColor'];
          }
        }
      }
      if (filter.type == null && filter.taxonomy != null) {
        if (
          filter.taxonomy != null &&
          properties[filter.taxonomy] != null &&
          properties[filter.taxonomy].indexOf(filter.identifier) < 0
        ) {
          strokeStyle = cacheStyle['noColor'];
        }
      }
    });
  } else {
    const searchable = `${JSON.stringify(properties?.name ?? '')}${properties?.searchable ?? ''}`;
    if (
      this.inputTyped != null &&
      this.inputTyped != '' &&
      searchable != '' &&
      searchable.toLowerCase().indexOf(this.inputTyped.toLocaleLowerCase()) < 0
    ) {
      strokeStyle = cacheStyle['noColor'];
    }
  }

  const opt: handlingStrokeStyleWidthOptions = {
    strokeStyle,
    minZoom: this.conf.minZoom,
    maxZoom: this.conf.maxZoom,
    minStrokeWidth,
    maxStrokeWidth: this.conf.maxStrokeWidth,
    currentZoom,
  };
  handlingStrokeStyleWidth(opt);

  let styles = [
    new Style({
      stroke: strokeStyle,
      zIndex: TRACK_ZINDEX + 1,
    }),
  ];
  if (strokeStyle?.getColor() != 'rgba(0,0,0,0)') {
    if (this.conf.start_end_icons_show && currentZoom > this.conf.start_end_icons_min_zoom) {
      styles = [...styles, ...buildStartEndIcons(geometry)];
    }
    if (this.conf.ref_on_track_show && currentZoom > this.conf.ref_on_track_min_zoom) {
      const lineString = getLineStringFromRenderFeature(feature);
      lineString.setProperties(feature.getProperties());
      styles = [...styles, ...buildRefStyle.bind(this)(lineString, {map: this.map})];
    }
    if (currentZoom > 11 && enableRouting === false) {
      const lineString = getLineStringFromRenderFeature(feature);
      lineString.setProperties(feature.getProperties());
      styles = [
        ...styles,
        ...buildArrowStyle.bind(this)(lineString, {
          map: this.map,
          width: strokeStyle.getWidth() - 1,
        }),
      ];
    }
  }
  return styles;
}

/**
 * @description
 * Generates a style for a given feature object.
 * This function generates a new Style object for a given feature object with a stroke style based on the current layer configuration
 * and a zIndex value of TRACK_ZINDEX + 1. This is useful for displaying a consistent visual style for features on a map based on
 * the current layer configuration.
 *
 * Note that this function is intended to be bound to a `this` context object that contains properties for the current layer, the
 * default feature color, the configuration settings, and the current map view. It is not intended to be used standalone.
 *
 * @param feature - The feature object to generate a style for.
 * @returns A new Style object for the given feature object with a stroke style based on the current layer configuration and a zIndex value of TRACK_ZINDEX + 1.
 *
 * @example
 * const feature = new Feature(new Point([0, 0]));
 * const style = styleFn.bind(this)(feature);
 * // style will contain a new Style object with a stroke style based on the current layer configuration and a zIndex value of TRACK_ZINDEX + 1.
 */
export function styleFn(this: any, feature: FeatureLike) {
  const properties = feature.getProperties();
  const layers: number[] = JSON.parse(properties['layers']);
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

  let styles = [
    new Style({
      stroke: strokeStyle,
      zIndex: TRACK_ZINDEX + 1,
    }),
  ];

  return styles;
}

/**
 * @description
 * Generates a high style for a given feature object.
 * This function generates a new Style object for a given feature object with a higher zIndex value and a slightly increased
 * stroke width value. This is useful for displaying high-priority features on a map with a different visual style than lower
 * priority features.
 *
 * Note that this function is intended to be bound to a `this` context object that contains properties for the TRACK_ZINDEX,
 * the minimum stroke width, and configuration settings. It is not intended to be used standalone.
 *
 * @param feature - The feature object to generate a style for.
 * @returns A new Style object for the given feature object with a higher zIndex and a slightly increased stroke width.
 *
 * @example
 * const feature = new Feature(new Point([0, 0]));
 * const highStyle = styleHighFn.bind(this)(feature);
 * // highStyle will contain a new Style object with a higher zIndex and slightly increased stroke width.
 */
export function styleHighFn(this: any, feature: FeatureLike) {
  this.TRACK_ZINDEX = TRACK_ZINDEX;
  this.minStrokeWidth = this.conf.minStrokeWidth + 1;
  return styleCoreFn.bind(this)(feature, true);
}

/**
 * @description
 * Generates a Mapbox Style JSON object to style vector layers in OpenLayers.
 * This style JSON object includes layer styles for different CAI scales ('EEA', 'EE', 'E', 'T').
 * It also includes a text label layer to display the 'ref' property of each feature.
 *
 * @param {string} vectorLayerUrl The URL of the vector layer source.
 * @returns {object} A Mapbox Style JSON object.
 *
 * @example
 * const styleJson = styleJsonFn("https://example.com/vector-layer-url");
 */
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
 * Generates a low style for a given feature object.
 * This function generates a new Style object for a given feature object with a lower zIndex value and a slightly increased
 * stroke width value. This is useful for displaying low-priority features on a map with a different visual style than higher
 * priority features.
 *
 * Note that this function is intended to be bound to a `this` context object that contains properties for the TRACK_ZINDEX,
 * the minimum stroke width, and configuration settings. It is not intended to be used standalone.
 *
 * @param feature - The feature object to generate a style for.
 * @returns A new Style object for the given feature object with a lower zIndex and a slightly increased stroke width.
 *
 * @example
 * const feature = new Feature(new Point([0, 0]));
 * const lowStyle = styleLowFn.bind(this)(feature);
 * // lowStyle will contain a new Style object with a lower zIndex and slightly increased stroke width.
 */
export function styleLowFn(this: any, feature: FeatureLike) {
  this.TRACK_ZINDEX = TRACK_ZINDEX + 1;
  this.minStrokeWidth = this.conf.minStrokeWidth + 1;
  return styleCoreFn.bind(this)(feature);
}

export var currentTrackID = null;
export const cacheStyle = {
  'noColor': new StrokeStyle({color: 'rgba(0,0,0,0)'}),
  'red': new StrokeStyle({color: 'red'}),
};
export let currentCluster = null;
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
export const nextColors = [
  '#FFF500',
  '#FFA13D',
  '#2DFE54',
  '#3F8DFF',
  '#FFD700',
  '#FF8A00',
  '#1DE43F',
  '#0066FF',
];
export const prevColors = [
  '#B0B0B0',
  '#8DAFD3',
  '#88C5A7',
  '#E9B1C2',
  '#A0A0A0',
  '#7D9DC3',
  '#78B597',
  '#D9A1B2',
];
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
