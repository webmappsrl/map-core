import {Directive, EventEmitter, Host, Input, Output, SimpleChanges} from '@angular/core';
import {WmMapBaseDirective} from './base.directive';
import {filter, take} from 'rxjs/operators';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import {getLineStyle} from '../../src/utils';
import {BehaviorSubject} from 'rxjs';
import {WmMapComponent} from '../components';
import {UGC_TRACK_ZINDEX} from '../readonly';
import {MapBrowserEvent} from 'ol';
import {WmFeature} from '@wm-types/feature';
import {LineString} from 'geojson';

@Directive({
  selector: '[wmMapUgcTracks]',
})
export class WmMapUcgTracksDirective extends WmMapBaseDirective {
  private _ugcTrackLayer: VectorLayer<VectorSource>;
  private _wmMapUgcTracks: BehaviorSubject<WmFeature<LineString>[]> = new BehaviorSubject<
    WmFeature<LineString>[]
  >([]);

  @Input() set wmMapUgcTrackDisableLayer(disabled: boolean) {
    this._ugcTrackLayer?.setVisible(!disabled);
  }

  @Input() set wmMapUgcTracks(tracks: WmFeature<LineString>[]) {
    this._wmMapUgcTracks.next(tracks);
  }

  @Output()
  ugcTrackSelectedFromMapEVT: EventEmitter<string> = new EventEmitter<string>();

  constructor(@Host() mapCmp: WmMapComponent) {
    super(mapCmp);
    this.mapCmp.isInit$
      .pipe(
        filter(f => f === true),
        take(1),
      )
      .subscribe(() => {
        this._initLayer();
        this.mapCmp.map.once('rendercomplete', () => {
          this._wmMapUgcTracks
            .pipe(
              filter(t => t && t.length > 0),
              take(1),
            )
            .subscribe(t => {
              this._addTracksLayer(t);
            });
        });
        this.mapCmp.map.on('click', (evt: MapBrowserEvent<UIEvent>) => {
          try {
            this.mapCmp.map.forEachFeatureAtPixel(
              evt.pixel,
              function (clickedFeature) {
                const clickedUgcTracProperties = clickedFeature?.getProperties();
                const clickedUgcTrackId: string = clickedUgcTracProperties?.id ?? undefined;
                if (clickedUgcTrackId && clickedUgcTracProperties.uuid) {
                  this.ugcTrackSelectedFromMapEVT.emit(clickedUgcTrackId);
                }
              }.bind(this),
              {
                hitTolerance: 50,
              },
            );
          } catch (_) {}
        });
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.mapCmp.isInit$
      .pipe(
        filter(f => f === true),
        take(1),
      )
      .subscribe(() => {
        if (
          changes.wmMapUgcTracks &&
          changes.wmMapUgcTracks.previousValue != null &&
          changes.wmMapUgcTracks.currentValue != null &&
          changes.wmMapUgcTracks.previousValue.length != changes.wmMapUgcTracks.currentValue.length
        ) {
          this._addTracksLayer(changes.wmMapUgcTracks.currentValue);
        }
      });
  }

  private _addTracksLayer(tracks: WmFeature<LineString>[]): void {
    const collection = {
      type: 'FeatureCollection',
      features: tracks,
    };
    const features = new GeoJSON({
      featureProjection: 'EPSG:3857',
    }).readFeatures(collection);
    if (this.mapCmp.map != null) {
      this._ugcTrackLayer.getSource().clear();
      this._ugcTrackLayer.getSource().addFeatures(features);
      if (!this.mapCmp.map.getLayers().getArray().includes(this._ugcTrackLayer)) {
        this.mapCmp.map.addLayer(this._ugcTrackLayer);
      }
    }
    this.mapCmp.map.getRenderer();
  }

  private _initLayer(): void {
    if (!this._ugcTrackLayer) {
      this._ugcTrackLayer = new VectorLayer({
        source: new VectorSource({
          format: new GeoJSON(),
        }),
        style: () => getLineStyle('#CA1551'),
        updateWhileAnimating: true,
        updateWhileInteracting: true,
        zIndex: UGC_TRACK_ZINDEX,
      });
    }
  }
}
