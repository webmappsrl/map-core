import { Directive, Host, Input } from "@angular/core";
import { WmMapBaseDirective } from "./base.directive";
import { filter, take } from "rxjs/operators";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from 'ol/format/GeoJSON';
import { getLineStyle } from "../../src/utils";
import { BehaviorSubject } from "rxjs";
import {WmMapComponent} from '../components';
import { UGC_TRACK_ZINDEX } from "../readonly";

@Directive({
  selector: '[wmMapUgcTracks]',
})
export class WmMapUcgTracksDirective extends WmMapBaseDirective {

  private _ugcTrackLayer: VectorLayer<VectorSource>;
  private _wmMapUgcTracks: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  @Input() set wmMapUgcTracks(tracks: any) {
    this._wmMapUgcTracks.next(tracks);
  }

  @Input() set wmMapUgcPoisDisableLayer(disabled: boolean) {
    this._ugcTrackLayer?.setVisible(!disabled);
  }

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
            filter(t => t),
            take(1),
          )
          .subscribe(t => {
            this._addTracksLayer(t);
          });
        });
      });
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

  private _addTracksLayer(tracks: any): void{
    const collection = {
      type: 'FeatureCollection',
      features: tracks.map( t => t.geojson)
    }
    const features = new GeoJSON({
      featureProjection: 'EPSG:3857',
    }).readFeatures(collection);

    this._ugcTrackLayer.getSource().addFeatures(features);
    if (this.mapCmp.map != null) {
      this.mapCmp.map.addLayer(this._ugcTrackLayer);
    }

    this.mapCmp.map.getRenderer();
  }

}
