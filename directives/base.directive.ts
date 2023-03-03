import {Directive, Host, Input} from '@angular/core';

import {Extent} from 'ol/extent';
import SimpleGeometry from 'ol/geom/SimpleGeometry';
import {FitOptions} from 'ol/View';

import {WmMapComponent} from '../components/map/map.component';
import {IMAP} from '../types/model';
import {extentFromLonLat} from '../utils';

@Directive()
export abstract class WmMapBaseDirective {
  @Input() wmMapConf: IMAP;
  @Input() wmMapPadding: number[];

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
  fitView(geometryOrExtent: SimpleGeometry | Extent, optOptions?: FitOptions): void {
    if (this.mapCmp.map != null) {
      const view = this.mapCmp.map.getView();
      if (view != null) {
        if (optOptions == null) {
          optOptions = {
            duration: 500,
            padding: this.wmMapPadding ?? undefined,
          };
        }
        this.mapCmp.map.once('rendercomplete', () => {
          view.fit(geometryOrExtent as any, optOptions);
        });
      }
    }
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
      const view = this.mapCmp.map.getView();
      if (view != null) {
        if (optOptions == null) {
          optOptions = {
            padding: this.wmMapPadding ?? undefined,
            maxZoom: this.wmMapConf.defZoom,
          };
        }
        this.mapCmp.map.once('rendercomplete', () => {
          view.fit(extentFromLonLat(geometryOrExtent as any), optOptions);
        });
      }
    }
  }
}
