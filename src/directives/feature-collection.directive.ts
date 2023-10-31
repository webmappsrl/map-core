import {HttpClient} from '@angular/common/http';
import {Directive, EventEmitter, Host, Input, Output} from '@angular/core';

import {BehaviorSubject} from 'rxjs';
import {filter, switchMap} from 'rxjs/operators';
import {Feature} from 'ol';
import GeoJSON from 'ol/format/GeoJSON';
import {Geometry} from 'ol/geom';
import VectorLayer from 'ol/layer/Vector';
import {default as VectorSource} from 'ol/source/Vector';
import {Fill, Stroke, Style} from 'ol/style';
import {WmMapComponent} from '../components';
import {WmMapBaseDirective} from './base.directive';
import {Color} from 'ol/color';
import {
  FEATURE_COLLECTION_STROKE_COLOR,
  FEATURE_COLLECTION_FILL_COLOR,
  FEATURE_COLLECTION_STROKE_WIDTH,
  FEATURE_COLLECTION_ZINDEX,
} from '../readonly';
@Directive({
  selector: '[wmMapFeatureCollection]',
})
export class WmMapFeatureCollectionDirective extends WmMapBaseDirective {
  private _enabled$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private _featureCollectionLayer: VectorLayer<VectorSource<Geometry>> | undefined;
  private _overlay$: BehaviorSubject<any | null> = new BehaviorSubject<any>(null);
  private _primaryColor: string | null = null;
  private _selectedFeature: Feature | null = null;
  private _unselectedStyle = new Style({
    stroke: new Stroke({
      color: FEATURE_COLLECTION_STROKE_COLOR as unknown as Color,
      width: FEATURE_COLLECTION_STROKE_WIDTH,
    }),
    fill: new Fill({
      color: 'rgba(245, 159, 26, 0)',
    }),
  });

  @Input('wmMapFeatureCollectionPrimaryColor') set color(color: string) {
    this._primaryColor = color;
  }

  @Input('wmMapFeatureCollection') set enabled(val: boolean) {
    this._enabled$.next(val);
    if (this._featureCollectionLayer != null) {
      this._featureCollectionLayer.setVisible(val);
    }
  }

  @Input('wmMapFeatureCollectionOverlay') set overlay(overlay: any) {
    this._overlay$.next(overlay);
  }

  @Input('wmMapTranslationCallback') translationCallback: (any) => string = value => {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    for (const val in value) {
      if (value[val]) {
        return value[val];
      }
    }
  };
  @Output('wmMapFeatureCollectionLayerSelected')
  wmMapFeatureCollectionLayerSelected: EventEmitter<number> = new EventEmitter<number>();

  constructor(@Host() mapCmp: WmMapComponent, private _http: HttpClient) {
    super(mapCmp);
    this._enabled$
      .pipe(
        filter(e => e === true),
        switchMap(() => this.mapCmp.isInit$),
        filter(f => f === true),
        switchMap(_ => this._overlay$),
        filter(overlay => overlay != null),
        switchMap(overlay => {
          this._unselectedStyle = new Style({
            stroke: new Stroke({
              color: overlay.strokeColor
                ? overlay.strokeColor
                : (FEATURE_COLLECTION_STROKE_COLOR as unknown as Color),
              width: overlay.strokeWidth ? overlay.strokeWidth : FEATURE_COLLECTION_STROKE_WIDTH,
            }),
            fill: new Fill({
              color: overlay.fillColor ? overlay.fillColor : FEATURE_COLLECTION_FILL_COLOR,
            }),
          });
          return this._http.get(overlay.url);
        }),
      )
      .subscribe(geojson => {
        this.mapCmp.map.once('precompose', () => {
          this._buildGeojson(geojson);
        });
      });
  }

  private _buildGeojson(geojson: any): void {
    let count = 0;
    const features = new GeoJSON({
      featureProjection: 'EPSG:3857',
    }).readFeatures(geojson);
    const vectorSource = new VectorSource({
      format: new GeoJSON(),
      features: features,
    });
    if (this._featureCollectionLayer != null && this._featureCollectionLayer.getSource() != null) {
      this._featureCollectionLayer.getSource().clear();
    }
    this._featureCollectionLayer = new VectorLayer({
      source: vectorSource,
      style: (f: Feature<Geometry>) => {
        f.setId(count);
        count++;
        f.setStyle(this._unselectedStyle);
      },
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      zIndex: FEATURE_COLLECTION_ZINDEX,
    });
    if (this.mapCmp.map != null) {
      this.mapCmp.map.addLayer(this._featureCollectionLayer);
    }

    this.mapCmp.map.on('pointermove', evt => {
      const pixel = this.mapCmp.map.getEventPixel(evt.originalEvent);
      const features = this.mapCmp.map.getFeaturesAtPixel(pixel);
      if (features.length > 0) {
        const feature = features[0];
        const prop = feature.getProperties();
        this.mapCmp.map.getViewport().style.cursor =
          prop != null && prop['clickable'] ? 'pointer' : '';
      }
    });
    this.mapCmp.map.on('click', e => {
      this._featureCollectionLayer.getFeatures(e.pixel).then(features => {
        const selectedFeature = features[0]; // Seleziona il primo elemento
        const prop = selectedFeature.getProperties();
        if (prop != null && prop['clickable'] === true) {
          if (this._selectedFeature != null) {
            this._featureCollectionLayer.getSource().addFeature(this._selectedFeature);
            this._selectedFeature = null;
          }
          if (features.length > 0) {
            this._featureCollectionLayer.getSource().removeFeature(selectedFeature);
            this._selectedFeature = selectedFeature;
          }
        }
      });
    });
  }
}
