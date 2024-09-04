import {HttpClient} from '@angular/common/http';
import {Directive, EventEmitter, Host, Input, Output} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {filter, switchMap, take} from 'rxjs/operators';
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
import {Store} from '@ngrx/store';
import {partitionToggleState} from '../store/map-core.selector';
import {WmFeatureCollection} from './feature-collection.directive';
import {setHitMapFeatureCollections} from '../store/map-core.actions';

@Directive({
  selector: '[wmMapHitMapCollection]',
})
export class WmMapHitMapDirective extends WmMapBaseDirective {
  private _hitMapLayer: VectorLayer<VectorSource<Geometry>> | undefined;
  private _selectedFeature: Feature | null = null;

  @Input() set wmMapHitMapUrl(url: undefined | string) {
    this.mapCmp.isInit$
      .pipe(
        filter(e => e === true && url != null),
        switchMap(_ => {
          return this._http.get(url);
        }),
        take(1),
      )
      .subscribe((geojson: WmFeatureCollection) => {
        this.mapCmp.map.once('precompose', () => {
          this._buildGeojson(geojson);
        });
      });
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
  @Output()
  wmMapFeatureCollectionPartitionsSelected: EventEmitter<any[] | null> = new EventEmitter<
    any[] | null
  >();
  @Output()
  wmMapFeatureCollectionPopup: EventEmitter<any> = new EventEmitter<any>();

  constructor(@Host() mapCmp: WmMapComponent, private _http: HttpClient, private _store: Store) {
    super(mapCmp);
  }

  private _buildGeojson(geojson: WmFeatureCollection): void {
    geojson.features.map(f => {
      f.properties;
    });
    let count = 0;
    const features = new GeoJSON({
      featureProjection: 'EPSG:3857',
    }).readFeatures(geojson);
    const vectorSource = new VectorSource({
      format: new GeoJSON(),
      features: features,
    });
    if (this._hitMapLayer != null && this._hitMapLayer.getSource() != null) {
      this._hitMapLayer.getSource().clear();
    }
    this._hitMapLayer = new VectorLayer({
      source: vectorSource,
      style: (f: Feature<Geometry>) => {
        f.setId(count);
        count++;
        f.setStyle(this.unselectedStyle());
      },
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      zIndex: FEATURE_COLLECTION_ZINDEX,
    });
    if (this.mapCmp.map != null) {
      this.mapCmp.map.addLayer(this._hitMapLayer);
    }

    this.mapCmp.map.on('click', e => {
      const feats = this.mapCmp.map
        .getFeaturesAtPixel(e.pixel, {hitTolerance: 30})
        .filter(f => f.getProperties().carg_code != null);
      if (feats.length > 0) {
        const newSelectedFeature = feats[0] as Feature<Geometry>;
        if (this._selectedFeature != null) {
          if (this._selectedFeature.getId() === newSelectedFeature.getId()) {
            return;
          } else {
            this._selectedFeature.setStyle(this.unselectedStyle());
          }
        }
        this._selectedFeature = newSelectedFeature;
        const prop = this._selectedFeature?.getProperties() ?? null;
        const hitMapfeatureCollections = prop['featureCollections'];
        this._selectedFeature.setStyle(this.selectedStyle());
        this._store.dispatch(setHitMapFeatureCollections({hitMapfeatureCollections}));
        this.mapCmp.map.getView().fit(this._selectedFeature.getGeometry().getExtent());
      } else {
        this._resetFeaturesStyle();
      }
    });
    this.mapCmp.map.getView().on('change:resolution', () => {});
  }

  private _resetFeaturesStyle(): void {
    if (this._hitMapLayer && this._hitMapLayer.getSource()) {
      const features = this._hitMapLayer.getSource().getFeatures();
      features
        .filter(f => f != this._selectedFeature)
        .forEach(feature => feature.setStyle(this.unselectedStyle()));
    }
    this._selectedFeature = null;
  }

  private selectedStyle(): Style {
    return new Style({
      stroke: new Stroke({
        color: 'rgba(231, 67, 58,0.5)',
        width: 2,
      }),
      fill: new Fill({
        color: 'rgba(231, 240, 58,0)',
      }),
    });
  }

  private unselectedStyle(): Style {
    return new Style({
      stroke: new Stroke({
        color: 'rgba(231, 67, 58,0.5)',
        width: 2,
      }),
      fill: new Fill({
        color: 'rgba(231, 240, 58,0.5)',
      }),
    });
  }
}
