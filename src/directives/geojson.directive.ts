import {Directive, Host, Input, OnChanges, OnDestroy, SimpleChanges} from '@angular/core';
import {filter, take} from 'rxjs/operators';
import {WmMapComponent} from '../components';
import {WmMapBaseDirective} from './base.directive';
import GeoJSON from 'ol/format/GeoJSON';
import {default as VectorSource} from 'ol/source/Vector';
import {Geometry} from 'ol/geom';
import VectorLayer from 'ol/layer/Vector';
import View from 'ol/View';
import {getLineStyle} from '../utils';
@Directive({
  selector: '[wmMapGeojson]',
})
export class WmMapGeojsonDirective extends WmMapBaseDirective implements OnDestroy, OnChanges {
  private _featureCollectionLayer: VectorLayer<VectorSource<Geometry>> | undefined;

  constructor(@Host() mapCmp: WmMapComponent) {
    super(mapCmp);
    this.mapCmp.isInit$
      .pipe(
        filter(f => f === true),
        take(1),
      )
      .subscribe(() => {
        this.mapCmp.map.once('precompose', () => {
          const extent = this._featureCollectionLayer.getSource().getExtent();
          this.mapCmp.map.addLayer(this._featureCollectionLayer);
          this.mapCmp.map.setView(
            new View({
              center: extent,
              zoom: 15,
              padding: [80, 80, 80, 80],
              projection: 'EPSG:3857',
              constrainOnlyCenter: true,
              extent,
            }),
          );
          this.mapCmp.map
            .getView()
            .fit(extent, this.mapCmp.wmMapOnly ? {maxZoom: 12} : {maxZoom: 17});
          this.mapCmp.map.updateSize();
        });
      });
  }

  @Input('wmMapGeojson') set geojson(geojson: any) {
    this._buildGeojson(this._getGeoJson(geojson));
  }

  ngOnChanges(changes: SimpleChanges): void {}

  ngOnDestroy(): void {}

  private _buildGeojson(geojson: any): void {
    const features = new GeoJSON({
      featureProjection: 'EPSG:3857',
    }).readFeatures(geojson);
    this._featureCollectionLayer = new VectorLayer({
      source: new VectorSource({
        format: new GeoJSON(),
        features,
      }),
      style: () => getLineStyle('#CA1551'),
      zIndex: 450,
    });
  }

  private _getGeoJson(trackgeojson: any): any {
    if (trackgeojson?.geoJson) {
      return trackgeojson.geoJson;
    }
    if (trackgeojson?.geometry) {
      return trackgeojson.geometry;
    }
    if (trackgeojson?._geometry) {
      return trackgeojson._geometry;
    }
    return trackgeojson;
  }
}
