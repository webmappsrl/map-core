import {Directive, EventEmitter, Host, Input, Output, SimpleChanges} from '@angular/core';
import {WmMapBaseDirective} from './base.directive';
import {WmMapComponent} from '../components';
import {WmFeature} from '@wm-types/feature';
import {Point} from 'geojson';
import {filter, take} from 'rxjs/operators';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import {BehaviorSubject} from 'rxjs';
import {UGC_POI_DRAWN_ZINDEX} from '@map-core/readonly';
import {createLayer, clearLayer} from '../utils/ol';
import {fromLonLat, toLonLat} from 'ol/proj';
import {Point as OlPoint} from 'ol/geom';
import {Feature, MapBrowserEvent} from 'ol';
import {Icon, Style} from 'ol/style';

@Directive({
  selector: '[wmMapDrawUgcPoi]',
})
export class WmMapDrawUgcPoiDirective extends WmMapBaseDirective {
  private _drawUgcPoiLayer: VectorLayer<VectorSource>;
  private _enabled$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  @Output() ugcPoiDrawnEvt: EventEmitter<WmFeature<Point>> = new EventEmitter<WmFeature<Point>>();

  @Input() wmMapDrawUgcPoiPoi: WmFeature<Point> | null;
  @Input('wmMapDrawUgcPoiEnabled') set enabled(val: boolean) {
    this._enabled$.next(val);
    this._drawUgcPoiLayer?.setVisible(val);
    //TODO: gestione del messaggio popover
  }

  constructor(@Host() mapCmp: WmMapComponent) {
    super(mapCmp);
    this.mapCmp.isInit$
      .pipe(
        filter(f => f === true),
        take(1),
      )
      .subscribe(() => {
        this._init();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.wmMapDrawUgcPoiPoi) {
      this._drawUgcPoiIcon(this.wmMapDrawUgcPoiPoi);
    }
  }

  private _init(): void {
    this._drawUgcPoiLayer = createLayer(this._drawUgcPoiLayer, UGC_POI_DRAWN_ZINDEX);
    this._drawUgcPoiLayer.setVisible(this._enabled$.value);
    this.mapCmp.map.addLayer(this._drawUgcPoiLayer);

    this.mapCmp.map.on('click', (evt: MapBrowserEvent<UIEvent>) => {
      this._onClick(evt);
    });
  }

  private _onClick(evt: MapBrowserEvent<UIEvent>): void {
    if (this._enabled$.value) {
      const coordinates = toLonLat(evt.coordinate);
      if (this.wmMapDrawUgcPoiPoi?.geometry?.coordinates != null) {
        const newPoi = {
          ...this.wmMapDrawUgcPoiPoi,
          geometry: {
            ...this.wmMapDrawUgcPoiPoi.geometry,
            coordinates: coordinates,
          },
        };
        this._drawUgcPoiIcon(newPoi);
        this.ugcPoiDrawnEvt.emit(newPoi);
      }
    }
  }

  private _drawUgcPoiIcon(ugcPoi: WmFeature<Point>): void {
    clearLayer(this._drawUgcPoiLayer);
    if (ugcPoi != null) {
      const selectedUgcPoiLayerSource = this._drawUgcPoiLayer.getSource();
      let geometry = null;

      if (ugcPoi.geometry != null && ugcPoi.geometry.coordinates != null) {
        const coordinates = [
          ugcPoi.geometry.coordinates[0] as number,
          ugcPoi.geometry.coordinates[1] as number,
        ];
        const position = fromLonLat([coordinates[0] as number, coordinates[1] as number]);
        geometry = new OlPoint([position[0], position[1]]);
      } else {
        geometry = ugcPoi.geometry;
      }

      if (ugcPoi.properties != null) {
        const iconFeature = new Feature({type: 'icon', geometry});
        let iconStyle = new Style({
          zIndex: UGC_POI_DRAWN_ZINDEX,
          image: new Icon({
            anchor: [0.5, 0.5],
            scale: 0.7,
            src: 'assets/icons/pois/poi_type_draw-ugc-poi.png',
          }),
        });
        iconFeature.setStyle(iconStyle);
        iconFeature.setId(ugcPoi.properties.id);
        selectedUgcPoiLayerSource.addFeature(iconFeature);
        selectedUgcPoiLayerSource.changed();
      }
    }
  }
}
