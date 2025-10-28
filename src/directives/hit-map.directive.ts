import {WmFeatureCollection} from '@wm-types/feature';
import {HttpClient} from '@angular/common/http';
import {Directive, EventEmitter, Host, Input, Output} from '@angular/core';
import {filter, switchMap, take} from 'rxjs/operators';
import {Feature, MapBrowserEvent} from 'ol';
import GeoJSON from 'ol/format/GeoJSON';
import {Geometry} from 'ol/geom';
import VectorLayer from 'ol/layer/Vector';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import {default as VectorSource} from 'ol/source/Vector';
import {Fill, Stroke, Style, Text} from 'ol/style';
import {WmMapComponent} from '../components';
import {WmMapBaseDirective} from './base.directive';
import {FEATURE_COLLECTION_ZINDEX} from '../readonly';
import {Store} from '@ngrx/store';
import {setHitMapFeatureCollections, setHitMapGeometry} from '../store/map-core.actions';
import {coordsFromLonLat, CustomTileSource, extentToLonLat} from '@map-core/utils';
@Directive({
  selector: '[wmMapHitMapCollection]',
})
export class WmMapHitMapDirective extends WmMapBaseDirective {
  private _hitMapLayer: VectorLayer<VectorSource<Geometry>> | undefined;
  private _tileLayer: TileLayer<XYZ> | undefined;
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
          this._addTileLayer(); // Aggiunta del nuovo tile sopra il layer esistente
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
            const features = this._hitMapLayer?.getSource()?.getFeatures();
            const feature = features?.find(f => f.getProperties().id === id);
            if (feature) this._changeFeature(feature);
          } catch (e) {
            console.error(e);
          }
        });
      });
  }

  @Output()
  wmMapFeatureCollectionPartitionsSelected: EventEmitter<any[] | null> = new EventEmitter<
    any[] | null
  >();

  @Output()
  wmMapFeatureCollectionPopup: EventEmitter<any> = new EventEmitter<any>();

  @Output()
  wmMapHitMapfeatureClicked: EventEmitter<string> = new EventEmitter<string>();

  constructor(@Host() mapCmp: WmMapComponent, private _http: HttpClient, private _store: Store) {
    super(mapCmp);
    this.mapCmp.wmMapEmptyClickEVT$.subscribe(() => {
      this._resetFeaturesStyle();
    });
  }

  onClick(evt: MapBrowserEvent<UIEvent>): void {
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

  private _addTileLayer(): void {
    if (this._tileLayer) {
      this.mapCmp.map.removeLayer(this._tileLayer);
    }

    // Crea il nuovo TileLayer con zIndex subito dopo l'ultimo
    this._tileLayer = new TileLayer({
      source: new CustomTileSource({
        url: 'https://carg.geosciences-ir.it/storage/cargmap/{z}/{x}/{y}.png',
        cacheSize: 50000,
        projection: 'EPSG:3857',
      }),
      visible: true,
      opacity: 1,
      zIndex: 1,
    });

    this.mapCmp.map.addLayer(this._tileLayer);
  }

  private _changeFeature(feature: Feature<Geometry>): void {
    if (this._selectedFeature != null) {
      if (this._selectedFeature.getId() === feature.getId()) {
        return;
      } else {
        this.mapCmp?.wmMapControls?.reset();
        this._selectedFeature.setStyle(this.unselectedStyle.bind(this));
      }
    }
    this._selectedFeature = feature;
    const prop = this._selectedFeature?.getProperties() ?? null;
    const hitMapfeatureCollections =
      prop && prop['featureCollections'] ? prop['featureCollections'] : null;
    if (this._selectedFeature) {
      this._selectedFeature.setStyle(this.selectedStyle());
      this.mapCmp.map.getView().fit(this._selectedFeature.getGeometry().getExtent());
    }
    this.wmMapHitMapfeatureClicked.emit(this._selectedFeature.getProperties().id);
    this._store.dispatch(setHitMapFeatureCollections({hitMapfeatureCollections}));
    this._store.dispatch(
      setHitMapGeometry({
        hitMapGeometry: extentToLonLat(this._selectedFeature.getGeometry().getExtent()),
      }),
    );
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
    if (this._selectedFeature != null) {
      this.mapCmp?.wmMapControls?.reset();
      this._selectedFeature?.setStyle(this.unselectedStyle.bind(this));
      this._selectedFeature = null;
      this._store.dispatch(setHitMapFeatureCollections({hitMapfeatureCollections: null}));
    }
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
    const numericPartMatch = cargCode.match(/^([\d\-]+)/);
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
