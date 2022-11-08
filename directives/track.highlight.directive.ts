import {Directive, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';

import GeoJSON from 'ol/format/GeoJSON';
import VectorLayer from 'ol/layer/Vector';
import VectorTileLayer from 'ol/layer/VectorTile';
import Map from 'ol/Map';
import RenderFeature, {toFeature} from 'ol/render/Feature';
import VectorSource from 'ol/source/Vector';

import {WmMapBaseDirective} from '.';
import {SELECTED_TRACK_ZINDEX} from '../readonly';
import {IMAP} from '../types/model';
import {getLineStyle} from '../utils';

@Directive({
  selector: '[wmMapTrackHighLight]',
})
export class wmMapTrackHighLightDirective extends WmMapBaseDirective implements OnChanges {
  private _highlightLayer: VectorLayer<VectorSource>;
  private _mapIsInit = false;

  @Input() conf: IMAP;
  @Input() map: Map;
  @Output() trackSelectedFromLayerEVT: EventEmitter<number> = new EventEmitter<number>();

  constructor() {
    super();
  }

  ngOnChanges(_: SimpleChanges): void {
    if (this.map != null && this.conf != null && this._mapIsInit == false) {
      this._mapIsInit = true;
      let highlightFeatureId = null;
      this._highlightLayer = new VectorLayer({
        source: new VectorSource({
          format: new GeoJSON(),
        }),
        style: () => getLineStyle('#CA1551'),
        zIndex: SELECTED_TRACK_ZINDEX - 1,
      });
      this.map.addLayer(this._highlightLayer);
      this.map.on('pointermove', (e: any) => {
        let added = this.map.forEachFeatureAtPixel(
          e.pixel,
          (f: RenderFeature, l: VectorTileLayer) => {
            if (f.getType != null) {
              const feature = toFeature(f);
              const featureId = feature.getProperties().id;
              if (l.getOpacity() === 1 && l.getProperties().high) {
                if (highlightFeatureId != featureId) {
                  this.map.getViewport().style.cursor = 'pointer';
                  this._highlightLayer.getSource().clear();
                  this._highlightLayer.getSource().addFeature(toFeature(f));
                  highlightFeatureId = featureId;
                }
                return true;
              }
            }
          },
          {hitTolerance: 30},
        );
        if (added) {
          this.map.getViewport().style.cursor = 'pointer';
        } else {
          this._highlightLayer.getSource().clear();
          this.map.getViewport().style.cursor = '';
        }
      });
    }
  }
}
