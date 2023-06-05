import {HttpClient} from '@angular/common/http';
import {Component, ViewEncapsulation, ChangeDetectionStrategy} from '@angular/core';
import {MAP} from 'demo/src/mocks/conf';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {map} from 'rxjs/operators';

@Component({
  selector: 'custom-tracks-page',
  templateUrl: './custom-tracks-page.component.html',
  styleUrls: ['./custom-tracks-page.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomTracksPageComponent {
  confMAP$: Observable<any>;
  currentTrack$: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private _http: HttpClient) {
    this.confMAP$ = this._http.get('https://geohub.webmapp.it/api/app/webmapp/26/config.json').pipe(
      map((conf: any) => {
        return conf.MAP;
      }),
    );
  }

  currentCustomTrack(track: any): void {
    localStorage.setItem('wm-saved-tracks', JSON.stringify([track]));
    this.currentTrack$.next(track);
  }
}
