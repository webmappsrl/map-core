import {HttpClient} from '@angular/common/http';
import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Component({
  selector: 'map-page',
  templateUrl: './demo-map-page.component.html',
  styleUrls: ['./demo-map-page.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPageComponent {
  confMAP$: Observable<any>;
  paddingValue: number[] = [0, 0, 0, 0];
  wmMapPadding$: BehaviorSubject<number[]> = new BehaviorSubject<number[]>([0, 0, 0, 0]);

  constructor(private _http: HttpClient) {
    this.confMAP$ = this._http.get('https://geohub.webmapp.it/api/app/webmapp/26/config.json').pipe(
      map((conf: any) => {
        return conf.MAP;
      }),
    );
  }

  addPaddingValue(): void {
    this.wmMapPadding$.next([...this.paddingValue]);
  }
}
