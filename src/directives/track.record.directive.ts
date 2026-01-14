import {Directive, Host, Input, OnChanges, OnDestroy, SimpleChanges} from '@angular/core';
import {WmMapBaseDirective} from './base.directive';
import {WmMapComponent} from '../components';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {getLineStyle} from '../utils';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import {fromLonLat} from 'ol/proj';
import {Location} from '@capacitor-community/background-geolocation';
import {RENDER_BUFFER, TRACK_RECORD_ZINDEX} from '@map-core/readonly';

@Directive({
  selector: '[WmMapTrackRecord]',
})
export class WmMapTrackRecordDirective extends WmMapBaseDirective implements OnChanges, OnDestroy {
  private _featureLayer: VectorLayer<VectorSource> | null = null;
  private _feature: Feature<LineString> | null = null;
  private readonly TRACK_COLOR = '#CA1551';

  // Buffer per ottimizzare i re-render: accumula coordinate prima di aggiornare la mappa
  private _coordinateBuffer: number[][] = [];
  private _bufferFlushTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly _BUFFER_SIZE = 5; // Flush ogni 5 coordinate
  private readonly _BUFFER_TIMEOUT_MS = 1000; // O ogni secondo

  @Input() WmMapTrackRecord = false;
  @Input() WmMapTrackRecordLocation: Location | null = null;
  @Input() WmMapTrackRecordInitLocations: Location[] | null = null;

  constructor(@Host() mapCmp: WmMapComponent) {
    super(mapCmp);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.WmMapTrackRecord) {
      this._handleTrackRecordChange(changes.WmMapTrackRecord);
    }

