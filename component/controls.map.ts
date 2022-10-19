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
  selector: 'wm-map-controls',
  template: `
  <div class="layer-button" *ngIf="showButton$|async">
    <ion-icon name="layers-outline" (click)="toggle$.next(!toggle$.value)"></ion-icon>
  </div>
  <ion-list  *ngIf="toggle$|async" class="layer-content">
    <ion-radio-group value="v0">
      <ion-item *ngFor="let tileLayer of tileLayers;let idx = index">
        <ion-label>{{tileLayer.getClassName()}}</ion-label>
        <ion-radio slot="start" [value]="'v'+idx" (click)="selectTileLayer(idx)"></ion-radio>
      </ion-item>
    </ion-radio-group>
  </ion-list>
`,
  styleUrls: ['controls.map.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmMapControls implements OnChanges {
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
