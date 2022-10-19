import {
  ChangeDetectorRef,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  Renderer2,
  SimpleChanges,
} from '@angular/core';
import {Interaction, defaults as defaultInteractions} from 'ol/interaction.js';
import SelectInteraction, {SelectEvent} from 'ol/interaction/Select';

import {Collection} from 'ol';
import {ConfService} from 'src/app/store/conf/conf.service';
import {DEF_LINE_COLOR} from './constants';
import {FeatureLike} from 'ol/Feature';
import Layer from 'ol/layer/Layer';
import MVT from 'ol/format/MVT';
import Map from 'ol/Map';
import StrokeStyle from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import {TRACK_ZINDEX} from './zIndex';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import {WmMapBaseDirective} from './base.directive';

const SWITCH_RESOLUTION_ZOOM_LEVEL = 10;

@Directive({
  selector: '[wmMapLayer]',
})
export class WmMapLayerDirective extends WmMapBaseDirective implements OnChanges, OnInit {
  private _currentLayer: ILAYER;
  private _defaultFeatureColor = DEF_LINE_COLOR;
  private _highVectorTileLayer: VectorTileLayer;
  private _ionProgress: any;
  private _loaded = 0;
  private _loading = 0;
  private _lowLoaded = 0;
  private _lowLoading = 0;
  private _lowVectorTileLayer: VectorTileLayer;
  private _mapIsInit = false;
  private _selectInteraction: SelectInteraction;
  private _styleFn = (feature: FeatureLike) => {
    const map = this.conf;
    const properties = feature.getProperties();
    const layers: number[] = JSON.parse(properties.layers);
    let strokeStyle: StrokeStyle = new StrokeStyle();

    if (this._currentLayer != null) {
      const currentIDLayer = +this._currentLayer.id;
      if (layers.indexOf(currentIDLayer) >= 0) {
        strokeStyle.setColor(this._currentLayer.style.color ?? this._defaultFeatureColor);
      } else {
        strokeStyle.setColor('rgba(0,0,0,0)');
      }
    } else {
      const layerId = +layers[0];
      strokeStyle.setColor(this._getColorFromLayer(layerId));
    }
    this._handlingStrokeStyleWidth(strokeStyle, map, 2);

    let style = new Style({
      stroke: strokeStyle,
      zIndex: TRACK_ZINDEX + 1,
    });
    return style;
  };
  private _styleLowFn = (feature: FeatureLike) => {
    const map = this.conf;
    const properties = feature.getProperties();
    const layers: number[] = JSON.parse(properties.layers);
    let strokeStyle: StrokeStyle = new StrokeStyle();

    if (this._currentLayer != null) {
      const currentIDLayer = +this._currentLayer.id;
      if (layers.indexOf(currentIDLayer) >= 0) {
        strokeStyle.setColor(this._currentLayer.style.color ?? this._defaultFeatureColor);
      } else {
        strokeStyle.setColor('rgba(0,0,0,0)');
      }
    } else {
      const layerId = +layers[0];
      strokeStyle.setColor(this._getColorFromLayer(layerId));
    }
    this._handlingStrokeStyleWidth(strokeStyle, map, 3, 6);

    let style = new Style({
      stroke: strokeStyle,
      zIndex: TRACK_ZINDEX,
    });
    return style;
  };

  @Input() conf: IMAP;
  @Input() map: Map;
  @Output() trackSelectedFromLayerEVT: EventEmitter<number> = new EventEmitter<number>();

  constructor(
    private _elRef: ElementRef,
    private _confSvc: ConfService,
    private _renderer: Renderer2,
    private _cdr: ChangeDetectorRef,
  ) {
    super();
  }

  @Input() set disableLayers(disable: boolean) {
    if (this._highVectorTileLayer != null) {
      this._highVectorTileLayer.setVisible(!disable);
    }
    if (this._lowVectorTileLayer != null) {
      this._lowVectorTileLayer.setVisible(!disable);
    }
  }

  @Input() set layer(l: ILAYER) {
    this._currentLayer = l;
    if (l != null && l.bbox != null) {
      this.fitView(l.bbox);
    }
  }

