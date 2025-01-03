import {
  Directive,
  EventEmitter,
  Host,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import MapBrowserEvent from 'ol/MapBrowserEvent';
import VectorTileLayer from 'ol/layer/VectorTile';
import {filter, take} from 'rxjs/operators';
import {WmMapBaseDirective} from '.';
import {
  clearPbfDB,
  fromNameToHEX,
  getColorFromLayer,
  initInteractions,
  initVectorTileLayer,
  lowTileLoadFn,
  styleHighFn,
} from '../../src/utils';
import {WmMapComponent} from '../components';
import {IDATALAYER, ILAYER} from '../types/layer';
import {IMAP} from '../types/model';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import {DEF_ZOOM_ON_CLICK, MAP_ZOOM_ON_CLICK_TRESHOLD} from '../readonly/constants';

@Directive({
  selector: '[wmMapLayer]',
})
export class WmMapLayerDirective extends WmMapBaseDirective implements OnChanges {
  private _animatedVectorLayer: VectorLayer<VectorSource> = new VectorLayer({
    source: new VectorSource({
      format: new GeoJSON(),
    }),
    zIndex: 410,
    updateWhileAnimating: true,
    updateWhileInteracting: true,
  });
  private _currentLayer: ILAYER;
  private _dataLayerUrls: IDATALAYER;
  private _disabled = false;
  private _opacity = 1;
  private _vectorTileLayer: VectorTileLayer;

  /**
   * @description
   * The input property for the JIDO update time.
   * It sets the JIDO update time in localStorage and clears the storage if the time has changed.
   */
  @Input() set jidoUpdateTime(time: number) {
    const storedJidoVersion = localStorage.getItem(`JIDO_UPDATE_TIME`);
    if (time != undefined && time != +storedJidoVersion) {
      clearPbfDB();
      localStorage.setItem(`JIDO_UPDATE_TIME`, `${time}`);
    }
  }

  /**
   * @description
   * The input property for the data layer URLs.
   * It sets the data layer URLs used in the map.
   */
  @Input() set wmMapLayerDataLayerUrls(urls: IDATALAYER) {
    this._dataLayerUrls = urls;
  }

  /**
   * @description
   * The input property to enable or disable the map layers.
   * When set to `true`, it disables the map layers. When set to `false`, it enables the map layers.
   */
  @Input() set wmMapLayerDisableLayers(disable: boolean) {
    this._disabled = disable;
    if (this._vectorTileLayer != null) {
      this._vectorTileLayer.setVisible(!this._disabled);
    }
  }

  /**
   * @description
   * The input property to set the current map layer.
   * When a new layer is set, it updates the current layer and fits the map view to the bounding box of the layer if available.
   */
  @Input() set wmMapLayerLayer(l: ILAYER) {
    this._currentLayer = l;
    const hostname: string = window.location.href;
    if (l != null && l.bbox != null) {
      this.fitViewFromLonLat(l.bbox);
    }
    this._updateMap();
  }

  /**
   * @description
   * The input property to set the opacity of the map layer.
   * If `opacity` is `true`, it sets the opacity of the layer to 0.3; otherwise, it sets it to 1.
   * After updating the opacity, it triggers the `_resolutionLayerSwitcher` method.
   */
  @Input() set wmMapLayerOpacity(opacity: boolean) {
    this._opacity = opacity ? 0.3 : 1;
  }

  /**
   * @description
   * The output event emitter for selecting a color from the layer.
   * It emits the selected color value as a string.
   */
  @Input() set wmMapLayerRefresh(_: any) {
    this._updateMap();
  }

  @Input() track;
  @Input() wmMapInputTyped: string;
  @Output()
  colorSelectedFromLayerEVT: EventEmitter<string> = new EventEmitter<string>();
  /**
   * @description
   * The output event emitter for selecting a track from the layer.
   * It emits the ID of the selected track as a number.
   */
  @Output()
  trackSelectedFromLayerEVT: EventEmitter<number> = new EventEmitter<number>();

  constructor(@Host() mapCmp: WmMapComponent) {
    super(mapCmp);
    this.mapCmp.isInit$
      .pipe(
        filter(f => f === true),
        take(1),
      )
      .subscribe(() => {
        this.mapCmp.map.once('precompose', () => {
          this._initLayer(this.wmMapConf);
        });
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes.track != null &&
      changes.track.currentValue != null &&
      changes.track.previousValue != null &&
      changes.track.currentValue != changes.track.previousValue
    ) {
      if (this._animatedVectorLayer != null) {
        this._animatedVectorLayer.getSource().clear();
      }
    }
  }

  onClick(evt: MapBrowserEvent<UIEvent>): void {
    const features = [];
    this.mapCmp.map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
      if (layer === this._vectorTileLayer) {
        features.push(feature);
      }
    });
    if (features.length === 0) {
      return;
    }
    const zoom = this.mapCmp.map.getView().getZoom();
    if (zoom <= MAP_ZOOM_ON_CLICK_TRESHOLD) {
      this._zoomOnClick(evt);
    } else {
      try {
        const features = this.mapCmp.map.getFeaturesAtPixel(evt.pixel, {hitTolerance: 100});
        const clickedFeature = features[0];
        const properties = clickedFeature?.getProperties();
        const geometryType = clickedFeature.getGeometry()?.getType();
        // Controlla se la geometria è un Point e, in tal caso, non prosegue
        if (geometryType === 'Point') {
          return;
        }

        const isPbfLayer = properties?.name == null;
        if (isPbfLayer) {
          this._zoomOnClick(evt);
        }
        const clickedFeatureId: number = clickedFeature?.getProperties()?.id ?? undefined;
        const clickedLayerId = JSON.parse(clickedFeature?.getProperties()?.layers)[0] ?? undefined;
        if (clickedFeatureId > -1 && !isPbfLayer) {
          this.trackSelectedFromLayerEVT.emit(clickedFeatureId);
          const color = getColorFromLayer(clickedLayerId, this.wmMapConf.layers);

          this.colorSelectedFromLayerEVT.emit(fromNameToHEX[color] ?? color);
        }
      } catch (_) {}
    }
  }

  /**
   *  @format
   * @description
   * This code is used to initialize the layers of a map.
   * It takes in an IMAP object and initializes the data layers, adds interactions, and sets up a resolution layer switcher.
   * Finally, it updates the size of the map.
   * @private
   * @param {IMAP} map
   * @memberof WmMapLayerDirective
   */
  private _initLayer(map: IMAP) {
    clearPbfDB();
    if (this._dataLayerUrls != null) {
      this.wmMapStateEvt.emit('rendering:layer_start');
      this._initializeDataLayers(map);
      initInteractions().forEach(interaction => {
        this.mapCmp.map.addInteraction(interaction);
      });
      this.mapCmp.map.updateSize();
      this.wmMapStateEvt.emit('rendering:layer_done');
    }
  }

  /**
   * @description
   * This code is used to initialize data layers on a map.
   * It creates two vector tile layers, one low and one high, using the functions initVectorTileLayer and styleLowFn/styleHighFn.
   * The low layer is given the property 'high' set to false, while the high layer is given the property 'high' set to true.
   * Finally, both layers are added to the map and the resolution layer switcher is called.
   * @private
   * @param {IMAP} map
   * @memberof WmMapLayerDirective
   */
  private _initializeDataLayers(map: IMAP): void {
    if (this._dataLayerUrls != null) {
      this._vectorTileLayer = initVectorTileLayer(
        this._dataLayerUrls.low,
        f =>
          styleHighFn.bind({
            currentLayer: this._currentLayer,
            conf: this.wmMapConf,
            map: this.mapCmp.map,
            opacity: this.wmMapLayerOpacity,
            filters: this.mapCmp.filters,
            tileLayer: this._vectorTileLayer,
            inputTyped: this.wmMapInputTyped,
            currentTrack: this.track,
          })(f),
        lowTileLoadFn,
      );

      this.mapCmp.map.addLayer(this._vectorTileLayer);
      this.mapCmp.map.addLayer(this._animatedVectorLayer);
      this.mapCmp.registerDirective(this._vectorTileLayer['ol_uid'], this);
      this._vectorTileLayer.setVisible(!this._disabled);
    }
  }

  /**
   * @description
   * This code is a private method called _updateMap() that is used to update the map.
   * It does this by calling the changed() method on two vector tile layers,
   * this._lowVectorTileLayer and this._highVectorTileLayer.
   * @private
   * @memberof WmMapLayerDirective
   */
  private _updateMap(): void {
    if (this._vectorTileLayer != null) {
      this._vectorTileLayer.getSource().refresh();
      this._vectorTileLayer.changed();
    }
  }

  private _zoomOnClick(evt): void {
    const view = this.mapCmp.map.getView();
    const clickedCoordinate = evt.coordinate;
    view.animate({
      center: clickedCoordinate,
      zoom: DEF_ZOOM_ON_CLICK,
      duration: 500,
    });
    this.mapCmp.map.once('moveend', e => {
      this._updateMap();
    });
  }
}
