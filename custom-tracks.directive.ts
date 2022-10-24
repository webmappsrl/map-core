import {BehaviorSubject, Subject} from 'rxjs';
import {Directive, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';

import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import Geometry from 'ol/geom/Geometry';
import {ITrackElevationChartHoverElements} from './types/track-elevation-charts';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {WmMapBaseDirective} from './base.directive';
import {getLineStyle} from './utils/styles';

export const GRAPH_HOPPER_API_KEY: string = '92e49c7c-1c0a-4aad-8097-e9bfec06360d';

@Directive({
  selector: '[wmMapCustomTracks]',
})
export class WmMapCustomTracksDirective extends WmMapBaseDirective implements OnChanges {
  private _customTrackLayer: VectorLayer;
  private _savedTracks$: BehaviorSubject<Feature<Geometry>[]> = new BehaviorSubject<
    Feature<Geometry>[]
  >([]);

  @Input() conf: IMAP;
  @Input() customTracks: any[];
  @Input() trackElevationChartElements: ITrackElevationChartHoverElements;
  @Output() currentCustomTrack: EventEmitter<any> = new EventEmitter<any>();

  reset$ = new Subject();

  constructor() {
    super();
    this._loadSavedTracks();
  }

  @Input() set reloadCustomTracks(val) {
    if (val != null) {
      this._clear();
      this._loadSavedTracks();
      if (this._customTrackLayer != null) {
        this._customTrackLayer.getSource().addFeatures(this._savedTracks$.value);
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.reset$.next(void 0);
    if (
      changes.map != null &&
      changes.map.previousValue == null &&
      changes.map.currentValue !== null
    ) {
      this._initLayer();
    }
  }

  private _clear(): void {
    if (this._customTrackLayer != null) {
      this._customTrackLayer.getSource().clear();
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

      if (localSavedTracks != null) {
        this._savedTracks$.next(localSavedTracks);
      }
    }
  }
}
