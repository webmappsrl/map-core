import {HttpClient} from '@angular/common/http';
import {Component, ViewEncapsulation, ChangeDetectionStrategy} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Component({
  selector: 'position-page',
  templateUrl: './position-page.component.html',
  styleUrls: ['./position-page.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PositionPageComponent {
  confMAP$: Observable<any>;
  positionValue: number[] = [0, 0];
  showMap$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  wmMapPositionCenter$: BehaviorSubject<number[]> = new BehaviorSubject<number[]>([0, 0]);
  wmMapPositioncurrentLocation$: BehaviorSubject<Location> = new BehaviorSubject<Location>(null);

  constructor(private _http: HttpClient) {
    this.confMAP$ = this._http.get('https://geohub.webmapp.it/api/app/webmapp/26/config.json').pipe(
      map((conf: any) => {
        return conf.MAP;
      }),
    );
    this._webWatcher();
  }

  addPositionCenterValue(): void {
    this.showMap$.next(false);
    this.wmMapPositionCenter$.next(this.positionValue);
    setTimeout(() => {
      this.showMap$.next(true);
    }, 300);
  }

  private _webWatcher(): void {
    navigator.geolocation.watchPosition(
      res => {
        this.wmMapPositioncurrentLocation$.next((res as any).coords as Location);
      },
      function errorCallback(error) {},
      {maximumAge: 60000, timeout: 100, enableHighAccuracy: true},
    );
  }
}