    if (this.WmMapTrackRecord && changes.WmMapTrackRecordLocation?.currentValue) {
      this._addLocation(changes.WmMapTrackRecordLocation.currentValue);
    }
  }

  ngOnDestroy(): void {
    this._clearBuffer();
    this._removeLayer();
  }

  /**
   * Gestisce il cambio di stato di WmMapTrackRecord
   */
  private _handleTrackRecordChange(change: {currentValue: boolean; previousValue?: boolean}): void {
    const isEnabled = change.currentValue === true;
    const wasEnabled = change.previousValue === true;

    if (isEnabled && !wasEnabled && this.mapCmp.map) {
      this._initLayer();

      if (this.WmMapTrackRecordLocation) {
        this._addLocation(this.WmMapTrackRecordLocation);
      }
    } else if (!isEnabled && wasEnabled) {
      this._removeLayer();
    }
  }

  /**
   * Inizializza il layer vettoriale per la traccia con ottimizzazioni memoria.
   * Se WmMapTrackRecordInitLocations è presente, inizializza la feature con quelle locations.
   */
  private _initLayer(): void {
    if (this._featureLayer || !this.mapCmp.map || !this.WmMapTrackRecord) {
      return;
    }

    // Inizializza la geometry: se ci sono locations iniziali, le usa, altrimenti parte vuota
    const initialCoordinates =
      this.WmMapTrackRecordInitLocations && this.WmMapTrackRecordInitLocations.length > 0
        ? this.WmMapTrackRecordInitLocations.filter(loc => this._isValidLocation(loc)).map(loc =>
            fromLonLat([loc.longitude, loc.latitude]),
          )
        : [];

    this._feature = new Feature(new LineString(initialCoordinates));

    // Crea source con opzioni ottimizzate
    const source = new VectorSource({
      features: [this._feature],
      // useSpatialIndex: false riduce memoria per tracce lineari dove non serve l'indice spaziale
      useSpatialIndex: false,
    });

    this._featureLayer = new VectorLayer({
      source,
      style: getLineStyle(this.TRACK_COLOR),
      zIndex: TRACK_RECORD_ZINDEX,
      // Ottimizzazioni per ridurre i re-render durante interazioni
      updateWhileAnimating: false,
      updateWhileInteracting: false,
      // renderBuffer: minimo per ridurre memoria del canvas offscreen
      renderBuffer: RENDER_BUFFER,
    });

    this.mapCmp.map.addLayer(this._featureLayer);
  }

  /**
   * Rimuove il layer dalla mappa e pulisce i riferimenti deallocando memoria
   */
  private _removeLayer(): void {
    // Pulisci il buffer e cancella eventuali timeout pendenti
    this._clearBuffer();

    if (this._featureLayer && this.mapCmp.map) {
      // Rimuovi il layer dalla mappa prima di deallocare
      this.mapCmp.map.removeLayer(this._featureLayer);

      // Dealloca la source e le sue feature
      const source = this._featureLayer.getSource();
      if (source) {
        source.clear(); // Rimuove tutte le feature dalla source
        source.dispose(); // Dealloca risorse della source (listener, cache, etc.)
      }

      // Dealloca la geometria separatamente per assicurare pulizia completa
      if (this._feature) {
        const geometry = this._feature.getGeometry();
        if (geometry) {
          geometry.setCoordinates([]); // Svuota le coordinate per liberare memoria array
        }
        this._feature.setGeometry(undefined as any); // Rimuovi riferimento alla geometria
        this._feature.dispose(); // Dealloca la feature (listener, properties)
      }

      // Dealloca il layer (renderer, canvas cache)
      this._featureLayer.dispose();
    }

    // Reset riferimenti
    this._featureLayer = null;
    this._feature = null;
  }

  /**
   * Pulisce il buffer delle coordinate e cancella il timeout
   */
  private _clearBuffer(): void {
    if (this._bufferFlushTimeout) {
      clearTimeout(this._bufferFlushTimeout);
      this._bufferFlushTimeout = null;
    }
    this._coordinateBuffer = [];
  }

  /**
   * Aggiunge una location alla traccia ottimizzando memoria e re-render.
   * Usa un buffer per accumulare coordinate e ridurre le chiamate a changed().
   */
  private _addLocation(location: Location): void {
    if (!this.WmMapTrackRecord) {
      return;
    }

    // Lazy init del layer se necessario
    if (!this._featureLayer && this.mapCmp.map) {
      this._initLayer();
    }

    const geometry = this._feature?.getGeometry();
    if (!geometry) {
      return;
    }

    if (!this._isValidLocation(location)) {
      return;
    }

    const newCoord = fromLonLat([location.longitude, location.latitude]);

    // Controlla duplicati con l'ultima coordinata (buffer o geometry)
    const lastBuffered =
      this._coordinateBuffer.length > 0
        ? this._coordinateBuffer[this._coordinateBuffer.length - 1]
        : null;

    if (lastBuffered) {
      // Confronta con l'ultimo nel buffer
      if (newCoord[0] === lastBuffered[0] && newCoord[1] === lastBuffered[1]) {
        return; // Duplicato, ignora
      }
    } else {
      // Buffer vuoto, confronta con l'ultima nella geometry
      const coords = geometry.getCoordinates();
      const lastCoord = coords.length > 0 ? coords[coords.length - 1] : null;
      if (lastCoord && newCoord[0] === lastCoord[0] && newCoord[1] === lastCoord[1]) {
        return; // Duplicato, ignora
      }
    }

    // Aggiungi al buffer
    this._coordinateBuffer.push(newCoord);

    // Flush se il buffer è pieno
    if (this._coordinateBuffer.length >= this._BUFFER_SIZE) {
      this._flushBuffer(geometry);
    } else {
      // Imposta timeout per flush automatico (per non perdere punti se l'utente si ferma)
      this._scheduleBufferFlush(geometry);
    }
  }

  /**
   * Pianifica un flush del buffer dopo un timeout
   */
  private _scheduleBufferFlush(geometry: LineString): void {
    // Cancella timeout esistente
    if (this._bufferFlushTimeout) {
      clearTimeout(this._bufferFlushTimeout);
    }

    this._bufferFlushTimeout = setTimeout(() => {
      this._flushBuffer(geometry);
    }, this._BUFFER_TIMEOUT_MS);
  }

  /**
   * Svuota il buffer aggiungendo tutte le coordinate alla geometry.
   * Riduce i re-render facendo un'unica chiamata a changed() per N coordinate.
   */
  private _flushBuffer(geometry: LineString): void {
    if (this._coordinateBuffer.length === 0) {
      return;
    }

    // Cancella il timeout se presente
    if (this._bufferFlushTimeout) {
      clearTimeout(this._bufferFlushTimeout);
      this._bufferFlushTimeout = null;
    }

    // Aggiungi tutte le coordinate del buffer in una volta
    for (const coord of this._coordinateBuffer) {
      geometry.appendCoordinate(coord);
    }
    this._coordinateBuffer = []; // Reset buffer

    // Una sola chiamata a changed() per tutto il batch
    geometry.changed();
  }

  /**
   * Verifica se una location ha coordinate valide
   */
  private _isValidLocation(loc: Location): boolean {
    return loc != null && loc.latitude != null && loc.longitude != null;
  }
}
