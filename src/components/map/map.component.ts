import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChange,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import View, {FitOptions} from 'ol/View';
import {BehaviorSubject, Observable} from 'rxjs';
import {delay, filter, shareReplay, take} from 'rxjs/operators';

import {MapBrowserEvent} from 'ol';
import Collection from 'ol/Collection';
import {defaults as defaultControls, FullScreen} from 'ol/control';
import ScaleLineControl from 'ol/control/ScaleLine';
import {Extent} from 'ol/extent';
import SimpleGeometry from 'ol/geom/SimpleGeometry';
import {Interaction} from 'ol/interaction';
import {defaults as defaultInteractions} from 'ol/interaction.js';
import TileLayer from 'ol/layer/Tile';
import Map from 'ol/Map';
import XYZ from 'ol/source/XYZ';

import {buildTileLayers, extentFromLonLat} from '../../../src/utils/ol';
import {
  DEF_MAP_ROTATION_DURATION,
  initExtent,
  scaleMinWidth,
  scaleUnits,
} from '../../readonly/constants';
import {IMAP} from '../../types/model';
import {ActivatedRoute} from '@angular/router';
import {wmMapCustomTrackDrawTrackDirective} from '@map-core/directives';

@Component({
  selector: 'wm-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WmMapComponent implements OnChanges, AfterViewInit, OnDestroy {
  private _centerExtent: Extent;
  private _customDrawDirective: wmMapCustomTrackDrawTrackDirective;
  private _directiveRegistry = new Map();
  private _view: View;

  @Input() set wmMapCloseTopRightBtns(selector: string) {
    this.wmMapCloseTopRightBtnsEVT$.emit(selector);
  }

  @Input() set wmMapConf(conf: IMAP) {
    this.wmMapConf$.next(conf);
  }

  @Input('wmMapFilters') filters: any;
  @Input('wmMapTranslationCallback') translationCallback: (any) => string = value => {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    for (const val in value) {
      if (value[val]) {
        return value[val];
      }
    }
  };
  @Input() wmMapFullscreen: boolean = false;
  @Input() wmMapOnly: boolean = false;
  @Input() wmMapPadding: number[] | null;
  @Output() clickEVT$: EventEmitter<MapBrowserEvent<UIEvent>> = new EventEmitter<
    MapBrowserEvent<UIEvent>
  >();
  @Output() wmMapCloseTopRightBtnsEVT$: EventEmitter<string> = new EventEmitter();
  @Output() wmMapEmptyClickEVT$: EventEmitter<MapBrowserEvent<UIEvent>> = new EventEmitter();
  @Output() wmMapOverlayEVT$: EventEmitter<string | null> = new EventEmitter(null);
  @Output() wmMapRotateEVT$: EventEmitter<number> = new EventEmitter();
  @Output() wmMapToggleDataEVT$: EventEmitter<{type: 'layers' | 'pois' | 'ugc'; toggle: boolean}> =
    new EventEmitter();
  @ViewChild('mapContainer') mapContainer: ElementRef;
  @ViewChild('scaleLineContainer') scaleLineContainer: ElementRef;

  customTrackEnabled$: Observable<boolean>;
  isInit$: BehaviorSubject<boolean> = new BehaviorSubject(false);
  map: Map;
  map$: BehaviorSubject<Map> = new BehaviorSubject<Map>(null as Map);
  mapDegrees: number;
  queryParams$ = this._route.queryParams.pipe(shareReplay(1));
  tileLayers: TileLayer<XYZ>[] = [];
  wmMapConf$: BehaviorSubject<IMAP | null> = new BehaviorSubject<IMAP>(null);

  constructor(private _route: ActivatedRoute) {}

  /**
   * @description
   * Method that gets called whenever there are changes to the input properties.
   * This method is used to detect changes in the input properties of the component.
   * If the reset property changes and its new value is not null, the _reset method is called.
   * If the wmMapPadding property changes and _view is not null, the _view.fit() method is called to fit the centerExtent with the specified padding and maxZoom.
   *
   * @param changes An object containing all input property changes.
   * @returns void.
   */
  ngOnChanges(changes: SimpleChanges): void {
    this._handleResetChange(changes.reset);
    this._handleWmMapPaddingChange(changes.wmMapPadding);
    this._handleFiltersChange(changes.filters);
  }

  /**
   * @description
   * Executes initialization of the map after view initialization.
   * This function subscribes to the _wmMapConf$ observable and initializes the map with the given configuration
   * after view initialization. If the observable emits a value that is null, then nothing happens.
   *
   * @returns void
   */
  ngAfterViewInit(): void {
    this.wmMapConf$
      .pipe(
        filter(f => f != null),
        take(1),
        delay(250),
      )
      .subscribe(conf => {
        this._initMap(conf);
      });
  }

  ngOnDestroy(): void {
    this.map.dispose();
    this.map = null;
    this._view = null;
    this.isInit$.next(false);
  }

  /**
   * Sets the base tile layer source for the map.
   * @param tile The URL template for the tile layer.
   * @returns The XYZ source object for the tile layer.
   */
  @Input() initBaseSource(tile: string): XYZ {
    if (tile === '') {
      return null;
    }
    return new XYZ({
      url: tile,
      cacheSize: 50000,
    });
  }

  /**
   * @description
   * Fits the map view to a given geometry or extent.
   * // Fit the map view to a polygon feature
   * const polygonFeature = new Feature(new Polygon([[[0,0], [1,1], [2,0]]]));
   * map.fitView(polygonFeature.getGeometry());
   * // Fit the map view to an extent with a duration of 1 second
   * const extent = [0, 0, 100, 100];
   * map.fitView(extent, { duration: 1000 });
   *
   * @param {SimpleGeometry | Extent} geometryOrExtent - The geometry or extent to fit the map view to.
   * @param {FitOptions} [optOptions] - Optional options to use for the fit operation, such as duration.
   * @returns {void}
   */
  fitView(geometryOrExtent: SimpleGeometry | Extent, optOptions?: FitOptions): void {
    if (this.map != null) {
      if (optOptions == null) {
        optOptions = {
          duration: 500,
        };
      }

      this._view.fit(geometryOrExtent, optOptions);
    }
  }

  getDirective(olUUID: string): any {
    return this._directiveRegistry.get(olUUID);
  }

  getZoom(): number {
    if (this.map != null) {
      const view = this.map.getView();
      return view.getZoom();
    }
    return 10;
  }

  /**
   * @description
   * Resets the rotation of the map to north.
   * @returns {void}
   */
  orientNorth(): void {
    this._view.animate({
      duration: DEF_MAP_ROTATION_DURATION,
      rotation: 0,
    });
  }

  registerDirective(olUUID: string, directive: any): void {
    this._directiveRegistry.set(olUUID, directive);
  }

  /**
   * Resets the map rotation to 0.
   * @returns void
   */
  resetRotation(): void {
    this._view.animate({
      duration: 0,
      rotation: 0,
    });
  }

  resetView(): void {
    this._view.fit(this._centerExtent, {
      padding: this.wmMapPadding,
      maxZoom: this._view.getZoom(),
      duration: 1500,
    });
  }

  setCustomDrawDirective(directive: wmMapCustomTrackDrawTrackDirective): void {
    this._customDrawDirective = directive;
  }

  /**
   * Sets the map overlay.
   * @param overlay The overlay to set.
   */
  setOverlay(overlay: any | null): void {
    this.wmMapOverlayEVT$.emit(overlay);
  }

  /**
   * Toggles map data visibility.
   * @param data Object specifying the type of data to toggle and its new visibility state.
   */
  toggleData(data: {type: 'layers' | 'pois' | 'ugc'; toggle: boolean}): void {
    this.wmMapToggleDataEVT$.emit(data);
  }

  private _disableInteractions(): Collection<Interaction> {
    return defaultInteractions({
      doubleClickZoom: false,
      dragPan: false,
      mouseWheelZoom: false,
      pinchRotate: false,
      altShiftDragRotate: false,
    });
  }

  /**
   * Handles changes to the map's filters.
   * @param filtersChange The change object for the filters property.
   */
  private _handleFiltersChange(filtersChange: SimpleChange): void {
    if (filtersChange && this.map) {
      this._updateMap();
    }
  }

  /**
   * Handles changes to the map's reset state.
   * @param resetChange The change object for the reset property.
   */
  private _handleResetChange(resetChange: SimpleChange): void {
    if (resetChange?.currentValue != null) {
      this._reset();
    }
  }

  /**
   * Handles changes to the map's reset state.
   * @param resetChange The change object for the reset property.
   */
  private _handleWmMapPaddingChange(wmMapPaddingChange: SimpleChange): void {
    if (wmMapPaddingChange && this._view) {
      this._view.fit(this._centerExtent, {
        padding: this.wmMapPadding,
        maxZoom: this._view.getZoom(),
      });
    }
  }

  /**
   * @description
   * Initializes the default interactions for the map.
   *
   * @returns A collection of default map interactions.
   */
  private _initDefaultInteractions(): Collection<Interaction> {
    return defaultInteractions({
      doubleClickZoom: false,
      dragPan: true,
      mouseWheelZoom: true,
      pinchRotate: false,
      altShiftDragRotate: false,
    });
  }

  /**
   * @description
   * Initializes the map with the given configuration object
   *
   * @param conf The configuration object to use for map initialization
   * @returns void
   */
  private _initMap(conf: IMAP): void {
    this._centerExtent = extentFromLonLat(conf.bbox ?? initExtent);
    const extendControl = [];
    if (!this.wmMapOnly) {
      extendControl.push(
        new ScaleLineControl({
          units: scaleUnits,
          minWidth: scaleMinWidth,
          target: this.scaleLineContainer.nativeElement,
        }),
      );
      if (this.wmMapFullscreen) {
        extendControl.push(new FullScreen());
      }
    }
    this._view = new View({
      maxZoom: conf.maxZoom,
      zoom: conf.defZoom || 10,
      minZoom: conf.minZoom,
      projection: 'EPSG:3857',
      constrainOnlyCenter: true,
      padding: this.wmMapPadding,
      extent: this._centerExtent,
      showFullExtent: true,
    });

    const confTiles = conf?.controls?.tiles || null;
    this.tileLayers = buildTileLayers(confTiles);
    this.map = new Map({
      view: this._view,
      controls: defaultControls({
        rotate: false,
        attribution: false,
        zoom: !this.wmMapOnly,
      }).extend(extendControl),
      interactions: this.wmMapOnly ? this._disableInteractions() : this._initDefaultInteractions(),
      layers: this.tileLayers,
      moveTolerance: 3,
      target: this.mapContainer.nativeElement,
    });

    this.map.on('postrender', () => {
      this._updateDegrees();
    });
    this.map.on('pointermove', evt => {
      try {
        let cursor = '';
        const pixel = this.map.getEventPixel(evt.originalEvent);
        const features = this.map.getFeaturesAtPixel(pixel);
        if (features.length > 0) {
          const feature = features[0];
          const geometry = feature.getGeometry();
          const prop = feature.getProperties();
          const type = geometry.getType();
          if (type === 'Point' || prop['clickable'] === true) {
            cursor = 'pointer';
          }
        }
        if (this.map.getViewport().style.cursor != cursor) {
          this.map.getViewport().style.cursor = cursor;
        }
      } catch (_) {}
    });
    this.map$.next(this.map);
    this._view.setZoom(conf.defZoom);
    if (conf.bbox) {
      this._view.fit(this._centerExtent, {
        maxZoom: conf.defZoom,
      });
    }
    this.map.on('click', (evt: MapBrowserEvent<UIEvent>) => {
      const layersAtPixel: {olUID: string; zIndex: number}[] = [];
      try {
        this.map.forEachFeatureAtPixel(evt.pixel, (_, layer) => {
          if (layer == null) return;
          const olUID = layer['ol_uid'];
          const zIndex = layer.getZIndex();
          layersAtPixel.push({olUID, zIndex});
        });
        layersAtPixel.sort((a, b) => b.zIndex - a.zIndex);
        try {
          const topLayer = layersAtPixel[0] ?? null;
          if (topLayer != null) {
            const directive = this.getDirective(topLayer.olUID);
            if (directive && directive.onClick) {
              directive.onClick(evt);
            } else {
              console.warn('No directive or onClick method found for layer:', topLayer.olUID);
            }
          } else {
            this.wmMapEmptyClickEVT$.emit(evt);
          }
        } catch (_) {
          console.log(_);
        }
      } catch (_) {
        console.log(_);
      }
    });

    this.map.render();
    this.map.changed();
    this.map.updateSize();
    this.isInit$.next(true);
  }

  /**
   * @description
   * Resets the map to its initial state.
   */
  private _reset(): void {
    if (this._view != null) {
      this._view.animate({
        duration: 0,
        rotation: 0,
      });
      this._view.fit(this._centerExtent);
    }
  }

  /**
   * @description
   * Updates the rotation degrees of the map and emits the new value through the `wmMapRotateEVT$` observable.
   */
  private _updateDegrees(): void {
    const degree = (this.map.getView().getRotation() / (2 * Math.PI)) * 360;
    if (degree != this.mapDegrees) {
      this.wmMapRotateEVT$.emit(degree);
    }
    this.mapDegrees = degree;
    this.map.updateSize();
  }

  /**
   * Updates the map to reflect any changes in its state.
   */
  private _updateMap(): void {
    setTimeout(() => {
      this.map?.changed();
      this.map?.renderSync();
      this.map?.render();
      this.map?.updateSize();
      this.map?.dispatchEvent('over');
    }, 300);
  }
}
