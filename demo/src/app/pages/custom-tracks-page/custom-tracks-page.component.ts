import {Component, ViewEncapsulation, ChangeDetectionStrategy} from '@angular/core';
import {MAP} from 'demo/src/mocks/conf';
import {BehaviorSubject, of} from 'rxjs';

@Component({
  selector: 'custom-tracks-page',
  templateUrl: './custom-tracks-page.component.html',
  styleUrls: ['./custom-tracks-page.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomTracksPageComponent {
  confMAP$ = of(MAP);
  currentTrack$: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  currentCustomTrack(track: any): void {
    console.log(`custom-track: ${track}`);
    localStorage.setItem('wm-saved-tracks', JSON.stringify([track]));
    this.currentTrack$.next(track);
  }
}
