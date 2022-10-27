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
import {Subscription} from 'rxjs';

import {stopPropagation} from 'ol/events/Event';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import MapBrowserEvent from 'ol/MapBrowserEvent';
import {fromLonLat} from 'ol/proj';
import Icon from 'ol/style/Icon';
import Style from 'ol/style/Style';
import {FitOptions} from 'ol/View';

import {WmMapBaseDirective} from '.';
import {WmMapComponent} from '../components';
import {FLAG_TRACK_ZINDEX, ICN_PATH} from '../readonly';
import {IGeojsonFeature} from '../types/model';
import {
  activateInteractions,
  createCluster,
  createLayer,
  deactivateInteractions,
  intersectionBetweenArrays,
  isCluster,
  nearestFeatureOfCluster,
} from '../utils';
import {Cluster} from 'ol/source';
import VectorSource from 'ol/source/Vector';
@Directive({
  selector: '[wmMapPois]',
})
export class WmMapPoisDirective extends WmMapBaseDirective implements OnChanges, OnDestroy {
  private _onClickSub: Subscription = Subscription.EMPTY;
  private _poisClusterLayer: VectorLayer<Cluster>;
  private _selectedPoiLayer: VectorLayer<VectorSource>;

  @Input() set onClick(clickEVT$: EventEmitter<MapBrowserEvent<UIEvent>>) {
    this._onClickSub = clickEVT$.subscribe(event => {
      try {
        stopPropagation(event);
        console.log('stop propagation');
        if (isCluster(this._poisClusterLayer, event, this.map)) {
          deactivateInteractions(this.map);
          const geometry = new Point([event.coordinate[0], event.coordinate[1]]);
          this._fitView(geometry as any, {
            maxZoom: this.map.getView().getZoom() + 1,
            duration: 500,
          });
        } else {
          const poiFeature = nearestFeatureOfCluster(this._poisClusterLayer, event, this.map);
          if (poiFeature) {
            deactivateInteractions(this.map);
            const currentID = +poiFeature.getId() || -1;
            this.poiClick.emit(currentID);
          }
        }
        setTimeout(() => activateInteractions(this.map), 1200);
      } catch (e) {
        console.log(e);
      }
    });
  }

  @Input('poi') set setPoi(id: number) {
    if (this.map != null) {
      this._selectedPoiLayer = createLayer(
        this._selectedPoiLayer,
        FLAG_TRACK_ZINDEX + 100,
        this.map,
      );
      this._selectedPoiLayer.getSource().clear();
      if (id > -1) {
        const currentPoi = this.pois.features.find(p => +p.properties.id === +id);
        if (currentPoi != null) {
          const icn = this._getIcnFromTaxonomies(currentPoi.properties.taxonomyIdentifiers);
          const coordinates = [
            currentPoi.geometry.coordinates[0] as number,
            currentPoi.geometry.coordinates[1] as number,
          ] || [0, 0];
          const position = fromLonLat([coordinates[0] as number, coordinates[1] as number]);
          const geometry = new Point([position[0], position[1]]);
          const iconFeature = new Feature({
            type: 'icon',
            geometry,
          });
          let iconStyle = new Style({
            image: new Icon({
              anchor: [0.5, 0.5],
              scale: 0.5,
              src: `${ICN_PATH}/${icn}_selected.png`,
            }),
          });
          if (
            currentPoi != null &&
            currentPoi.properties != null &&
            currentPoi.properties.svgIcon != null
          ) {
            iconStyle = new Style({
              image: new Icon({
                anchor: [0.5, 0.5],
                scale: 1,
                src: `data:image/svg+xml;utf8,${currentPoi.properties.svgIcon
                  .replaceAll('<circle fill="darkorange"', '<circle fill="white" ')
                  .replaceAll('<g fill="white"', '<g fill="darkorange" ')}`,
              }),
            });
          }
          iconFeature.setStyle(iconStyle);
          iconFeature.setId(currentPoi.properties.id);
          const source = this._selectedPoiLayer.getSource();
          source.addFeature(iconFeature);
          source.changed();
          this._fitView(geometry as any);
        }
      }
    }
  }

  @Input() conf: IMAP;
  @Input() filters: any[] = [];
  @Input() pois: any;
  @Output('poi-click') poiClick: EventEmitter<number> = new EventEmitter<number>();

  constructor(@Host() private _mapCmp: WmMapComponent) {
    super();
  }

  ngOnChanges(_: SimpleChanges): void {
    if (this.map != null && this.pois != null) {
      if (this.filters.length > 0) {
        this._poisClusterLayer.getSource().clear();
        (this._poisClusterLayer.getSource() as any).getSource().clear();
        const selectedFeatures = this.pois.features.filter(
          p => intersectionBetweenArrays(p.properties.taxonomyIdentifiers, this.filters).length > 0,
        );
        this._addPoisFeature(selectedFeatures);
      } else {
        this._addPoisFeature(this.pois.features);
      }
    }
  }

  ngOnDestroy(): void {
    this._onClickSub.unsubscribe();
  }

  private _addPoisFeature(poiCollection: IGeojsonFeature[]) {
    this._poisClusterLayer = createCluster(this._poisClusterLayer, FLAG_TRACK_ZINDEX, this.map);
    const clusterSource: any = this._poisClusterLayer.getSource() as any;
    const featureSource = clusterSource.getSource();

    if (poiCollection) {
      for (const poi of poiCollection) {
        const icn = this._getIcnFromTaxonomies(poi.properties.taxonomyIdentifiers);
        const coordinates = [
          poi.geometry.coordinates[0] as number,
          poi.geometry.coordinates[1] as number,
        ] || [0, 0];

        const position = fromLonLat([coordinates[0] as number, coordinates[1] as number]);
        const iconFeature = new Feature({
          type: 'icon',
          geometry: new Point([position[0], position[1]]),
        });
        let iconStyle = new Style({
          image: new Icon({
            anchor: [0.5, 0.5],
            scale: 0.5,
            src: `${ICN_PATH}/${icn}.png`,
          }),
        });
        if (poi != null && poi.properties != null && poi.properties.svgIcon != null) {
          iconStyle = new Style({
            image: new Icon({
              anchor: [0.5, 0.5],
              scale: 1,
              src: `data:image/svg+xml;utf8,${poi.properties.svgIcon}`,
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
      const view = this.map.getView();
      if (view != null) {
        const newZoom = +view.getZoom();
        const poisMinZoom = +this.conf.pois.poiMinZoom || 15;
        if (newZoom >= poisMinZoom) {
          this._poisClusterLayer.setVisible(true);
        } else {
          this._poisClusterLayer.setVisible(false);
        }
      }
    });
  }

  private _fitView(geometryOrExtent: any, optOptions?: FitOptions): void {
    if (optOptions == null) {
      optOptions = {
        maxZoom: this.map.getView().getZoom(),
        duration: 1000,
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
}
