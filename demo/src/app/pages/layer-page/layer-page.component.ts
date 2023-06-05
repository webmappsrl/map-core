import {HttpClient} from '@angular/common/http';
import {Component, ViewEncapsulation, ChangeDetectionStrategy} from '@angular/core';
import {Observable, of} from 'rxjs';
import {filter, map} from 'rxjs/operators';
import {IDATALAYER} from 'src/types/layer';

@Component({
  selector: 'layer-page',
  templateUrl: './layer-page.component.html',
  styleUrls: ['./layer-page.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayerPageComponent {
  confMAP$: Observable<any>;
  dataLayerUrls$: Observable<IDATALAYER>;

  constructor(private _http: HttpClient) {
    this.confMAP$ = this._http.get('https://geohub.webmapp.it/api/app/webmapp/26/config.json').pipe(
      map((conf: any) => {
        return conf.MAP;
      }),
    );

    const mockGeohubId = 13;
    this.dataLayerUrls$ = of(mockGeohubId).pipe(
      filter(g => g != null),
      map(geohubId => {
        return {
          low: `https://jidotile.webmapp.it/?x={x}&y={y}&z={z}&index=geohub_app_low_${geohubId}`,
          high: `https://jidotile.webmapp.it/?x={x}&y={y}&z={z}&index=geohub_app_high_${geohubId}`,
        } as IDATALAYER;
      }),
    );
  }
}
