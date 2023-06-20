import {HttpClient} from '@angular/common/http';
import {Directive, EventEmitter, Host, Input, Output} from '@angular/core';

import {BehaviorSubject} from 'rxjs';
import {filter, switchMap} from 'rxjs/operators';
import {getCenter} from 'ol/extent';
import {Feature} from 'ol';
import {FitOptions} from 'ol/View';
import GeoJSON from 'ol/format/GeoJSON';
import {Geometry, MultiPolygon, Polygon} from 'ol/geom';
import VectorLayer from 'ol/layer/Vector';
import {default as VectorSource} from 'ol/source/Vector';
import {Fill, Stroke, Style} from 'ol/style';
import Popup from 'ol-ext/overlay/popup';
import {WmMapComponent} from '../components';
import {WmMapBaseDirective} from './base.directive';
import {Select} from 'ol/interaction';
import {pointerMove} from 'ol/events/condition';
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
  private _popupOverlay: Popup;
  private _primaryColor: string | null = null;
  private _selectedFeature: Feature | null = null;
  private _selectedStyle = new Style({
    stroke: new Stroke({
      color: FEATURE_COLLECTION_STROKE_COLOR as unknown as Color,
      width: FEATURE_COLLECTION_STROKE_WIDTH,
    }),
    fill: new Fill({
      color: FEATURE_COLLECTION_FILL_COLOR as unknown as Color,
    }),
  });
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
      style: this._unselectedStyle,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      zIndex: FEATURE_COLLECTION_ZINDEX,
    });
    if (this.mapCmp.map != null) {
      this.mapCmp.map.addLayer(this._featureCollectionLayer);
      const extent = vectorSource.getExtent();
      if (extent != null) {
        const optOptions: FitOptions = {
          duration: 500,
          maxZoom: 18,
          padding: [10, 10, 10, 10],
        };
        this.fitView(extent, optOptions);
      }
    }
    var over = new Select({
      hitTolerance: 5,
      multi: true,
      condition: pointerMove,
    });
    this._popupOverlay = new Popup({
      popupClass: 'default anim', //"tooltips", "warning" "black" "default", "tips", "shadow",
      closeBox: true,
      offset: [0, -16],
      positioning: 'bottom-center',
      select: over,
      onclose: () => {},
      autoPan: {
        animation: {
          duration: 100,
        },
      },
    });
    this.mapCmp.map.addOverlay(this._popupOverlay);
    let _center = null;
    this.mapCmp.map.on('pointermove', e => {
      this.mapCmp.map.getViewport().style.cursor = '';

      this.mapCmp.map.forEachFeatureAtPixel(e.pixel, feat => {
        if (
          feat instanceof Feature &&
          (feat.getGeometry() instanceof Polygon || feat.getGeometry() instanceof MultiPolygon)
        ) {
          if (feat.getProperties().layer != null) {
            this.mapCmp.map.getViewport().style.cursor = 'pointer';

            if (this._selectedFeature != null) {
              this._selectedFeature.setStyle(this._unselectedStyle);
            }
            this._selectedFeature = feat;
            this._selectedFeature.setStyle(this._selectedStyle);
            const properties = feat.getProperties();
            if (properties != null && properties.layer != null) {
              const layer = properties.layer;
              if (layer.id) {
                const content = ` 
                <ion-card style="max-width:300px">
                ${layer.feature_image ? `<img  src="${layer.feature_image}" />` : ''}
                  <ion-card-header>
                    <ion-card-title>${this.translationCallback(layer.title)}</ion-card-title>
                  </ion-card-header>
                  <ion-card-content>
                  ${
                    layer.description
                      ? `${this.translationCallback(layer.description).substring(0, 200) + '...'}`
                      : ''
                  }
                  </ion-card-content>
                </ion-card>`;
                const center = getCenter(feat.getGeometry().getExtent());
                if (JSON.stringify(center) != JSON.stringify(_center)) {
                  this._popupOverlay.show(center, content);
                  _center = center;
                }
              }
            }
          } else {
            if (this._selectedFeature != null) {
              this._selectedFeature.setStyle(this._unselectedStyle);
            }
            this._popupOverlay.hide();
            _center = null;
          }

          return true;
        }
      });
    });
    this.mapCmp.map.on('click', e => {
      this.mapCmp.map.forEachFeatureAtPixel(e.pixel, feat => {
        if (feat instanceof Feature) {
          const properties = feat.getProperties();
          if (properties != null && properties.layer != null) {
            const layer = properties.layer;
            const extent = feat.getGeometry().getExtent();
            this.fitView(extent);
            console.log('seleziono nuovo layer', layer.id);
            this._popupOverlay.hide();
            this.wmMapFeatureCollectionLayerSelected.emit(layer);
          }
        }
      });
    });
  }
}
