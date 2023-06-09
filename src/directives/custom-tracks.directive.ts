import {Directive, Host, Input} from '@angular/core';
import {BehaviorSubject, Subject} from 'rxjs';

import {Coordinate} from 'ol/coordinate';
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import Geometry from 'ol/geom/Geometry';
import LineString from 'ol/geom/LineString';
import VectorLayer from 'ol/layer/Vector';
import {toLonLat} from 'ol/proj';
import VectorSource from 'ol/source/Vector';

import {filter, take} from 'rxjs/operators';
import {WmMapBaseDirective} from '.';
import {createIconFeatureFromHtml, getLineStyle} from '../../src/utils';
import {WmMapComponent} from '../components';
import {endIconHtml, startIconHtml} from '../readonly';

@Directive({
  selector: '[wmMapCustomTracks]',
})
export class WmMapCustomTracksDirective extends WmMapBaseDirective {
  /**
   * @description
   * The custom Point of Interest (POI) layer used for displaying custom track points on the map.
   * @private
   */
  private _customPoiLayer: VectorLayer<VectorSource> | undefined;
  /**
   * @description
   * The custom Point of Interest (POI) source used for storing the features of custom track points.
   * @private
   */
  private _customPoiSource: VectorSource = new VectorSource({
    features: [],
  });
  /**
   * @description
   * The custom VectorLayer used for displaying the custom track.
   * @private
   */
  private _customTrackLayer: VectorLayer<VectorSource>;
  /**
   * @description
   * BehaviorSubject that holds the array of saved tracks.
   * @private
   */
  private _savedTracks$: BehaviorSubject<Feature<Geometry>[]> = new BehaviorSubject<
    Feature<Geometry>[]
  >([]);

  /**
   * @description
   * Setter for the `reloadCustomTracks` input property.
   * Clears the custom tracks and reloads the saved tracks.
   * @param val - The value of the `reloadCustomTracks` input property.
   */
  @Input() set reloadCustomTracks(val) {
    if (val != null) {
      this._clear();
      this._loadSavedTracks();
      if (this._customTrackLayer != null) {
        this._customTrackLayer.getSource().addFeatures(this._savedTracks$.value);
      }
    }
  }

  reset$ = new Subject();

  /**
   * @description
   * Constructor for the CustomTracksComponent.
   * Initializes the component and subscribes to the initialization of the map.
   * Loads saved tracks and initializes the track layer.
   * @param mapCmp - The host WmMapComponent.
   * @private
   * @memberof WmMapCustomTracksDirective
   */
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

  /**
   * @description
   * Clears the custom track and point of interest layers.
   * Removes all features from the layers.
   * @private
   * @memberof WmMapCustomTracksDirective
   */
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

        const startFeature = createIconFeatureFromHtml(startIconHtml, lonLatStart);
        const endFeature = createIconFeatureFromHtml(endIconHtml, lonLatEnd);
        this._customPoiSource.addFeature(startFeature);
        this._customPoiSource.addFeature(endFeature);
      });

      if (localSavedTracks != null) {
        this._savedTracks$.next(localSavedTracks);
      }
    }
  }
}
