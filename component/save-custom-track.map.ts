import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ViewEncapsulation,
} from '@angular/core';

import {BehaviorSubject} from 'rxjs';
import TileLayer from 'ol/layer/Tile';

@Component({
  selector: 'wm-map-save-custom-track-controls',
  template: `
  <div class="layer-button">
    <button>SAVE</button>
  </div>

`,
  styleUrls: ['save-custom-track.map.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmMapSaveCustomTrackControls implements OnChanges {
  @Input() tileLayers: TileLayer[];

  currentTileLayerIdx$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  showButton$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  toggle$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.tileLayers.currentValue != null && this.tileLayers.length > 1) {
      this.showButton$.next(true);
    }
  }

  selectTileLayer(idx: number): void {
    this.currentTileLayerIdx$.next(idx);
    this.tileLayers.forEach((tile, tidx) => {
      const visibility = idx === tidx;
      tile.setVisible(visibility);
    });
  }
}
