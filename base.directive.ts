import {Directive, Input} from '@angular/core';

import {Extent} from 'ol/extent';
import {FitOptions} from 'ol/View';
import Map from 'ol/Map';
import SimpleGeometry from 'ol/geom/SimpleGeometry';
import {extentFromLonLat} from './utils/utils';

@Directive()
export abstract class WmMapBaseDirective {
  @Input() map: Map;
  @Input() padding: number[];

  fitView(geometryOrExtent: SimpleGeometry | Extent, optOptions?: FitOptions): void {
    const view = this.map.getView();
    if (view != null) {
      if (optOptions == null) {
        optOptions = {
          duration: 500,
          padding: this.padding ?? undefined,
        };
      }
      view.fit(extentFromLonLat(geometryOrExtent as any), optOptions);
    }
  }
}
