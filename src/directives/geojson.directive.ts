import {WmFeatureCollection, WmFeature} from '@wm-types/feature';
import {Directive, Host, Input} from '@angular/core';
import {filter, take} from 'rxjs/operators';
import {WmMapComponent} from '../components';
import {WmMapBaseDirective} from './base.directive';
import GeoJSON from 'ol/format/GeoJSON';
import {default as VectorSource} from 'ol/source/Vector';
import {Geometry} from 'ol/geom';
import {Geometry as geojsonGeometry} from 'geojson';
import VectorLayer from 'ol/layer/Vector';
import {getLineStyle} from '../utils';
import {Icon, Style} from 'ol/style';
import {Feature} from 'ol';
import {Extent} from 'ol/extent';
@Directive({
  selector: '[wmMapGeojson]',
})
export class WmMapGeojsonDirective extends WmMapBaseDirective {
  private _featureCollectionLayer: VectorLayer<VectorSource<Geometry>> | undefined;
  private _init = false;

  @Input('wmMapGeojson') set geojson(feature: WmFeatureCollection | WmFeature<geojsonGeometry>) {
    this.mapCmp.isInit$
      .pipe(
        filter(f => f === true),
        take(1),
      )
      .subscribe(() => {
        this._buildGeojson(this._getFeatureCollection(feature));
      });
  }

  @Input('wmMapGeojsonFit') fit = false;

  constructor(@Host() mapCmp: WmMapComponent) {
    super(mapCmp);
  }

  private _buildGeojson(featureCollection: WmFeatureCollection): void {
    if (featureCollection != null) {
      console.log('Building GeoJSON');
      const features = new GeoJSON({
        featureProjection: 'EPSG:3857',
      }).readFeatures(featureCollection);

      if (this._featureCollectionLayer == null) {
        this._featureCollectionLayer = new VectorLayer({
          source: new VectorSource({
            format: new GeoJSON({featureProjection: 'EPSG:3857'}),
            features,
          }),
          style: (feature: Feature<Geometry>) => {
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
        this.mapCmp.map.addLayer(this._featureCollectionLayer);
      } else {
        this._featureCollectionLayer.getSource().clear();
        this._featureCollectionLayer.getSource().addFeatures(features);
      }
      if (this._init === false) {
        const extent = this._featureCollectionLayer.getSource().getExtent();
        const size = this.mapCmp.map.getSize();
        const sizeFitted = [50, 50];
        this.mapCmp.map.getView().fit(extent, {
          duration: 0,
          maxZoom: 17,
          size: this.fit ? sizeFitted : size,
        });
        this._featureCollectionLayer.changed();
        this._init = true;
      }
    }
  }

  private _getFeatureCollection(trackgeojson: any): WmFeatureCollection {
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
