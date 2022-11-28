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
import {IGeojsonFeature, IGeojsonGeneric, IMAP} from '../types/model';
import {
  changedLayer,
  clearLayer,
  createCluster,
  createHull,
  createLayer,
  intersectionBetweenArrays,
  nearestFeatureOfCluster,
  selectCluster,
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
  private _selectedPoiLayer: VectorLayer<VectorSource>;

  @Input() set onClick(clickEVT$: EventEmitter<MapBrowserEvent<UIEvent>>) {
    this._onClickSub = clickEVT$.subscribe(event => {
      clearLayer(this._selectedPoiLayer);
      try {
        if (this.map.getView().getZoom() === this.map.getView().getMaxZoom()) {
          selectCluster.setActive(true);
        } else {
          selectCluster.setActive(false);
        }
        this._poisClusterLayer.getFeatures(event.pixel).then(features => {
          if (features.length > 0) {
            setCurrentCluster(features[0]);
            const clusterMembers = features[0].get('features');
            this._hullClusterLayer.setStyle(clusterHullStyle);
            if (clusterMembers.length > 1) {
              // Calculate the extent of the cluster members.
              const extent = createEmpty();
              clusterMembers.forEach(feature => extend(extent, feature.getGeometry().getExtent()));
              const view = this.map.getView();
              if (view.getZoom() === view.getMaxZoom()) {
                selectCluster.setActive(true);
              }
              setTimeout(() => {
                // Zoom to the extent of the cluster members.
                view.fit(extent, {duration: 500, padding: PADDING});
                setTimeout(() => {
                  if (view.getZoom() === view.getMaxZoom()) {
                    selectCluster.setActive(true);
                  }
                }, 200);
              }, 400);
            } else {
              selectCluster.setActive(true);
              const poiFeature = nearestFeatureOfCluster(this._poisClusterLayer, event, this.map);
              if (poiFeature) {
                const poi: IGeojsonFeature = poiFeature.getProperties() as any;
                this.currentPoiEvt.emit(poi);
                this._selectIcon(poi);
              }
            }
          }
        });
      } catch (e) {
        console.log(e);
      }
    });
  }

  @Input('poi') set setPoi(id: number | 'reset') {
    if (this.map != null) {
      selectCluster.setActive(false);
      clearLayer(this._selectedPoiLayer);
      if (id != 'reset' && id > -1) {
        const currentPoi = this.pois.features.find(p => +p.properties.id === +id);
        this._selectIcon(currentPoi);
        this.currentPoiEvt.emit(currentPoi);
      } else {
        clearLayer(this._selectedPoiLayer);
      }
    }
  }

  @Input() WmMapPoisUnselectPoi: boolean;
  @Input() conf: IMAP;
  @Input() filters: any[] = [];
  @Input() pois: any;
  @Output() currentPoiEvt: EventEmitter<any> = new EventEmitter<any>();

  constructor(@Host() private _mapCmp: WmMapComponent) {
    super();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log(changes);
    if (
      changes.map != null &&
      changes.map.previousValue == null &&
      changes.map.currentValue != null &&
      this._isInit === false
    ) {
      this._initDirective();
      this._renderPois();
    }
    if (
      changes &&
      ((changes.filters != null && changes.filters.firstChange === false) ||
        changes.WmMapPoisUnselectPoi != null)
    ) {
      clearLayer(this._selectedPoiLayer);
    }
    const filtersCondition =
      changes.filters != null &&
      changes.filters.previousValue != null &&
      changes.filters.previousValue.length != 0 &&
      changes.filters.currentValue != null &&
      changes.filters.currentValue.length != 0;
    if (this.map != null && (filtersCondition || changes.pois != null)) {
      this._renderPois();
    }
  }

  ngOnDestroy(): void {
    this._onClickSub.unsubscribe();
  }

  private _addPoisFeature(poiCollection: IGeojsonFeature[]) {
    clearLayer(this._poisClusterLayer);
    clearLayer(selectCluster);
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

    this.map.on('moveend', e => {
      this._checkZoom(this._poisClusterLayer);
    });
  }

  private _checkZoom(layer: VectorLayer<any>): void {
    const view = this.map.getView();
    if (view != null) {
      const newZoom = +view.getZoom();
      const poisMinZoom = +this.conf.pois.poiMinZoom || 15;
      if (newZoom >= poisMinZoom) {
        layer.setVisible(true);
      } else {
        layer.setVisible(false);
      }
    }
  }

  private _fitView(geometryOrExtent: any, optOptions?: FitOptions): void {
    if (optOptions == null) {
      optOptions = {
        maxZoom: this.map.getView().getMaxZoom() - 1,
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
    createHull(this.map);
    const clusterSource: Cluster = this._poisClusterLayer.getSource();
    this._hullClusterLayer = new VectorLayer({
      style: clusterHullStyle,
      source: clusterSource,
    });
    this._checkZoom(this._poisClusterLayer);
    this.map.addLayer(this._poisClusterLayer);
    this.map.addLayer(this._hullClusterLayer);
    this.map.addLayer(this._selectedPoiLayer);
    selectCluster.getFeatures().on(['add'], e => {
      var c = e.element.get('features');

      if (c.length === 1 && this.map.getView().getZoom() === this.map.getView().getMaxZoom()) {
        const poi = c[0].getProperties();
        this.currentPoiEvt.emit(poi);
        this._selectIcon(poi);
      }
    });
    console.log('pois init');
  }

  private _renderPois(): void {
    if (this.pois != null) {
      if (this.filters.length > 0) {
        if (this._poisClusterLayer != null) {
          clearLayer(this._poisClusterLayer);
          changedLayer(this._poisClusterLayer);
        }
        const selectedFeatures = this.pois.features.filter(
          p => intersectionBetweenArrays(p.properties.taxonomyIdentifiers, this.filters).length > 0,
        );
        this._addPoisFeature(selectedFeatures);
      } else {
        this._addPoisFeature(this.pois.features);
      }
    }
  }

  private _selectIcon(currentPoi: IGeojsonGeneric): void {
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

      this._fitView(geometry as any);
      this.currentPoiEvt.emit(currentPoi);
    }
  }
}
