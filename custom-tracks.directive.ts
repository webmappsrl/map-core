import {BehaviorSubject, Observable, Subject, of, timer} from 'rxjs';
import {
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import {skip, switchMap, takeWhile} from 'rxjs/operators';

import {Coordinate} from 'ol/coordinate';
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import Geometry from 'ol/geom/Geometry';
import {ITrackElevationChartHoverElements} from 'src/app/types/track-elevation-chart';
import Point from 'ol/geom/Point';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {WmMapBaseDirective} from './base.directive';
import {transform} from 'ol/proj';

export const GRAPH_HOPPER_API_KEY: string = '92e49c7c-1c0a-4aad-8097-e9bfec06360d';
export const RECORD_TRACK_ID: string = 'wm-current_record_track';

@Directive({
  selector: '[wmMapCustomTracks]',
})
export class WmMapCustomTracksDirective extends WmMapBaseDirective implements OnChanges {
  private _customPoiLayer: VectorLayer;
  private _customPoiSource: VectorSource = new VectorSource({
    features: [],
  });
  private _customTrack: any;
  private _customTrackLayer: VectorLayer;
  private _customTracks: any[] = [];
  private _points: Coordinate[] = [];
  private _savedTracks$: BehaviorSubject<Feature<Geometry>[]> = new BehaviorSubject<
    Feature<Geometry>[]
  >([]);

  @Input() conf: IMAP;
  @Input() customTracks: any[];
  @Input() trackElevationChartElements: ITrackElevationChartHoverElements;
  @Output() currentCustomTrack: EventEmitter<any> = new EventEmitter<any>();

  isStable$: Observable<boolean>;
  reset$ = new Subject();

  constructor() {
    super();
    this._initSavedTracks();
    this.isStable$ = this.reset$.pipe(
      switchMap(() => timer(500, 500)),
      takeWhile(v => v <= 2),
      skip(2),
      switchMap(_ => of(true)),
    );
    this.isStable$.subscribe(v => {
      this._initializeCustomTrackLayer();
      this._customTrack = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [],
        },
        properties: {
          id: 'wm-current_record_track',
          name: 'prova',
          locale: 'it',
          taxonomy: {},
          image: '',
          color: 'rgba(226, 249, 0, 0.6)',
        },
      };
    });
  }

  @Input() set reloadCustomTracks(val) {
    if (val != null) {
      this._clear();
      this._initSavedTracks();
      this._customTrackLayer.getSource().addFeatures(this._savedTracks$.value);
    }
  }

  ngOnChanges(_: SimpleChanges): void {
    this.reset$.next(void 0);
  }

  private _clear(): void {
    this._customTrackLayer.getSource().clear();
    this._customPoiLayer.getSource().clear();
    this._points = [];
  }

  private _fromLonLat(coordinates: Coordinate): Coordinate {
    return transform(coordinates, 'EPSG:4326', 'EPSG:3857');
  }

  private _getLineStyle(color?: string): Array<Style> {
    const style: Array<Style> = [],
      selected: boolean = false;

    if (!color) color = '255, 177, 0'; // this._featuresService.color(id),
    if (color[0] === '#') {
      color =
        parseInt(color.substring(1, 3), 16) +
        ', ' +
        parseInt(color.substring(3, 5), 16) +
        ', ' +
        parseInt(color.substring(5, 7), 16);
    }
    const strokeWidth: number = 3, // this._featuresService.strokeWidth(id),
      strokeOpacity: number = 1, // this._featuresService.strokeOpacity(id),
      lineDash: Array<number> = [], // this._featuresService.lineDash(id),
      lineCap: CanvasLineCap = 'round', // this._featuresService.lineCap(id),
      currentZoom: number = this.map.getView().getZoom();

    color = 'rgba(' + color + ',' + strokeOpacity + ')';

    const zIndex: number = 50; //this._getZIndex(id, "line", selected);

    if (selected) {
      style.push(
        new Style({
          stroke: new Stroke({
            color: 'rgba(226, 249, 0, 0.6)',
            width: 10,
          }),
          zIndex: zIndex + 5,
        }),
      );
    }

    style.push(
      new Style({
        stroke: new Stroke({
          color: 'rgba(255, 255, 255, 0.9)',
          width: strokeWidth * 2,
        }),
        zIndex: zIndex + 1,
      }),
    );

    style.push(
      new Style({
        stroke: new Stroke({
          color,
          width: strokeWidth,
          lineDash,
          lineCap,
        }),
        zIndex: zIndex + 2,
      }),
    );

    return style;
  }

  private _initSavedTracks(): void {
    const stringedLocalSavedTracks = localStorage.getItem('wm-saved-tracks');
    if (stringedLocalSavedTracks != null) {
      const localSavedTracks: Feature<Geometry>[] = JSON.parse(stringedLocalSavedTracks).map(
        (f, idx) => {
          const feature = new GeoJSON({
            featureProjection: 'EPSG:3857',
          }).readFeature(f.geometry);
          feature.setProperties(f.properties);
          feature.setId(`${f.properties.id}-${idx}`);

          return feature;
        },
      );

      if (localSavedTracks != null) {
        this._savedTracks$.next(localSavedTracks);
      }
    }
  }

  private _initializeCustomTrackLayer(): void {
    if (!this._customTrackLayer) {
      this._customTrackLayer = new VectorLayer({
        source: new VectorSource({
          format: new GeoJSON(),
        }),
        style: () => {
          return this._getLineStyle('#CA1551');
        },
        updateWhileAnimating: true,
        updateWhileInteracting: true,
        zIndex: 0,
      });
      this._customTrackLayer.getSource().addFeatures(this._savedTracks$.value);
      if (this.map != null) {
        this.map.addLayer(this._customTrackLayer);
      }
      this._customPoiLayer = new VectorLayer({
        zIndex: 400,
        source: this._customPoiSource,
      });
      this.map.addLayer(this._customPoiLayer);
      this.map.getRenderer();
    }
  }

  private _redrawPoints() {
    this._customTrackLayer.getSource().forEachFeature((feature: Feature) => {
      if (feature.getGeometry().getType() === 'Point')
        this._customTrackLayer.getSource().removeFeature(feature);
    });

    let id: number = 0;
    for (let point of this._points) {
      let newPoi: Feature = new Feature(new Point(this._fromLonLat(point)));
      newPoi.setId(id + '');
      this._customTrackLayer.getSource().addFeature(newPoi);
      newPoi.changed();
      id++;
    }

    this._customTrackLayer.changed();
    this.map.render();
  }
}
