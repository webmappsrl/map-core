import {
  Directive,
  EventEmitter,
  Host,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import * as localforage from 'localforage';
import MapBrowserEvent from 'ol/MapBrowserEvent';
import VectorTileLayer from 'ol/layer/VectorTile';
import {filter, take} from 'rxjs/operators';
import {WmMapBaseDirective} from '.';
import {
  clearStorage,
  fromNameToHEX,
  getColorFromLayer,
  initInteractions,
  initVectorTileLayer,
  lowTileLoadFn,
  styleHighFn,
  styleLowFn,
  tileLoadFn,
} from '../../src/utils';
import {WmMapComponent} from '../components';
import {SWITCH_RESOLUTION_ZOOM_LEVEL} from '../readonly';
import {IDATALAYER, ILAYER} from '../types/layer';
import {IMAP} from '../types/model';

@Directive({
  selector: '[wmMapLayer]',
})
export class WmMapLayerDirective extends WmMapBaseDirective implements OnChanges {
  private _currentLayer: ILAYER;
  private _dataLayerUrls: IDATALAYER;
  private _disabled = false;
  private _highVectorTileLayer: VectorTileLayer;
  private _lowVectorTileLayer: VectorTileLayer;
  private _opacity = 1;

  /**
   * @description
   * The input property for the JIDO update time.
   * It sets the JIDO update time in localStorage and clears the storage if the time has changed.
   */
  @Input() set jidoUpdateTime(time: number) {
    const storedJidoVersion = localStorage.getItem(`JIDO_UPDATE_TIME`);
    if (time != undefined && time != +storedJidoVersion) {
      clearStorage();
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
    if (this._highVectorTileLayer != null) {
      this._highVectorTileLayer.setVisible(!disable);
    }
    if (this._lowVectorTileLayer != null) {
      this._lowVectorTileLayer.setVisible(!disable);
    }
  }
  @Input() wmMapInputTyped: string;

  /**
   * @description
   * The input property to set the current map layer.
   * When a new layer is set, it updates the current layer and fits the map view to the bounding box of the layer if available.
   */
  @Input() set wmMapLayerLayer(l: ILAYER) {
    this._currentLayer = l;
    if (l != null && l.bbox != null) {
      this.fitViewFromLonLat(l.bbox);
    }
  }

  /**
   * @description
   * The input property to set the opacity of the map layer.
   * If `opacity` is `true`, it sets the opacity of the layer to 0.3; otherwise, it sets it to 1.
   * After updating the opacity, it triggers the `_resolutionLayerSwitcher` method.
   */
  @Input() set wmMapLayerOpacity(opacity: boolean) {
    this._opacity = opacity ? 0.3 : 1;
    this._resolutionLayerSwitcher();
  }

  /**
   * @description
   * The output event emitter for selecting a color from the layer.
   * It emits the selected color value as a string.
   */
  @Input() set wmMapLayerRefresh(_: any) {
    this._updateMap();
  }

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
    localforage.config({
      name: 'JIDO',
      version: 1.0,
      size: 49807360, // Size of database, in bytes. WebSQL-only for now.
      storeName: 'xyz', // Should be alphanumeric, with underscores.
      description: 'tile vector tiles',
    });
    this.mapCmp.isInit$
      .pipe(
        filter(f => f === true),
        take(1),
      )
      .subscribe(() => {
        this.mapCmp.map.once('precompose', () => {
          this._initLayer(this.wmMapConf);
        });
        this.mapCmp.map.on('moveend', () => {
          this._resolutionLayerSwitcher();
        });
        this.mapCmp.map.on('movestart', () => {
          this._resolutionLayerSwitcher();
        });
        this.mapCmp.map.on('click', (evt: MapBrowserEvent<UIEvent>) => {
          try {
            this.mapCmp.map.forEachFeatureAtPixel(
              evt.pixel,
              function (clickedFeature) {
                const clickedFeatureId: number = clickedFeature?.getProperties()?.id ?? undefined;
                const clickedLayerId =
                  JSON.parse(clickedFeature?.getProperties()?.layers)[0] ?? undefined;
                if (
                  clickedFeatureId > -1 &&
                  this._highVectorTileLayer.getOpacity() === 1 &&
                  clickedFeature.getType() != null
                ) {
                  this.trackSelectedFromLayerEVT.emit(clickedFeatureId);
                  const color = getColorFromLayer(clickedLayerId, this.wmMapConf.layers);

                  this.colorSelectedFromLayerEVT.emit(fromNameToHEX[color] ?? color);
                }
                return true;
              }.bind(this),
              {
                hitTolerance: 100,
              },
            );
          } catch (_) {}
        });
      });
  }

  ngOnChanges(_: SimpleChanges): void {
    if (this._lowVectorTileLayer != null || this._highVectorTileLayer != null) {
      this._updateMap();
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
    this._initializeDataLayers(map);
    initInteractions().forEach(interaction => {
      this.mapCmp.map.addInteraction(interaction);
    });
    this._resolutionLayerSwitcher();

    this.mapCmp.map.updateSize();
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
    this._lowVectorTileLayer = initVectorTileLayer(
      this._dataLayerUrls.low,
      f => {
        return styleLowFn.bind({
          currentLayer: this._currentLayer,
          conf: this.wmMapConf,
          map: this.mapCmp.map,
          opacity: this.wmMapLayerOpacity,
          filters: this.mapCmp.filters,
          tileLayer: this._lowVectorTileLayer,
          inputTyped: this.wmMapInputTyped,
        })(f);
      },
      lowTileLoadFn,
      true,
    );
    this._highVectorTileLayer = initVectorTileLayer(
      this._dataLayerUrls.high,
      f => {
        return styleHighFn.bind({
          currentLayer: this._currentLayer,
          conf: this.wmMapConf,
          map: this.mapCmp.map,
          opacity: this.wmMapLayerOpacity,
          filters: this.mapCmp.filters,
          tileLayer: this._highVectorTileLayer,
          inputTyped: this.wmMapInputTyped,
        })(f);
      },
      tileLoadFn,
      true,
    );
    this._lowVectorTileLayer.setProperties({
      'high': false,
    });
    this._highVectorTileLayer.setProperties({
      'high': true,
    });
    this.mapCmp.map.addLayer(this._lowVectorTileLayer);
    this.mapCmp.map.addLayer(this._highVectorTileLayer);
    this._resolutionLayerSwitcher();
  }

  /**
   * @description
   * This function is used to switch between two vector tile layers based on the current zoom level.
   * It checks if the two vector tile layers are not null and if they are not disabled.
   * If the current zoom level is less than the preload zoom level,
   * it sets the high vector tile layer to be invisible and sets the low vector tile layer to be visible with an opacity set by this._opacity.
   * If the current zoom level is between the preload and switch resolution zoom levels,
   * it sets both layers to be visible with the high vector tile layer having an opacity of 0
   * and the low vector tile layer having an opacity set by this._opacity.
   * If the current zoom level is greater than or equal to the switch resolution zoom level,
   * it sets both layers to be visible with only the high vector tile layer having an opacity set by this._opacity.
   * If they are disabled, both layers are set to be invisible.
   * @private
   * @memberof WmMapLayerDirective
   */
  private _resolutionLayerSwitcher(): void {
    if (this._highVectorTileLayer != null && this._lowVectorTileLayer != null) {
      const currentZoom = this.mapCmp.map.getView().getZoom();
      const preload = SWITCH_RESOLUTION_ZOOM_LEVEL - 2;
      if (this._disabled === false) {
        if (currentZoom < preload) {
          this._highVectorTileLayer.setVisible(false);
          this._lowVectorTileLayer.setVisible(true);
          this._lowVectorTileLayer.setOpacity(this._opacity);
        } else if (preload < currentZoom && currentZoom < SWITCH_RESOLUTION_ZOOM_LEVEL) {
          this._highVectorTileLayer.setOpacity(0);
          this._highVectorTileLayer.setVisible(true);
          this._lowVectorTileLayer.setVisible(true);
          this._lowVectorTileLayer.setOpacity(this._opacity);
        } else {
          this._highVectorTileLayer.setOpacity(this._opacity);
          this._highVectorTileLayer.setVisible(true);
          this._lowVectorTileLayer.setVisible(false);
        }
      } else {
        this._highVectorTileLayer.setVisible(false);
        this._lowVectorTileLayer.setVisible(false);
      }
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
    if (this._lowVectorTileLayer != null) {
      this._lowVectorTileLayer.changed();
    }
    if (this._highVectorTileLayer != null) {
      this._highVectorTileLayer.changed();
    }
  }
}
