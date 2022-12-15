import {
  ChangeDetectorRef,
  Directive,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import VectorTileLayer from 'ol/layer/VectorTile';
import Map from 'ol/Map';
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
} from '../utils';
import {IMAP} from '../types/model';

@Directive({
  selector: '[wmMapLayer]',
})
export class WmMapLayerDirective extends WmMapBaseDirective implements OnChanges {
  private _currentLayer: ILAYER;
  private _dataLayerUrls: IDATALAYER;
  private _highVectorTileLayer: VectorTileLayer;
  private _lowVectorTileLayer: VectorTileLayer;
  private _mapIsInit = false;

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
    this._opacity = opacity ? 0.5 : 1;
    this._resolutionLayerSwitcher();
  }
  @Output() trackSelectedFromLayerEVT: EventEmitter<number> = new EventEmitter<number>();

  constructor(private _cdr: ChangeDetectorRef) {
    super();
    localforage.config({
      name: 'JIDO',
      version: 1.0,
      size: 49807360, // Size of database, in bytes. WebSQL-only for now.
      storeName: 'xyz', // Should be alphanumeric, with underscores.
      description: 'tile vector tiles',
    });
  }

  ngOnChanges(_: SimpleChanges): void {
    if (this.wmMapMap != null && this.wmMapConf != null && this._mapIsInit == false) {
      this._initLayer(this.wmMapConf);
      this._mapIsInit = true;
      this.wmMapMap.on('moveend', () => {
        this._resolutionLayerSwitcher();
      });
      this.wmMapMap.on('movestart', () => {
        setTimeout(() => {
          this._resolutionLayerSwitcher();
        }, 500);
      });
      this.wmMapMap.on('click', (evt: MapBrowserEvent<UIEvent>) => {
        try {
          this.wmMapMap.forEachFeatureAtPixel(
            evt.pixel,
            function (clickedFeature) {
              const clickedFeatureId: number = clickedFeature?.getProperties()?.id ?? undefined;
              if (clickedFeatureId > -1 && this._highVectorTileLayer.getOpacity() === 1) {
                this.trackSelectedFromLayerEVT.emit(clickedFeatureId);
              }
              return true;
            }.bind(this),
            {
              hitTolerance: 100,
            },
          );
        } catch (_) {}
      });
    }

    if (this._lowVectorTileLayer != null || this._highVectorTileLayer != null) {
      this._updateMap();
    }
  }

  private _initLayer(map: IMAP) {
    this._initializeDataLayers(map);
    initInteractions().forEach(interaction => {
      this.wmMapMap.addInteraction(interaction);
    });
    this._resolutionLayerSwitcher();

    this.wmMapMap.updateSize();
  }

  /**
   * Create the layers containing the map interactive data
   *
   * @returns the array of created layers
   */
  private _initializeDataLayers(map: IMAP): void {
    this._lowVectorTileLayer = initVectorTileLayer(
      this._dataLayerUrls.low,
      f => {
        return styleLowFn.bind({
          currentLayer: this._currentLayer,
          conf: this.wmMapConf,
          map: this.wmMapMap,
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
          map: this.wmMapMap,
        })(f);
      },
      tileLoadFn,
      true,
    );
    this._lowVectorTileLayer.setProperties({'high': false});
    this._highVectorTileLayer.setProperties({'high': true});
    this.wmMapMap.addLayer(this._lowVectorTileLayer);
    this.wmMapMap.addLayer(this._highVectorTileLayer);
    this._resolutionLayerSwitcher();
  }

  private _resolutionLayerSwitcher(): void {
    if (this._highVectorTileLayer != null && this._lowVectorTileLayer != null) {
      const currentZoom = this.wmMapMap.getView().getZoom();

      if (currentZoom > SWITCH_RESOLUTION_ZOOM_LEVEL) {
        this._highVectorTileLayer.setOpacity(this._opacity);
        this._lowVectorTileLayer.setOpacity(0);
      } else {
        this._highVectorTileLayer.setOpacity(0);
        this._lowVectorTileLayer.setOpacity(this._opacity);
      }
    }
    this._cdr.markForCheck();
  }

  private _updateMap(): void {
    this._lowVectorTileLayer.changed();
    this._highVectorTileLayer.changed();
  }
}
