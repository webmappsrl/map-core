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
  }

  /**
   * Ridisegna la linea con l'elenco ricevuto: un solo `setCoordinates`, quindi un solo re-render,
   * per emissione.
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

    const coordinates = (locations ?? [])
      .filter(location => this._isValidLocation(location))
      .map(location => fromLonLat([location.longitude, location.latitude]));
    geometry.setCoordinates(coordinates);
  }

  /**
   * Verifica se una location ha coordinate valide
   */
  private _isValidLocation(loc: Location): boolean {
    return loc != null && loc.latitude != null && loc.longitude != null;
  }
}
