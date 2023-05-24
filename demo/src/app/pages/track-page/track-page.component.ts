import {Component, ViewEncapsulation, ChangeDetectionStrategy} from '@angular/core';
import {MAP} from 'demo/src/mocks/conf';
import {Observable, of} from 'rxjs';
import {HttpClient} from '@angular/common/http';

@Component({
  selector: 'track-page',
  templateUrl: './track-page.component.html',
  styleUrls: ['./track-page.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackPageComponent {
  confMAP$ = of(MAP);
  track$: Observable<any>;

  constructor(private _http: HttpClient) {
    this.track$ = this._http.get('https://geohub.webmapp.it/api/ec/track/30996');
  }
}
