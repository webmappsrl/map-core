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
    <ion-radio-group value="v{{currentTileLayerIdx$|async}}">
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
  @Input() tileLayers: TileLayer<any>[];

  currentTileLayerIdx$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  showButton$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  toggle$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  /**
   * @description
   * This method is called by Angular when the input properties of the component change.
   * If the tileLayers input property has more than one layer, it sets the showButton$
   * observable to true.
   * @param changes - An object containing the changes detected by Angular.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.tileLayers.currentValue != null && changes.tileLayers.currentValue.length > 1) {
      this.showButton$.next(true);
    }
  }

  /**
   * @description
   * Changes the selected tile layer and toggles its visibility.
   * This function updates the current tile layer index and changes the visibility of all tile layers
   * based on the provided index.
   * If the index of the new tile layer is the same as the current index, this function toggles
   * the visibility of the tile layer.
   *
   * @param idx - The index of the tile layer to select.
   * @returns void.
   *
   * @example
   * selectTileLayer(0); // Selects the first tile layer and makes it visible.
   * selectTileLayer(1); // Selects the second tile layer and makes it visible.
   * selectTileLayer(0); // Toggles the visibility of the first tile layer.
   */
  selectTileLayer(idx: number): void {
    this.currentTileLayerIdx$.next(idx);
    this.tileLayers.forEach((tile, tidx) => {
      const visibility = idx === tidx;
      tile.setVisible(visibility);
    });
    this.toggle$.next(!this.toggle$.value);
  }
}
