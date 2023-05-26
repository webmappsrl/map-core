import {HttpClient} from '@angular/common/http';
import {Component, OnInit, ViewEncapsulation, ChangeDetectionStrategy} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
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
  showMap$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);

  constructor(private _http: HttpClient) {
    this.confMAP$ = this._http.get('https://geohub.webmapp.it/api/app/webmapp/13/config.json').pipe(
      map((conf: any) => {
        return conf.MAP;
      }),
    );
  }
}
