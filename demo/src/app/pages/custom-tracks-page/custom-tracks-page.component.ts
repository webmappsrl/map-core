import {Component, ViewEncapsulation, ChangeDetectionStrategy} from '@angular/core';
import {MAP} from 'demo/src/mocks/conf';
import {of} from 'rxjs';

@Component({
  selector: 'custom-tracks-page',
  templateUrl: './custom-tracks-page.component.html',
  styleUrls: ['./custom-tracks-page.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomTracksPageComponent {
  //TODO: add ability to save track created
  confMAP$ = of(MAP);

  saveCurrentCustomTrack(track: any): void {
    localStorage.setItem('wm-saved-tracks', JSON.stringify([track]));
  }
}
