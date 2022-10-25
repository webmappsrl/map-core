import {Directive, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {BehaviorSubject, Subject} from 'rxjs';

import {Coordinate} from 'ol/coordinate';
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import Geometry from 'ol/geom/Geometry';
import LineString from 'ol/geom/LineString';
import VectorLayer from 'ol/layer/Vector';
import {toLonLat} from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';

import {ITrackElevationChartHoverElements} from '../types/track-elevation-charts';
import {WmMapBaseDirective} from '.';
import {createCircleFeature, getLineStyle} from '../utils';

@Directive({
  selector: '[wmMapCustomTracks]',
})
export class WmMapCustomTracksDirective extends WmMapBaseDirective implements OnChanges {
  private _customPoiLayer: VectorLayer;
  private _customPoiSource: VectorSource = new VectorSource({
    features: [],
  });
  private _customTrackLayer: VectorLayer;
  private _savedTracks$: BehaviorSubject<Feature<Geometry>[]> = new BehaviorSubject<
    Feature<Geometry>[]
  >([]);

  @Input() set reloadCustomTracks(val) {
    if (val != null) {
      this._clear();
      this._loadSavedTracks();
      if (this._customTrackLayer != null) {
        this._customTrackLayer.getSource().addFeatures(this._savedTracks$.value);
      }
    }
  }

  @Input() conf: IMAP;
  @Input() customTracks: any[];
  @Input() trackElevationChartElements: ITrackElevationChartHoverElements;
  @Output() currentCustomTrack: EventEmitter<any> = new EventEmitter<any>();

  reset$ = new Subject();

  constructor() {
    super();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.reset$.next(void 0);
    if (
      changes.map != null &&
      changes.map.previousValue == null &&
      changes.map.currentValue !== null
    ) {
      this._loadSavedTracks();

      this._initLayer();
    }
  }

  private _clear(): void {
    if (this._customTrackLayer != null) {
      this._customTrackLayer.getSource().clear();
    }
    if (this._customPoiLayer != null) {
      this._customPoiLayer.getSource().clear();
    }
  }

  private _initLayer(): void {
    if (!this._customTrackLayer) {
      this._customTrackLayer = new VectorLayer({
        source: new VectorSource({
          format: new GeoJSON(),
        }),
        style: () => getLineStyle('#CA1551'),
        updateWhileAnimating: true,
        updateWhileInteracting: true,
        zIndex: 0,
      });
      this._customTrackLayer.getSource().addFeatures(this._savedTracks$.value);
      if (this.map != null) {
        this.map.addLayer(this._customTrackLayer);
      }

      this.map.getRenderer();
    }
    this._customPoiLayer = new VectorLayer({
      zIndex: 1100,
      source: this._customPoiSource,
    });
    this.map.addLayer(this._customPoiLayer);
  }

  private _loadSavedTracks(): void {
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
      localSavedTracks.forEach((f: Feature<LineString>) => {
        const coords = f.getGeometry().getCoordinates();
        const startCoordinate = coords[0];
        const endCoordinate = coords[coords.length - 1];
        const lonLatStart = toLonLat([startCoordinate[0], startCoordinate[1]] as Coordinate);
        const lonLatEnd = toLonLat([endCoordinate[0], endCoordinate[1]] as Coordinate);
        const options = {
          radius: 15,
          stroke: new Stroke({
            color: '#fff',
          }),
          fill: new Fill({
            color: '#CA1551',
          }),
          scale: 0.5,
        };
        this._customPoiSource.addFeature(createCircleFeature(lonLatStart, options));
        this._customPoiSource.addFeature(createCircleFeature(lonLatEnd, options));
      });

      if (localSavedTracks != null) {
        this._savedTracks$.next(localSavedTracks);
      }
    }
  }
}