  ngOnChanges(_: SimpleChanges): void {
    if (this.map != null && this.conf != null && this._mapIsInit == false) {
      this._initLayer(this.conf);
      this._mapIsInit = true;
      this.map.on('moveend', () => {
        this._resolutionLayerSwitcher();
      });
      this.map.on('movestart', () => {
        setTimeout(() => {
          this._resolutionLayerSwitcher();
        }, 500);
      });

      this._highVectorTileLayer.getSource().on('tileloadstart', () => {
        ++this._loading;
        this._updateProgressBar();
      });
      this._highVectorTileLayer.getSource().on(['tileloadend', 'tileloaderror'], () => {
        ++this._loaded;
        this._updateProgressBar();
      });
      this._lowVectorTileLayer.getSource().on('tileloadstart', () => {
        ++this._lowLoading;
        this._updateProgressBar();
      });
      this._lowVectorTileLayer.getSource().on(['tileloadend', 'tileloaderror'], () => {
        ++this._lowLoaded;
        this._updateProgressBar();
      });
    }

    if (this._lowVectorTileLayer != null || this._highVectorTileLayer != null) {
      this._updateMap();
    }
  }

  ngOnInit(): void {
    this._ionProgress = this._renderer.createElement('ion-progress-bar');
    this._ionProgress.setAttribute('value', '1');
    this._renderer.appendChild(this._elRef.nativeElement.parentNode, this._ionProgress);
  }

  private _getColorFromLayer(id: number): string {
    const layers = this.conf.layers || [];
    const layer = layers.filter(l => +l.id === +id);
    return layer[0] && layer[0].style && layer[0].style.color
      ? layer[0].style.color
      : this._defaultFeatureColor;
  }

  private _handlingStrokeStyleWidth(
    strokeStyle: StrokeStyle,
    conf: IMAP,
    minW = 0.1,
    maxW = 5,
  ): void {
    const currentZoom: number = this.map.getView().getZoom();

    const delta = (currentZoom - conf.minZoom) / (conf.maxZoom - conf.minZoom);
    const newWidth = minW + (maxW - minW) * delta;
    strokeStyle.setWidth(newWidth);
  }

  private _initLayer(map: IMAP) {
    this._initializeDataLayers(map);
    this._resolutionLayerSwitcher();

    const interactions: Collection<Interaction> = this._initializeMapInteractions([
      this._lowVectorTileLayer,
      this._highVectorTileLayer,
    ]);
    interactions.forEach(interaction => {
      this.map.addInteraction(interaction);
    });
    this._selectInteraction.on('select', async (event: SelectEvent) => {
      const clickedFeature = event?.selected?.[0] ?? undefined;
      const clickedFeatureId: number = clickedFeature?.getProperties()?.id ?? undefined;
      if (clickedFeatureId > -1 && this._highVectorTileLayer.getOpacity() === 1) {
        this.trackSelectedFromLayerEVT.emit(clickedFeatureId);
      }
    });

    this.map.updateSize();
  }

  /**
   * Create the layers containing the map interactive data
   *
   * @returns the array of created layers
   */
  private _initializeDataLayers(map: IMAP): void {
    this._lowVectorTileLayer = this._initializeLowDataLayer(
      `https://jidotile.webmapp.it/?x={x}&y={y}&z={z}&index=geohub_app_low_${this._confSvc.geohubAppId}`,
      map,
    );
    this._highVectorTileLayer = this._initializeHighDataLayer(
      `https://jidotile.webmapp.it/?x={x}&y={y}&z={z}&index=geohub_app_high_${this._confSvc.geohubAppId}`,
      map,
    );

    this.map.addLayer(this._lowVectorTileLayer);
    this.map.addLayer(this._highVectorTileLayer);
  }

  /**
   * Initialize a specific layer with interactive data
   *
   * @returns the created layer
   */
  private _initializeHighDataLayer(url: any, map: IMAP): VectorTileLayer {
    if (!url) {
      return;
    }

    const layer = new VectorTileLayer({
      zIndex: TRACK_ZINDEX,
      renderBuffer: 5000,
      source: new VectorTileSource({
        format: new MVT(),
        url: url,
        overlaps: true,
        tileSize: 512,
        tileLoadFunction: (tile: any, url: string) => {
          tile.setLoader(
            this._loadFeaturesXhr(
              url,
              tile.getFormat(),
              tile.extent,
              tile.resolution,
              tile.projection,
              tile.onLoad.bind(tile),
              tile.onError.bind(tile),
            ),
          );
        },
      }),
      style: this._styleFn,
    });
    return layer;
  }

