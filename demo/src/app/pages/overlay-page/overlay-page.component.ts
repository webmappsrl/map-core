import {HttpClient} from '@angular/common/http';
import {Component, ViewEncapsulation, ChangeDetectionStrategy} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Component({
  selector: 'overlay-page',
  templateUrl: './overlay-page.component.html',
  styleUrls: ['./overlay-page.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverlayPageComponent {
  public get http(): HttpClient {
    return this._http;
  }

  public set http(value: HttpClient) {
    this._http = value;
  }

  confMAP$: Observable<any>;

  constructor(private _http: HttpClient) {
    this.confMAP$ = this._http
      .get('https://geohub.webmapp.it/api/app/webmapp/26/config.json')
      .pipe(map((conf: any) => conf.MAP));
  }
}
