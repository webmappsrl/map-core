import { Directive, EventEmitter, Host, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { WmMapBaseDirective } from "./base.directive";
import { filter, take } from "rxjs/operators";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { BehaviorSubject } from "rxjs";
import {WmMapComponent} from '../components';
import { DEF_MAP_MAX_PBF_ZOOM, UGC_POI_ZINDEX } from "../readonly";
import { FeatureCollection } from "geojson";
import { Icon, Style } from "ol/style";
import { clearLayer, createLayer }  from '../../src/utils';
import { Feature, MapBrowserEvent } from "ol";
import { Point } from "ol/geom";
import { fromLonLat } from "ol/proj";
import { FitOptions } from "ol/View";

const PADDING = [80, 80, 80, 80];
const TRESHOLD_ENABLE_FIT = 2;

@Directive({
  selector: '[wmMapUgcPois]',
})
export class WmUgcPoisDirective extends WmMapBaseDirective implements OnChanges {


  private _wmMapUgcPoisLayer: VectorLayer<VectorSource>;
  private _selectedUgcPoiLayer: VectorLayer<VectorSource>;
  private _wmMapUgcPois: BehaviorSubject<FeatureCollection> = new BehaviorSubject<FeatureCollection>(null);

  @Input() set wmMapUgcPois(ugcPois: FeatureCollection) {
    this._wmMapUgcPois.next(ugcPois);
  }
  @Input() set wmMapUgcTrackDisableClusterLayer(disabled: boolean) {
    this._wmMapUgcPoisLayer?.setVisible(!disabled);
  }
  @Input() wmMapUgcUnselectedPoi: boolean;
  @Input() wmMapUgcPoi: number | 'reset';
  @Output() currentUgcPoiEvt: EventEmitter<any> = new EventEmitter<any>();

  constructor(@Host() mapCmp: WmMapComponent) {
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
            filter(p => !!p),
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
    })
  }

  private _initLayer(): void {
    this._wmMapUgcPoisLayer = createLayer(this._wmMapUgcPoisLayer, UGC_POI_ZINDEX);
    this._selectedUgcPoiLayer = createLayer(this._selectedUgcPoiLayer, UGC_POI_ZINDEX);
    const iconStyle = new Style({
      image: new Icon({
        src: 'assets/icons/pois/poi_type_poi.png',
        anchor: [0.5, 0.5],
        scale: 0.7,
      }),
      zIndex: UGC_POI_ZINDEX + 1,
    });
    this._wmMapUgcPoisLayer.setStyle(iconStyle);
    this.mapCmp.map.addLayer(this._wmMapUgcPoisLayer);
    this.mapCmp.map.addLayer(this._selectedUgcPoiLayer);

    this.mapCmp.map.on('click', (event: MapBrowserEvent<UIEvent>) => {
      this._wmMapUgcPoisLayer.getFeatures(event.pixel).then(features => {
        if (features.length > 0) {
          if (features.length === 1) {
            const poiFeature = features[0].getProperties();
            this._selectIcon(poiFeature);
          }
        }
      });
    });
  }


  private _addPoisLayer(poiFeatureCollection: any): void{
    const iconFeatures = [];
    clearLayer(this._wmMapUgcPoisLayer);
    if (poiFeatureCollection) {
      for (const poi of poiFeatureCollection.features.filter(poi => poi.geometry != null)){
        const coordinates = [
          poi.geometry.coordinates[0] as number,
          poi.geometry.coordinates[1] as number,
        ] || [0, 0];
        const position = fromLonLat([coordinates[0] as number, coordinates[1] as number]);
        const iconFeature = new Feature({
          type: 'icon',
          geometry: new Point([position[0], position[1]]),
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
      this._wmMapUgcPoisLayer.getSource().addFeatures(iconFeatures);
      this._wmMapUgcPoisLayer.getSource().changed();
      this.mapCmp.map.getRenderer();
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
          const currentPoi = pois.features.find(p => +p.properties.id === +id);
          this._selectIcon(currentPoi);
        });
    }
  }

  private _fitView(geometryOrExtent: any, optOptions?: FitOptions): void {
    if (optOptions == null) {
      const maxZoom = this.wmMapConf.maxZoom;
      const currentZoom = this.mapCmp.map.getView().getZoom();
      let usedZoom = this.mapCmp.map.getView().getMaxZoom() - TRESHOLD_ENABLE_FIT;

      if (maxZoom - currentZoom < TRESHOLD_ENABLE_FIT) {
        usedZoom = currentZoom;
      }

      optOptions = {
        maxZoom: usedZoom,
        duration: 500,
        padding: PADDING,
      };
      if (usedZoom >= DEF_MAP_MAX_PBF_ZOOM - 1) {
        let firstOptOptions = {
          maxZoom: DEF_MAP_MAX_PBF_ZOOM,
          duration: 0,
          padding: PADDING,
        };
        this.mapCmp.fitView(geometryOrExtent, firstOptOptions);
        setTimeout(() => {
          this.mapCmp.fitView(geometryOrExtent, optOptions);
        }, 500);
      } else {
        this.mapCmp.fitView(geometryOrExtent, optOptions);
      }
    }
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
        geometry = new Point([position[0], position[1]]);
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
        this._fitView(geometry as any);
      });
    }
  }
}
