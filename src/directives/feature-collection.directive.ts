import {HttpClient} from '@angular/common/http';
import {Directive, EventEmitter, Host, Input, Output} from '@angular/core';

import {BehaviorSubject} from 'rxjs';
import {filter, switchMap, take} from 'rxjs/operators';
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
import {FEATURE_COLLECTION_DISABLE_ZOOM_TRESHOLD, FEATURE_COLLECTION_ZINDEX} from '../readonly';
import {ZoomToExtent} from 'ol/control';
@Directive({
  selector: '[wmMapFeatureCollection]',
})
export class WmMapFeatureCollectionDirective extends WmMapBaseDirective {
  private _enabled$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private _featureCollectionLayer: VectorLayer<VectorSource<Geometry>> | undefined;
  private _popupOverlay: Popup;
  private _primaryColor: string | null = null;
  private _selectedFeature: Feature | null = null;
  private _selectedStyle = new Style({
    stroke: new Stroke({
      color: '#F59F1A',
      width: 3,
    }),
    fill: new Fill({
      color: 'rgba(245, 159, 26, 0.4)',
    }),
  });
  private _unselectedStyle = new Style({
    stroke: new Stroke({
      color: 'rgba(245, 159, 26, 1)',
      width: 2,
    }),
    fill: new Fill({
      color: 'rgba(245, 159, 26, 0)',
    }),
  });
  private _unselectedStyleFn = (feature, resolution) => {
    const calculatedWidth =
      2 + (feature.getProperties().value % 5 == 0 ? 3.175 : 1.863) * Math.min(1, 2.5 / resolution);
    console.log(resolution);
    return new Style({
      stroke: new Stroke({
        color: 'rgba(245, 159, 26, 1)',
        width: calculatedWidth,
      }),
      fill: new Fill({
        color: 'rgba(245, 159, 26, 0)',
      }),
    });
  };
  private _url$: BehaviorSubject<string | null> = new BehaviorSubject<string>(null);

  @Input('wmMapFeatureCollectionPrimaryColor') set color(color: string) {
    this._primaryColor = color;
  }

  @Input('wmMapFeatureCollection') set enabled(val: boolean) {
    this._enabled$.next(val);
    if (this._featureCollectionLayer != null) {
      this._featureCollectionLayer.setVisible(val);
    }
  }

  @Input('wmMapFeatureCollectionUrl') set url(url: string) {
    this._url$.next(url);
  }

  @Input('wmMapFeatureTranslationCallback') translationCallback: (any) => string = value => value;
  @Output('wmMapFeatureCollectionLayerSelected')
  wmMapFeatureCollectionLayerSelected: EventEmitter<number> = new EventEmitter<number>();

  constructor(@Host() mapCmp: WmMapComponent, private _http: HttpClient) {
    super(mapCmp);
    this._enabled$
      .pipe(
        filter(e => e === true),
        switchMap(() => this.mapCmp.isInit$),
        filter(f => f === true),
        switchMap(_ => this._url$),
        filter(url => url != null),
        switchMap(url => this._http.get(url)),
      )
      .subscribe((geojson: any) => {
        this.mapCmp.map.once('precompose', () => {
          this._buildGeojson(geojson);
        });

        this.mapCmp.map.on('moveend', e => {
          if (this._enabled$.value) {
            const currentZoom = this.mapCmp.map.getView().getZoom();
            if (currentZoom > FEATURE_COLLECTION_DISABLE_ZOOM_TRESHOLD) {
              this._featureCollectionLayer.setVisible(false);
            } else {
              this._featureCollectionLayer.setVisible(true);
            }
          }
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
      positionning: 'bottom-center',
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
      this.mapCmp.map.forEachFeatureAtPixel(e.pixel, feat => {
        if (
          feat instanceof Feature &&
          (feat.getGeometry() instanceof Polygon || feat.getGeometry() instanceof MultiPolygon)
        ) {
          if (feat.getProperties().layer != null) {
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
                  ${layer.description ? `${this.translationCallback(layer.description)}` : ''}
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
