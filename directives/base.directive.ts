import {Directive, Input} from '@angular/core';

import {Extent} from 'ol/extent';
import SimpleGeometry from 'ol/geom/SimpleGeometry';
import Map from 'ol/Map';
import {FitOptions} from 'ol/View';
import {IMAP} from '../types/model';
import {extentFromLonLat} from '../utils';

@Directive()
export abstract class WmMapBaseDirective {
  @Input() wmMapMap: Map;
  @Input() wmMapPadding: number[];
  @Input() wmMapConf: IMAP;
  /**
   *
   *
   * @param {(SimpleGeometry | Extent)} geometryOrExtent
   * @param {FitOptions} [optOptions]
   * @memberof WmMapBaseDirective
   */
  fitView(geometryOrExtent: SimpleGeometry | Extent, optOptions?: FitOptions): void {
    if (this.wmMapMap != null) {
      const view = this.wmMapMap.getView();
      if (view != null) {
        if (optOptions == null) {
          optOptions = {
            duration: 500,
            padding: this.wmMapPadding ?? undefined,
          };
        }
        view.fit(extentFromLonLat(geometryOrExtent as any), optOptions);
      }
    }
  }
}
