import {
  ChangeDetectorRef,
  Directive,
  EventEmitter,
  Host,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import {WmMapBaseDirective} from './base.directive';
import {filter, take} from 'rxjs/operators';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {BehaviorSubject} from 'rxjs';
import {WmMapComponent} from '../components';
import {CLUSTER_ZINDEX, DEF_MAP_MAX_PBF_ZOOM, UGC_POI_ZINDEX} from '../readonly';
import {Icon, Style} from 'ol/style';
import {
  clearLayer,
  clusterHullStyle,
  createCluster,
  createHull,
  createLayer,
} from '../../src/utils';
import {Feature, MapBrowserEvent} from 'ol';
import {Point as OlPoint} from 'ol/geom';
import {Point} from 'geojson';
import {fromLonLat} from 'ol/proj';
import {WmFeature} from '@wm-types/feature';
import {Cluster} from 'ol/source';
import Popup from 'ol-ext/overlay/Popup';
import {createEmpty, extend} from 'ol/extent';

const PADDING = [80, 80, 80, 80];
const TRESHOLD_ENABLE_FIT = 2;

@Directive({
  selector: '[wmMapUgcPois]',
})
export class WmUgcPoisDirective extends WmMapBaseDirective implements OnChanges {
  private _disabled = false;
  private _hullClusterLayer: VectorLayer<Cluster>;
  private _popupOverlay: Popup;
  private _selectCluster: any;
  private _selectedUgcPoiLayer: VectorLayer<VectorSource>;
  private _wmMapUgcPois: BehaviorSubject<WmFeature<Point>[]> = new BehaviorSubject<
    WmFeature<Point>[]
  >([]);
  private _wmMapUgcPoisLayer: VectorLayer<VectorSource>;

  @Input() set wmMapUgcPoiDisableClusterLayer(disabled: boolean) {
    this._disabled = disabled;
    this._ugcPoisClusterLayer?.setVisible(!disabled);
  }

  @Input() set wmMapUgcPois(ugcPois: WmFeature<Point>[]) {
    this._wmMapUgcPois.next(ugcPois);
  }

  @Input() wmMapUgcPoi: number | 'reset';
  @Input() wmMapUgcUnselectedPoi: boolean;
  @Output() currentUgcPoiEvt: EventEmitter<any> = new EventEmitter<any>();

  _ugcPoisClusterLayer: VectorLayer<Cluster>;

  constructor(private _cdr: ChangeDetectorRef, @Host() mapCmp: WmMapComponent) {
    super(mapCmp);
    this.mapCmp.isInit$
      .pipe(
        filter(f => f === true),
        take(1),
      )
      .subscribe(() => {
        this._initLayer();
        this.mapCmp.map.once('rendercomplete', () => {
          this._wmMapUgcPois
            .pipe(
              filter(p => !!p && p.length > 0),
              take(1),
            )
            .subscribe(p => {
              this._addPoisLayer(p);
            });
        });
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.mapCmp.isInit$
      .pipe(
        filter(f => f === true),
        take(1),
      )
      .subscribe(() => {
        if (changes.wmMapUgcPoi) {
          this.mapCmp.map.once('rendercomplete', () => {
            this._setPoi(this.wmMapUgcPoi);
          });
        }
        if (changes.wmMapUgcUnselectedPoi != null) {
          clearLayer(this._selectedUgcPoiLayer);
        }
        if (
          changes.wmMapUgcPois &&
          changes.wmMapUgcPois.previousValue != null &&
          changes.wmMapUgcPois.currentValue != null &&
          changes.wmMapUgcPois.previousValue.length != changes.wmMapUgcPois.currentValue.length
        ) {
          this._addPoisLayer(changes.wmMapUgcPois.currentValue);
        }
      });
  }

  onClick(evt: MapBrowserEvent<UIEvent>): void {
    this._ugcPoisClusterLayer.getFeatures(evt.pixel).then(features => {
      if (features.length > 0) {
        this.mapCmp.map.addInteraction(this._selectCluster);
        this._selectCluster.getFeatures().on(['add'], e => {
          var c = e.element.get('features');
          if (c != null && c.length === 1) {
            const poi = c[0].getProperties();
            this._selectIcon(poi);
          }
        });
        const clusterMembers = features[0].get('features');
        const view = this.mapCmp.map.getView();
        if (clusterMembers.length > 3) {
          setTimeout(() => {
            // Zoom to the extent of the cluster members.
            const extent = createEmpty();
            clusterMembers.forEach(feature => extend(extent, feature.getGeometry().getExtent()));
            view.fit(extent, {duration: 500, padding: PADDING});
          }, 400);
        }
        if (clusterMembers.length === 1) {
          const poiFeature = clusterMembers[0].getProperties();
          this._selectIcon(poiFeature);
        }
      }
    });
  }

  private _addPoisLayer(poiFeatureCollection: WmFeature<Point>[]): void {
    const iconFeatures = [];
    clearLayer(this._wmMapUgcPoisLayer);
    const clusterSource: Cluster = this._ugcPoisClusterLayer.getSource();
    this._ugcPoisClusterLayer.set('onClick', this.onClick);
    const featureSource = clusterSource.getSource();
    featureSource.clear();
    if (poiFeatureCollection) {
      for (const poi of poiFeatureCollection.filter(poi => poi.geometry != null)) {
        const coordinates = [
          poi.geometry.coordinates[0] as number,
          poi.geometry.coordinates[1] as number,
        ] || [0, 0];
        const position = fromLonLat([coordinates[0] as number, coordinates[1] as number]);
        const iconFeature = new Feature({
          type: 'icon',
          geometry: new OlPoint([position[0], position[1]]),
          properties: poi.properties,
        });
        let iconStyle = new Style({
          image: new Icon({
            anchor: [0.5, 0.5],
            scale: 0.7,
            src: 'assets/icons/pois/poi_type_poi.png',
          }),
        });
        iconFeature.setStyle(iconStyle);
        iconFeature.setId(poi.properties.id);
        iconFeatures.push(iconFeature);
      }
      featureSource.addFeatures(iconFeatures);
      featureSource.changed();
      clusterSource.changed();
      this.mapCmp.map.getRenderer();
    }
  }

  private _checkZoom(layer: VectorLayer<any>): void {
    if (!this._disabled) {
      const view = this.mapCmp.map.getView();
      if (view != null && this.wmMapConf != null) {
        const newZoom = +view.getZoom();
        const poisMinZoom = +this.wmMapConf?.pois?.poiMinZoom || 15;
        if (newZoom >= poisMinZoom) {
          layer.setVisible(true);
        } else {
          layer.setVisible(false);
        }
      }
    }
  }

  private _initLayer(): void {
    this._ugcPoisClusterLayer = createCluster(this._ugcPoisClusterLayer, CLUSTER_ZINDEX, {
      r: 202,
      g: 21,
      b: 81,
    });
    this._wmMapUgcPoisLayer = createLayer(this._wmMapUgcPoisLayer, UGC_POI_ZINDEX);
    this._wmMapUgcPoisLayer.set('name', 'ugc-pois');
    this._selectedUgcPoiLayer = createLayer(this._selectedUgcPoiLayer, UGC_POI_ZINDEX + 100);
    const clusterSource: Cluster = this._ugcPoisClusterLayer.getSource();
    this._hullClusterLayer = new VectorLayer({
      style: clusterHullStyle,
      source: clusterSource,
    });
    this._selectCluster = createHull();
    this._popupOverlay = new Popup({
      popupClass: 'default anim', //"tooltips", "warning" "black" "default", "tips", "shadow",
      closeBox: true,
      offset: [0, -16],
      positioning: 'bottom-center',
      onclose: () => {
        clearLayer(this._selectedUgcPoiLayer);
      },
      autoPan: {
        animation: {
          duration: 100,
        },
      },
    });
    this.mapCmp.map.addLayer(this._ugcPoisClusterLayer);
    this.mapCmp.map.addLayer(this._hullClusterLayer);
    this.mapCmp.map.addLayer(this._wmMapUgcPoisLayer);
    this.mapCmp.map.addLayer(this._selectedUgcPoiLayer);
    this.mapCmp.map.addOverlay(this._popupOverlay);
    this.mapCmp.registerDirective(this._ugcPoisClusterLayer['ol_uid'], this);
  }

  private _selectIcon(currentPoi: any): void {
    clearLayer(this._selectedUgcPoiLayer);
    if (currentPoi != null) {
      const selectedUgcPoiLayerSource = this._selectedUgcPoiLayer.getSource();
      let geometry = null;

      if (currentPoi.geometry != null && currentPoi.geometry.coordinates != null) {
        const coordinates = [
          currentPoi.geometry.coordinates[0] as number,
          currentPoi.geometry.coordinates[1] as number,
        ] || [0, 0];
        const position = fromLonLat([coordinates[0] as number, coordinates[1] as number]);
        geometry = new OlPoint([position[0], position[1]]);
      } else {
        geometry = currentPoi.geometry;
      }

      if (currentPoi.properties != null) {
        const iconFeature = new Feature({type: 'icon', geometry});
        let iconStyle = new Style({
          zIndex: UGC_POI_ZINDEX + 10,
          image: new Icon({
            anchor: [0.5, 0.5],
            scale: 0.7,
            src: 'assets/icons/pois/poi_type_poi_selected.png',
          }),
        });
        iconFeature.setStyle(iconStyle);
        iconFeature.setId(currentPoi.properties.id);
        selectedUgcPoiLayerSource.addFeature(iconFeature);
        selectedUgcPoiLayerSource.changed();
      }

      const poiInteraction = this.wmMapConf.pois.poi_interaction ?? 'tooltip';
      switch (poiInteraction) {
        case 'no_interaction':
          break;
        case 'popup':
        default:
          this.currentUgcPoiEvt.emit(currentPoi);
          break;
      }
      this.mapCmp.map.once('rendercomplete', () => {
        const geometryExtent = geometry.getExtent();
        const view = this.mapCmp.map.getView();
        const targetZoom = view.getZoomForResolution(view.getResolutionForExtent(geometryExtent));
        const currentZoom = Math.floor(view.getZoom());
        if (targetZoom > DEF_MAP_MAX_PBF_ZOOM && currentZoom < DEF_MAP_MAX_PBF_ZOOM) {
          this.fitView(geometry as any, {
            maxZoom: DEF_MAP_MAX_PBF_ZOOM,
            duration: 0,
          });
          setTimeout(() => {
            this.fitView(geometry as any);
          }, 600);
        } else {
          this.fitView(geometry as any);
        }
        this.mapCmp.map.removeInteraction(this._selectCluster);
      });
    }
  }

  private _setPoi(id: number | 'reset'): void {
    if (id != 'reset' && id > -1) {
      this._wmMapUgcPois
        .pipe(
          filter(p => !!p),
          take(1),
        )
        .subscribe(pois => {
          const currentPoi = pois.find(p => +p.properties.id === +id);
          this._selectIcon(currentPoi);
        });
    }
  }
}
