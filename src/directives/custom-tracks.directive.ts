import {Directive, EventEmitter, Host, Input, Output} from '@angular/core';
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

import {filter, take} from 'rxjs/operators';
import {WmMapBaseDirective} from '.';
import {createCircleFeature, getLineStyle} from '../../src/utils';
import {WmMapComponent} from '../components';
import {ITrackElevationChartHoverElements} from '../types/track-elevation-charts';

@Directive({
  selector: '[wmMapCustomTracks]',
})
export class WmMapCustomTracksDirective extends WmMapBaseDirective {
  private _customPoiLayer: VectorLayer<VectorSource> | undefined;
  private _customPoiSource: VectorSource = new VectorSource({
    features: [],
  });
  private _customTrackLayer: VectorLayer<VectorSource>;
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

  @Input() customTracks: any[];
  @Input() trackElevationChartElements: ITrackElevationChartHoverElements;
  @Output() currentCustomTrack: EventEmitter<any> = new EventEmitter<any>();

  reset$ = new Subject();

  constructor(@Host() mapCmp: WmMapComponent) {
    super(mapCmp);
    this.mapCmp.isInit$
      .pipe(
        filter(f => f === true),
        take(1),
      )
      .subscribe(() => {
        this.mapCmp.map.once('rendercomplete', () => {
          this.reset$.next(void 0);
          this._loadSavedTracks();
          this._initLayer();
        });
      });
  }

  private _clear(): void {
    if (this._customTrackLayer != null) {
      this._customTrackLayer.getSource().clear();
    }
    if (this._customPoiLayer != null) {
      this._customPoiLayer.getSource().clear();
    }
  }

  /**
   * @description
   * This code creates two layers, a customTrackLayer and a customPoiLayer, and adds them to the map.
   * The customTrackLayer is created with a VectorSource and GeoJSON format, and it has a style of '#CA1551' and an updateWhileAnimating/Interacting set to true.
   * The zIndex is set to 0. The customPoiLayer is created with the same source as the customPoiSource and its zIndex is set to 1100.
   * Finally, both layers are added to the map.
   * @private
   * @memberof WmMapCustomTracksDirective
   */
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
      if (this.mapCmp.map != null) {
        this.mapCmp.map.addLayer(this._customTrackLayer);
      }

      this.mapCmp.map.getRenderer();
    }
    this._customPoiLayer = new VectorLayer({
      zIndex: 1100,
      source: this._customPoiSource,
    });
    this.mapCmp.map.addLayer(this._customPoiLayer);
  }

  /**
   * @description
   * This code is a private method that loads saved tracks from local storage.
   * It checks if the local storage item 'wm-saved-tracks' exists and if it does, it parses the JSON data and creates an array of features.
   * For each feature, it sets its properties, id, and creates a start and end coordinate using toLonLat() and createCircleFeature().
   * Finally, it updates the savedTracks$ subject with the localSavedTracks array.
   * @private
   * @memberof WmMapCustomTracksDirective
   */
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
