import {Component, ViewEncapsulation, ChangeDetectionStrategy} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {map} from 'rxjs/operators';

@Component({
  selector: 'track-page',
  templateUrl: './demo-track-page.component.html',
  styleUrls: ['./demo-track-page.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackPageComponent {
  confMAP$: Observable<any>;
  selectedColor: string = '#caaf15';
  track$: Observable<any>;
  trackColor: string;
  wmMapTrackColor$: BehaviorSubject<string> = new BehaviorSubject<string>('#caaf15');

  constructor(private _http: HttpClient) {
    this.confMAP$ = this._http.get('https://geohub.webmapp.it/api/app/webmapp/26/config.json').pipe(
      map((conf: any) => {
        return conf.MAP;
      }),
    );
    this.track$ = this._http.get('https://geohub.webmapp.it/api/ec/track/30996');
  }

  addTrackColor(): void {
    this.wmMapTrackColor$.next(this.trackColor);
  }

  copyFromClipBoard(color: string): void {
    navigator.clipboard.writeText(color);
  }

  selectColor(color: string): void {
    this.selectedColor = color;
    this.wmMapTrackColor$.next(this.selectedColor);
  }

//TODO: add input for trackElevationChartElements
}
