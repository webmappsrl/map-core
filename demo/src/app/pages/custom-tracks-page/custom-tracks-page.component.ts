import {Component, OnInit, ViewEncapsulation, ChangeDetectionStrategy} from '@angular/core';
import {MAP} from 'demo/src/mocks/conf';
import {of} from 'rxjs';

@Component({
  selector: 'custom-tracks-page',
  templateUrl: './custom-tracks-page.component.html',
  styleUrls: ['./custom-tracks-page.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomTracksPageComponent implements OnInit {
  confMAP$ = of(MAP);
  savedCustomTrack: any;

  ngOnInit() {
    const savedTrack = localStorage.getItem('customTrack');
    if (savedTrack) {
      this.savedCustomTrack = savedTrack ? JSON.parse(savedTrack) : null;
    }
  }

  clearSavedCustomTrack() {
    this.savedCustomTrack = null;
    localStorage.removeItem('customTrack');
  }

  setCurrentCustomTrack(track: any) {
    console.log(track);
    this.savedCustomTrack = JSON.parse(JSON.stringify(track));
    localStorage.setItem('customTrack', JSON.stringify(track));
  }
}

//TODO: add ability to save track created