  private _initializeLowDataLayer(url: any, map: IMAP): VectorTileLayer {
    if (!url) {
      return;
    }
    const layer = new VectorTileLayer({
      zIndex: TRACK_ZINDEX,
      renderBuffer: 5000,
      declutter: true,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      useInterimTilesOnError: true,
      source: new VectorTileSource({
        format: new MVT(),
        tileSize: 128,
        url: url,
        overlaps: true,
        tileLoadFunction: (tile: any, url: string) => {
          tile.setLoader(
            this._loadFeaturesXhr(
              url,
              tile.getFormat(),
              tile.extent,
              tile.resolution,
              tile.projection,
              tile.onLoad.bind(tile),
              tile.onError.bind(tile),
            ),
          );
        },
      }),
      style: this._styleLowFn,
    });
    return layer;
  }

  private _initializeMapInteractions(selectLayers: Array<Layer>): Collection<Interaction> {
    const interactions = defaultInteractions({
      doubleClickZoom: false,
      dragPan: true,
      mouseWheelZoom: true,
      pinchRotate: false,
      altShiftDragRotate: false,
    });
    this._selectInteraction = new SelectInteraction({
      layers: selectLayers,
      hitTolerance: 100,
      style: null,
    });

    interactions.push(this._selectInteraction);

    return interactions;
  }

  private _loadFeaturesXhr(url, format, extent, resolution, projection, success, failure) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', typeof url === 'function' ? url(extent, resolution, projection) : url, true);
    if (format.getType() == 'arraybuffer') {
      xhr.responseType = 'arraybuffer';
    }
    /**
     * @param {Event} event Event.
     * @private
     */
    xhr.onload = function (event) {
      // status will be 0 for file:// urls
      if (!xhr.status || (xhr.status >= 200 && xhr.status < 300)) {
        var type = format.getType();
        /** @type {Document|Node|Object|string|undefined} */
        var source = void 0;
        if (type == 'json' || type == 'text') {
          source = xhr.responseText;
        } else if (type == 'xml') {
          source = xhr.responseXML;
          if (!source) {
            source = new DOMParser().parseFromString(xhr.responseText, 'application/xml');
          }
        } else if (type == 'arraybuffer') {
          source = xhr.response;
        }
        if (source) {
          success(
            format.readFeatures(source, {
              extent: extent,
              featureProjection: projection,
            }),
            format.readProjection(source),
          );
        } else {
          failure();
        }
      } else {
        failure();
      }
    };
    /**
     * @private
     */
    xhr.onerror = failure;
    const body = `{
      "query": {"term" : { "layers" : 133 }}
     
  }`;
    // const body = `{"query": {"term" : { "layers" : 133 }}}`;
    xhr.send(body);
  }

  private _resolutionLayerSwitcher(): void {
    if (this._highVectorTileLayer != null && this._lowVectorTileLayer != null) {
      const currentZoom = this.map.getView().getZoom();
      if (
        currentZoom > SWITCH_RESOLUTION_ZOOM_LEVEL - 2 &&
        this._highVectorTileLayer.getVisible() == false
      ) {
        this._highVectorTileLayer.setVisible(true);
      }
      if (currentZoom > SWITCH_RESOLUTION_ZOOM_LEVEL) {
        this._highVectorTileLayer.setOpacity(1);
        this._lowVectorTileLayer.setOpacity(0);
      } else {
        this._highVectorTileLayer.setOpacity(0);
        this._lowVectorTileLayer.setOpacity(1);
      }
    }
    this._cdr.markForCheck();
  }

  private _updateMap(): void {
    this._lowVectorTileLayer.changed();
    this._highVectorTileLayer.changed();
    this.map.updateSize();
  }

  private _updateProgressBar(): void {
    const currentZoom = this.map.getView().getZoom();
    let loaded = this._lowLoaded;
    let loading = this._lowLoading;
    if (currentZoom > SWITCH_RESOLUTION_ZOOM_LEVEL) {
      loaded = this._loaded;
      loading = this._loading;
    }
    const range = +((loaded / loading) * 100).toFixed(0);
    this._ionProgress.style.width = `${range}%`;

    if (loaded === loading) {
      this._ionProgress.setAttribute('color', 'success');
      setTimeout(() => {
        this._ionProgress.style.visibility = 'hidden';
      }, 1000);
    } else {
      this._ionProgress.setAttribute('color', 'primary');
      this._ionProgress.style.visibility = 'visible';
    }
    this._updateMap();
  }
}
