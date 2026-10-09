import {Directive, Host, Input, OnChanges, OnDestroy, SimpleChanges} from '@angular/core';
import {WmMapBaseDirective} from './base.directive';
import {WmMapComponent} from '../components';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {getLineStyle} from '../utils';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import {fromLonLat} from 'ol/proj';
import {Location} from '../types/location';
import {RENDER_BUFFER, TRACK_RECORD_ZINDEX} from '@map-core/readonly';

@Directive({
  standalone: false,
  selector: '[WmMapTrackRecord]',
})
export class WmMapTrackRecordDirective extends WmMapBaseDirective implements OnChanges, OnDestroy {
  private _featureLayer: VectorLayer<VectorSource> | null = null;
  private _feature: Feature<LineString> | null = null;
  // Ultimo elenco disegnato: se il nuovo ne è il prolungamento si aggiungono solo i punti nuovi
  private _drawnLocations: Location[] = [];
  private readonly TRACK_COLOR = '#CA1551';

  @Input() WmMapTrackRecord = false;
  /**
   * Elenco completo dei punti da disegnare, già decisi dal consumer (in wm-core: i punti tenuti
   * dalla pulizia GPS, oc:8743). Si passa sempre l'elenco intero, non un punto alla volta: una
   * stessa emissione può aggiungerne più di uno.
   */
  @Input() WmMapTrackRecordLocations: Location[] | null = null;

  constructor(@Host() mapCmp: WmMapComponent) {
    super(mapCmp);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.WmMapTrackRecord) {
      this._handleTrackRecordChange(changes.WmMapTrackRecord);
    }

    if (this.WmMapTrackRecord && changes.WmMapTrackRecordLocations) {
      this._setLocations(this.WmMapTrackRecordLocations);
    }
  }

  ngOnDestroy(): void {
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
      this._setLocations(this.WmMapTrackRecordLocations);
    } else if (!isEnabled && wasEnabled) {
      this._removeLayer();
    }
  }

  /**
   * Inizializza il layer vettoriale per la traccia con ottimizzazioni memoria
   */
  private _initLayer(): void {
    if (this._featureLayer || !this.mapCmp.map || !this.WmMapTrackRecord) {
      return;
    }

    this._feature = new Feature(new LineString([]));

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
    this._drawnLocations = [];
  }

  /**
   * Aggiorna la linea con l'elenco ricevuto, con un solo re-render per emissione. Di norma l'elenco
   * è il prolungamento di quello già disegnato: si proiettano e si aggiungono solo i punti nuovi.
   * Se cambia prima della coda (ripresa dopo un crash, pulizia rifatta con altri parametri, nuova
   * registrazione) si ridisegna tutto con `setCoordinates`.
   */
  private _setLocations(locations: Location[] | null): void {
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

    const next = locations ?? [];
    const flat = geometry.getFlatCoordinates();
    if (flat && this._isContinuation(next)) {
      // Si allunga l'array delle coordinate e si notifica una volta sola: appendCoordinate
      // chiamerebbe changed(), quindi un re-render, a ogni punto
      const before = flat.length;
      for (let i = this._drawnLocations.length; i < next.length; i++) {
        if (this._isValidLocation(next[i])) {
          flat.push(...this._toCoordinate(next[i]));
        }
      }
      if (flat.length > before) {
        geometry.changed();
      }
    } else {
      geometry.setCoordinates(
        next.filter(location => this._isValidLocation(location)).map(l => this._toCoordinate(l)),
      );
    }
    this._drawnLocations = next;
  }

  /**
   * Il nuovo elenco contiene, nelle stesse posizioni, tutti i punti già disegnati. Si confrontano i
   * riferimenti: il consumer allunga l'elenco con `concat`, quindi i punti già decisi restano gli
   * stessi oggetti; un confronto per riferimento non alloca e non riproietta nulla. Con niente di
   * disegnato (`_drawnLocations` vuoto anche quando il layer viene ricreato) la linea è vuota e
   * tutto l'elenco è coda.
   *
   * @param next il nuovo elenco
   * @returns true se basta aggiungere la coda
   */
  private _isContinuation(next: Location[]): boolean {
    const drawn = this._drawnLocations;
    if (next.length < drawn.length) {
      return false;
    }
    for (let i = 0; i < drawn.length; i++) {
      if (next[i] !== drawn[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Coordinate della mappa di una location.
   *
   * @param location la location
   * @returns la coordinata proiettata
   */
  private _toCoordinate(location: Location): number[] {
    return fromLonLat([location.longitude, location.latitude]);
  }

  /**
   * Verifica se una location ha coordinate valide
   */
  private _isValidLocation(loc: Location): boolean {
    return loc != null && loc.latitude != null && loc.longitude != null;
  }
}
