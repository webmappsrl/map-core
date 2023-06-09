import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewEncapsulation,
} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

import TileLayer from 'ol/layer/Tile';
import {DomSanitizer} from '@angular/platform-browser';
import {ICONTROLS} from '../../types/model';

@Component({
  selector: 'wm-map-controls',
  template: `
  <div class="layer-button" *ngIf="showButton$|async" (click)="toggle$.next(!toggle$.value)">
    <ion-icon name="layers-outline" ></ion-icon>
  </div>
  <ion-list class="layer-content" lines="none"   *ngIf="toggle$|async"> 
    <ng-container *ngIf="conf.tiles as tiles">
      <ion-item *ngFor="let tile of tiles;let idx = index">
          <wm-map-button-control [wmMapButtonControl]="tile" [wmMapTranslationCallback]="translationCallback" (wmMapButtonContolClicked)="selectTileLayer($event)" [wmMapButtonControlSelect]="currentTileLayerIdx$.value === idx"></wm-map-button-control>
      </ion-item>
    </ng-container>
    <ion-item-divider></ion-item-divider>
    <ng-container *ngIf="conf.overlays as overlays">
      <ion-item *ngFor="let overlay of overlays;let idx = index">
          <wm-map-button-control [wmMapButtonControl]="overlay" [wmMapTranslationCallback]="translationCallback" (wmMapButtonContolClicked)="selectOverlay($event,overlay)" [wmMapButtonControlSelect]="currentOverlayIdx$.value === idx"></wm-map-button-control>
      </ion-item>
    </ng-container>
  </ion-list>
`,
  styleUrls: ['controls.map.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmMapControls implements OnChanges {
  @Input() set wmMapControlClose(selector: string) {
    if (selector != 'wm-map-controls') {
      this.toggle$.next(false);
    }
  }

  @Input() conf: ICONTROLS;
  @Input() tileLayers: TileLayer<any>[];
  @Input('wmMapTranslationCallback') translationCallback: (any) => string = value => value;
  @Output('wmMapControlOverlay') overlayEVT: EventEmitter<string | null> = new EventEmitter<
    string | null
  >(null);

  currentOverlayIdx$: BehaviorSubject<number> = new BehaviorSubject<number>(-1);
  currentTileLayerIdx$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  showButton$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  toggle$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(public sanitizer: DomSanitizer) {}

  /**
   * @description
   * This method is called by Angular when the input properties of the component change.
   * If the tileLayers input property has more than one layer, it sets the showButton$
   * observable to true.
   * @param changes - An object containing the changes detected by Angular.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes?.tileLayers?.currentValue != null && changes.tileLayers.currentValue.length > 1) {
      this.showButton$.next(true);
    }
  }

  selectOverlay(idx, overlay): void {
    if (idx === this.currentOverlayIdx$.value) {
      this.currentOverlayIdx$.next(-1);
      this.overlayEVT.emit(null);
    } else {
      this.currentOverlayIdx$.next(idx);
      this.overlayEVT.emit(overlay.url);
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
    this.tileLayers.forEach(tile => {
      const visibility = idx === tile.getProperties().id;
      tile.setVisible(visibility);
    });
    this.toggle$.next(!this.toggle$.value);
  }
}
