import {POSITION_ZINDEX} from '../readonly';
import {BehaviorSubject, Subscription, from} from 'rxjs';
import {
  Directive,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

import {Feature} from 'ol';
import {FitOptions} from 'ol/View';
import Icon from 'ol/style/Icon';
import Point from 'ol/geom/Point';
import Style from 'ol/style/Style';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {fromLonLat} from 'ol/proj';
import {WmMapBaseDirective} from './base.directive';

interface Bearing {
  cos: number;
  sin: number;
}
interface Location {
  altitude: number;
  bearing: number;
  latitude: number;
  longitude: number;
}
@Directive({
  selector: '[wmMapPosition]',
})
export class WmMapPositionDirective extends WmMapBaseDirective implements OnDestroy, OnChanges {
  private _bgCurrentLocSub: Subscription = Subscription.EMPTY;
  private _bgLocSub: Subscription = Subscription.EMPTY;
  private _currentLocation: Location;
  private _focus$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private _lastBearings: Bearing[] = [];
  private _locationArrowIcon = new Icon({
    src: 'assets/location-icon-arrow.png',
    scale: 0.4,
    size: [125, 125],
  });
  private _locationFeature = new Feature();
  private _locationIcon = new Icon({
    src: 'assets/location-icon.png',
    scale: 0.4,
    size: [125, 125],
  });
  private _locationLayer = new VectorLayer({
    source: new VectorSource({
      features: [this._locationFeature],
    }),
    style: new Style({
      image: this._locationIcon,
    }),
    zIndex: POSITION_ZINDEX,
  });

  @Input() currentLocation: Location;
  @Input() focus;
  @Input() position;
  @Output() locationEvt: EventEmitter<Location> = new EventEmitter();

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes &&
      changes.currentLocation != null &&
      changes.currentLocation.currentValue != null
    ) {
      this._currentLocation = changes.currentLocation.currentValue;
      this._setPositionByLocation(changes.currentLocation.currentValue);
    }
    if (changes && changes.map && changes.map.currentValue != null) {
      this.map.addLayer(this._locationLayer);
      this.map.render();
      this._locationLayer.getSource().changed();
    }
    if (changes && changes.position && changes.position.currentValue != null) {
      this._setPositionToUser();
    }
    if (changes && changes.focus && changes.focus.currentValue != null) {
      const val = changes.focus.currentValue;
      this._focus$.next(val);
      if (val === true) {
        this._locationLayer.setStyle(
          new Style({
            image: this._locationArrowIcon,
          }),
        );
        this.map.getView().setZoom(this.map.getView().getZoom() + 1);
        this._setPositionByLocation(this._currentLocation);
      } else {
        this._locationLayer.setStyle(
          new Style({
            image: this._locationIcon,
          }),
        );
      }
      this._locationLayer.getSource().changed();
      if (this.map != null) {
        this.map.render();
      }
    }
  }

  ngOnDestroy(): void {
    this._bgLocSub.unsubscribe();
    this._bgCurrentLocSub.unsubscribe();
  }

  private _degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private _fitView(geometryOrExtent: Point, optOptions?: FitOptions): void {
    if (optOptions == null) {
      const size = this.map.getSize();
      const height = size != null && size.length > 0 ? size[1] : 0;
      optOptions = {
        maxZoom: this.map.getView().getZoom(),
        duration: 500,
        size,
      };
    }
    this.map.getView().fit(geometryOrExtent, optOptions);
  }

  private _radiansToDegrees(radians): number {
    return radians * (180 / Math.PI);
  }

  private _rotate(bearing: number, duration?: number): void {
    this.map.getView().animate({
      rotation: bearing,
      duration: duration ? duration : 0,
    });
  }

  private _runningAvg(bearing: number): number {
    try {
      if (typeof bearing === 'number' && Number.isNaN(bearing) === false && bearing >= 0) {
        const bearingInRadians = this._degreesToRadians(bearing);
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
      console.log('ERRORERRORERRORERRORERRORERROR', e);
      return 0;
    }
  }

  private _setPositionByLocation(loc: Location): void {
    console.log('*************************************');
    console.log('->locationnnnnnn');
    console.log(JSON.stringify(loc));
    console.log('*************************************');
    let location = loc as any;
    const runningAvg = this._runningAvg(location.bearing);
    location.runningAvg = this._radiansToDegrees(runningAvg);
    this.locationEvt.emit(location);
    const point = new Point(fromLonLat([location.longitude, location.latitude]));
    this._locationFeature.setGeometry(point);
    if (this._focus$.value === true) {
      this._fitView(point);
      this._rotate(-runningAvg, 500);
    }
  }

  private _setPositionToUser() {
    const point = new Point(
      fromLonLat([this._currentLocation.longitude, this._currentLocation.latitude]),
    );
    this._fitView(point);
    const runningAvg = this._runningAvg(this._currentLocation.bearing);
    this._rotate(-runningAvg, 500);
  }
}
