import {Directive, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {BehaviorSubject, Subject} from 'rxjs';

import {ToastController} from '@ionic/angular';

import GraphHopperResponse from 'graphhopper-js-api-client';
import GraphHopperRouting from 'graphhopper-js-api-client/src/GraphHopperRouting';

import {MapBrowserEvent} from 'ol';
import {Coordinate} from 'ol/coordinate';
import {stopPropagation} from 'ol/events/Event';
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import Geometry from 'ol/geom/Geometry';
import SimpleGeometry from 'ol/geom/SimpleGeometry';
import VectorLayer from 'ol/layer/Vector';
import {toLonLat} from 'ol/proj';
import VectorSource from 'ol/source/Vector';

import {ITrackElevationChartHoverElements} from '../types/track-elevation-charts';
import {createCircleFeature} from '../utils/ol';
import {getLineStyle} from '../utils/styles';
import {WmMapBaseDirective} from './base.directive';

const GRAPH_HOPPER_API_KEY: string = '92e49c7c-1c0a-4aad-8097-e9bfec06360d';
export const RECORD_TRACK_ID: string = 'wm-current_record_track';

@Directive({
  selector: '[wmMapDrawTrack]',
})
export class WmMapDrawTrackDirective extends WmMapBaseDirective implements OnChanges {
  private _customPoiLayer: VectorLayer<VectorSource>;
  private _customPoiSource: VectorSource = new VectorSource({
    features: [],
  });
  private _customTrack: any;
  private _customTrackLayer: VectorLayer<VectorSource>;
  private _enabled$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private _graphHopperRoutingObj: GraphHopperRouting;
  private _points: Coordinate[] = [];

  @Input('wmMapDrawTrack') set enabled(val: boolean) {
    this._enabled$.next(val);
  }

  @Input() set reloadCustomTracks(val) {
    if (val != null) this._clear();
  }

  @Input() conf: IMAP;
  @Input() customTracks: any[];
  @Input() trackElevationChartElements: ITrackElevationChartHoverElements;
  @Input() wmMapDrawTrackHost: string;
  @Output() currentCustomTrack: EventEmitter<any> = new EventEmitter<any>();

  reset$ = new Subject();

  constructor(private _toastCtrl: ToastController) {
    super();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.reset$.next(void 0);
    if (changes.map != null && changes.previousValue == null && changes.map.currentValue != null) {
      this._initializeCustomTrackLayer();
      this._customTrack = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [],
        },
        properties: {
          id: 'wm-current_record_track',
          name: '',
          color: 'rgba(226, 249, 0, 0.6)',
        },
      };
      if (!this._graphHopperRoutingObj) {
        this._graphHopperRoutingObj = new GraphHopperRouting({
          vehicle: 'foot',
          key: GRAPH_HOPPER_API_KEY,
          elevation: true,
          instructions: false,
        });
        if (this.wmMapDrawTrackHost) {
          this._graphHopperRoutingObj.host = this.wmMapDrawTrackHost;
        }
        this._graphHopperRoutingObj.defaults.profile = 'foot';
      }
      this.map.on('singleclick', (evt: MapBrowserEvent<UIEvent>) => {
        if (this._enabled$.value) {
          stopPropagation(evt);
          console.log('stop propagation');
          const oldCoordinates = this.map.getFeaturesAtPixel(evt.pixel);
          if (oldCoordinates != null && oldCoordinates.length > 0) {
            const oldCoordinate: Feature<Geometry> = oldCoordinates[0] as Feature<Geometry>;
            this._customPoiSource.removeFeature(oldCoordinate);
            const coords = toLonLat(
              (oldCoordinate.getGeometry() as SimpleGeometry).getCoordinates(),
            );
            this._points = this._points.filter(c => c[0] != coords[0] && c[1] != coords[1]);
          } else {
            const lonLat = toLonLat(evt.coordinate);
            this._customPoiSource.addFeature(createCircleFeature(lonLat));
            this._points.push(lonLat);
          }
          this._customPoiSource.changed();
          this._customPoiLayer.changed();
          if (this._points.length > 1) {
            this._graphHopperRoutingObj.doRequest({points: this._points}).then(
              (res: GraphHopperResponse) => {
                this._customTrack.geometry = res.paths[0].points;
                this._customTrack.properties.ascent = res.paths[0].ascend
                  ? Math.round(res.paths[0].ascend)
                  : this._customTrack.properties.ascent;
                this._customTrack.properties.descent = res.paths[0].descend
                  ? Math.round(res.paths[0].descend)
                  : this._customTrack.properties.descent;
                this._customTrack.properties.distance = res.paths[0].distance
                  ? res.paths[0].distance / 1000
                  : this._customTrack.properties.distance;
                let time: number =
                  res.paths[0].distance && res.paths[0].ascend
                    ? (res.paths[0].distance + res.paths[0].ascend * 10) / 3000
                    : res.paths[0].time
                    ? res.paths[0].time / (1000 * 60 * 60)
                    : undefined;

                if (time !== undefined)
                  this._customTrack.properties['duration:forward'] =
                    Math.floor(time) + ':' + ('0' + Math.round((time % 1) * 60)).slice(-2) + ' h';

                this._updateTrack();
                this._redrawPoints();
                this.currentCustomTrack.emit(this._customTrack);
              },
              (err: Error) => {
                console.warn(err);
                if (err.message.indexOf('Specify at least 2 points') !== -1) {
                  this._customTrack.geometry.coordinates = [];
                  this._customTrack.properties.ascent = undefined;
                  this._customTrack.properties.descent = undefined;
                  this._customTrack.properties.distance = undefined;
                  this._customTrack.properties['duration:forward'] = undefined;
                  this._updateTrack();
                } else if (err.message.indexOf('Cannot find point') !== -1) {
                  this._message(err.message);
                  this._points.pop();
                  this._redrawPoints();
                }
              },
            );
          } else {
            this._customTrackLayer.getSource().clear();
          }
        }
      });

      this._enabled$.subscribe(v => {
        if (v === false) {
          this._clear();
        }
      });
    }
  }

  private _clear(): void {
    this._customTrackLayer.getSource().clear();
    this._customPoiLayer.getSource().clear();
    this._points = [];
  }

  private _initializeCustomTrackLayer(): void {
    if (!this._customTrackLayer) {
      this._customTrackLayer = new VectorLayer({
        source: new VectorSource({
          format: new GeoJSON(),
        }),
        style: () => getLineStyle('#CA1551'),
        updateWhileAnimating: true,
        updateWhileInteracting: true,
        zIndex: 1000,
      });
      if (this.map != null) {
        this.map.addLayer(this._customTrackLayer);
        this._customPoiLayer = new VectorLayer({
          zIndex: 1100,
          source: this._customPoiSource,
        });
        this.map.addLayer(this._customPoiLayer);
        this.map.getRenderer();
      }
    }
  }

  private async _message(msg: string): Promise<void> {
    const toast = await this._toastCtrl.create({
      message: msg,
      duration: 1000,
    });
    await toast.present();
  }

  private _redrawPoints(): void {
    let id: number = 0;
    this._customPoiSource.clear();
    for (let point of this._points) {
      const circleFeature = createCircleFeature(point);
      circleFeature.setId(id + '');
      this._customPoiSource.addFeature(circleFeature);
      circleFeature.changed();
      id++;
    }

    this._customPoiLayer.changed();
    this.map.render();
  }

  private _updateTrack(): void {
    let feature: Feature = new GeoJSON({
      featureProjection: 'EPSG:3857',
    }).readFeatures(this._customTrack)[0];

    feature.setId(RECORD_TRACK_ID);
    if (this._customTrackLayer.getSource().getFeatureById(RECORD_TRACK_ID))
      this._customTrackLayer
        .getSource()
        .removeFeature(this._customTrackLayer.getSource().getFeatureById(RECORD_TRACK_ID));
    this._customTrackLayer.getSource().addFeature(feature);
    this._customTrackLayer.getSource().getFeatureById(RECORD_TRACK_ID).changed();
    this._customTrackLayer.changed();
    this.map.render();
  }
}
