import {HttpClient} from '@angular/common/http';
import {Component, OnInit, ViewEncapsulation, ChangeDetectionStrategy} from '@angular/core';
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
  poiId$: BehaviorSubject<number> = new BehaviorSubject<number>(null);
  relatedPoi$: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  selectedPoi$: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  selectedPoiDescription$: BehaviorSubject<string> = new BehaviorSubject<string>('');

  constructor(private _http: HttpClient) {
    this.track$ = this._http.get('https://geohub.webmapp.it/api/ec/track/1544');
    this.confMAP$ = this._http
      .get('https://geohub.webmapp.it/api/app/webmapp/17/config.json')
      .pipe(map((conf: any) => conf.MAP));
  }

  relatedPoiClick(poiId: number): void {
    console.log(`related-poi-click: ${poiId}`);
    this.poiId$.next(poiId);
  }
  relatedPoi(relatedPoi: any): void {
    console.log(`related-poi: ${relatedPoi}`);
    this.relatedPoi$.next(relatedPoi);
  }

  private _removeHtmlTags(html: string): string {
    let div = document.createElement('div');
    div.innerHTML = html;
    return div.innerText;
  }
}
