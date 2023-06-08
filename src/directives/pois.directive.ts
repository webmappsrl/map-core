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
import Popup from 'ol-ext/overlay/popup';
import {createEmpty, extend} from 'ol/extent';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import MapBrowserEvent from 'ol/MapBrowserEvent';
import {fromLonLat} from 'ol/proj';
import {Cluster} from 'ol/source';
import VectorSource from 'ol/source/Vector';
import Icon from 'ol/style/Icon';
import Style from 'ol/style/Style';
import {FitOptions} from 'ol/View';
import {BehaviorSubject} from 'rxjs';
import {filter, take} from 'rxjs/operators';
import {WmMapBaseDirective} from '.';
import {clearLayer, createCluster, createHull, createLayer} from '../../src/utils';
import {clusterHullStyle, fromHEXToColor} from '../../src/utils/styles';
import {WmMapComponent} from '../components';
import {FLAG_TRACK_ZINDEX, ICN_PATH} from '../readonly';
import {IGeojsonFeature, IGeojsonGeneric} from '../types/model';

const PADDING = [80, 80, 80, 80];
const TRESHOLD_ENABLE_FIT = 4;
@Directive({
  selector: '[wmMapPois]',
})
export class WmMapPoisDirective extends WmMapBaseDirective implements OnChanges {
  private _hullClusterLayer: VectorLayer<Cluster>;
  private _olFeatures = [];
  private _poisClusterLayer: VectorLayer<Cluster>;
  private _popupOverlay: Popup;
  private _selectCluster: any;
  private _selectedPoiLayer: VectorLayer<VectorSource>;
  private _wmMapPoisPois: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  @Input() set wmMapPoisPois(pois: any) {
    this._wmMapPoisPois.next(pois);
  }

  @Input() WmMapPoisUnselectPoi: boolean;
  @Input() wmMapInputTyped: string;
  @Input() wmMapPoisFilters: any[] = [];
  @Input() wmMapPoisPoi: number | 'reset';
  @Output() currentPoiEvt: EventEmitter<any> = new EventEmitter<any>();

