import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewEncapsulation,
} from '@angular/core';
import TileLayer from 'ol/layer/Tile';
import {BehaviorSubject} from 'rxjs';
import {ICONTROLS, ICONTROLSBUTTON} from '../../types/model';

/**
 * @component WmMapControls
 * @description Gestisce i controlli della mappa, permettendo agli utenti di interagire con diversi aspetti della mappa.
 */
@Component({
  selector: 'wm-map-controls',
  templateUrl: 'controls.map.html',
  styleUrls: ['controls.map.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmMapControls implements OnChanges, OnInit {
  /**
   * @input wmMapControlClose
   * @description Permette di chiudere i controlli della mappa dall'esterno.
   * @param {string} selector Il selettore dell'elemento da chiudere.
   */
  @Input() set wmMapControlClose(selector: string) {
    if (selector !== 'wm-map-controls') {
      this.toggle$.next(false);
      this.currentOverlayIdx$.next(null);
    }
  }

  /**
   * Configurazione dei controlli della mappa.
   */
  @Input() conf: ICONTROLS;
  /**
   * Livelli della mappa di tipo TileLayer.
   */
  @Input() tileLayers: TileLayer<any>[];
  /**
   * Funzione di traduzione personalizzabile passata dall'esterno.
   */
  @Input('wmMapTranslationCallback') translationCallback: (any) => string = value => value;
  /**
   * Evento emesso quando si selezionano i dati.
   */
  @Output('wmMapControlData') dataEVT = new EventEmitter<{
    type: 'layers' | 'pois';
    toggle: boolean;
  }>(false);
  /**
   * Evento emesso quando si seleziona un overlay.
   */
  @Output('wmMapControlOverlay') overlayEVT = new EventEmitter<ICONTROLSBUTTON | null>(null);

  /**
   * Stato interno per tracciare i dati selezionati.
   */
  currentDataIdx: {[id: number]: boolean} = {};
  /**
   * Stato interno per tracciare l'overlay selezionato.
   */
  currentOverlayIdx$ = new BehaviorSubject<number>(-1);
  /**
   * Stato interno per tracciare il livello della mappa selezionato.
   */
  currentTileLayerIdx$ = new BehaviorSubject<number>(1);
  /**
   * Stato interno per determinare se mostrare il pulsante dei controlli della mappa.
   */
  showButton$ = new BehaviorSubject<boolean>(false);
  /**
   * Stato interno per tracciare lo stato di visibilità dei controlli della mappa.
   */
  toggle$ = new BehaviorSubject<boolean>(false);

  // Metodo chiamato da Angular quando cambiano le proprietà di input del componente.
  ngOnChanges(changes: SimpleChanges): void {
    this._handleTileLayerChanges(changes);
    this._handleOverlayChanges(changes);
  }

  ngOnInit(): void {
    setTimeout(() => {
      this._initializeData();
      this._setDefaultOverlay();
    }, 200);
  }

  /**
   * Seleziona i dati e invia un evento.
   * @param {number} idx L'indice dei dati selezionati.
   * @param {ICONTROLSBUTTON} data I dati selezionati.
   */
  selectDirective(idx: number, data: ICONTROLSBUTTON): void {
    this.currentDataIdx[idx] = !this.currentDataIdx[idx];
    this.dataEVT.emit({
      type: data.url as 'layers' | 'pois',
      toggle: this.currentDataIdx[idx],
    });
  }

  /**
   * Seleziona un overlay e invia un evento.
   * @param {number} idx L'indice dell'overlay selezionato.
   * @param {any} overlay L'overlay selezionato.
   */
  selectOverlay(idx: number, overlay: ICONTROLSBUTTON): void {
    if (idx === this.currentOverlayIdx$.value) {
      this.currentOverlayIdx$.next(-1);
      this.overlayEVT.emit(null);
    } else {
      this.currentOverlayIdx$.next(idx);
      this.overlayEVT.emit(overlay);
    }
  }

  /**
   * Seleziona un livello della mappa e aggiorna la sua visibilità.
   * @param {number} idx L'indice del livello della mappa selezionato.
   */
  selectTileLayer(idx: number): void {
    this.currentTileLayerIdx$.next(idx);
    this.tileLayers.forEach((tile, index) => {
      const visibility = idx === tile.getProperties().id;
      tile.setVisible(visibility);
    });
  }

  /**
   * Metodo privato per gestire i cambiamenti degli overlay.
   * @param {SimpleChanges} changes Oggetto che contiene i cambiamenti delle proprietà di input.
   */
  private _handleOverlayChanges(changes: SimpleChanges): void {
    const overlaysChange = changes.conf?.currentValue?.overlays;
    if (overlaysChange && overlaysChange.length > 1) {
      this.showButton$.next(true);
    }
  }

  /**
   * Metodo privato per gestire i cambiamenti dei livelli della mappa.
   * @param {SimpleChanges} changes Oggetto che contiene i cambiamenti delle proprietà di input.
   */
  private _handleTileLayerChanges(changes: SimpleChanges): void {
    const tileLayersChange = changes.tileLayers;
    if (tileLayersChange && this._hasMultipleLayers(tileLayersChange.currentValue)) {
      this.showButton$.next(true);
      this._setDefaultTileLayer();
    }
  }

  /**
   * Metodo privato per controllare se ci sono più di un livello della mappa.
   * @param {TileLayer<any>[]} layers Array di livelli della mappa.
   * @returns {boolean} True se ci sono più di un livello della mappa, altrimenti false.
   */
  private _hasMultipleLayers(layers: TileLayer<any>[]): boolean {
    return layers && layers.length > 1;
  }

  /**
   * Metodo privato per inizializzare i dati.
   */
  private _initializeData(): void {
    (this.conf?.data || [])
      .filter(data => data.type === 'button')
      .forEach((data: ICONTROLSBUTTON) => {
        this.currentDataIdx[data.id] = data.default ?? true;
        this.dataEVT.emit({
          type: data.url as 'layers' | 'pois',
          toggle: this.currentDataIdx[data.id],
        });
      });
  }

  /**
   * Metodo privato per impostare l'overlay predefinito.
   */
  private _setDefaultOverlay(): void {
    (this.conf?.overlays || [])
      .filter(overlay => overlay.type === 'button' && overlay.default)
      .forEach((overlay: ICONTROLSBUTTON) => this.selectOverlay(overlay.id, overlay));
  }

  /**
   * Metodo privato per impostare il livello della mappa predefinito.
   */
  private _setDefaultTileLayer(): void {
    this.conf?.tiles
      ?.filter(tile => tile.type === 'button' && tile.default)
      .forEach((tile: ICONTROLSBUTTON) => this.selectTileLayer(tile.id));
  }
}
