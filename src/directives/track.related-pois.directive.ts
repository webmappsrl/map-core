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
import {BehaviorSubject, Subscription} from 'rxjs';

import Feature from 'ol/Feature';
import Geometry from 'ol/geom/Geometry';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import {fromLonLat} from 'ol/proj';
import Icon from 'ol/style/Icon';
import Style from 'ol/style/Style';
import {FitOptions} from 'ol/View';

import {preventDefault, stopPropagation} from 'ol/events/Event';
import VectorSource from 'ol/source/Vector';
import {filter, take} from 'rxjs/operators';
import {WmMapBaseDirective} from '.';
import {
  addFeatureToLayer,
  calculateNearestPoint,
  createCanvasForHtml,
  createLayer,
  downloadBase64Img,
  nearestFeatureOfLayer,
  removeFeatureFromLayer,
} from '../../src/utils';
import {WmMapComponent} from '../components';
import {DEF_LINE_COLOR, FLAG_TRACK_ZINDEX, logoBase64} from '../readonly';
import {IGeojsonFeature, PoiMarker} from '../types/model';

@Directive({
  selector: '[wmMapTrackRelatedPois]',
})
export class wmMapTrackRelatedPoisDirective
  extends WmMapBaseDirective
  implements OnChanges, OnDestroy
{
  private _defaultFeatureColor = DEF_LINE_COLOR;
  private _initPois;
  private _onClickSub: Subscription = Subscription.EMPTY;
  private _poiMarkers: PoiMarker[] = [];
  private _poisLayer: VectorLayer<VectorSource>;
  private _relatedPois: IGeojsonFeature[] = [];
  private _selectedPoiLayer: VectorLayer<VectorSource>;
  private _selectedPoiMarker: PoiMarker;

  @Input() set next(d) {
    if (this._selectedPoiLayer != null) {
      this.mapCmp.map.removeLayer(this._selectedPoiLayer);
    }
  }

  @Input('poi') set setPoi(id: number | 'reset') {
    if (id === -1 && this._selectedPoiLayer != null) {
      this.mapCmp.map.removeLayer(this._selectedPoiLayer);
      this._selectedPoiLayer = undefined;
      this.relatedPoiEvt.next(null);
    } else {
      const currentPoi = this._poiMarkers.find(p => +p.id === +id);

      if (currentPoi != null) {
        this._fitView(currentPoi.icon.getGeometry() as any);
        this._selectCurrentPoi(currentPoi);
        this.currentRelatedPoi$.next(this._getPoi(+id));
        this.relatedPoiEvt.next(this.currentRelatedPoi$.value);
      }
    }
  }

  @Input() track;
  @Input() wmMapPositioncurrentLocation: Location;
  @Input() wmMapTrackRelatedPoisAlertPoiRadius: number;
  @Output('related-poi-click') poiClick: EventEmitter<number> = new EventEmitter<number>();
  @Output('related-poi') relatedPoiEvt: EventEmitter<any> = new EventEmitter<any>();
  @Output() wmMapTrackRelatedPoisNearestPoiEvt: EventEmitter<Feature<Geometry>> =
    new EventEmitter();

  currentRelatedPoi$: BehaviorSubject<IGeojsonFeature> =
    new BehaviorSubject<IGeojsonFeature | null>(null);

  /**
   * @description
   * Constructs the PoiSelectionHandler instance.
   * This method is executed when changes occur to the component's input properties.
   * It handles the logic for resetting the view and initializing the point of interest markers based on the track's related_pois property.
   * It also calculates the nearest point of interest to the current location and emits the nearestPoi event.
   *
   * @param mapCmp The WmMapComponent instance.
   */
  constructor(@Host() mapCmp: WmMapComponent) {
    super(mapCmp);
    this.mapCmp.isInit$
      .pipe(
        filter(f => f === true),
        take(1),
      )
      .subscribe(() => {
        this.mapCmp.map.on('click', event => {
          this._deselectCurrentPoi();
          const poiFeature = nearestFeatureOfLayer(this._poisLayer, event, this.mapCmp.map);
          if (poiFeature) {
            preventDefault(event);
            stopPropagation(event);
            const currentID = +poiFeature.getId() || -1;
            this.currentRelatedPoi$.next(this._getPoi(currentID));
            this.relatedPoiEvt.emit(this.currentRelatedPoi$.value);
            this.poiClick.emit(currentID);
            this.setPoi = currentID;
          }
        });
      });
  }

  /**
   * @description
   * This method is executed when changes occur to the component's input properties.
   * It handles the logic for resetting the view and initializing the point of interest (POI) markers based on the track's related_pois property.
   * If the track has related_pois and the map is initialized, the POI markers are added to the map.
   * It also calculates the nearest POI to the current location and emits the wmMapTrackRelatedPoisNearestPoiEvt event.
   * The nearest POI is highlighted on the map.
   *
   * @param changes The SimpleChanges object containing the changed properties.
   */
  ngOnChanges(changes: SimpleChanges): void {
    const resetCondition =
      (changes.track &&
        changes.track.previousValue != null &&
        changes.track.currentValue != null &&
        (changes.track.previousValue.properties.id != changes.track.currentValue.properties.id ||
          (changes.track.previousValue == null &&
            changes.track.currentValue.properties.id != null))) ??
      false;
    // Reset view and initialization of pois if necessary
    if (this.track == null || this.mapCmp.map == null || resetCondition) {
      this._resetView();
      this._initPois = false;
    }
    // Initialize pois if track and related_pois are available
    if (
      this.track != null &&
      this.track.properties != null &&
      this.track.properties.related_pois != null &&
      this.mapCmp.map != null &&
      this._initPois === false
    ) {
      this._resetView();
      this._relatedPois = this.track.properties.related_pois;
      this._addPoisMarkers(this._relatedPois);
      calculateNearestPoint(
        this.wmMapPositioncurrentLocation as any,
        this._poisLayer,
        this.wmMapTrackRelatedPoisAlertPoiRadius,
      );
      this._initPois = true;
    }
    // Calculate nearest poi when currentLocation changes
    if (
      changes.wmMapPositioncurrentLocation &&
      changes.wmMapPositioncurrentLocation.currentValue != null
    ) {
      const currentLocation = changes.wmMapPositioncurrentLocation.currentValue;
      const nearestPoi = calculateNearestPoint(currentLocation, this._poisLayer);
      // Highlight the nearest poi on the map
      if (nearestPoi != null) {
        ((nearestPoi.getStyle() as any).getImage() as any).setScale(1.2);
      }
      this.wmMapTrackRelatedPoisNearestPoiEvt.emit(nearestPoi);
    }
  }

  /**
   * @description
   * Executes when the component is being destroyed.
   * Unsubscribes from the click event subscription.
   */
  ngOnDestroy(): void {
    this._onClickSub.unsubscribe();
  }

  /**
   * @description
   * Switches to the next point of interest (POI).
   * Updates the current POI to the next one in the list.
   */
  poiNext(): void {
    const currentID = this.currentRelatedPoi$.value.properties.id;
    const currentPosition = this._relatedPois.map(f => f.properties.id).indexOf(currentID);
    const nextId =
      this._relatedPois[(currentPosition + 1) % this._relatedPois.length].properties.id;
    this.setPoi = nextId;
  }

  /**
   * @description
   * Switches to the previous point of interest (POI).
   * Updates the current POI to the previous one in the list.
   */
  poiPrev(): void {
    const currentID = this.currentRelatedPoi$.value.properties.id;
    const currentPosition = this._relatedPois.map(f => f.properties.id).indexOf(currentID);
    const prevId =
      this._relatedPois[(currentPosition + this._relatedPois.length - 1) % this._relatedPois.length]
        .properties.id;
    this.setPoi = prevId;
  }

  /**
   * @description
   * Adds markers for the points of interest (POIs) to the map layer.
   * This private method adds markers for the points of interest (POIs) to the map layer.
   * It takes a collection of POIs and iterates through them to check if each POI already has a corresponding marker.
   * If not, it creates a canvas icon for the POI and adds it to the map layer.
   *
   * @param poiCollection - The collection of POIs to be added as markers.
   */
  private async _addPoisMarkers(poiCollection: Array<IGeojsonFeature>) {
    this._poisLayer = createLayer(this._poisLayer, FLAG_TRACK_ZINDEX);
    this.mapCmp.map.addLayer(this._poisLayer);
    for (let i = this._poiMarkers?.length - 1; i >= 0; i--) {
      const ov = this._poiMarkers[i];
      if (!poiCollection?.find(x => x.properties.id + '' === ov.id)) {
        removeFeatureFromLayer(this._poisLayer, ov.icon);
        this._poiMarkers.splice(i, 1);
      }
    }
    if (poiCollection) {
      for (const poi of poiCollection) {
        if (
          !this._poiMarkers?.find(
            x => x.id === poi.properties.id + '' && poi.properties?.feature_image?.sizes,
          )
        ) {
          const {marker} = await this._createPoiCanvasIcon(poi);
          addFeatureToLayer(this._poisLayer, marker.icon);
          this._poiMarkers.push(marker);
        }
      }
    }
  }

  /**
   * @description
   * Creates an icon feature for a point of interest (POI) with the specified coordinates, image, size, transparency, and anchor.
   * This private method creates an icon feature for a point of interest (POI) with the specified coordinates, image, size, transparency, and anchor.
   * It creates a new Point geometry based on the coordinates, sets the image and style properties for the icon feature,
   * and returns an object containing the created icon feature and its style.
   *
   * @param coordinates - The coordinates of the POI.
   * @param img - The image element for the icon.
   * @param size - The size of the icon.
   * @param transparent - Indicates whether the icon should be transparent (optional, default: false).
   * @param anchor - The anchor point of the icon (optional, default: [0.5, 0.5]).
   * @returns An object containing the created icon feature and its style.
   */
  private async _createIconFeature(
    coordinates: number[],
    img: HTMLImageElement,
    size: number,
    transparent: boolean = false,
    anchor: number[] = [0.5, 0.5],
  ): Promise<{iconFeature: Feature<Geometry>; style: Style}> {
    if (!coordinates) {
      return;
    }
    const position = fromLonLat([coordinates[0] as number, coordinates[1] as number]);

    const iconFeature = new Feature({
      type: 'icon',
      geometry: new Point([position[0], position[1]]),
    });
    const style = new Style({
      image: new Icon({
        anchor,
        img,
        imgSize: [size, size],
        opacity: transparent ? 0.5 : 1,
      }),
    });

    iconFeature.setStyle(style);

    return {iconFeature, style};
  }

  /**
   * @description
   * Creates a POI canvas icon with the specified POI, geometry, and selected state.
   * This private method creates a POI canvas icon with the specified POI, geometry, and selected state.
   * It first creates a canvas image using the _createPoiCanvasImage method, and then creates an icon feature using the _createIconFeature method.
   * The icon feature is assigned the ID of the POI, and the method returns an object containing the created POI marker and its style.
   *
   * @param poi - The point of interest (POI) object.
   * @param geometry - The geometry of the POI (optional, default: null).
   * @param selected - Indicates whether the POI is selected (optional, default: false).
   * @returns An object containing the created POI marker and its style.
   */
  private async _createPoiCanvasIcon(
    poi: any,
    geometry = null,
    selected = false,
  ): Promise<{marker: PoiMarker; style: Style}> {
    const img = await this._createPoiCavasImage(poi, selected);
    const {iconFeature, style} = await this._createIconFeature(
      geometry
        ? geometry
        : [poi.geometry.coordinates[0] as number, poi.geometry.coordinates[1] as number],
      img,
      46,
    );
    iconFeature.setId(poi.properties.id);
    return {
      marker: {
        poi,
        icon: iconFeature,
        id: poi.properties.id + '',
      },
      style,
    };
  }

  /**
   * @description
   * Creates a POI canvas image with the specified POI and selected state.
   * This private method creates a POI canvas image with the specified POI and selected state.
   * It first creates the HTML text for the POI marker using the _createPoiMarkerHtmlForCanvas method,
   * and then converts it into a canvas using the createCanvasForHtml method.
   * The canvas is then converted into an HTMLImageElement, which is returned by the method.
   *
   * @param poi - The point of interest (POI) object.
   * @param selected - Indicates whether the POI is selected (optional, default: false).
   * @returns The created POI canvas image as an HTMLImageElement.
   */
  private async _createPoiCavasImage(
    poi: IGeojsonFeature,
    selected = false,
  ): Promise<HTMLImageElement> {
    const htmlTextCanvas = await this._createPoiMarkerHtmlForCanvas(poi, selected);
    return createCanvasForHtml(htmlTextCanvas, 46);
  }

  /**
   * @description
   * Creates the HTML text for a POI marker to be used in a canvas.
   * This private method creates the HTML text for a POI marker to be used in a canvas.
   * It takes the POI object and the selected state as inputs. If the POI has a feature image URL, it downloads the base64 image using the downloadBase64Img method.
   * The HTML text includes an SVG element with a circle and a rectangle, filled with colors and patterns based on the selected state and the image.
   * The result is wrapped in a container div.
   *
   * @param value - The POI object.
   * @param selected - Indicates whether the POI is selected (optional, default: false).
   * @returns The HTML text for the POI marker.
   */
  private async _createPoiMarkerHtmlForCanvas(
    value: IGeojsonFeature,
    selected = false,
  ): Promise<string> {
    let img1b64: string | ArrayBuffer = logoBase64;
    const url = value.properties?.feature_image?.sizes['108x137'];
    if (url) {
      img1b64 = await downloadBase64Img(url);
    }

    let html = `
    <div class="webmapp-map-poimarker-container" style="position: relative;width: 30px;height: 60px;">`;

    html += `
        <svg width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style=" position: absolute;  width: 46px;  height: 46px;  left: 0px;  top: 0px;">
          <circle opacity="${selected ? 1 : 0.2}" cx="23" cy="23" r="23" fill="${
      this._defaultFeatureColor
    }"/>
          <rect x="5" y="5" width="36" height="36" rx="18" fill="url(#img)" stroke="white" stroke-width="2"/>
          <defs>
            <pattern height="100%" width="100%" patternContentUnits="objectBoundingBox" id="img">
              <image height="1" width="1" preserveAspectRatio="xMidYMid slice" xlink:href="${img1b64}">
              </image>
            </pattern>
          </defs>
        </svg>`;
    html += ` </div>`;

    return html;
  }

  /**
   * @description
   * Deselects the currently selected POI by removing its layer from the map.
   */
  private _deselectCurrentPoi(): void {
    if (this._selectedPoiMarker != null) {
      this.mapCmp.map.removeLayer(this._selectedPoiLayer);
      this._selectedPoiLayer = undefined;
    }
  }

  /**
   * @description
   * Fits the view of the map to the specified geometry or extent.
   *
   * @param geometryOrExtent The geometry or extent to fit the view to.
   * @param optOptions Additional options for fitting the view (optional).
   */
  private _fitView(geometryOrExtent: any, optOptions?: FitOptions): void {
    if (optOptions == null) {
      const size = this.mapCmp.map.getSize();
      optOptions = {
        maxZoom: this.mapCmp.map.getView().getZoom(),
        duration: 500,
        size,
      };
    }
    this.mapCmp.fitView(geometryOrExtent, optOptions);
  }

  /**
   * @description
   * Retrieves the Point of Interest (POI) with the specified ID.
   *
   * @param id The ID of the POI.
   * @returns The POI object with the specified ID, or `undefined` if not found.
   */
  private _getPoi(id: number): any {
    const poi = this._relatedPois.find(p => p.properties.id === id);
    return poi;
  }

  /**
   * @description
   * Resets the view by removing the POI layers and resetting other related properties.
   * This private method resets the view by removing the POI layers and resetting other related properties.
   * It checks if mapCmp.map is not null and _poisLayer is defined, then it removes the _poisLayer from the map.
   * Similarly, it checks if mapCmp.map is not null and _selectedPoiLayer is defined, then it removes the _selectedPoiLayer from the map.
   * After removing the layers, it calls mapCmp.map.render() to update the map.
   * It also clears the _poiMarkers array and emits a null value through the relatedPoiEvt event emitter.
   */
  private _resetView(): void {
    if (this.mapCmp.map != null && this._poisLayer != null) {
      this.mapCmp.map.removeLayer(this._poisLayer);
      this._poisLayer = undefined;
    }
    if (this.mapCmp.map != null && this._selectedPoiLayer != null) {
      this.mapCmp.map.removeLayer(this._selectedPoiLayer);
      this._selectedPoiLayer = undefined;
    }
    if (this.mapCmp.map != null) {
      this.mapCmp.map.render();
    }
    this._poiMarkers = [];
    this.relatedPoiEvt.emit(null);
  }

  /**
   * @description
   * Selects the current POI marker and adds it to the selected POI layer.
   * This private method selects the current POI marker by adding it to the selected POI layer.
   * It first calls _deselectCurrentPoi() to clear any previously selected POI marker.
   * Then, it creates a new layer for the selected POI (_selectedPoiLayer) with a high z-index value.
   * The layer is added to the map using mapCmp.map.addLayer(). The selected POI marker (poiMarker) is assigned to _selectedPoiMarker.
   * Finally, it uses _createPoiCanvasIcon() to create a canvas icon for the selected POI marker, and adds the icon feature to the selected POI layer using addFeatureToLayer().
   * @param poiMarker The POI marker to select.
   */
  private async _selectCurrentPoi(poiMarker: PoiMarker) {
    this._deselectCurrentPoi();
    this._selectedPoiLayer = createLayer(this._selectedPoiLayer, 999999999999999);
    this.mapCmp.map.addLayer(this._selectedPoiLayer);
    this._selectedPoiMarker = poiMarker;
    const {marker} = await this._createPoiCanvasIcon(poiMarker.poi, null, true);
    addFeatureToLayer(this._selectedPoiLayer, marker.icon);
  }
}
