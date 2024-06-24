import {extend} from 'ol/extent';
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
import {
  FEATURE_COLLECTION_STROKE_COLOR,
  FEATURE_COLLECTION_FILL_COLOR,
  FEATURE_COLLECTION_STROKE_WIDTH,
  FEATURE_COLLECTION_ZINDEX,
} from '../readonly';
import CircleStyle from 'ol/style/Circle';
import {Type} from 'ol/geom/Geometry';
import {FeatureCollection, GeoJsonProperties} from 'geojson';
import {Store, createAction} from '@ngrx/store';
import {partitionToggleState} from '../store/map-core.selector';

export interface WmFeatureCollection extends FeatureCollection {
  properties: WmGeoJsonProperties;
}

export interface WmGeoJsonProperties extends GeoJsonProperties {
  distinctProperty: string;
}

@Directive({
  selector: '[wmMapFeatureCollection]',
})
export class WmMapFeatureCollectionDirective extends WmMapBaseDirective {
  private _enabled$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private _featureCollectionLayer: VectorLayer<VectorSource<Geometry>> | undefined;
  private _overlay$: BehaviorSubject<any | null> = new BehaviorSubject<any>({
    fillColor: FEATURE_COLLECTION_FILL_COLOR,
    strokeColor: FEATURE_COLLECTION_STROKE_COLOR,
    strokeWidth: FEATURE_COLLECTION_STROKE_WIDTH,
  });
  private _partitionToggleState = {};
  private _partitionToggleState$ = this._store
    .select(partitionToggleState)
    .pipe(filter(p => p != null));
  private _primaryColor: string | null = null;
  private _selectedFeature: Feature | null = null;

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
    this._partitionToggleState = {};
  }

  @Input('wmMapFeatureCollectionOverlayUnselect') set unselect(unselect: any) {
    if (this._featureCollectionLayer != null && this._selectedFeature != null) {
      this._resetStyle(this._selectedFeature);
      this.mapCmp.map.render();
      this.mapCmp.map.changed();
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
  wmMapFeatureCollectionPartitionsSelected: EventEmitter<any[] | null> = new EventEmitter<
    any[] | null
  >();
  @Output()
  wmMapFeatureCollectionPopup: EventEmitter<any> = new EventEmitter<any>();

  constructor(@Host() mapCmp: WmMapComponent, private _http: HttpClient, private _store: Store) {
    super(mapCmp);
    this._enabled$
      .pipe(
        filter(e => e === true),
        switchMap(() => this.mapCmp.isInit$),
        filter(f => f === true),
        switchMap(_ => this._overlay$),
        filter(overlay => overlay != null && overlay.url != null),
        switchMap(overlay => {
          return this._http.get(overlay.url);
        }),
      )
      .subscribe((geojson: WmFeatureCollection) => {
        this.mapCmp.map.once('precompose', () => {
          this._buildGeojson(geojson);
        });
      });
    this._partitionToggleState$.subscribe(partitionToggleState => {
      this._partitionToggleState = partitionToggleState;
      this._updateFeaturesStyle();
    });
  }

  private _buildGeojson(geojson: WmFeatureCollection): void {
    geojson.features.map(f => {
      f.properties;
    });
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
        f.setStyle(this.getStyle(f));
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
        const feat = this.mapCmp.map.getFeaturesAtPixel(e.pixel, {
          layerFilter: l => l === this._featureCollectionLayer,
          hitTolerance: 10,
        });
        const selectedFeature = feat[feat.length - 1] as Feature<Geometry>;

        if (selectedFeature != null) {
          const prop = selectedFeature.getProperties() ?? null;
          if (prop != null) {
            if (prop['clickable'] === true) {
              if (this._selectedFeature != null) {
                this._featureCollectionLayer.getSource().addFeature(this._selectedFeature);
                this._selectedFeature = null;
              }
              if (features.length > 0) {
                this._featureCollectionLayer.getSource().removeFeature(selectedFeature);
                this._selectedFeature = selectedFeature;
              }
            }
            if (prop['popup'] != null) {
              this._resetStyle(this._selectedFeature);
              this._selectedFeature = selectedFeature;
              const geometryType = this._selectedFeature.getGeometry().getType();
              if (geometryType === 'MultiLineString' || geometryType === 'LineString') {
                this._setStrokeColor(this._selectedFeature, this._overlay$.value.fillColor);
                this._setFillColor(this._selectedFeature, this._overlay$.value.strokeColor);
                this._setStrokeWidth(this._selectedFeature, this._overlay$.value.strokeWidth + 20);
              } else if (geometryType === 'Point') {
                this._setFillColor(this._selectedFeature, this._overlay$.value.strokeColor);
              } else if (geometryType === 'MultiPolygon' || geometryType === 'Polygon') {
                this._setFeatureAphaFillColor(this._selectedFeature, 0.8);
              }
              const extent = this._selectedFeature.getGeometry().getExtent();
              this.mapCmp.map.getView().fit(extent, {
                duration: 300, // Durata dell'animazione in millisecondi
                padding: [50, 50, 50, 50], // Margine intorno alla feature
              });
              this.wmMapFeatureCollectionPopup.emit(prop['popup']);
            }
            if (prop['layer_id'] != null) {
              this.wmMapFeatureCollectionLayerSelected.emit(prop['layer_id']);
            }
          } else {
            this.wmMapFeatureCollectionPopup.emit(null);
          }
        } else {
          this.wmMapFeatureCollectionLayerSelected.emit(null);
          this.wmMapFeatureCollectionPopup.emit(null);
          if (this._selectedFeature != null) {
            this._resetStyle(this._selectedFeature);
            this._selectedFeature = null;
          }
        }
      } else if (this._selectedFeature != null) {
        this._selectedFeature.setStyle(this.getStyle(this._selectedFeature));
        this.wmMapFeatureCollectionPopup.emit('');
      }
    });
    this.mapCmp.map.getView().on('change:resolution', () => {
      this._updateFeaturesStyle();
    });
  }

  private _calculateRadiusForZoom(baseRadius = 10): number {
    const zoomFactor = 2;
    const zoom = this.mapCmp.map?.getView().getZoom() || 13;
    return (baseRadius * Math.pow(zoomFactor, zoom - 1)) / 8000;
  }

  private _resetSelectedFeature(): void {
    const featureCollectionSourceLayer =
      this._featureCollectionLayer != null ? this._featureCollectionLayer.getSource() : null;
    if (this._selectedFeature != null && featureCollectionSourceLayer != null) {
      featureCollectionSourceLayer.removeFeature(this._selectedFeature);
      this._selectedFeature = null;
    }
  }

  private _resetStyle(feature): void {
    if (feature != null) {
      this._selectedFeature.setStyle(this.getStyle(feature));
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
    if (feature != null) {
      const featureStyle: Style = feature.getStyle() as Style;
      const geometryType = feature.getGeometry().getType();
      if (
        geometryType === 'Polygon' ||
        geometryType === 'MultiPolygon' ||
        geometryType === 'GeometryCollection'
      ) {
        const featureFillColor: string = this._overlay$.value.fillColor as string;
        const featureStrokeColor: string = this._overlay$.value.strokeColor as string;
        feature.setStyle(
          new Style({
            stroke: new Stroke({
              color: this._setAlphaTo(featureStrokeColor, trasparency),
              width: this._overlay$.value.strokeWidth
                ? this._overlay$.value.strokeWidth
                : FEATURE_COLLECTION_STROKE_WIDTH,
            }),
            fill: new Fill({
              color: this._setAlphaTo(featureFillColor, trasparency),
            }),
          }),
        );
      } else if (geometryType === 'Point') {
        feature.setStyle(this.getStyle(feature));
      }
    }
  }

  private _setFillColor(feature: Feature, color): void {
    if (feature != null) {
      const featureStyle: Style = feature.getStyle() as Style;
      const geometryType = feature.getGeometry().getType();

      const featureFill = featureStyle.getFill();
      switch (geometryType) {
        case 'Point':
          const circleStyle = featureStyle.getImage() as CircleStyle;
          circleStyle.setFill(
            new Fill({
              color,
            }),
          );
          break;
        case 'MultiLineString':
          featureFill.setColor(color);
          break;
      }
      feature.setStyle(featureStyle);
    }
  }

  private _setStrokeColor(feature: Feature, color): void {
    if (feature != null) {
      const featureStyle: Style = feature.getStyle() as Style;
      const geometryType = feature.getGeometry().getType();
      switch (geometryType) {
        case 'Point':
          const featureStroke = featureStyle.getStroke();
          featureStroke.setColor(color);
          break;
      }
    }
  }

  private _setStrokeWidth(feature: Feature, width = 10): void {
    if (feature != null) {
      const featureStyle: Style = feature.getStyle() as Style;
      const geometryType = feature.getGeometry().getType();
      const featureStroke = featureStyle.getStroke();
      featureStroke.setWidth(width);
    }
  }

  private _updateFeatureSizes(feature): void {
    const style = feature.getStyle() as Style;
    const geometryType = feature?.getGeometry()?.getType();
    const newStrokeWidth = this._calculateRadiusForZoom();

    if (geometryType === 'Point') {
      const image = style?.getImage() as CircleStyle;
      if (image) {
        image.setRadius(newStrokeWidth);
      }
    } else if (geometryType === 'MultiLineString' || geometryType === 'LineString') {
      const stroke = style?.getStroke() as Stroke;
      if (stroke) {
        stroke.setWidth(this._calculateRadiusForZoom());
      }
    } else if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
      const stroke = style?.getStroke() as Stroke;
      if (stroke) {
        stroke.setWidth(this._calculateRadiusForZoom(2));
      }
    }

    feature.setStyle(style);
  }

  private _updateFeaturesStyle(): void {
    if (this._featureCollectionLayer && this._featureCollectionLayer.getSource()) {
      const features = this._featureCollectionLayer.getSource().getFeatures();
      features.forEach(feature => {
        // Salta l'aggiornamento dello stile se la feature è quella selezionata
        if (feature !== this._selectedFeature) {
          feature.setStyle(this.getStyle(feature));
        } else {
          this._updateFeatureSizes(feature);
        }
      });
    }
  }

  private getStyle(feature: Feature): Style {
    try {
      const geometryType: Type = feature.getGeometry().getType();
      const properties = feature.getProperties();
      const overlay = this._overlay$.value;
      let radius = 6;

      let strokeColor = overlay.strokeColor;
      let fillColor = overlay.fillColor;

      switch (geometryType) {
        case 'Point':
          radius = this._calculateRadiusForZoom();
          return new Style({
            image: new CircleStyle({
              radius,
              fill: new Fill({
                color: fillColor.replace('0.3', '0'),
              }),
              stroke: new Stroke({
                color: strokeColor.replace('0.3', '0'),
                width: overlay.strokeWidth,
              }),
            }),
          });
        case 'MultiLineString':
          return new Style({
            stroke: new Stroke({
              color: strokeColor,
              width: this._calculateRadiusForZoom(overlay.strokeWidth),
            }),
            fill: new Fill({
              color: fillColor,
            }),
          });
        default:
          if (
            overlay.distinctProperty != null &&
            properties[overlay.distinctProperty] != null &&
            overlay.partitionProperties != null
          ) {
            const hideStyle = new Style({
              fill: new Fill({
                color: 'rgba(0, 0, 0, 0)',
              }),
              stroke: new Stroke({
                color: 'rgba(0, 0, 0, 0)',
                width: 1,
              }),
            });

            const myProperties = overlay.partitionProperties.filter(
              d => d.value === properties[overlay.distinctProperty],
            );
            if (properties[overlay.distinctProperty] != null) {
              if (this._partitionToggleState[properties[overlay.distinctProperty]] === false) {
                return hideStyle;
              }
            }

            if (myProperties.length > 0) {
              const myProperty = myProperties[0];
              return new Style({
                fill: new Fill({
                  color: myProperty.fillColor.replace('0.3', '0'),
                }),
                stroke: new Stroke({
                  color: myProperty.strokeColor.replace('0.3', '0'),
                  width: myProperty.strokeWidth,
                }),
              });
            }
          }
          return new Style({
            stroke: new Stroke({
              color: strokeColor.replace('0.3', '0'),
              width: overlay.strokeWidth,
            }),
            fill: new Fill({
              color: fillColor.replace('0.3', '0'),
            }),
          });
      }
    } catch (error) {
      console.log(feature);
    }
  }
}
