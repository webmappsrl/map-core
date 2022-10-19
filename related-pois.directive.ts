import {DEF_LINE_COLOR, DEF_MAP_CLUSTER_CLICK_TOLERANCE} from './constants';
import {Directive, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';

import {Coordinate} from 'ol/coordinate';
import {FLAG_TRACK_ZINDEX} from './zIndex';
import Feature from 'ol/Feature';
import {FitOptions} from 'ol/View';
import Geometry from 'ol/geom/Geometry';
import {IGeojsonFeature} from 'src/app/types/model';
import Icon from 'ol/style/Icon';
import Map from 'ol/Map';
import MapBrowserEvent from 'ol/MapBrowserEvent';
import {PoiMarker} from 'src/app/classes/features/cgeojson-feature';
import Point from 'ol/geom/Point';
import Style from 'ol/style/Style';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {WmMapBaseDirective} from './base.directive';
import {buffer} from 'ol/extent';
import {fromLonLat} from 'ol/proj';
import {logoBase64} from 'src/assets/logoBase64';

@Directive({
  selector: '[wmMapRelatedPois]',
})
export class WmMapRelatedPoisDirective extends WmMapBaseDirective implements OnChanges {
  private _defaultFeatureColor = DEF_LINE_COLOR;
  private _initPois;
  private _poiMarkers: PoiMarker[] = [];
  private _poisLayer: VectorLayer;
  private _selectedPoiLayer: VectorLayer;
  private _selectedPoiMarker: PoiMarker;

  @Input() conf: IMAP;
  @Input() map: Map;
  @Input() track;
  @Output('related-poi-click') poiClick: EventEmitter<number> = new EventEmitter<number>();

  @Input('poi') set setPoi(id: number) {
    if (id === -1 && this._selectedPoiLayer != null) {
      this.map.removeLayer(this._selectedPoiLayer);
      this._selectedPoiLayer = undefined;
    } else {
      const currentPoi = this._poiMarkers.find(p => +p.id === +id);
      if (currentPoi != null) {
        this._fitView(currentPoi.icon.getGeometry() as any);
        this._selectCurrentPoi(currentPoi);
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['map'] != null &&
      changes['map'].currentValue != null &&
      changes['map'].previousValue == null
    ) {
      this.map.on('click', event => {
        try {
          const poiFeature = this._getNearestFeatureOfLayer(this._poisLayer, event);
          if (poiFeature) {
            this.map.getInteractions().forEach(i => i.setActive(false));
            const currentID = +poiFeature.getId() || -1;
            this.poiClick.emit(currentID);
            setTimeout(() => {
              this.map.getInteractions().forEach(i => i.setActive(true));
            }, 1200);
          }
        } catch (e) {
          console.log(e);
        }
      });
    }
    const resetCondition =
      (changes['track'] &&
        changes['track'].previousValue != null &&
        changes['track'].currentValue != null &&
        changes['track'].previousValue.properties.id !=
          changes['track'].currentValue.properties.id) ??
      false;
    if (this.track == null || this.map == null || resetCondition) {
      this._resetView();
      this._initPois = false;
    }
    if (
      this.track != null &&
      this.track.properties != null &&
      this.track.properties.related_pois != null &&
      this.map != null &&
      this._initPois === false
    ) {
      this._addPoisMarkers(this.track.properties.related_pois);
      this._initPois = true;
    }
  }

  private _addIconToLayer(layer: VectorLayer, icon: Feature<Geometry>) {
    if (layer != null) {
      layer.getSource().addFeature(icon);
    }
  }

  private async _addPoisMarkers(poiCollection: Array<IGeojsonFeature>) {
    this._poisLayer = this._createLayer(this._poisLayer, FLAG_TRACK_ZINDEX);
    for (let i = this._poiMarkers?.length - 1; i >= 0; i--) {
      const ov = this._poiMarkers[i];
      if (!poiCollection?.find(x => x.properties.id + '' === ov.id)) {
        this._removeIconFromLayer(this._poisLayer, ov.icon);
        this._poiMarkers.splice(i, 1);
      }
    }
    if (poiCollection) {
      for (const poi of poiCollection) {
        if (
          !this._poiMarkers?.find(
            x => x.id === poi.properties.id + '' && poi.properties?.feature_image?.sizes,
          )
        ) {
          const {marker} = await this._createPoiCanvasIcon(poi);
          this._addIconToLayer(this._poisLayer, marker.icon);
          this._poiMarkers.push(marker);
        }
      }
    }
  }

  private async _createCanvasForHtml(html: string, size: number): Promise<HTMLImageElement> {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions

    const canvasHtml =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      '<foreignObject width="100%" height="100%">' +
      '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size:40px">' +
      html +
      '</div>' +
      '</foreignObject>' +
      '</svg>';

    const domUrl = window.URL; // || window.webkitURL || window;

    const img = new Image();
    const svg = new Blob([canvasHtml], {
      type: 'image/svg+xml', //;charset=utf-8',
    });
    const url = domUrl.createObjectURL(svg);

    img.onload = () => {
      domUrl.revokeObjectURL(url);
    };
    img.src = url;

    return img;
  }

  private async _createIconFeature(
    coordinates: number[],
    img: HTMLImageElement,
    size: number,
    transparent: boolean = false,
    anchor: number[] = [0.5, 0.5],
  ): Promise<{iconFeature: Feature<Geometry>; style: Style}> {
    if (!coordinates) {
      return;
    }
    const position = fromLonLat([coordinates[0] as number, coordinates[1] as number]);

    const iconFeature = new Feature({
      type: 'icon',
      geometry: new Point([position[0], position[1]]),
    });
    const style = new Style({
      image: new Icon({
        anchor,
        img,
        imgSize: [size, size],
        opacity: transparent ? 0.5 : 1,
      }),
    });

    iconFeature.setStyle(style);

    return {iconFeature, style};
  }

  private _createLayer(layer: VectorLayer, zIndex: number) {
    if (!layer) {
      layer = new VectorLayer({
        source: new VectorSource({
          features: [],
        }),
        updateWhileAnimating: true,
        updateWhileInteracting: true,
        zIndex,
      });
      this.map.addLayer(layer);
    }
    return layer;
  }

  private async _createPoiCanvasIcon(
    poi: any,
    geometry = null,
    selected = false,
  ): Promise<{marker: PoiMarker; style: Style}> {
    const img = await this._createPoiCavasImage(poi, selected);
    const {iconFeature, style} = await this._createIconFeature(
      geometry
        ? geometry
        : [poi.geometry.coordinates[0] as number, poi.geometry.coordinates[1] as number],
      img,
      46,
    );
    iconFeature.setId(poi.properties.id);
    return {
      marker: {
        poi,
        icon: iconFeature,
        id: poi.properties.id + '',
      },
      style,
    };
  }

  private async _createPoiCavasImage(
    poi: IGeojsonFeature,
    selected = false,
  ): Promise<HTMLImageElement> {
    const htmlTextCanvas = await this._createPoiMarkerHtmlForCanvas(poi, selected);
    return this._createCanvasForHtml(htmlTextCanvas, 46);
  }

  private async _createPoiMarkerHtmlForCanvas(
    value: IGeojsonFeature,
    selected = false,
  ): Promise<string> {
    let img1b64: string | ArrayBuffer = logoBase64;
    const url = value.properties?.feature_image?.sizes['108x137'];
    if (url) {
      img1b64 = await this._downloadBase64Img(url);
    }

    let html = `
    <div class="webmapp-map-poimarker-container" style="position: relative;width: 30px;height: 60px;">`;

    html += `
        <svg width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style=" position: absolute;  width: 46px;  height: 46px;  left: 0px;  top: 0px;">
          <circle opacity="${selected ? 1 : 0.2}" cx="23" cy="23" r="23" fill="${
      this._defaultFeatureColor
    }"/>
          <rect x="5" y="5" width="36" height="36" rx="18" fill="url(#img)" stroke="white" stroke-width="2"/>
          <defs>
            <pattern height="100%" width="100%" patternContentUnits="objectBoundingBox" id="img">
              <image height="1" width="1" preserveAspectRatio="xMidYMid slice" xlink:href="${img1b64}">
              </image>
            </pattern>
          </defs>
        </svg>`;
    html += ` </div>`;

    return html;
  }

  private _distance(c1: Coordinate, c2: Coordinate) {
    return Math.sqrt(Math.pow(c1[0] - c2[0], 2) + Math.pow(c1[1] - c2[1], 2));
  }

  private async _downloadBase64Img(url): Promise<string | ArrayBuffer> {
    const opt = {};
    const data = await fetch(url, opt);
    const blob = await data.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      try {
        reader.onloadend = () => {
          const base64data = reader.result;
          resolve(base64data);
        };
      } catch (error) {
        resolve('');
      }
    });
  }

  private _fitView(geometryOrExtent: any, optOptions?: FitOptions): void {
    if (optOptions == null) {
      const size = this.map.getSize();
      const height = size != null && size.length > 0 ? size[1] : 0;
      optOptions = {
        maxZoom: this.map.getView().getZoom(),
        duration: 500,
        size,
      };
    }
    this.map.getView().fit(geometryOrExtent, optOptions);
  }

  private _getNearest(features: Feature<Geometry>[], coordinate: Coordinate) {
    let ret: Feature<Geometry> = features[0];
    let minDistance = Number.MAX_VALUE;
    features.forEach(feature => {
      const geom = feature.getGeometry() as Point;
      const distance = this._distance(geom.getFlatCoordinates(), coordinate);
      if (distance < minDistance) {
        minDistance = distance;
        ret = feature;
      }
    });
    return ret;
  }

  private _getNearestFeatureOfLayer(
    layer: VectorLayer,
    evt: MapBrowserEvent<UIEvent>,
  ): Feature<Geometry> {
    const precision = this.map.getView().getResolution() * DEF_MAP_CLUSTER_CLICK_TOLERANCE;
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

    if (features.length) {
      nearestFeature = this._getNearest(features, evt.coordinate);
    }

    return nearestFeature;
  }

  private _removeIconFromLayer(layer: VectorLayer, icon: Feature<Geometry>) {
    const source = layer.getSource();
    if (source.hasFeature(icon)) {
      source.removeFeature(icon);
    }
  }

  private _resetView(): void {
    if (this._poisLayer != null) {
      this.map.removeLayer(this._poisLayer);
      this._poisLayer = undefined;
    }
    if (this._selectedPoiLayer != null) {
      this.map.removeLayer(this._selectedPoiLayer);
      this._selectedPoiLayer = undefined;
    }
    if (this.map != null) {
      this.map.render();
    }
  }

  private async _selectCurrentPoi(poiMarker: PoiMarker) {
    if (this._selectedPoiMarker != null) {
      this.map.removeLayer(this._selectedPoiLayer);
      this._selectedPoiLayer = undefined;
    }
    this._selectedPoiLayer = this._createLayer(this._selectedPoiLayer, 999999999999999);
    this._selectedPoiMarker = poiMarker;
    const {marker} = await this._createPoiCanvasIcon(poiMarker.poi, null, true);
    this._addIconToLayer(this._selectedPoiLayer, marker.icon);
  }
}
