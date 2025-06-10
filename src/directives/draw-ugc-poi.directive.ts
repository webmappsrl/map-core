import {
  Directive,
  ElementRef,
  EventEmitter,
  Host,
  Input,
  Output,
  ViewContainerRef,
} from '@angular/core';
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
import {WmMapPopoverBaseDirective} from './popover-base.directive';

@Directive({
  selector: '[wmMapDrawUgcPoi]',
})
export class WmMapDrawUgcPoiDirective extends WmMapPopoverBaseDirective {
  private _ugcPoidrawn: WmFeature<Point>;
  private _drawUgcPoiLayer: VectorLayer<VectorSource>;
  private _enabled$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  protected _popoverMsg: string = 'Clicca sulla mappa per avviare la creazione di un POI';

  @Output() wmMapDrawUgcPoiEvt: EventEmitter<WmFeature<Point>> = new EventEmitter<
    WmFeature<Point>
  >();

  @Input() set wmMapDrawUgcPoiPoi(ugcPoi: WmFeature<Point> | null) {
    this._ugcPoidrawn = ugcPoi;
    this._updatePopoverMessage(null);
    this._drawUgcPoiIcon(this._ugcPoidrawn);
  }

  @Input('wmMapDrawUgcPoiEnabled') set enabled(val: boolean) {
    this._enabled$.next(val);
    this._drawUgcPoiLayer?.setVisible(val);

    if (this._enabled$.value) {
      this.mapCmp.map.on('click', this._onClick);
    } else {
      try {
        this.mapCmp.map.un('click', this._onClick);
      } catch (e) {
        console.error(e);
      }
    }

    if (val) {
      this._updatePopoverMessage(this._popoverMsg);
    } else {
      this._updatePopoverMessage(null);
    }
  }

  constructor(
    @Host() mapCmp: WmMapComponent,
    protected _viewContainerRef: ViewContainerRef,
    protected _element: ElementRef,
  ) {
    super(mapCmp, _viewContainerRef, _element);
    this.mapCmp.isInit$
      .pipe(
        filter(f => f === true),
        take(1),
      )
      .subscribe(() => {
        this._init();
      });
  }

  private _init(): void {
    this._drawUgcPoiLayer = createLayer(this._drawUgcPoiLayer, UGC_POI_DRAWN_ZINDEX);
    this.mapCmp.map.addLayer(this._drawUgcPoiLayer);
    this._initPopover();
  }

  private _onClick = (evt: MapBrowserEvent<UIEvent>): void => {
    const coordinates = toLonLat(evt.coordinate);
    let newPoi: WmFeature<Point>;
    if (!this._ugcPoidrawn) {
      newPoi = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: coordinates,
        },
        properties: {},
      };
    } else {
      newPoi = {
        ...this._ugcPoidrawn,
        geometry: {
          ...this._ugcPoidrawn.geometry,
          coordinates: coordinates,
        },
      };
    }
    this._drawUgcPoiIcon(newPoi);
    this.wmMapDrawUgcPoiEvt.emit(newPoi);
  };

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
