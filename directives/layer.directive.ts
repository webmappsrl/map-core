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
import {FeatureLike} from 'ol/Feature';
import VectorTileLayer from 'ol/layer/VectorTile';
import Map from 'ol/Map';
import MapBrowserEvent from 'ol/MapBrowserEvent';
import StrokeStyle from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import * as localforage from 'localforage';
import {WmMapBaseDirective} from '.';
import {
  DEF_LINE_COLOR,
  SELECTED_TRACK_ZINDEX,
  SWITCH_RESOLUTION_ZOOM_LEVEL,
  TRACK_ZINDEX,
} from '../readonly';
import {IDATALAYER, ILAYER} from '../types/layer';
import {
  clearStorage,
  handlingStrokeStyleWidthOptions,
  handlingStrokeStyleWidth,
  getColorFromLayer,
  initInteractions,
  initVectorTileLayer,
  tileLoadFn,
  lowTileLoadFn,
  getFlowStyle,
  getLineStyle,
} from '../utils';
import {IMAP} from '../types/model';
import RenderFeature, {toFeature} from 'ol/render/Feature';
import {Fill, Stroke} from 'ol/style';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
@Directive({
  selector: '[wmMapLayer]',
})
export class WmMapLayerDirective extends WmMapBaseDirective implements OnChanges, OnInit {
  private _currentLayer: ILAYER;
  private _dataLayerUrls: IDATALAYER;
  private _defaultFeatureColor = DEF_LINE_COLOR;
  private _highVectorTileLayer: VectorTileLayer;
  private _highlightLayer: VectorLayer<VectorSource>;
  private _ionProgress: any;
  private _loaded = 0;
  private _loading = 0;
  private _lowLoaded = 0;
  private _lowLoading = 0;
  private _lowVectorTileLayer: VectorTileLayer;
  private _mapIsInit = false;
  private _styleFn = (feature: FeatureLike) => {
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
      strokeStyle.setColor(getColorFromLayer(layerId, this.conf.layers));
    }
    const opt: handlingStrokeStyleWidthOptions = {
      strokeStyle,
      minZoom: this.conf.minZoom,
      maxZoom: this.conf.maxZoom,
      minStrokeWidth: this.conf.minStrokeWidth,
      maxStrokeWidth: this.conf.maxStrokeWidth,
      currentZoom: this.map.getView().getZoom(),
    };
    handlingStrokeStyleWidth(opt);

    let style = new Style({
      stroke: strokeStyle,
      zIndex: TRACK_ZINDEX + 1,
    });
    return style;
  };
  private _styleLowFn = (feature: FeatureLike) => {
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
      strokeStyle.setColor(getColorFromLayer(layerId, this.conf.layers));
    }
    const opt: handlingStrokeStyleWidthOptions = {
      strokeStyle,
      minZoom: this.conf.minZoom,
      maxZoom: this.conf.maxZoom,
      minStrokeWidth: this.conf.minStrokeWidth + 1,
      maxStrokeWidth: this.conf.maxStrokeWidth,
      currentZoom: this.map.getView().getZoom(),
    };
    handlingStrokeStyleWidth(opt);

    let style = new Style({
      stroke: strokeStyle,
      zIndex: TRACK_ZINDEX,
    });
    return style;
  };

  @Input() set dataLayerUrls(urls: IDATALAYER) {
    this._dataLayerUrls = urls;
  }

  @Input() set disableLayers(disable: boolean) {
    if (this._highVectorTileLayer != null) {
      this._highVectorTileLayer.setVisible(!disable);
    }
    if (this._lowVectorTileLayer != null) {
      this._lowVectorTileLayer.setVisible(!disable);
    }
  }

  @Input() set jidoUpdateTime(time: number) {
    const storedJidoVersion = localStorage.getItem(`JIDO_UPDATE_TIME`);
    if (time != undefined && time != +storedJidoVersion) {
      clearStorage();
      localStorage.setItem(`JIDO_UPDATE_TIME`, `${time}`);
    }
  }

  @Input() set layer(l: ILAYER) {
    this._currentLayer = l;
    if (l != null && l.bbox != null) {
      this.fitView(l.bbox);
    }
  }

  @Input() conf: IMAP;
  @Input() map: Map;
  @Output() trackSelectedFromLayerEVT: EventEmitter<number> = new EventEmitter<number>();

  constructor(
    private _elRef: ElementRef,
    private _renderer: Renderer2,
    private _cdr: ChangeDetectorRef,
  ) {
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
      this.map.on('click', (evt: MapBrowserEvent<UIEvent>) => {
        try {
          this.map.forEachFeatureAtPixel(
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
      let highlightFeatureId = null;
      this._highlightLayer = new VectorLayer({
        source: new VectorSource({
          format: new GeoJSON(),
        }),
        style: () => getLineStyle('#CA1551'),
        zIndex: SELECTED_TRACK_ZINDEX - 1,
      });
      this.map.addLayer(this._highlightLayer);
      this.map.on('pointermove', (e: any) => {
        let added = this.map.forEachFeatureAtPixel(
          e.pixel,
          (f: RenderFeature, l: VectorTileLayer) => {
            if (f.getType != null) {
              const feature = toFeature(f);
              const featureId = feature.getProperties().id;
              if (l.getOpacity() === 1 && l.getProperties().high) {
                if (highlightFeatureId != featureId) {
                  this.map.getViewport().style.cursor = 'pointer';
                  this._highlightLayer.getSource().clear();
                  this._highlightLayer.getSource().addFeature(toFeature(f));
                  highlightFeatureId = featureId;
                }
                return true;
              }
            }
          },
          {hitTolerance: 30},
        );
        if (added) {
          this.map.getViewport().style.cursor = 'pointer';
        } else {
          this._highlightLayer.getSource().clear();
          this.map.getViewport().style.cursor = '';
        }
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

  private _initLayer(map: IMAP) {
    this._initializeDataLayers(map);
    initInteractions().forEach(interaction => {
      this.map.addInteraction(interaction);
    });
    this._resolutionLayerSwitcher();

    this.map.updateSize();
  }

  /**
   * Create the layers containing the map interactive data
   *
   * @returns the array of created layers
   */
  private _initializeDataLayers(map: IMAP): void {
    this._lowVectorTileLayer = initVectorTileLayer(
      this._dataLayerUrls.low,
      this._styleLowFn,
      lowTileLoadFn,
      true,
    );
    this._highVectorTileLayer = initVectorTileLayer(
      this._dataLayerUrls.high,
      this._styleFn,
      tileLoadFn,
      true,
    );
    this._lowVectorTileLayer.setProperties({'high': false});
    this._highVectorTileLayer.setProperties({'high': true});
    this.map.addLayer(this._lowVectorTileLayer);
    this.map.addLayer(this._highVectorTileLayer);
    this._resolutionLayerSwitcher();
  }

  private _resolutionLayerSwitcher(): void {
    if (this._highVectorTileLayer != null && this._lowVectorTileLayer != null) {
      const currentZoom = this.map.getView().getZoom();

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
