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
  private _enabled$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private _url$: BehaviorSubject<string | null> = new BehaviorSubject<string>(null);

  @Input('wmMapOverlay') set enabled(val: boolean) {
    this._enabled$.next(val);
  }

  @Input('wmMapOverlayUrl') set url(url: string) {
    this._url$.next(url);
  }

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
          this.mapCmp.map.addLayer(baseVector);
        });
      });
  }
}
