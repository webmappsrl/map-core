import {Directive, Host, Input, OnChanges, OnDestroy, SimpleChanges} from '@angular/core';
import {BehaviorSubject, Subscription} from 'rxjs';
import {POSITION_ZINDEX} from '../readonly';

import {Feature} from 'ol';
import {FitOptions} from 'ol/View';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import {fromLonLat} from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import Icon from 'ol/style/Icon';
import Style from 'ol/style/Style';

import {filter, take} from 'rxjs/operators';

import {circularPolygon, toRadians} from '../../src/utils/ol';
import {WmMapComponent} from '../components';
import {WmMapBaseDirective} from './base.directive';
interface Bearing {
  cos: number;
  sin: number;
}
interface Location {
  accuracy: number;
  altitude: number;
  bearing: number;
  latitude: number;
  longitude: number;
  runningAvg?: number;
}
@Directive({
  selector: '[wmMapPosition]',
})
export class WmMapPositionDirective extends WmMapBaseDirective implements OnDestroy, OnChanges {
  private _bgCurrentLocSub: Subscription = Subscription.EMPTY;
  private _bgLocSub: Subscription = Subscription.EMPTY;
  private _currentLocation: Location;
  private _featureAccuracy = new Feature();
  private _featureLocation = new Feature();
  private _focus$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private _iconLocation = new Icon({
    src: 'map-core/assets/location-icon.png',
    scale: 0.4,
    size: [125, 125],
  });
  private _iconLocationArrow = new Icon({
    src: 'map-core/assets/location-icon-arrow.png',
    scale: 0.4,
    size: [125, 125],
  });
  private _lastBearings: Bearing[] = [];
  private _layerAccuracy = new VectorLayer({
    source: new VectorSource({
      features: [this._featureAccuracy],
    }),
    zIndex: POSITION_ZINDEX - 10,
  });
  private _layerLocation = new VectorLayer({
    source: new VectorSource({
      features: [this._featureLocation],
    }),
    style: new Style({
      image: this._iconLocation,
    }),
    zIndex: POSITION_ZINDEX,
  });

  @Input() wmMapPositionCenter;
  @Input() wmMapPositioncurrentLocation: Location;
  @Input() wmMapPositionfocus;

  constructor(@Host() mapCmp: WmMapComponent) {
    super(mapCmp);
    this.mapCmp.isInit$
      .pipe(
        filter(f => f === true),
        take(1),
      )
      .subscribe(() => {
        this.mapCmp.map.once('rendercomplete', () => {
          this.mapCmp.map.addLayer(this._layerLocation);
          this.mapCmp.map.addLayer(this._layerAccuracy);
          if (this._currentLocation != null) {
            this._setPositionByLocation(this._currentLocation);
          }
          this.mapCmp.map.render();
          this._layerLocation.getSource().changed();
        });
      });
  }

  /**
   * @description
   * Watches for changes to the position of the map. When the current location changes, updates the position of the map.
   * When the center position or focus change, updates the position of the map and adjusts the zoom level if necessary.
   *
   * @param changes Object containing changes to the map position
   * @returns void
   */
  ngOnChanges(changes: SimpleChanges): void {
    console.log(changes);
    if (
      changes.wmMapPositioncurrentLocation != null &&
      changes.wmMapPositioncurrentLocation.currentValue != null
    ) {
      const currentLocation = changes.wmMapPositioncurrentLocation.currentValue;
      this._currentLocation = currentLocation;
      this._setPositionByLocation(currentLocation);
    }

    if (changes.wmMapPositionCenter && changes.wmMapPositionCenter.currentValue != null) {
      this._centerPosition();
    }
    if (changes.wmMapPositionfocus && changes.wmMapPositionfocus.currentValue != null) {
      const val = changes.wmMapPositionfocus.currentValue;
      this._focus$.next(val);
      if (val === true) {
        this._layerLocation.setStyle(
          new Style({
            image: this._iconLocationArrow,
          }),
        );
        this.mapCmp.map.getView().setZoom(this.mapCmp.map.getView().getZoom() + 1);
        this._setPositionByLocation(this._currentLocation);
      } else {
        this._layerLocation.setStyle(
          new Style({
            image: this._iconLocation,
          }),
        );
      }
      this._layerLocation.getSource().changed();
      if (this.mapCmp.map != null) {
        this.mapCmp.map.render();
      }
    }
  }

