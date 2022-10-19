import {BehaviorSubject, Observable} from 'rxjs';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {DEF_XYZ_URL, initExtent, scaleMinWidth, scaleUnits} from '../constants';
import View, {FitOptions} from 'ol/View';

import Collection from 'ol/Collection';
import {Extent} from 'ol/extent';
import {Interaction} from 'ol/interaction';
import Map from 'ol/Map';
import {MapService} from 'src/app/services/map.service';
import ScaleLineControl from 'ol/control/ScaleLine';
import SimpleGeometry from 'ol/geom/SimpleGeometry';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import {defaults as defaultControls} from 'ol/control';
import {defaults as defaultInteractions} from 'ol/interaction.js';

@Component({
  selector: 'wm-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WmMapComponent implements OnChanges {
  private _centerExtent: Extent;
  private _view: View;

  @Input() conf: IMAP;
  @Input() padding: number[];
  @ViewChild('scaleLineContainer') scaleLineContainer: ElementRef;

  customTrackEnabled$: Observable<boolean>;
  map: Map;
  map$: BehaviorSubject<Map> = new BehaviorSubject<Map | null>(null);
  tileLayers: TileLayer[] = [];

  constructor(private _mapSvc: MapService, private _cdr: ChangeDetectorRef) {}

  @Input() set reset(_) {
    this._reset();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes.conf != null &&
      changes.conf.currentValue != null &&
      changes.conf.previousValue == null
    ) {
      this._initMap(this.conf);
    }
  }

  private _buildTileLayers(tiles: {[name: string]: string}[]): TileLayer[] {
    return (
      tiles.map((tile, index) => {
        return new TileLayer({
          source: this._initializeBaseSource(Object.values(tile)[0]),
          visible: index === 0,
          zIndex: index,
          useInterimTilesOnError: true,
          className: Object.keys(tile)[0],
        });
      }) ?? [
        new TileLayer({
          source: this._initializeBaseSource(DEF_XYZ_URL),
          visible: true,
          zIndex: 0,
          className: 'webmapp',
        }),
      ]
    );
  }

  private _fitView(geometryOrExtent: SimpleGeometry | Extent, optOptions?: FitOptions): void {
    if (optOptions == null) {
      optOptions = {
        duration: 500,
      };
    }
    this._view.fit(geometryOrExtent, optOptions);
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
    this._centerExtent = this._mapSvc.extentFromLonLat(conf.bbox ?? initExtent);
    this._view = new View({
      maxZoom: conf.maxZoom,
      zoom: conf.defZoom || 10,
      minZoom: conf.minZoom,
      projection: 'EPSG:3857',
      constrainOnlyCenter: true,
      padding: this.padding,
    });

    if (conf.bbox) {
      this._fitView(this._centerExtent);
    }

    this.tileLayers = this._buildTileLayers(conf.tiles);
    this._cdr.detectChanges();
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
      target: 'ol-map',
    });
    this.map$.next(this.map);
  }

  /**
   * Initialize the base source of the map
   *
   * @returns the XYZ source to use
   */
  private _initializeBaseSource(tile: string) {
    return new XYZ({
      maxZoom: 20,
      minZoom: 0,
      opaque: true,
      imageSmoothing: true,
      cacheSize: 50000,
      url: tile,
      wrapX: true,
      projection: 'EPSG:3857',
      tileSize: [512, 512],
    });
  }

  private _reset(): void {
    if (this._view != null) {
      this._view.fit(this._centerExtent);
    }
  }
}
