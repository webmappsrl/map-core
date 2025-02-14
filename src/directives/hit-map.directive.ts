import {WmFeatureCollection} from '@wm-types/feature';
import {HttpClient} from '@angular/common/http';
import {Directive, EventEmitter, Host, Input, Output} from '@angular/core';
import {filter, switchMap, take} from 'rxjs/operators';
import {Feature, MapBrowserEvent} from 'ol';
import GeoJSON from 'ol/format/GeoJSON';
import {Geometry} from 'ol/geom';
import VectorLayer from 'ol/layer/Vector';
import {default as VectorSource} from 'ol/source/Vector';
import {Fill, Stroke, Style, Text} from 'ol/style';
import {WmMapComponent} from '../components';
import {WmMapBaseDirective} from './base.directive';
import {FEATURE_COLLECTION_ZINDEX} from '../readonly';
import {Store} from '@ngrx/store';
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
  @Input() set wmMapHitMapChangeFeatureById(id: number | null) {
    if (id == null) {
      this._resetFeaturesStyle();
      return;
    }
    this.mapCmp.isInit$
      .pipe(
        filter(f => f),
        take(1),
      )
      .subscribe(() => {
        this.mapCmp.map.once('rendercomplete', () => {
          try {
            const features = this._hitMapLayer.getSource()?.getFeatures();
            const feature = features?.find(f => f.getProperties().id === id);
            if (feature) this._changeFeature(feature);
          } catch (e) {
            console.error(e);
          }
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

  onClick(evt: MapBrowserEvent<UIEvent>): void {
    this.mapCmp.wmMapEmptyClickEVT$.emit();

    const feats = this.mapCmp.map
      .getFeaturesAtPixel(evt.pixel, {hitTolerance: 30})
      .filter(f => f.getProperties().carg_code != null);
    if (feats.length > 0) {
      const newSelectedFeature = feats[0] as Feature<Geometry>;
      this._changeFeature(newSelectedFeature);
    } else {
      this._resetFeaturesStyle();
    }
  }

  private _changeFeature(feature: Feature<Geometry>): void {
    if (this._selectedFeature != null) {
      if (this._selectedFeature.getId() === feature.getId()) {
        return;
      } else {
        this._selectedFeature.setStyle(this.unselectedStyle.bind(this));
      }
    }
    this._selectedFeature = feature;
    const prop = this._selectedFeature?.getProperties() ?? null;
    const hitMapfeatureCollections = prop['featureCollections'];
    this._selectedFeature.setStyle(this.selectedStyle());
    this._store.dispatch(setHitMapFeatureCollections({hitMapfeatureCollections}));
    this.mapCmp.map.getView().fit(this._selectedFeature.getGeometry().getExtent());
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
        f.setStyle(this.unselectedStyle.bind(this));
      },
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      zIndex: FEATURE_COLLECTION_ZINDEX,
    });
    if (this.mapCmp.map != null) {
      this.mapCmp.map.addLayer(this._hitMapLayer);
      this.mapCmp.registerDirective(this._hitMapLayer['ol_uid'], this);
    }
    this.mapCmp.map.getView().on('change:resolution', () => {});
  }

  private _resetFeaturesStyle(): void {
    if (this._hitMapLayer && this._hitMapLayer.getSource()) {
      const features = this._hitMapLayer.getSource().getFeatures();
      features
        .filter(f => f != this._selectedFeature)
        .forEach(feature => feature.setStyle(this.unselectedStyle.bind(this)));
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

  private unselectedStyle(feature: Feature): Style {
    const properties = feature.getProperties();
    const cargCode = properties['carg_code'] ?? '';
    // Dividi la stringa in due parti
    const numericPartMatch = cargCode.match(/^([\d\-]+)/); // Cattura numeri e trattini iniziali
    const numericPart = numericPartMatch ? numericPartMatch[0].trim() : '';
    const textPart = cargCode.substring(numericPart.length).trim();
    const baseStyle = {
      stroke: new Stroke({
        color: 'rgba(231, 67, 58,0.5)',
        width: 2,
      }),
      fill: new Fill({
        color: 'rgba(231, 240, 58,0.5)',
      }),
    };
    const currentZoom = this.mapCmp?.getZoom() ?? 0;
    if (currentZoom >= 9) {
      baseStyle['text'] = new Text({
        text: `${numericPart}\n${textPart}`,
        font: '10px Calibri,sans-serif',
        textAlign: 'center',
        textBaseline: 'middle',
        fill: new Fill({
          color: 'rgba(0, 0, 0, 1)',
        }),
        stroke: new Stroke({
          color: 'rgba(255, 255, 255, 0.8)',
          width: 3,
        }),
      });
    }
    return new Style(baseStyle);
  }
}
