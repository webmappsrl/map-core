import {
  Directive,
  EventEmitter,
  Host,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import {SelectCluster} from 'ol-ext/interaction/SelectCluster';
import {createEmpty, extend} from 'ol/extent';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import MapBrowserEvent from 'ol/MapBrowserEvent';
import {fromLonLat} from 'ol/proj';
import Icon from 'ol/style/Icon';
import Style from 'ol/style/Style';
import {FitOptions} from 'ol/View';
import {Subscription} from 'rxjs';
import {clusterHullStyle, fromHEXToColor, setCurrentCluster} from './../utils/styles';

import {Cluster} from 'ol/source';
import VectorSource from 'ol/source/Vector';
import {WmMapBaseDirective} from '.';
import {WmMapComponent} from '../components';
import {FLAG_TRACK_ZINDEX, ICN_PATH} from '../readonly';
import {IGeojsonFeature, IGeojsonGeneric} from '../types/model';
import {
  changedLayer,
  clearLayer,
  createCluster,
  createHull,
  createLayer,
  intersectionBetweenArrays,
  nearestFeatureOfCluster,
} from '../utils';

const PADDING = [0, 0, 250, 0];
@Directive({
  selector: '[wmMapPois]',
})
export class WmMapPoisDirective extends WmMapBaseDirective implements OnChanges, OnDestroy {
  private _hullClusterLayer: VectorLayer<Cluster>;
  private _isInit = false;
  private _onClickSub: Subscription = Subscription.EMPTY;
  private _poisClusterLayer: VectorLayer<Cluster>;
  private _selectCluster: SelectCluster;
  private _selectedPoiLayer: VectorLayer<VectorSource>;

  @Input() WmMapPoisUnselectPoi: boolean;
  @Input() onClick: EventEmitter<MapBrowserEvent<UIEvent>>;
  @Input() wmMapPoisFilters: any[] = [];
  @Input() wmMapPoisPoi: number | 'reset';
  @Input() wmMapPoisPois: any;
  @Output() currentPoiEvt: EventEmitter<any> = new EventEmitter<any>();

  constructor(@Host() private _mapCmp: WmMapComponent) {
    super();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes.wmMapMap != null &&
      changes.wmMapMap.previousValue == null &&
      changes.wmMapMap.currentValue != null &&
      this._isInit === false
    ) {
      this._initDirective();
      this._renderPois();
    }
    if (changes.wmMapPoisPoi) {
      if (this.wmMapMap != null) {
        this._setPoi(this.wmMapPoisPoi);
      } else {
        setTimeout(() => {
          this._setPoi(this.wmMapPoisPoi);
        }, 300);
      }
    }
    if (changes.onClick && changes.onClick.firstChange) {
      this._onClickSub = this.onClick.subscribe(event => {
        this.wmMapMap.removeInteraction(this._selectCluster);
        this._selectCluster = createHull(this.wmMapMap);
        clearLayer(this._selectedPoiLayer);
        try {
          this._poisClusterLayer.getFeatures(event.pixel).then(features => {
            if (features.length > 0) {
              setCurrentCluster(features[0]);
              const clusterMembers = features[0].get('features');
              if (clusterMembers.length > 4) {
                this.wmMapMap.removeInteraction(this._selectCluster);
                this._selectCluster = createHull(this.wmMapMap);
              }
              if (clusterMembers.length > 1) {
                // Calculate the extent of the cluster members.
                const extent = createEmpty();
                clusterMembers.forEach(feature =>
                  extend(extent, feature.getGeometry().getExtent()),
                );
                const view = this.wmMapMap.getView();
                if (clusterMembers.length > 4) {
                  setTimeout(() => {
                    // Zoom to the extent of the cluster members.
                    view.fit(extent, {duration: 500, padding: PADDING});
                  }, 400);
                }
              } else {
                this._selectCluster.setActive(true);
                const poiFeature = nearestFeatureOfCluster(
                  this._poisClusterLayer,
                  event,
                  this.wmMapMap,
                );
                if (poiFeature) {
                  const poi: IGeojsonFeature = poiFeature.getProperties() as any;
                  this._selectIcon(poi);
                }
              }
            }
          });
        } catch (e) {
          console.log(e);
        }
        this._selectCluster.getFeatures().on(['add'], e => {
          var c = e.element.get('features');

          if (c.length === 1) {
            const poi = c[0].getProperties();
            this._selectIcon(poi);
          }
        });
      });
    }

    if (
      (changes.wmMapPoisFilters != null && changes.wmMapPoisFilters.firstChange === false) ||
      changes.WmMapPoisUnselectPoi != null
    ) {
      clearLayer(this._selectedPoiLayer);
    }
    const filtersCondition =
      changes.wmMapPoisFilters != null && changes.wmMapPoisFilters.currentValue != null;
    if (this.wmMapMap != null && (filtersCondition || changes.wmMapPoisPois != null)) {
      this._renderPois();
    }
  }

  ngOnDestroy(): void {
    this._onClickSub.unsubscribe();
  }

  private _addPoisFeature(poiCollection: IGeojsonFeature[]): void {
    clearLayer(this._poisClusterLayer);
    const clusterSource: Cluster = this._poisClusterLayer.getSource();
    const featureSource = clusterSource.getSource();
    featureSource.clear();
    if (poiCollection) {
      for (const poi of poiCollection) {
        const properties = poi.properties || null;
        const taxonomy = properties.taxonomy || null;
        const poyType = taxonomy.poi_type || null;
        const icn = this._getIcnFromTaxonomies(properties.taxonomyIdentifiers);
        const coordinates = [
          poi.geometry.coordinates[0] as number,
          poi.geometry.coordinates[1] as number,
        ] || [0, 0];

        const poiColor = poyType?.color
          ? poyType.color
          : properties.color
          ? properties.color
          : '#ff8c00';
        const namedPoiColor = fromHEXToColor[poiColor] || 'darkorange';
        const position = fromLonLat([coordinates[0] as number, coordinates[1] as number]);
        const iconFeature = new Feature({
          type: 'icon',
          geometry: new Point([position[0], position[1]]),
          properties: {
            ...properties,
            ...{color: poiColor},
            ...{taxonomyIdentifiers: properties.taxonomyIdentifiers},
          },
        });
        let iconStyle = new Style({
          image: new Icon({
            anchor: [0.5, 0.5],
            scale: 0.5,
            src: `${ICN_PATH}/${icn}.png`,
          }),
        });
        if (poi != null && poi.properties != null && poi.properties.svgIcon != null) {
          const src = `data:image/svg+xml;utf8,${poi.properties.svgIcon.replaceAll(
            'darkorange',
            namedPoiColor,
          )}`;
          iconStyle = new Style({
            image: new Icon({
              anchor: [0.5, 0.5],
              scale: 1,
              src,
            }),
          });
        }

        iconFeature.setStyle(iconStyle);
        iconFeature.setId(poi.properties.id);
        featureSource.addFeature(iconFeature);
        featureSource.changed();
        clusterSource.changed();
      }
    }

    this.wmMapMap.on('moveend', e => {
      this._checkZoom(this._poisClusterLayer);
    });
  }

  private _checkZoom(layer: VectorLayer<any>): void {
    const view = this.wmMapMap.getView();
    if (view != null) {
      const newZoom = +view.getZoom();
      const poisMinZoom = +this.wmMapConf.pois.poiMinZoom || 15;
      if (newZoom >= poisMinZoom) {
        layer.setVisible(true);
      } else {
        layer.setVisible(false);
      }
    }
  }

  //@Log({prefix: 'map.directive'})
  private _fitView(geometryOrExtent: any, optOptions?: FitOptions): void {
    if (optOptions == null) {
      optOptions = {
        maxZoom: this.wmMapMap.getView().getMaxZoom() - 1,
        duration: 1000,
        padding: PADDING,
      };
    }
    this._mapCmp.fitView(geometryOrExtent, optOptions);
  }

  private _getIcnFromTaxonomies(taxonomyIdentifiers: string[]): string {
    const excludedIcn = ['theme_ucvs'];
    const res = taxonomyIdentifiers.filter(
      p => excludedIcn.indexOf(p) === -1 && p.indexOf('poi_type') > -1,
    );
    return res.length > 0 ? res[0] : taxonomyIdentifiers[0];
  }

  private _initDirective(): void {
    this._isInit = true;
    this._selectedPoiLayer = createLayer(this._selectedPoiLayer, FLAG_TRACK_ZINDEX + 100);
    this._poisClusterLayer = createCluster(this._poisClusterLayer, FLAG_TRACK_ZINDEX);
    const clusterSource: Cluster = this._poisClusterLayer.getSource();
    this._hullClusterLayer = new VectorLayer({
      style: clusterHullStyle,
      source: clusterSource,
    });
    this._selectCluster = createHull(this.wmMapMap);
    this._checkZoom(this._poisClusterLayer);
    this.wmMapMap.addLayer(this._poisClusterLayer);
    this.wmMapMap.addLayer(this._hullClusterLayer);
    this.wmMapMap.addLayer(this._selectedPoiLayer);
    this._selectCluster.getFeatures().on(['add'], e => {
      var c = e.element.get('features');

      if (c.length === 1) {
        const poi = c[0].getProperties();
        this._selectIcon(poi);
      }
    });
  }

  //@Log({prefix: 'map.directive'})
  private _renderPois(): void {
    if (this.wmMapPoisPois != null) {
      if (this.wmMapPoisFilters.length > 0) {
        if (this._poisClusterLayer != null) {
          clearLayer(this._poisClusterLayer);
          changedLayer(this._poisClusterLayer);
        }
        const selectedFeatures = this.wmMapPoisPois.features.filter(p => {
          const intersection = intersectionBetweenArrays(
            p.properties.taxonomyIdentifiers,
            this.wmMapPoisFilters,
          );

          return intersection.length > 0;
        });
        this._addPoisFeature(selectedFeatures);
      } else {
        this._addPoisFeature(this.wmMapPoisPois.features);
      }
    }
  }

  private _selectIcon(currentPoi: IGeojsonGeneric): void {
    clearLayer(this._selectedPoiLayer);
    if (currentPoi != null) {
      const icn = this._getIcnFromTaxonomies(currentPoi.properties.taxonomyIdentifiers);
      const selectedPoiLayerSource = this._selectedPoiLayer.getSource();
      let geometry = null;

      if (currentPoi.geometry != null && currentPoi.geometry.coordinates != null) {
        const coordinates = [
          currentPoi.geometry.coordinates[0] as number,
          currentPoi.geometry.coordinates[1] as number,
        ] || [0, 0];
        const position = fromLonLat([coordinates[0] as number, coordinates[1] as number]);
        geometry = new Point([position[0], position[1]]);
      } else {
        geometry = currentPoi.geometry;
      }
      const iconFeature = new Feature({type: 'icon', geometry});
      let iconStyle = new Style({
        image: new Icon({
          anchor: [0.5, 0.5],
          scale: 0.5,
          src: `${ICN_PATH}/${icn}_selected.png`,
        }),
      });
      if (currentPoi.properties != null && currentPoi.properties.svgIcon != null) {
        const properties = currentPoi.properties || null;
        const taxonomy = properties.taxonomy || null;
        const poyType = taxonomy.poi_type || null;
        const poiColor = poyType?.color
          ? poyType.color
          : properties.color
          ? properties.color
          : '#ff8c00';
        const namedPoiColor = fromHEXToColor[poiColor] || 'darkorange';
        iconStyle = new Style({
          image: new Icon({
            anchor: [0.5, 0.5],
            scale: 1,
            src: `data:image/svg+xml;utf8,${currentPoi.properties.svgIcon
              .replaceAll(`<circle fill="darkorange"`, '<circle fill="white" ')
              .replaceAll(`<g fill="white"`, `<g fill="${namedPoiColor || 'darkorange'}" `)}`,
          }),
        });
      }
      iconFeature.setStyle(iconStyle);
      iconFeature.setId(currentPoi.properties.id);
      selectedPoiLayerSource.addFeature(iconFeature);
      selectedPoiLayerSource.changed();

      this._fitView(geometry as any);
      this.currentPoiEvt.emit(currentPoi);
    }
  }

  private _setPoi(id: number | 'reset'): void {
    if (id != 'reset' && id > -1) {
      this._selectCluster.setActive(false);
      const currentPoi = this.wmMapPoisPois.features.find(p => +p.properties.id === +id);
      setTimeout(() => {
        this._selectIcon(currentPoi);
      }, 200);
    }
  }
}
