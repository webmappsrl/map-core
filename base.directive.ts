import {Directive, Input} from '@angular/core';
import View, {FitOptions} from 'ol/View';

import {Extent} from 'ol/extent';
import Map from 'ol/Map';
import SimpleGeometry from 'ol/geom/SimpleGeometry';
import {transformExtent} from 'ol/proj';

@Directive()
export abstract class WmMapBaseDirective {
  @Input() map: Map;
  @Input() padding: number[];

  extentFromLonLat(extent: Extent): Extent {
    return transformExtent(extent, 'EPSG:4326', 'EPSG:3857');
  }

  fitView(geometryOrExtent: SimpleGeometry | Extent, optOptions?: FitOptions): void {
    const view = this.map.getView();
    if (view != null) {
      if (optOptions == null) {
        optOptions = {
          duration: 500,
          padding: this.padding ?? undefined,
        };
      }
      view.fit(this.extentFromLonLat(geometryOrExtent as any), optOptions);
    }
  }
}
