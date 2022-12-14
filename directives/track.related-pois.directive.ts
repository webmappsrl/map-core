import {
  Directive,
  EventEmitter,
  Host,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import {Subscription, BehaviorSubject} from 'rxjs';

import Feature from 'ol/Feature';
import Geometry from 'ol/geom/Geometry';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import Map from 'ol/Map';
import MapBrowserEvent from 'ol/MapBrowserEvent';
import {fromLonLat} from 'ol/proj';
import Icon from 'ol/style/Icon';
import Style from 'ol/style/Style';
import {FitOptions} from 'ol/View';

import {WmMapBaseDirective} from '.';
import {WmMapComponent} from '../components';
import {DEF_LINE_COLOR, FLAG_TRACK_ZINDEX, logoBase64} from '../readonly';
import {IGeojsonFeature, IMAP, PoiMarker} from '../types/model';
import {
  addFeatureToLayer,
  calculateNearestPoint,
  createCanvasForHtml,
  createLayer,
  downloadBase64Img,
  nearestFeatureOfLayer,
  removeFeatureFromLayer,
} from '../utils';
import VectorSource from 'ol/source/Vector';
import {preventDefault, stopPropagation} from 'ol/events/Event';

@Directive({
  selector: '[wmMapTrackRelatedPois]',
})
export class wmMapTrackRelatedPoisDirective
  extends WmMapBaseDirective
  implements OnChanges, OnDestroy
{
  private _defaultFeatureColor = DEF_LINE_COLOR;
  private _initPois;
  private _onClickSub: Subscription = Subscription.EMPTY;
  private _poiMarkers: PoiMarker[] = [];
  private _poisLayer: VectorLayer<VectorSource>;
  private _relatedPois: IGeojsonFeature[] = [];
  private _selectedPoiLayer: VectorLayer<VectorSource>;
  private _selectedPoiMarker: PoiMarker;

  @Input() set next(d) {
    if (this._selectedPoiLayer != null) {
      this.wmMapMap.removeLayer(this._selectedPoiLayer);
    }
  }

  @Input() set onClick(clickEVT$: EventEmitter<MapBrowserEvent<UIEvent>>) {
    this._onClickSub = clickEVT$.subscribe(event => {
      try {
        this._deselectCurrentPoi();
        const poiFeature = nearestFeatureOfLayer(this._poisLayer, event, this.wmMapMap);
        if (poiFeature) {
          preventDefault(event);
          stopPropagation(event);
          this.wmMapMap.getInteractions().forEach(i => i.setActive(false));
          const currentID = +poiFeature.getId() || -1;
          this.currentRelatedPoi$.next(this._getPoi(currentID));
          this.relatedPoiEvt.emit(this.currentRelatedPoi$.value);
          this.poiClick.emit(currentID);
          this.setPoi = currentID;
          setTimeout(() => {
            this.wmMapMap.getInteractions().forEach(i => i.setActive(true));
          }, 1200);
        }
      } catch (e) {
        console.log(e);
      }
    });
  }

  @Input('poi') set setPoi(id: number | 'reset') {
    if (id === -1 && this._selectedPoiLayer != null) {
      this.wmMapMap.removeLayer(this._selectedPoiLayer);
      this._selectedPoiLayer = undefined;
      this.relatedPoiEvt.next(null);
    } else {
      const currentPoi = this._poiMarkers.find(p => +p.id === +id);

      if (currentPoi != null) {
        this._fitView(currentPoi.icon.getGeometry() as any);
        this._selectCurrentPoi(currentPoi);
        this.currentRelatedPoi$.next(this._getPoi(+id));
        this.relatedPoiEvt.next(this.currentRelatedPoi$.value);
      }
    }
  }

  @Input() track;
  @Input() wmMapPositioncurrentLocation: Location;
  @Input() wmMapTrackRelatedPoisAlertPoiRadius: number;
  @Output('related-poi-click') poiClick: EventEmitter<number> = new EventEmitter<number>();
  @Output('related-poi') relatedPoiEvt: EventEmitter<any> = new EventEmitter<any>();
  @Output() wmMapTrackRelatedPoisNearestPoiEvt: EventEmitter<Feature<Geometry>> =
    new EventEmitter();

  currentRelatedPoi$: BehaviorSubject<IGeojsonFeature> =
    new BehaviorSubject<IGeojsonFeature | null>(null);

  constructor(@Host() private _mapCmp: WmMapComponent) {
    super();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const resetCondition =
      (changes.track &&
        changes.track.previousValue != null &&
        changes.track.currentValue != null &&
        (changes.track.previousValue.properties.id != changes.track.currentValue.properties.id ||
          (changes.track.previousValue == null &&
            changes.track.currentValue.properties.id != null))) ??
      false;
    if (this.track == null || this.wmMapMap == null || resetCondition) {
      this._resetView();
      this._initPois = false;
    }
    if (
      this.track != null &&
      this.track.properties != null &&
      this.track.properties.related_pois != null &&
      this.wmMapMap != null &&
      this._initPois === false
    ) {
      this._resetView();
      this._relatedPois = this.track.properties.related_pois;
      this._addPoisMarkers(this._relatedPois);
      calculateNearestPoint(
        this.wmMapPositioncurrentLocation as any,
        this._poisLayer,
        this.wmMapTrackRelatedPoisAlertPoiRadius,
      );
      this._initPois = true;
    }

    if (
      changes.wmMapPositioncurrentLocation &&
      changes.wmMapPositioncurrentLocation.currentValue != null
    ) {
      const currentLocation = changes.wmMapPositioncurrentLocation.currentValue;
      const nearestPoi = calculateNearestPoint(currentLocation, this._poisLayer);
      if (nearestPoi != null) {
        ((nearestPoi.getStyle() as any).getImage() as any).setScale(1.2);
      }
      this.wmMapTrackRelatedPoisNearestPoiEvt.emit(nearestPoi);
    }
  }

  ngOnDestroy(): void {
    this._onClickSub.unsubscribe();
  }

  poiNext(): void {
    const currentID = this.currentRelatedPoi$.value.properties.id;
    const currentPosition = this._relatedPois.map(f => f.properties.id).indexOf(currentID);
    const nextId =
      this._relatedPois[(currentPosition + 1) % this._relatedPois.length].properties.id;
    this.setPoi = nextId;
  }

  poiPrev(): void {
    const currentID = this.currentRelatedPoi$.value.properties.id;
    const currentPosition = this._relatedPois.map(f => f.properties.id).indexOf(currentID);
    const prevId =
      this._relatedPois[(currentPosition + this._relatedPois.length - 1) % this._relatedPois.length]
        .properties.id;
    this.setPoi = prevId;
  }

  private async _addPoisMarkers(poiCollection: Array<IGeojsonFeature>) {
    this._poisLayer = createLayer(this._poisLayer, FLAG_TRACK_ZINDEX);
    this.wmMapMap.addLayer(this._poisLayer);
    for (let i = this._poiMarkers?.length - 1; i >= 0; i--) {
      const ov = this._poiMarkers[i];
      if (!poiCollection?.find(x => x.properties.id + '' === ov.id)) {
        removeFeatureFromLayer(this._poisLayer, ov.icon);
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
          addFeatureToLayer(this._poisLayer, marker.icon);
          this._poiMarkers.push(marker);
        }
      }
    }
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
    return createCanvasForHtml(htmlTextCanvas, 46);
  }

  private async _createPoiMarkerHtmlForCanvas(
    value: IGeojsonFeature,
    selected = false,
  ): Promise<string> {
    let img1b64: string | ArrayBuffer = logoBase64;
    const url = value.properties?.feature_image?.sizes['108x137'];
    if (url) {
      img1b64 = await downloadBase64Img(url);
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

  private _deselectCurrentPoi(): void {
    if (this._selectedPoiMarker != null) {
      this.wmMapMap.removeLayer(this._selectedPoiLayer);
      this._selectedPoiLayer = undefined;
    }
  }

  private _fitView(geometryOrExtent: any, optOptions?: FitOptions): void {
    if (optOptions == null) {
      const size = this.wmMapMap.getSize();
      optOptions = {
        maxZoom: this.wmMapMap.getView().getZoom(),
        duration: 500,
        size,
      };
    }
    this._mapCmp.fitView(geometryOrExtent, optOptions);
  }

  private _getPoi(id: number): any {
    const poi = this._relatedPois.find(p => p.properties.id === id);
    return poi;
  }

  private _resetView(): void {
    if (this.wmMapMap != null && this._poisLayer != null) {
      this.wmMapMap.removeLayer(this._poisLayer);
      this._poisLayer = undefined;
    }
    if (this.wmMapMap != null && this._selectedPoiLayer != null) {
      this.wmMapMap.removeLayer(this._selectedPoiLayer);
      this._selectedPoiLayer = undefined;
    }
    if (this.wmMapMap != null) {
      this.wmMapMap.render();
    }
    this._poiMarkers = [];
    this.relatedPoiEvt.emit(null);
  }

  private async _selectCurrentPoi(poiMarker: PoiMarker) {
    this._deselectCurrentPoi();
    this._selectedPoiLayer = createLayer(this._selectedPoiLayer, 999999999999999);
    this.wmMapMap.addLayer(this._selectedPoiLayer);
    this._selectedPoiMarker = poiMarker;
    const {marker} = await this._createPoiCanvasIcon(poiMarker.poi, null, true);
    addFeatureToLayer(this._selectedPoiLayer, marker.icon);
  }
}
