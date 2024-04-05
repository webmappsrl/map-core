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
import {Store} from '@ngrx/store';
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
        filter(overlay => overlay != null),
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
        const feat = this.mapCmp.map.getFeaturesAtPixel(e.pixel, {hitTolerance: 30});
        const selectedFeature = feat[0] as Feature<Geometry>;
        if (selectedFeature != null) {
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
            this._resetStyle(this._selectedFeature);
            if (selectedFeature.getGeometry().getType() === 'MultiLineString') {
              this._setStrokeWidth(selectedFeature, this._overlay$.value.strokeWidth + 10);
              this._setStrokeColor(selectedFeature, this._overlay$.value.fillColor);
            } else {
              this._setFeatureAphaFillColor(selectedFeature, 0.3);
            }
            this._selectedFeature = selectedFeature;
            const extent = selectedFeature.getGeometry().getExtent();
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
        } else if (this._selectedFeature != null) {
          this._selectedFeature.setStyle(this.getStyle(this._selectedFeature));
          this.wmMapFeatureCollectionPopup.emit('');
        }
      }
    });
    this.mapCmp.map.getView().on('change:resolution', () => {
      this._updateFeaturesStyle();
      if (
        this._selectedFeature != null &&
        this._selectedFeature.getGeometry().getType() === 'Point'
      ) {
        this._selectedFeature.setStyle(this.getStyle(this._selectedFeature));
      }
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

  private _setStrokeColor(feature: Feature, color): void {
    if (feature != null) {
      const featureStyle: Style = feature.getStyle() as Style;
      const geometryType = feature.getGeometry().getType();
      if (geometryType === 'MultiLineString') {
        const featureStroke = featureStyle.getStroke();
        featureStroke.setColor(color);
      }
    }
  }

  private _setStrokeWidth(feature: Feature, width = 10): void {
    if (feature != null) {
      const featureStyle: Style = feature.getStyle() as Style;
      const geometryType = feature.getGeometry().getType();
      if (geometryType === 'MultiLineString') {
        const featureStroke = featureStyle.getStroke();
        featureStroke.setWidth(width);
      }
    }
  }

  private _updateFeaturesStyle(): void {
    if (this._featureCollectionLayer && this._featureCollectionLayer.getSource()) {
      const features = this._featureCollectionLayer.getSource().getFeatures();
      features
        .filter(f => f != this._selectedFeature)
        .forEach(feature => feature.setStyle(this.getStyle(feature)));
    }
  }

  private getStyle(feature: Feature): Style {
    const geometryType: Type = feature.getGeometry().getType();
    const properties = feature.getProperties();
    const overlay = this._overlay$.value;
    let radius = 6;

    switch (geometryType) {
      case 'Point':
        radius = this._calculateRadiusForZoom();
        return new Style({
          image: new CircleStyle({
            radius,
            fill: new Fill({
              color: overlay.fillColor.replace('0.1', '0'),
            }),
            stroke: new Stroke({
              color: overlay.strokeColor.replace('0.1', '0'),
              width: overlay.strokeWidth,
            }),
          }),
        });
      case 'MultiLineString':
        return new Style({
          stroke: new Stroke({
            color: overlay.strokeColor,
            width: this._calculateRadiusForZoom(overlay.strokeWidth),
          }),
          fill: new Fill({
            color: overlay.fillColor,
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
                color: myProperty.fillColor.replace('0.1', '0'),
              }),
              stroke: new Stroke({
                color: myProperty.strokeColor.replace('0.1', '0'),
                width: myProperty.strokeWidth,
              }),
            });
          }
        }
        return new Style({
          stroke: new Stroke({
            color: overlay.strokeColor.replace('0.1', '0'),
            width: overlay.strokeWidth,
          }),
          fill: new Fill({
            color: overlay.fillColor.replace('0.1', '0'),
          }),
        });
    }
  }
}
