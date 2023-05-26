import {HttpClient} from '@angular/common/http';
import {Component, OnInit, ViewEncapsulation, ChangeDetectionStrategy} from '@angular/core';
import {MAP} from 'demo/src/mocks/conf';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {map} from 'rxjs/operators';

@Component({
  selector: 'track-related-pois-page',
  templateUrl: './track-related-pois-page.component.html',
  styleUrls: ['./track-related-pois-page.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackRelatedPoisPageComponent {
  confMAP$: Observable<any>;
  showMap$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  track$: Observable<any>;

  constructor(private _http: HttpClient) {
    this.track$ = this._http.get('https://geohub.webmapp.it/api/ec/track/1544');
    this.confMAP$ = this._http.get('https://geohub.webmapp.it/api/app/webmapp/17/config.json').pipe(
      map((conf: any) => {
        return conf.MAP;
      }),
    );
  }
}