  /**
   *
   * @description
   * This method is called when the component is destroyed, and it unsubscribes from the
   * background location and current location observables to prevent memory leaks.
   *
   * @returns void
   */
  ngOnDestroy(): void {
    this._bgLocSub.unsubscribe();
    this._bgCurrentLocSub.unsubscribe();
  }

  /**
   * @description
   * Centers the map to the current location and updates the position marker accordingly.
   */
  private _centerPosition() {
    const point = this._updateGeometry(this._currentLocation);
    if (point != null) {
      this._followLocation(point);
    }
  }

  /**
   * @description
   * Fits the map view to a given geometry or extent.
   *
   * @param geometryOrExtent The geometry or extent to fit the map view to.
   * @param optOptions Optional options for the fit operation, including maxZoom, duration, and size.
   * If size is not specified, it defaults to the height of the map container.
   * @returns void
   */
  private _fitView(geometryOrExtent: Point, optOptions?: FitOptions): void {
    if (optOptions == null) {
      const size = this.mapCmp.map.getSize();
      const height = size != null && size.length > 0 ? size[1] : 0;
      optOptions = {
        maxZoom: this.mapCmp.map.getView().getZoom(),
        duration: 500,
        size,
      };
    }
    this.mapCmp.map.getView().fit(geometryOrExtent, optOptions);
  }

  /**
   * @description
   * Adjusts the map view to follow the location of the user.
   *
   * @param point The current position of the user as a Point object.
   * @returns Void.
   */
  private _followLocation(point: Point): void {
    this._fitView(point);
    const runningAvg = this._runningAvg(this._currentLocation.bearing);
    this._rotate(-runningAvg, 500);
  }

  /**
   * @description
   * Rotates the map to a specified bearing.
   *
   * @param bearing The desired bearing in radians.
   * @param duration Optional. The duration of the animation in milliseconds. Default is 0.
   */
  private _rotate(bearing: number, duration?: number): void {
    this.mapCmp.map.getView().animate({
      rotation: bearing,
      duration: duration ? duration : 0,
    });
  }

  /**
   * @description
   * Calculates the running average of bearings and returns the result in radians.
   *
   * @param bearing The current bearing in degrees.
   * @returns The running average of bearings in radians.
   */
  private _runningAvg(bearing: number): number {
    try {
      if (typeof bearing === 'number' && Number.isNaN(bearing) === false && bearing >= 0) {
        const bearingInRadians = toRadians(bearing);
        const newBearing: Bearing = {
          cos: Math.cos(bearingInRadians),
          sin: Math.sin(bearingInRadians),
        };
        if (this._lastBearings.length > 3) {
          this._lastBearings.shift();
        }
        this._lastBearings.push(newBearing);
        let cosAverage = 0;
        let sinAverage = 0;
        this._lastBearings.forEach(b => {
          cosAverage += b.cos;
          sinAverage += b.sin;
        });
        const count = this._lastBearings.length;
        const runningAverage = Math.atan2(sinAverage / count, cosAverage / count);

        return runningAverage < 0 ? Math.PI * 2 + runningAverage : runningAverage;
      }
      return 0;
    } catch (e) {
      console.log('position error', e);
      return 0;
    }
  }

  /**
   * @description
   * Sets the position of the map view based on the given location.
   * If the focus flag is set to true, it also rotates the view to follow the location.
   *
   * @param loc The location to center the map view on.
   */
  private _setPositionByLocation(loc: Location): void {
    const point = this._updateGeometry(loc);
    if (this._focus$.value === true) {
      this._followLocation(point);
    }
  }

  /**
   * @description
   * Update the position and accuracy of the location feature on the map based on the given location data.
   * Also returns the new point location.
   *
   * @param loc The location data to use.
   * @returns The new point location.
   */
  private _updateGeometry(loc: Location): Point {
    if (loc != null) {
      const point = new Point(fromLonLat([loc.longitude, loc.latitude]));
      const geometry = circularPolygon([loc.longitude, loc.latitude], loc.accuracy);
      this._featureLocation.setGeometry(point);
      this._featureAccuracy.setGeometry(geometry);
      return point;
    }
    return null;
  }
}