  constructor(private _cdr: ChangeDetectorRef, @Host() mapCmp: WmMapComponent) {
    super(mapCmp);
    this.mapCmp.isInit$
      .pipe(
        filter(f => f === true),
        take(1),
      )
      .subscribe(() => {
        this.mapCmp.map.once('precompose', () => {
          this._initDirective();
        });
        this.mapCmp.map.once('rendercomplete', () => {
          this._wmMapPoisPois
            .pipe(
              filter(f => f != null),
              take(1),
            )
            .subscribe(conf => {
              this._renderPois(conf);
              this._updatePois();
            });
        });
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.wmMapPoisPoi) {
      if (this.mapCmp.map != null) {
        this.setPoi(this.wmMapPoisPoi);
      } else {
        setTimeout(() => {
          this.setPoi(this.wmMapPoisPoi);
        }, 500);
      }
    }
    if (
      (changes.wmMapPoisFilters != null && changes.wmMapPoisFilters.firstChange === false) ||
      changes.WmMapPoisUnselectPoi != null
    ) {
      clearLayer(this._selectedPoiLayer);
    }
    const filtersCondition =
      changes.wmMapPoisFilters != null && changes.wmMapPoisFilters.currentValue != null;
    if (
      this.mapCmp.map != null &&
      (filtersCondition || changes.wmMapPoisPois != null || changes.wmMapInputTyped != null)
    ) {
      this._updatePois();
    }
  }

  /**
   * @description
   * This function sets a Point of Interest (POI) on a map.
   * The function takes an id parameter which can either be a number or the string 'reset'.
   * If the id is not 'reset' and is greater than -1, it searches for the POI in the wmMapPoisPois object.
   * If the POI is found, it calls the _selectIcon() function after 200 milliseconds.
   * @param {(number | 'reset')} id
   * @memberof WmMapPoisDirective
   */
  setPoi(id: number | 'reset'): void {
    if (id != 'reset' && id > -1 && this._wmMapPoisPois.value != null) {
      const currentPoi = this._wmMapPoisPois.value.features.find(p => +p.properties.id === +id);
      setTimeout(() => {
        this._selectIcon(currentPoi);
      }, 200);
    }
  }

  /**
   * @description
   * This code adds a feature to a cluster layer on a map.
   * It first clears the layer, then creates a cluster source and feature source.
   * It then loops through an array of GeoJSON features, creating an icon for each one.
   * The icon is created using the color from the feature's taxonomy,
   * or from its properties if it has one. It also checks for an SVG icon in the properties and uses that if it exists.
   * Finally, it sets the style of the icon to be either an image or SVG and adds it to the feature source.
   * It also sets up two event listeners for when the map moves and when the mouse pointer moves over it.
   *
   * @private
   * @param {IGeojsonFeature[]} poiCollection
   * @memberof WmMapPoisDirective
   */
  private _addPoisFeature(poiCollection: IGeojsonFeature[]): void {
    clearLayer(this._poisClusterLayer);
    const clusterSource: Cluster = this._poisClusterLayer.getSource();
    const featureSource = clusterSource.getSource();
    featureSource.clear();
    if (poiCollection) {
      for (const poi of poiCollection.filter(poi => poi.geometry != null)) {
        const properties = poi.properties || null;
        const taxonomy = properties.taxonomy || null;
        const poyType = taxonomy?.poi_type || null;
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
    this._olFeatures = featureSource.getFeatures();
    this.mapCmp.map.on('moveend', e => {
      this._checkZoom(this._poisClusterLayer);
    });
    this.mapCmp.map.on('pointermove', evt => {
      var pixel = this.mapCmp.map.getEventPixel(evt.originalEvent);
      var hit = this.mapCmp.map.hasFeatureAtPixel(pixel);
      this.mapCmp.map.getViewport().style.cursor = hit ? 'pointer' : '';
    });
  }

  /**
   * @description
   * This function is used to check the zoom level of a VectorLayer and set its visibility accordingly.
   * It first gets the view of the map component and stores it in the view variable.
   * It then gets the new zoom level from this view and stores it in the newZoom variable.
   * The poisMinZoom is then retrieved from the wmMapConf object and stored in a separate variable.
   * If the newZoom is greater than or equal to poisMinZoom, then the layer's visibility is set to true,
   * otherwise it is set to false.
   * @private
   * @param {VectorLayer<any>} layer
   * @memberof WmMapPoisDirective
   */
  private _checkZoom(layer: VectorLayer<any>): void {
    const view = this.mapCmp.map.getView();
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

  /**
   * @description
   * This function takes an object or a string as its argument and returns an object or a string.
   * If the argument is a string, the function will return the same string.
   * If the argument is an object, the function will loop through each key of the object and check if its value is not null or an empty string.
   * If it is not, then it will add this key-value pair to a new object and return it.
   * @private
   * @param {({[key: string]: string | null} | string)} val
   * @returns {*}  {({[key: string]: string | null} | string)}
   * @memberof WmMapPoisDirective
   */
  private _cleanObj(
    val: {[key: string]: string | null} | string,
  ): {[key: string]: string | null} | string {
    if (typeof val === 'string') {
      return val;
    }
    const res = {};
    const keys = Object.keys(val);
    keys.forEach(key => {
      if (val[key] != null && val[key] !== '') {
        res[key] = val[key];
      }
    });
    return res;
  }

  /**
   * @description
   * This function is used to fit the view of a map to a given geometry or extent.
   * It takes in two parameters, the first being a geometry or extent,
   * and the second being an optional FitOptions object.
   * If no FitOptions object is provided, it will default to setting the maximum zoom level 4 lower than the current view's max zoom level,
   * setting the duration to 500 milliseconds, and using a padding of PADDING. Finally, it calls the map's getView() method with the given geometry or extent and FitOptions object.
   * @private
   * @param {*} geometryOrExtent
   * @param {FitOptions} [optOptions]
   * @memberof WmMapPoisDirective
   */
  private _fitView(geometryOrExtent: any, optOptions?: FitOptions): void {
    if (optOptions == null) {
      const maxZoom = this.wmMapConf.maxZoom;
      const currentZoom = this.mapCmp.map.getView().getZoom();
      optOptions = {
        maxZoom: this.mapCmp.map.getView().getMaxZoom() - TRESHOLD_ENABLE_FIT,
        duration: 500,
        padding: PADDING,
      };
      if (maxZoom - currentZoom < TRESHOLD_ENABLE_FIT) {
        optOptions = {
          maxZoom: currentZoom,
          duration: 500,
          padding: PADDING,
        };
      }
    }
    this.mapCmp.map.getView().fit(geometryOrExtent, optOptions);
  }

  /**
   * @description
   * This function takes an array of strings (taxonomyIdentifiers) as a parameter and returns a string.
   * It filters out any strings in the array that are equal to 'theme_ucvs' or contain the substring 'poi_type'.
   * If any of the filtered strings exist, it returns the first one, otherwise it returns the first string from the original array.
   * @private
   * @param {string[]} taxonomyIdentifiers
   * @returns {*}  {string}
   * @memberof WmMapPoisDirective
   */
  private _getIcnFromTaxonomies(taxonomyIdentifiers: string[]): string {
    const excludedIcn = ['theme_ucvs'];
    const res = taxonomyIdentifiers?.filter(
      p => excludedIcn.indexOf(p) === -1 && p.indexOf('poi_type') > -1,
    );
    return res?.length > 0
      ? res[0]
      : taxonomyIdentifiers != null && taxonomyIdentifiers.length > 0
      ? taxonomyIdentifiers[0]
      : null;
  }

  /**
   * @description
   * This code initializes a directive for a map component.
   * It creates and adds layers to the map, including a selected POI layer, a POI cluster layer, and a hull cluster layer.
   * It also adds an interaction for selecting clusters and a popup overlay.
   * When the map is clicked, it checks if there are any clusters present and zooms in if there are more than four members in the cluster.
   * If there is only one member in the cluster, it selects the icon. Finally, it updates the POIs after the render is complete.
   * @private
   * @memberof WmMapPoisDirective
   */
  private _initDirective(): void {
    this._selectedPoiLayer = createLayer(this._selectedPoiLayer, FLAG_TRACK_ZINDEX + 100);
    this._poisClusterLayer = createCluster(this._poisClusterLayer, FLAG_TRACK_ZINDEX);
    const clusterSource: Cluster = this._poisClusterLayer.getSource();
    this._hullClusterLayer = new VectorLayer({
      style: clusterHullStyle,
      source: clusterSource,
    });
    this._selectCluster = createHull();
    this.mapCmp.map.addInteraction(this._selectCluster);
    this._popupOverlay = new Popup({
      popupClass: 'default anim', //"tooltips", "warning" "black" "default", "tips", "shadow",
      closeBox: true,
      offset: [0, -16],
      positioning: 'bottom-center',
      onclose: () => {
        clearLayer(this._selectedPoiLayer);
      },
      autoPan: {
        animation: {
          duration: 100,
        },
      },
    });
    this._checkZoom(this._poisClusterLayer);
    this.mapCmp.map.addLayer(this._poisClusterLayer);
    this.mapCmp.map.addLayer(this._hullClusterLayer);
    this.mapCmp.map.addLayer(this._selectedPoiLayer);
    this.mapCmp.map.addOverlay(this._popupOverlay);

    this._selectCluster.getFeatures().on(['add'], e => {
      var c = e.element.get('features');
      if (c != null && c.length === 1) {
        const poi = c[0].getProperties();
        this._selectIcon(poi);
      }
    });

    this.mapCmp.map.on('click', (event: MapBrowserEvent<UIEvent>) => {
      this._poisClusterLayer.getFeatures(event.pixel).then(features => {
        if (features.length > 0) {
          const clusterMembers = features[0].get('features');
          if (clusterMembers.length > 4) {
            setTimeout(() => {
              // Zoom to the extent of the cluster members.
              const view = this.mapCmp.map.getView();
              const extent = createEmpty();
              clusterMembers.forEach(feature => extend(extent, feature.getGeometry().getExtent()));
              view.fit(extent, {duration: 500, padding: PADDING});
            }, 400);
          }
          if (clusterMembers.length === 1) {
            const poi = clusterMembers[0].getProperties();
            this._selectIcon(poi);
          }
        }
      });
    });
    this.mapCmp.map.once('rendercomplete', () => {
      setTimeout(() => {
        this._updatePois();
      }, 500);
    });
  }

  private _isArrayContained(needle: any[], haystack: any[]): boolean {
    if (needle.length > haystack.length) return false;
    return needle.every(element => haystack.includes(element));
  }

  /**
   * @description
   * This code is a private method called _renderPois()
   * that checks if the this.wmMapPoisPois variable is not null and if it is not,
   * it calls the _addPoisFeature() method and passes in this.wmMapPoisPois.features as an argument.
   * @private
   * @memberof WmMapPoisDirective
   */
  private _renderPois(inlineConf?: any): void {
    if (inlineConf != null) {
      this._addPoisFeature(inlineConf.features);
    } else if (this.wmMapPoisPois != null) {
      this._addPoisFeature(this.wmMapPoisPois.features);
    }
  }

  /**
   * @description
   * This code is used to select an icon for a point of interest (POI).
   * It takes in a parameter 'currentPoi' which is an IGeojsonGeneric object.
   * It first clears the layer of the selected POI, then checks if the currentPoi is not null.
   * If it is not null, it gets the source of the selected POI layer and sets the geometry to either a point or the currentPoi's geometry.
   * It then checks if there is a svgIcon property in the properties of currentPoi and creates an Icon feature with that svgIcon.
   * It sets this feature's style, id, and color based on certain properties in currentPoi.
   * Then it checks what interaction type has been set for POIs and either does nothing, emits an event with currentPOI, or shows a popup/tooltip with information about currentPOI.
   * Finally, it fits the view to the geometry of currentPOI when rendering is complete.
   * @private
   * @param {IGeojsonGeneric} currentPoi
   * @memberof WmMapPoisDirective
   */
  private _selectIcon(currentPoi: IGeojsonGeneric): void {
    clearLayer(this._selectedPoiLayer);
    if (currentPoi != null) {
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

      if (currentPoi.properties != null && currentPoi.properties.svgIcon != null) {
        const iconFeature = new Feature({type: 'icon', geometry});
        const properties = currentPoi.properties || null;
        const taxonomy = properties.taxonomy || null;
        const poyType = taxonomy?.poi_type || null;
        const poiColor = poyType?.color
          ? poyType.color
          : properties.color
          ? properties.color
          : '#ff8c00';
        const namedPoiColor = fromHEXToColor[poiColor] || 'darkorange';
        let iconStyle = new Style({
          zIndex: 200,

          image: new Icon({
            anchor: [0.5, 0.5],
            scale: 1,
            src: `data:image/svg+xml;utf8,${currentPoi.properties.svgIcon
              .replaceAll(`<circle fill="darkorange"`, '<circle fill="white" ')
              .replaceAll(`<g fill="white"`, `<g fill="${namedPoiColor || 'darkorange'}" `)}`,
          }),
        });
        iconFeature.setStyle(iconStyle);
        iconFeature.setId(currentPoi.properties.id);
        selectedPoiLayerSource.addFeature(iconFeature);
        selectedPoiLayerSource.changed();
        this._selectCluster.clear();
      }

      const poiInteraction = this.wmMapConf.pois.poi_interaction ?? 'tooltip';
      switch (poiInteraction) {
        case 'no_interaction':
          break;
        case 'popup':
        default:
          this.currentPoiEvt.emit(currentPoi);
          break;
        case 'tooltip':
        case 'tooltip_popup':
          const l = localStorage.getItem('wm-lang') ?? 'it';
          let nameObj = this._cleanObj(currentPoi.properties.name);
          let name = nameObj;
          if (typeof nameObj != 'string') {
            if (nameObj[l] != null) {
              name = nameObj[l];
            } else {
              name = nameObj[Object.keys(name)[0]];
            }
          }
          let content = '<ion-card>';
          if (currentPoi?.properties?.feature_image?.url) {
            content += `<div class="img-cnt"><img src='${currentPoi.properties.feature_image.url}'/></div>`;
          }
          content += `
          <ion-card-content>
              ${name}
          </ion-card-content>`;
          (window as any).details = () => {
            this.currentPoiEvt.emit(currentPoi);
            this._fitView(geometry as any);
            this._popupOverlay.hide();
          };
          if (poiInteraction === 'tooltip_popup') {
            content += `<ion-button  expand="block" onclick="details()" style="text-align:right">info<ion-icon name="information-circle-outline"></ion-icon></ion-button>`;
          }
          content += '</ion-card>';
          const coordinates = (currentPoi.geometry as any).getCoordinates
            ? (currentPoi.geometry as any).getCoordinates()
            : fromLonLat([
                (currentPoi.geometry as any).coordinates[0],
                (currentPoi.geometry as any).coordinates[1],
              ]);
          this._popupOverlay.show(coordinates, content);
          setTimeout(() => {
            this.mapCmp.map.updateSize();
            this.mapCmp.map.setTarget('ol-map');
            this.mapCmp.map.changed();
            this._cdr.detectChanges();
          }, 500);
          break;
      }
      this.mapCmp.map.once('rendercomplete', () => {
        this._fitView(geometry as any);
      });
    }
  }

  /**
   * @description
   * This function updates the POIs (points of interest) on a map.
   * It first checks if the _poisClusterLayer is not null, then it gets the cluster source from the layer and stores it in a variable.
   * It then clears the feature source and checks if there are any filters set for the POIs.
   * If there are, it filters out any features that don't have any of the taxonomy identifiers in the filter array and adds them to the feature source.
   * If there are no filters set, it adds all features to the feature source.
   * Finally, it changes all sources and layers and calls detectChanges() on ChangeDetectorRef to update any changes in the view.
   * @private
   * @memberof WmMapPoisDirective
   */
  private _updatePois(): void {
    if (this._poisClusterLayer != null) {
      const clusterSource: Cluster = this._poisClusterLayer.getSource();
      const featureSource = clusterSource.getSource();
      featureSource.clear();
      if (this.wmMapInputTyped != '' || this.wmMapPoisFilters.length > 0) {
        const featuresToAdd = this._olFeatures
          .filter(f => {
            if (this.wmMapInputTyped != null && this.wmMapInputTyped != '') {
              const p = f.getProperties().properties;
              return (
                JSON.stringify(p.name)
                  .toLowerCase()
                  .indexOf(this.wmMapInputTyped.toLocaleLowerCase()) >= 0
              );
            }
            return true;
          })
          .filter(f => {
            if (this.wmMapPoisFilters.length > 0) {
              const p = f.getProperties().properties;
              return this._isArrayContained(this.wmMapPoisFilters, p.taxonomyIdentifiers);
            }
            return true;
          });
        featureSource.addFeatures(featuresToAdd);
      } else {
        featureSource.addFeatures(this._olFeatures);
      }
      featureSource.changed();
      clusterSource.changed();
      this._poisClusterLayer.changed();
      this._cdr.detectChanges();
    }
  }
}
