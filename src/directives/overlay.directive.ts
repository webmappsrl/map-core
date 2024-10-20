import {BehaviorSubject} from 'rxjs';
import {Directive, Host, Input} from '@angular/core';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {WmMapBaseDirective} from './base.directive';
import GeoJSON from 'ol/format/GeoJSON';
import {Fill, Stroke, Style} from 'ol/style';
import {WmMapComponent} from '../components';
import {filter, switchMap, take} from 'rxjs/operators';
@Directive({
  selector: '[wmMapOverlay]',
})
export class WmMapOverlayDirective extends WmMapBaseDirective {
  /**
   * @description
   * BehaviorSubject<boolean> that represents the current state of the feature
   * Enables or disables the feature
   */
  private _enabled$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  /**
   * @description
   * Vector layer used for displaying overlay data on top of the base map.
   */
  private _overlayLayer: VectorLayer<VectorSource>;
  /**
   * @description
   * Private `BehaviorSubject` that holds a URL string or null.
   */
  private _url$: BehaviorSubject<string | null> = new BehaviorSubject<string>(null);

  @Input('wmMapOverlay') set enabled(val: boolean) {
    this._enabled$.next(val);
  }

  /**
   * @description
   * This class extends the WmLayerComponent to provide a vector layer with a base geojson. It initializes
   * the layer only when the layer is enabled and the map is initialized.
   *
   * @param mapCmp The WmMapComponent this layer belongs to
   */
  constructor(@Host() mapCmp: WmMapComponent) {
    super(mapCmp);

    this._enabled$
      .pipe(
        filter(e => e === true),
        switchMap(() => this.mapCmp.isInit$),
        filter(f => f === true),
        take(1),
      )
      .subscribe(() => {
        this.mapCmp.map.once('precompose', () => {
          this._overlayLayer = new VectorLayer({
            source: new VectorSource({
              format: new GeoJSON(),
              url: this._url$.value,
            }),
            style: new Style({
              fill: new Fill({
                color: 'rgba(255, 0, 0, 0)',
              }),
              stroke: new Stroke({
                color: 'rgba(0, 0, 0, 1)',
                width: 3,
              }),
            }),
            zIndex: 1,
          });
          this._overlayLayer.setOpacity(0.8);
          this.mapCmp.map.addLayer(this._overlayLayer);
        });
      });
  }
}
