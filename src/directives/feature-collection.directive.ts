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
import CircleStyle from 'ol/style/Circle';
const radius = 15;
@Directive({
  selector: '[wmMapFeatureCollection]',
})
export class WmMapFeatureCollectionDirective extends WmMapBaseDirective {
  private _enabled$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private _featureCollectionLayer: VectorLayer<VectorSource<Geometry>> | undefined;
  private _overlay$: BehaviorSubject<any | null> = new BehaviorSubject<any>(null);
  private _primaryColor: string | null = null;
  private _selectedFeature: Feature | null = null;
  private _unselectedStyle = {
    'Point': new Style({
      image: new CircleStyle({
        radius,
        fill: new Fill({
          color: 'rgba(245, 159, 26, 0)',
        }),
        stroke: new Stroke({
          color: FEATURE_COLLECTION_STROKE_COLOR as unknown as Color,
          width: FEATURE_COLLECTION_STROKE_WIDTH,
        }),
      }),
    }),
    'Polygon': new Style({
      stroke: new Stroke({
        color: FEATURE_COLLECTION_STROKE_COLOR as unknown as Color,
        width: FEATURE_COLLECTION_STROKE_WIDTH,
      }),
      fill: new Fill({
        color: 'rgba(245, 159, 26, 0)',
      }),
    }),
  };

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

  @Input('wmMapFeatureCollectionOverlayUnselect') set unselect(unselect: any) {
    if (this._featureCollectionLayer != null && this._selectedFeature != null) {
      this._setFeatureAphaFillColor(this._selectedFeature, 0);
      this._selectedFeature = null;
    }
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
  @Output()
  wmMapFeatureCollectionPopup: EventEmitter<any> = new EventEmitter<any>();

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
          this._unselectedStyle = {
            'Point': new Style({
              image: new CircleStyle({
                radius,
                fill: new Fill({
                  color: overlay.fillColor ? overlay.fillColor : FEATURE_COLLECTION_FILL_COLOR,
                }),
                stroke: new Stroke({
                  color: overlay.strokeColor
                    ? overlay.strokeColor
                    : (FEATURE_COLLECTION_STROKE_COLOR as unknown as Color),
                  width: overlay.strokeWidth
                    ? overlay.strokeWidth
                    : FEATURE_COLLECTION_STROKE_WIDTH,
                }),
              }),
            }),
            'Polygon': new Style({
              stroke: new Stroke({
                color: overlay.strokeColor
                  ? overlay.strokeColor
                  : (FEATURE_COLLECTION_STROKE_COLOR as unknown as Color),
                width: overlay.strokeWidth ? overlay.strokeWidth : FEATURE_COLLECTION_STROKE_WIDTH,
              }),
              fill: new Fill({
                color: overlay.fillColor ? overlay.fillColor : FEATURE_COLLECTION_FILL_COLOR,
              }),
            }),
          };

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
    this._resetSelectedFeature();
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
        f.setStyle(this._unselectedStyle[f.getGeometry().getType()]);
      },
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      zIndex: FEATURE_COLLECTION_ZINDEX,
    });
    if (this.mapCmp.map != null) {
      this.mapCmp.map.addLayer(this._featureCollectionLayer);
    }

    this.mapCmp.map.on('click', e => {
      if (this._overlay$.value != null) {
        this._featureCollectionLayer.getFeatures(e.pixel).then(features => {
          const selectedFeature = features[0]; // Seleziona il primo elemento
          if (selectedFeature != null) {
            this._setFeatureAphaFillColor(selectedFeature, 1);

            const prop = selectedFeature?.getProperties() ?? null;
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
            if (prop != null && prop['popup'] != null) {
              this._featureCollectionLayer.getSource().removeFeature(this._selectedFeature);
              this._selectedFeature = selectedFeature;
              this._featureCollectionLayer.getSource().addFeature(this._selectedFeature);
              const extent = this._selectedFeature.getGeometry().getExtent();
              this.mapCmp.map.getView().fit(extent, {
                duration: 300, // Durata dell'animazione in millisecondi
                padding: [50, 50, 50, 50], // Margine intorno alla feature
              });
            }
            if (prop != null && prop['layer_id'] != null) {
              this.wmMapFeatureCollectionLayerSelected.emit(prop['layer_id']);
            }
            if (prop != null && prop['popup'] != null) {
              this.wmMapFeatureCollectionPopup.emit(prop['popup']);
            } else {
              this.wmMapFeatureCollectionPopup.emit(null);
            }
          }
        });
      }
    });
  }

  private _resetSelectedFeature(): void {
    const featureCollectionSourceLayer =
      this._featureCollectionLayer != null ? this._featureCollectionLayer.getSource() : null;
    if (this._selectedFeature != null && featureCollectionSourceLayer != null) {
      featureCollectionSourceLayer.removeFeature(this._selectedFeature);
      this._selectedFeature = null;
    }
  }

  private _setAlphaTo(rgba: string, trasparency = 1): string {
    // Utilizza una regular expression per estrarre i valori di rosso, verde, blu e alpha dalla stringa RGBA
    const rgbaRegex = /^rgba?\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})(?:,\s*([01]?\.?\d*))?\)$/;
    const match = rgba.match(rgbaRegex);

    if (match) {
      // Estrae i valori di rosso, verde, blu e ignora il valore originale di alpha, impostandolo a 1
      const red = match[1];
      const green = match[2];
      const blue = match[3];
      // Restituisce la nuova stringa RGBA con alpha impostato a 1
      return `rgba(${red}, ${green}, ${blue}, ${trasparency})`;
    } else {
      // Restituisce la stringa originale se non corrisponde al formato atteso
      return rgba;
    }
  }

  private _setFeatureAphaFillColor(feature: Feature, trasparency = 1): void {
    const featureStyle: Style = feature.getStyle() as Style;
    const geometryType = feature.getGeometry().getType();
    if (geometryType === 'Polygon') {
      const featureFillColor: string = featureStyle.getFill().getColor() as string;
      const color = this._setAlphaTo(featureFillColor, trasparency / 2);
      feature.setStyle(
        new Style({
          stroke: new Stroke({
            color: this._setAlphaTo(FEATURE_COLLECTION_STROKE_COLOR, trasparency),
            width: FEATURE_COLLECTION_STROKE_WIDTH,
          }),
          fill: new Fill({
            color,
          }),
        }),
      );
    } else if (geometryType === 'Point') {
      feature.setStyle(
        new Style({
          image: new CircleStyle({
            radius,
            fill: new Fill({
              color: this._setAlphaTo(FEATURE_COLLECTION_STROKE_COLOR, trasparency),
            }),
            stroke: new Stroke({
              color: this._setAlphaTo(FEATURE_COLLECTION_STROKE_COLOR, trasparency),
              width: FEATURE_COLLECTION_STROKE_WIDTH,
            }),
          }),
        }),
      );
    }
  }
}
