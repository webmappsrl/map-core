import {Component, ViewEncapsulation, ChangeDetectionStrategy} from '@angular/core';
import {MAP} from 'demo/src/mocks/conf';
import {BehaviorSubject, Observable, of} from 'rxjs';
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
  selectedColor: string = '#caaf15';
  track$: Observable<any>;
  trackColor: string;
  wmMapTrackColor$: BehaviorSubject<string> = new BehaviorSubject<string>('#caaf15');

  constructor(private _http: HttpClient) {
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
