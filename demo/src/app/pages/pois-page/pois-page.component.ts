import {HttpClient} from '@angular/common/http';
import {Component, ViewEncapsulation, ChangeDetectionStrategy} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Component({
  selector: 'pois-page',
  templateUrl: './pois-page.component.html',
  styleUrls: ['./pois-page.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoisPageComponent {
  confMAP$: Observable<any>;
  pois$: Observable<any>;

  constructor(private _http: HttpClient) {
    this.pois$ = this._http.get('https://geohub.webmapp.it/api/v1/app/17/pois.geojson');
    this.confMAP$ = this._http
      .get('https://geohub.webmapp.it/api/app/webmapp/17/config.json')
      .pipe(map((conf: any) => conf.MAP));
  }
}
