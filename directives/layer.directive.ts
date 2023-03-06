import {
  Directive,
  EventEmitter,
  Host,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import {take, filter} from 'rxjs/operators';
import VectorTileLayer from 'ol/layer/VectorTile';
import MapBrowserEvent from 'ol/MapBrowserEvent';
import * as localforage from 'localforage';
import {WmMapBaseDirective} from '.';
import {SWITCH_RESOLUTION_ZOOM_LEVEL} from '../readonly';
import {IDATALAYER, ILAYER} from '../types/layer';
import {
  clearStorage,
  initInteractions,
  initVectorTileLayer,
  tileLoadFn,
  lowTileLoadFn,
  styleLowFn,
  styleHighFn,
  getColorFromLayer,
  fromNameToHEX,
} from '../utils';
import {IMAP} from '../types/model';
import {WmMapComponent} from '../components';

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

  @Input() set jidoUpdateTime(time: number) {
    const storedJidoVersion = localStorage.getItem(`JIDO_UPDATE_TIME`);
    if (time != undefined && time != +storedJidoVersion) {
      clearStorage();
      localStorage.setItem(`JIDO_UPDATE_TIME`, `${time}`);
    }
  }

  @Input() set wmMapLayerDataLayerUrls(urls: IDATALAYER) {
    this._dataLayerUrls = urls;
  }

  @Input() set wmMapLayerDisableLayers(disable: boolean) {
    this._disabled = disable;
    if (this._highVectorTileLayer != null) {
      this._highVectorTileLayer.setVisible(!disable);
    }
    if (this._lowVectorTileLayer != null) {
      this._lowVectorTileLayer.setVisible(!disable);
    }
  }

  @Input() set wmMapLayerLayer(l: ILAYER) {
    this._currentLayer = l;
    if (l != null && l.bbox != null) {
      this.fitViewFromLonLat(l.bbox);
    }
  }

  @Input() set wmMapLayerOpacity(opacity: boolean) {
    this._opacity = opacity ? 0.3 : 1;
    this._resolutionLayerSwitcher();
  }

  @Output()
  colorSelectedFromLayerEVT: EventEmitter<string> = new EventEmitter<string>();
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
        this._initLayer(this.wmMapConf);
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
    this._lowVectorTileLayer.changed();
    this._highVectorTileLayer.changed();
  }
}
