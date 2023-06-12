import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import View, {FitOptions} from 'ol/View';
import {BehaviorSubject, Observable} from 'rxjs';
import {filter, take} from 'rxjs/operators';

import {MapBrowserEvent} from 'ol';
import Collection from 'ol/Collection';
import {defaults as defaultControls} from 'ol/control';
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

@Component({
  selector: 'wm-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WmMapComponent implements OnChanges, AfterViewInit {
  private _centerExtent: Extent;
  private _debounceFitTimer = null;
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
  @Input() wmMapPadding: number[] | null;
  @Input() wmMapTarget = 'ol-map';
  @Output() clickEVT$: EventEmitter<MapBrowserEvent<UIEvent>> = new EventEmitter<
    MapBrowserEvent<UIEvent>
  >();
  @Output() wmMapCloseTopRightBtnsEVT$: EventEmitter<string> = new EventEmitter();
  @Output() wmMapOverlayEVT$: EventEmitter<string | null> = new EventEmitter(null);
  @Output() wmMapRotateEVT$: EventEmitter<number> = new EventEmitter();
  @ViewChild('scaleLineContainer') scaleLineContainer: ElementRef;

  customTrackEnabled$: Observable<boolean>;
  isInit$: BehaviorSubject<boolean> = new BehaviorSubject(false);
  map: Map;
  map$: BehaviorSubject<Map> = new BehaviorSubject<Map>(null as Map);
  mapDegrees: number;
  tileLayers: TileLayer<XYZ>[] = [];
  wmMapConf$: BehaviorSubject<IMAP | null> = new BehaviorSubject<IMAP>(null);

  constructor() {}

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
    if (optOptions == null) {
      optOptions = {
        duration: 500,
      };
    }
    if (this._debounceFitTimer !== null) {
      clearTimeout(this._debounceFitTimer);
    }
    this._debounceFitTimer = setTimeout(() => {
      this._view.fit(geometryOrExtent, optOptions);
      this._debounceFitTimer = null;
    }, 500);
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
        take(3),
        filter(f => f != null),
      )
      .subscribe(conf => {
        this._initMap(conf);
      });
  }

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
    if (changes.reset && changes.reset.currentValue != null) {
      this._reset();
    }
    if (changes.wmMapPadding && this._view != null) {
      this._view.fit(this._centerExtent, {
        padding: this.wmMapPadding,
        maxZoom: this._view.getZoom(),
      });
    }
    if (changes.filters) {
      if (this.map != null) {
        setTimeout(() => {
          this.map?.changed();
          this.map.renderSync();
          this.map.render();
          this.map.updateSize();
          this.map.dispatchEvent('over');
        }, 300);
      }
    }
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

  setOverlay(overlay: any | null) {
    this.wmMapOverlayEVT$.emit(overlay);
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

    if (conf.bbox) {
      this.fitView(this._centerExtent, {
        maxZoom: conf.defZoom,
      });
    }
    if (conf.controls.tiles) {
      const confTiles = conf.controls.tiles;
      this.tileLayers = buildTileLayers(confTiles);
    }
    this.map = new Map({
      view: this._view,
      controls: defaultControls({
        rotate: false,
        attribution: false,
      }).extend([
        new ScaleLineControl({
          units: scaleUnits,
          minWidth: scaleMinWidth,
          target: this.scaleLineContainer.nativeElement,
        }),
      ]),
      interactions: this._initDefaultInteractions(),
      layers: this.tileLayers,
      moveTolerance: 3,
      target: this.wmMapTarget,
    });

    this.map.on('postrender', () => {
      this._updateDegrees();
    });

    this.map$.next(this.map);
    this._view.setZoom(conf.defZoom);
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
}
