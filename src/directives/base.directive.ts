import {Directive, EventEmitter, Host, Input, Output} from '@angular/core';

import {Extent} from 'ol/extent';
import SimpleGeometry from 'ol/geom/SimpleGeometry';
import {FitOptions} from 'ol/View';
import {take} from 'rxjs/operators';

import {extentFromLonLat} from '../../src/utils';
import {WmMapComponent} from '../components/map/map.component';
import {IMAP} from '../types/model';

@Directive({
  selector: '[wmMapBase]',
})
export class WmMapBaseDirective {
  @Input() wmMapConf: IMAP;
  @Input() wmMapPadding: number[];
  @Output() wmMapStateEvt: EventEmitter<string> = new EventEmitter<string>();

  constructor(@Host() public mapCmp: WmMapComponent) {}

  /**
   * @description
   * This function is used to fit a view on a map. It takes two parameters, geometryOrExtent and optOptions.
   * The geometryOrExtent parameter is either a SimpleGeometry or an Extent object. The optOptions parameter is optional and is an object containing properties such as duration and padding.
   * The function checks if the mapCmp.map exists and if it does, it gets the view from the map.
   * If the optOptions parameter is not provided, it sets default values for duration and padding.
   * It then waits for the rendercomplete event before fitting the view with the given geometryOrExtent and options.
   * @param {(SimpleGeometry | Extent)} geometryOrExtent
   * @param {FitOptions} [optOptions]
   * @memberof WmMapBaseDirective
   */
  fitView(
    geometryOrExtent: SimpleGeometry | Extent,
    optOptions?: FitOptions,
    caller?: string,
  ): void {
    if (this.mapCmp.map == null) return;

    this.mapCmp.queryParams$.pipe(take(1)).subscribe(params => {
      const keys = Object.keys(params);

      // Determina se eseguire il fit in base alle condizioni
      const shouldFit =
        (keys.length > 1 && caller?.includes('WmMapTrackDirective')) || keys.length <= 1;

      if (!shouldFit) return;

      const view = this.mapCmp.map.getView();
      if (view == null) return;
      optOptions = optOptions ?? {
        duration: 500,
        padding: this.wmMapPadding ?? undefined,
      };

      view.fit(geometryOrExtent as any, optOptions);
    });
  }

  /**
   * @description
   * This function is used to fit a view from a given longitude and latitude.
   * It takes in two parameters, geometryOrExtent which is either a SimpleGeometry or an Extent,
   * and optOptions which is an optional FitOptions object.
   * It first checks if the mapCmp.map is not null, then gets the view from the mapCmp.map.
   * If optOptions is null, it sets it to default values for padding and maxZoom using the wmMapPadding and wmMapConf variables respectively.
   * It then waits for rendercomplete before fitting the view with extentFromLonLat using the geometryOrExtent parameter and optOptions as parameters.
   * @param {(SimpleGeometry | Extent)} geometryOrExtent
   * @param {FitOptions} [optOptions]
   * @memberof WmMapBaseDirective
   */
  fitViewFromLonLat(geometryOrExtent: SimpleGeometry | Extent, optOptions?: FitOptions): void {
    if (this.mapCmp.map != null) {
      if (optOptions == null) {
        optOptions = {
          padding: this.wmMapPadding ?? undefined,
          maxZoom: this.wmMapConf.maxZoom,
          duration: 500,
          nearest: true,
        };

        this.mapCmp.map.once('rendercomplete', () => {
          this.fitView(extentFromLonLat(geometryOrExtent as any), optOptions);
        });
      }
    }
  }
}
