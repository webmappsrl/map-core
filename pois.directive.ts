import {Cluster, Vector as VectorSource} from 'ol/source';
import {Directive, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import CircleStyle from 'ol/style/Circle';
import {Coordinate} from 'ol/coordinate';
import {
  CLUSTER_DISTANCE,
  DEF_LINE_COLOR,
  DEF_MAP_CLUSTER_CLICK_TOLERANCE,
  ICN_PATH,
} from './constants';
import {FLAG_TRACK_ZINDEX} from './zIndex';
import Feature from 'ol/Feature';
import Fill from 'ol/style/Fill';
import {FitOptions} from 'ol/View';
import Geometry from 'ol/geom/Geometry';
import {IGeojsonFeature} from 'src/app/types/model';
import Icon from 'ol/style/Icon';
import MapBrowserEvent from 'ol/MapBrowserEvent';
import Point from 'ol/geom/Point';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import Text from 'ol/style/Text';
import VectorLayer from 'ol/layer/Vector';
import {WmMapBaseDirective} from './base.directive';
import {buffer} from 'ol/extent';
import {fromLonLat} from 'ol/proj';
import {stopPropagation} from 'ol/events/Event';
@Directive({
  selector: '[wmMapPois]',
})
export class WmMapPoisDirective extends WmMapBaseDirective implements OnChanges {
  private _poisClusterLayer: VectorLayer;
  private _selectedPoiLayer: VectorLayer;

  @Input() conf: IMAP;
  @Input() filters: any[] = [];
  @Input() pois: any;
  @Output('poi-click') poiClick: EventEmitter<number> = new EventEmitter<number>();

  @Input('poi') set setPoi(id: number) {
    if (this.map != null) {
      this._selectedPoiLayer = this._createLayer(this._selectedPoiLayer, FLAG_TRACK_ZINDEX + 100);
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
              src: `${ICN_PATH}/${icn}.png`,
            }),
          });
          console.log(currentPoi);
          if (currentPoi.properties.svgIcon != null) {
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

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes.map != null &&
      changes.map.currentValue != null &&
      changes.map.previousValue == null
    ) {
      this.map.on('select', event => {
        console.log('asd');
      });
      this.map.on('click', event => {
        try {
          if (this._isCluster(this._poisClusterLayer, event)) {
            this._deactivateInteractions();
            const geometry = new Point([event.coordinate[0], event.coordinate[1]]);
            this._fitView(geometry as any, {
              maxZoom: this.map.getView().getZoom() + 1,
              duration: 500,
            });
            console.log(event);
            stopPropagation(event);
          } else {
            const poiFeature = this._getNearestFeatureOfCluster(this._poisClusterLayer, event);
            if (poiFeature) {
              this._deactivateInteractions();
              const currentID = +poiFeature.getId() || -1;
              this.poiClick.emit(currentID);
            }
          }
          setTimeout(() => {
            this._activateInteractions();
          }, 1200);
        } catch (e) {
          console.log(e);
        }
      });
    }
    if (this.map != null && this.pois != null) {
      if (this.filters.length > 0) {
        this._poisClusterLayer.getSource().clear();
        (this._poisClusterLayer.getSource() as any).getSource().clear();
        const selectedFeatures = this.pois.features.filter(
          p => this._intersection(p.properties.taxonomyIdentifiers, this.filters).length > 0,
        );
        this._addPoisFeature(selectedFeatures);
      } else {
        this._addPoisFeature(this.pois.features);
      }
    }
  }

  private _activateInteractions(): void {
    this.map.getInteractions().forEach(i => i.setActive(true));
  }

  private _addPoisFeature(poiCollection: IGeojsonFeature[]) {
    this._poisClusterLayer = this._createCluster(this._poisClusterLayer, FLAG_TRACK_ZINDEX);
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
        if (poi.properties.svgIcon != null) {
          iconStyle = new Style({
            image: new Icon({
              anchor: [0.5, 0.5],
              scale: 1,
              src: `data:image/svg+xml;utf8,${poi.properties.svgIcon}`,
              //src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1024 1024' width='32' height='32'><circle cx='512' cy='512' r='512' fill=\"red\" /><g transform='scale(0.8 0.8) translate(100, 100)' fill=\"white\"><path   d='M294.4 108.8l-54.4 297.6c-6.4 44.8 96 64 92.8 108.8l-12.8 348.8c-3.2 54.4 54.4 54.4 54.4 54.4s54.4 0 54.4-54.4l-12.8-348.8c-3.2-44.8 92.8-64 92.8-108.8l-54.4-297.6h-25.6l12.8 214.4-41.6 25.6-12.8-243.2h-25.6l-12.8 243.2-41.6-25.6 12.8-214.4h-25.6zM752 108.8c-38.4 0-105.6 35.2-131.2 89.6-22.4 38.4-28.8 128-28.8 182.4v134.4c0 44.8 57.6 54.4 80 54.4l-25.6 297.6c-6.4 54.4 54.4 54.4 54.4 54.4s54.4 0 54.4-54.4v-758.4h-3.2z'/></g></svg>",
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

  private _createCluster(clusterLayer: VectorLayer, zIndex: number) {
    if (!clusterLayer) {
      clusterLayer = new VectorLayer({
        source: new Cluster({
          distance: CLUSTER_DISTANCE,
          source: new VectorSource({
            features: [],
          }),
          geometryFunction: (feature: Feature): Point | null => {
            return feature.getGeometry().getType() === 'Point'
              ? <Point>feature.getGeometry()
              : null;
          },
        }),
        style: function (feature) {
          const size = feature.get('features').length;
          let style = styleCache[size];
          if (size === 1) {
            const icon = feature.getProperties().features[0];
            return icon.getStyle() || null;
          }
          if (!style) {
            style = new Style({
              image: new CircleStyle({
                radius: 15,
                stroke: new Stroke({
                  color: '#fff',
                }),
                fill: new Fill({
                  color: '#3399CC',
                }),
              }),
              text: new Text({
                text: `${size}`,
                scale: 1.5,
                fill: new Fill({
                  color: '#fff',
                }),
                font: '30px ',
              }),
            });
            styleCache[size] = style;
          }
          return style;
        },
        updateWhileAnimating: true,
        updateWhileInteracting: true,
        zIndex,
      });

      this.map.addLayer(clusterLayer);

      const styleCache = {};
    }
    return clusterLayer;
  }

  private _createLayer(layer: VectorLayer, zIndex: number) {
    if (!layer) {
      layer = new VectorLayer({
        source: new VectorSource({
          features: [],
        }),
        updateWhileAnimating: true,
        updateWhileInteracting: true,
        zIndex,
      });
      this.map.addLayer(layer);
    }
    return layer;
  }

  private _deactivateInteractions(): void {
    this.map.getInteractions().forEach(i => i.setActive(false));
  }

  private _distance(c1: Coordinate, c2: Coordinate) {
    return Math.sqrt(Math.pow(c1[0] - c2[0], 2) + Math.pow(c1[1] - c2[1], 2));
  }

  private _fitView(geometryOrExtent: any, optOptions?: FitOptions): void {
    if (optOptions == null) {
      optOptions = {
        maxZoom: this.map.getView().getZoom(),
        duration: 1000,
      };
    }
    this.map.getView().fit(geometryOrExtent, optOptions);
  }

  private _getIcnFromTaxonomies(taxonomyIdentifiers: string[]): string {
    const excludedIcn = ['theme_ucvs'];
    const res = taxonomyIdentifiers.filter(
      p => excludedIcn.indexOf(p) === -1 && p.indexOf('poi_type') > -1,
    );
    return res.length > 0 ? res[0] : taxonomyIdentifiers[0];
  }

  private _getNearest(features: Feature<Geometry>[], coordinate: Coordinate) {
    let ret: Feature<Geometry> = features[0];
    let minDistance = Number.MAX_VALUE;
    features.forEach(feature => {
      const geom = feature.getGeometry() as Point;
      const distance = this._distance(geom.getFlatCoordinates(), coordinate);
      if (distance < minDistance) {
        minDistance = distance;
        ret = feature;
      }
    });
    return ret;
  }

  private _getNearestFeatureOfCluster(
    layer: VectorLayer,
    evt: MapBrowserEvent<UIEvent>,
  ): Feature<Geometry> {
    const precision = this.map.getView().getResolution() * DEF_MAP_CLUSTER_CLICK_TOLERANCE;
    let nearestFeature = null;
    const features: Feature<Geometry>[] = [];
    const clusterSource = layer?.getSource() ?? (null as any);
    const layerSource = clusterSource?.getSource();

    if (layer && layerSource) {
      layerSource.forEachFeatureInExtent(
        buffer(
          [evt.coordinate[0], evt.coordinate[1], evt.coordinate[0], evt.coordinate[1]],
          precision,
        ),
        feature => {
          features.push(feature);
        },
      );
    }

    if (features.length) {
      nearestFeature = this._getNearest(features, evt.coordinate);
    }

    return nearestFeature;
  }

  private _getNearestFeatureOfLayer(
    layer: VectorLayer,
    evt: MapBrowserEvent<UIEvent>,
  ): Feature<Geometry> {
    const precision = this.map.getView().getResolution() * DEF_MAP_CLUSTER_CLICK_TOLERANCE;
    let nearestFeature = null;
    const features: Feature<Geometry>[] = [];
    const layerSource = layer.getSource() as any;

    if (layer && layerSource) {
      layerSource.forEachFeatureInExtent(
        buffer(
          [evt.coordinate[0], evt.coordinate[1], evt.coordinate[0], evt.coordinate[1]],
          precision,
        ),
        feature => {
          features.push(feature);
        },
      );
    }

    if (features.length) {
      nearestFeature = this._getNearest(features, evt.coordinate);
    }

    return nearestFeature;
  }

  private _intersection(a: any[], b: any[]): any[] {
    var setA = new Set(a);
    var setB = new Set(b);
    var intersection = new Set([...setA].filter(x => setB.has(x)));
    return Array.from(intersection);
  }

  private _isCluster(layer: VectorLayer, evt: MapBrowserEvent<UIEvent>): boolean {
    const precision = this.map.getView().getResolution() * DEF_MAP_CLUSTER_CLICK_TOLERANCE;
    const features: Feature<Geometry>[] = [];
    const clusterSource = layer?.getSource() ?? (null as any);
    const layerSource = clusterSource?.getSource();

    if (layer && layerSource) {
      layerSource.forEachFeatureInExtent(
        buffer(
          [evt.coordinate[0], evt.coordinate[1], evt.coordinate[0], evt.coordinate[1]],
          precision,
        ),
        feature => {
          features.push(feature);
        },
      );
    }

    return features.length > 1;
  }
}
