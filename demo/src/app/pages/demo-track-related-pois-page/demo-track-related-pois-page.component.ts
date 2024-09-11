import {HttpClient} from '@angular/common/http';
import {Component, ViewEncapsulation, ChangeDetectionStrategy} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Component({
  selector: 'track-related-pois-page',
  templateUrl: './demo-track-related-pois-page.component.html',
  styleUrls: ['./demo-track-related-pois-page.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackRelatedPoisPageComponent {
  confMAP$: Observable<any>;
  poiId$: BehaviorSubject<number> = new BehaviorSubject<number>(null);
  relatedPoi$: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  track$: Observable<any>;

  constructor(private _http: HttpClient) {
    this.track$ = this._http.get('https://geohub.webmapp.it/api/ec/track/1544');
    this.confMAP$ = this._http
      .get('https://geohub.webmapp.it/api/app/webmapp/17/config.json')
      .pipe(map((conf: any) => conf.MAP));
  }

  relatedPoi(relatedPoi: any): void {
    this.relatedPoi$.next(relatedPoi);
  }

  relatedPoiClick(poiId: number): void {
    this.poiId$.next(poiId);
  }
}
