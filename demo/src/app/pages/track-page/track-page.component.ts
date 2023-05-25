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
  showMap$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  track$: Observable<any>;
  trackColor: string;
  wmMapTrackColor$: BehaviorSubject<string> = new BehaviorSubject<string>('#caaf15');

  // Colore predefinito
  constructor(private _http: HttpClient) {
    this.track$ = this._http.get('https://geohub.webmapp.it/api/ec/track/30996');
  }

  addTrackColor() {
    this.showMap$.next(false);
    this.wmMapTrackColor$.next(this.trackColor);
    setTimeout(() => {
      this.showMap$.next(true);
    }, 300);
  }

  selectColor(color: string): void {
    this.showMap$.next(false);
    this.selectedColor = color;
    this.wmMapTrackColor$.next(this.selectedColor);
    setTimeout(() => {
      this.showMap$.next(true);
    }, 300);
  }

  copyFromClipBoard(color: string): void {
    navigator.clipboard.writeText(color);
  }

  //TODO: add input for trackElevationChartElements
}
