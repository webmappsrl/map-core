import {Directive, Host, Input, OnDestroy} from '@angular/core';
import {filter, take} from 'rxjs/operators';
import {WmMapComponent} from '../components';
import {WmMapBaseDirective} from './base.directive';
import GeoJSON from 'ol/format/GeoJSON';
import {default as VectorSource} from 'ol/source/Vector';
import {Geometry} from 'ol/geom';
import VectorLayer from 'ol/layer/Vector';
import View from 'ol/View';
import {getLineStyle} from '../utils';
import {Icon, Style} from 'ol/style';
@Directive({
  selector: '[wmMapGeojson]',
})
export class WmMapGeojsonDirective extends WmMapBaseDirective implements OnDestroy {
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
          if (this._featureCollectionLayer != null) {
            const extent = this._featureCollectionLayer.getSource().getExtent();
            this.mapCmp.map.addLayer(this._featureCollectionLayer);
            this.mapCmp.map.setView(
              new View({
                center: extent,
                zoom: 15,
                padding: [80, 80, 80, 80],
                projection: 'EPSG:3857',
                constrainOnlyCenter: true,
              }),
            );
            this.mapCmp.map.updateSize();
          }
        });
      });
  }

  @Input('wmMapGeojson') set geojson(geojson: any) {
    this._buildGeojson(this._getFeatureCollection(geojson));
  }

  ngOnDestroy(): void {}

  private _buildGeojson(geojson: any): void {
    if (geojson != null) {
      const features = new GeoJSON({
        featureProjection: 'EPSG:3857',
      }).readFeatures(geojson);

      if (this._featureCollectionLayer == null) {
        this._featureCollectionLayer = new VectorLayer({
          source: new VectorSource({
            format: new GeoJSON({featureProjection: 'EPSG:3857'}),
            features,
          }),
          style: feature => {
            const getType = feature.getGeometry().getType();
            if (getType === 'Point') {
              return [
                new Style({
                  image: new Icon({
                    src: 'assets/location-icon.png',
                    scale: 0.29,
                    size: [125, 125],
                  }),
                  zIndex: 1e11,
                }),
              ];
            } else {
              return getLineStyle('#CA1551');
            }
          },
          zIndex: 450,
        });
      } else {
        this._featureCollectionLayer.getSource().clear();
        this._featureCollectionLayer.getSource().addFeatures(features);
      }

      this._featureCollectionLayer.changed();
    }
  }

  private _getFeatureCollection(trackgeojson: any): any {
    if (trackgeojson == null) {
      return null;
    }
    const features = [];
    if (trackgeojson.type === 'FeatureCollection') {
      return trackgeojson;
    } else if (trackgeojson?.geoJson) {
      features.push(trackgeojson.geoJson);
    } else if (trackgeojson?.geometry) {
      features.push(trackgeojson.geometry);
    } else if (trackgeojson?._geometry) {
      features.push(trackgeojson._geometry);
    } else if (trackgeojson.coordinates) {
      features.push(trackgeojson);
    } else if (trackgeojson?.latitude && trackgeojson?.longitude) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [trackgeojson?.longitude, trackgeojson?.latitude],
        },
      });
    } else if (trackgeojson.geojson) {
      features.push(trackgeojson.geojson);
    }
    return {
      type: 'FeatureCollection',
      features,
    };
  }
}
