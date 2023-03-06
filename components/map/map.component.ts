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

import {
  DEF_MAP_ROTATION_DURATION,
  DEF_XYZ_URL,
  initExtent,
  scaleMinWidth,
  scaleUnits,
} from '../../readonly/constants';
import {IMAP} from '../../types/model';
import {extentFromLonLat} from '../../utils/ol';

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

  @Input() wmMapConf: IMAP;
  @Input() wmMapPadding: number[] | null;
  @Input() wmMapTarget = 'ol-map';
  @Output() clickEVT$: EventEmitter<MapBrowserEvent<UIEvent>> = new EventEmitter<
    MapBrowserEvent<UIEvent>
  >();
  @Output() wmMapRotateEVT$: EventEmitter<number> = new EventEmitter();
  @ViewChild('scaleLineContainer') scaleLineContainer: ElementRef;

  customTrackEnabled$: Observable<boolean>;
  isInit$: BehaviorSubject<boolean> = new BehaviorSubject(false);
  map: Map;
  map$: BehaviorSubject<Map> = new BehaviorSubject<Map>(null as Map);
  mapDegrees: number;
  tileLayers: TileLayer<XYZ>[] = [];

  constructor() {}

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

  ngAfterViewInit(): void {
    this._initMap(this.wmMapConf);
  }

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
  }

  orientNorth(): void {
    this._view.animate({
      duration: DEF_MAP_ROTATION_DURATION,
      rotation: 0,
    });
  }

  resetRotation(): void {
    this._view.animate({
      duration: 0,
      rotation: 0,
    });
  }

  private _buildTileLayers(tiles: {[name: string]: string}[]): TileLayer<XYZ>[] {
    const tilesMap = tiles.map((tile, index) => {
      return new TileLayer({
        preload: Infinity,
        source: this._initBaseSource(Object.values(tile)[0]),
        visible: index === 0,
        zIndex: index,
        className: Object.keys(tile)[0],
      });
    }) ?? [
      new TileLayer({
        preload: Infinity,
        source: this._initBaseSource(DEF_XYZ_URL),
        visible: true,
        zIndex: 0,
        className: 'webmapp',
      }),
    ];
    return tilesMap;
  }

  /**
   * Initialize the base source of the map
   *
   * @returns the XYZ source to use
   */
  private _initBaseSource(tile: string): XYZ {
    if (tile === '') {
      return null;
    }
    return new XYZ({
      url: tile,
      cacheSize: 50000,
    });
  }

  private _initDefaultInteractions(): Collection<Interaction> {
    return defaultInteractions({
      doubleClickZoom: false,
      dragPan: true,
      mouseWheelZoom: true,
      pinchRotate: false,
      altShiftDragRotate: false,
    });
  }

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

    this.tileLayers = this._buildTileLayers(conf.tiles);
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
      const degree = (this.map.getView().getRotation() / (2 * Math.PI)) * 360;
      if (degree != this.mapDegrees) {
        this.wmMapRotateEVT$.emit(degree);
      }
      this.mapDegrees = degree;
      this.map.updateSize();
    });

    this.map$.next(this.map);
    this._view.setZoom(this.wmMapConf.defZoom);
    this.map.updateSize();
    this.isInit$.next(true);
  }

  private _reset(): void {
    if (this._view != null) {
      this._view.animate({
        duration: 0,
        rotation: 0,
      });
      this._view.fit(this._centerExtent);
    }
  }
}
