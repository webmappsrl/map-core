import {BehaviorSubject} from 'rxjs';
import {Directive, Input, OnChanges, SimpleChanges} from '@angular/core';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {WmMapBaseDirective} from './base.directive';
import GeoJSON from 'ol/format/GeoJSON';
import {Fill, Stroke, Style} from 'ol/style';
@Directive({
  selector: '[wmMapOverlay]',
})
export class WmMapOverlayDirective extends WmMapBaseDirective implements OnChanges {
  private _enabled$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private _mapIsInit = false;
  private _url$: BehaviorSubject<string | null> = new BehaviorSubject<string>(null);

  @Input('wmMapOverlay') set enabled(val: boolean) {
    this._enabled$.next(val);
  }

  @Input('wmMapOverlayUrl') set url(url: string) {
    this._url$.next(url);
  }

  ngOnChanges(_: SimpleChanges): void {
    if (this.wmMapMap != null && this._mapIsInit == false && this._enabled$.value === true) {
      this._mapIsInit = true;
      const baseVector = new VectorLayer({
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
      baseVector.setOpacity(0.8);
      this.wmMapMap.addLayer(baseVector);
    }
  }
}
