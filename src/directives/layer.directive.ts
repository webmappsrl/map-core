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
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import RenderFeature, {toFeature} from 'ol/render/Feature';

import {debounceTime, filter, take} from 'rxjs/operators';
import {Subject} from 'rxjs';

import {WmMapBaseDirective} from '@map-core/directives';
import {
  clearPbfDB,
  convertFeatureToEpsg3857,
  fromNameToHEX,
  getColorFromLayer,
  initInteractions,
  initVectorTileLayer,
  lowTileLoadFn,
  styleFn,
} from '@map-core/utils';
import {WmMapComponent} from '@map-core/components';
import {IDATALAYER, ILAYER} from '@map-core/types/layer';
import {IMAP} from '@map-core/types/model';
import {
  DEF_ZOOM_ON_CLICK,
  MAP_ZOOM_ON_CLICK_TRESHOLD,
  FEATURES_IN_VIEWPORT_ZOOM_MIN,
  FEATURES_IN_VIEWPORT_ZOOM_MAX,
} from '@map-core/readonly/constants';
import {ZoomFeaturesInViewport} from '@wm-types/config';

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
  private _minZoomFeaturesInViewport: number;
  private _maxZoomFeaturesInViewport: number;
  private _vectorTileLayer: VectorTileLayer;
  private _moveEndSubject$: Subject<void> = new Subject<void>();
  private _moveEndListener: () => void;
  private _hoveredFeatureId: number | null = null;
  private _hoverHandlerInitialized = false;

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
    if (l != null && l.bbox != null) {
      this.mapCmp.queryParams$.pipe(take(1)).subscribe(params => {
        if (params.track == null) {
          this.mapCmp.isInit$
            .pipe(
              filter(f => f),
              take(1),
            )
            .subscribe(() => {
              this.fitViewFromLonLat(l.bbox);
            });
        }
      });
    }
    this._updateMap();
  }

  @Input() set wmMapLayerZoomFeaturesInViewport(zoom: ZoomFeaturesInViewport) {
    this._minZoomFeaturesInViewport = zoom.minZoomFeaturesInViewport ?? FEATURES_IN_VIEWPORT_ZOOM_MIN;
    this._maxZoomFeaturesInViewport = zoom.maxZoomFeaturesInViewport ?? FEATURES_IN_VIEWPORT_ZOOM_MAX;
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
  @Input() set wmMapLayerEnableFeaturesInViewport(enable: boolean) {
    this.mapCmp.isInit$
      .pipe(
        filter(f => f === true),
        take(1),
      )
      .subscribe(() => {
        const view = this.mapCmp.map.getView();
        if (enable) {
          this._moveEndSubject$.pipe(debounceTime(100)).subscribe(() => {
            this._featuresInViewport();
          });
          this._moveEndListener = () => this._moveEndSubject$.next();
          view.on('change:resolution', this._enableFeaturesInViewportCallback);
        } else {
          this.wmMapLayerShowFeaturesInViewport = false;
          this._enableFeaturesInViewportCallback();
          view.un('change:resolution', this._enableFeaturesInViewportCallback);
        }
      });
  }
  @Input() wmMapLayerShowFeaturesInViewport: boolean = false;

  @Output()
  colorSelectedFromLayerEVT: EventEmitter<string> = new EventEmitter<string>();
  /**
   * @description
   * The output event emitter for selecting a track from the layer.
   * It emits the ID of the selected track as a number.
   */
  @Output()
  trackSelectedFromLayerEVT: EventEmitter<number> = new EventEmitter<number>();

  @Output()
  featuresInViewportEVT: EventEmitter<any[]> = new EventEmitter<any[]>();

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
    this._updateMap();
  }

  onClick(evt: MapBrowserEvent<UIEvent>): void {
    const zoom = this.mapCmp.map.getView().getZoom();
    const features = this.mapCmp.map.getFeaturesAtPixel(evt.pixel, {
      hitTolerance: 100,
      layerFilter: layer => layer === this._vectorTileLayer,
    });
    if (features.length === 0) {
      return;
    }
    const otherFeatures = this.mapCmp.map.getFeaturesAtPixel(evt.pixel, {
      hitTolerance: 10,
      layerFilter: layer => layer != this._vectorTileLayer,
    });
    if (otherFeatures.length > 0) {
      return;
    }

    const clickedFeature = features[0];
    const properties = clickedFeature?.getProperties() ?? {};

    if (zoom <= MAP_ZOOM_ON_CLICK_TRESHOLD) {
      this._zoomOnClick(evt);
    } else {
      try {
        const isPbfLayer = properties?.name == null;
        if (isPbfLayer) {
          this._zoomOnClick(evt);
        }
        const clickedFeatureId: number = properties?.id ?? undefined;
        const clickedLayerId = JSON.parse(properties?.layers ?? '[]')[0] ?? undefined;
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
   * It creates two vector tile layers, one low and one high, using the functions initVectorTileLayer and styleFn.
   * The low layer is given the property 'high' set to false, while the high layer is given the property 'high' set to true.
   * Finally, both layers are added to the map and the resolution layer switcher is called.
   * @private
   * @param {IMAP} map
   * @memberof WmMapLayerDirective
   */
  private _initializeDataLayers(map: IMAP): void {
    if (this._dataLayerUrls != null) {
      // Crea un oggetto wrapper per mantenere il riferimento alla direttiva
      // così styleFn può accedere a _hoveredFeatureId aggiornato
      const directiveRef = this;
      const styleFnContext = {
        currentLayer: this._currentLayer,
        conf: this.wmMapConf,
        map: this.mapCmp.map,
        opacity: this.wmMapLayerOpacity,
        filters: this.mapCmp.filters,
        tileLayer: null as VectorTileLayer, // Verrà aggiornato dopo
        inputTyped: this.wmMapInputTyped,
        currentTrack: convertFeatureToEpsg3857(this.track),
        get hoveredFeatureId() {
          return directiveRef._hoveredFeatureId;
        },
      };

      this._vectorTileLayer = initVectorTileLayer(
        this._dataLayerUrls.low,
        f => styleFn.bind(styleFnContext)(f),
        lowTileLoadFn,
      );

      // Aggiorna il riferimento al tileLayer nel contesto
      styleFnContext.tileLayer = this._vectorTileLayer;

      this.mapCmp.map.addLayer(this._vectorTileLayer);
      this._vectorTileLayer.setVisible(!this._disabled);
      this.mapCmp.map.on('click', (evt: any) => {
        this.onClick(evt);
      });
      this._initHoverHandler();
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

  private _featuresInViewport(): void {
    const features = [];
    if (this._vectorTileLayer) {
      const extent = this.mapCmp.map.getView().calculateExtent(this.mapCmp.map.getSize());
      const source = this._vectorTileLayer.getSource();
      source.getFeaturesInExtent(extent).forEach(feature => {
        if (feature.getGeometry().getType() == 'LineString') {
          features.push(feature);
        }
      });
    }
    this.featuresInViewportEVT.emit(features);
  }

  private _enableFeaturesInViewportCallback = () => {
    try {
      const view = this.mapCmp.map.getView();
      const zoom = view.getZoom();
      if (
        this.wmMapLayerShowFeaturesInViewport &&
        zoom >= this._minZoomFeaturesInViewport &&
        zoom <= this._maxZoomFeaturesInViewport
      ) {
        this.mapCmp.map.on('moveend', this._moveEndListener);
      } else {
        const listeners = this.mapCmp.map.getListeners('moveend');
        if (listeners && listeners.length > 0) {
          this.mapCmp.map.un('moveend', this._moveEndListener);
        }
        this.featuresInViewportEVT.emit([]);
      }
    } catch (e) {
      console.log(e);
      this.featuresInViewportEVT.emit([]);
    }
  };

  /**
   * @description
   * Inizializza il gestore del mouseover per le tracce.
   * Rileva quando il mouse è sopra una traccia e aggiorna _hoveredFeatureId per attivare il bordo bianco.
   * Ottimizzato per evitare listener duplicati e chiamate inutili a changed().
   * @private
   * @memberof WmMapLayerDirective
   */
  private _initHoverHandler(): void {
    if (!this._vectorTileLayer || this._hoverHandlerInitialized) {
      return;
    }

    this._hoverHandlerInitialized = true;
    const viewport = this.mapCmp.map.getViewport();

    this.mapCmp.map.on('pointermove', (e: any) => {
      if (!this._vectorTileLayer) {
        return;
      }

      let foundFeatureId: number | null = null;

      // Cerca la feature sotto il pixel del mouse
      this.mapCmp.map.forEachFeatureAtPixel(
        e.pixel,
        (f: RenderFeature, l: VectorTileLayer) => {
          // Verifica che la feature appartenga al layer delle tracce
          if (l === this._vectorTileLayer && f.getType != null) {
            try {
              const feature = toFeature(f);
              const properties = feature.getProperties();
              const featureId: number = properties?.id ?? undefined;
              const geometryType = feature.getGeometry()?.getType();

              // Applica l'highlight alle LineString e MultiLineString (tracce)
              if (
                (geometryType === 'LineString' || geometryType === 'MultiLineString') &&
                featureId != null &&
                featureId > -1
              ) {
                foundFeatureId = featureId;
                return true;
              }
            } catch (_) {
              // Ignora errori nella conversione della feature
            }
          }
        },
        {
          hitTolerance: 10,
          layerFilter: layer => layer === this._vectorTileLayer,
        },
      );

      // Aggiorna lo stato solo se è cambiato
      if (foundFeatureId !== null) {
        // Feature trovata
        if (this._hoveredFeatureId !== foundFeatureId) {
          this._hoveredFeatureId = foundFeatureId;
          this._vectorTileLayer.changed();
        }
        if (viewport.style.cursor !== 'pointer') {
          viewport.style.cursor = 'pointer';
        }
      } else {
        // Nessuna feature trovata
        if (this._hoveredFeatureId !== null) {
          this._hoveredFeatureId = null;
          this._vectorTileLayer.changed();
        }
        if (viewport.style.cursor !== '') {
          viewport.style.cursor = '';
        }
      }
    });
  }

}
