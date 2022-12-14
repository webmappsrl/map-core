import {map} from 'rxjs/operators';
import {Directive, Input} from '@angular/core';

import {Extent} from 'ol/extent';
import SimpleGeometry from 'ol/geom/SimpleGeometry';
import Map from 'ol/Map';
import {FitOptions} from 'ol/View';
import {IMAP} from '../types/model';
import {extentFromLonLat} from '../utils';

@Directive()
export abstract class WmMapBaseDirective {
  @Input() wmMapConf: IMAP;
  @Input() wmMapMap: Map;
  @Input() wmMapPadding: number[];

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
        this.wmMapMap.once('rendercomplete', () => {
          view.fit(geometryOrExtent as any, optOptions);
        });
      }
    }
  }

  fitViewFromLonLat(geometryOrExtent: SimpleGeometry | Extent, optOptions?: FitOptions): void {
    if (this.wmMapMap != null) {
      const view = this.wmMapMap.getView();
      if (view != null) {
        if (optOptions == null) {
          optOptions = {
            padding: this.wmMapPadding ?? undefined,
            maxZoom: this.wmMapConf.defZoom,
          };
        }
        this.wmMapMap.once('rendercomplete', () => {
          view.fit(extentFromLonLat(geometryOrExtent as any), optOptions);
        });
      }
    }
  }
}
