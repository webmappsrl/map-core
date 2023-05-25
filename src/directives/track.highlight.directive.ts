import {
  Directive,
  EventEmitter,
  Host,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';

import GeoJSON from 'ol/format/GeoJSON';
import VectorLayer from 'ol/layer/Vector';
import VectorTileLayer from 'ol/layer/VectorTile';
import RenderFeature, {toFeature} from 'ol/render/Feature';
import VectorSource from 'ol/source/Vector';

import {WmMapBaseDirective} from '.';
import {getLineStyle} from '../../src/utils';
import {WmMapComponent} from '../components';
import {SELECTED_TRACK_ZINDEX} from '../readonly';
@Directive({
  selector: '[wmMapTrackHighLight]',
})
export class WmMapTrackHighLightDirective extends WmMapBaseDirective implements OnChanges, OnInit {
  private _highlightLayer: VectorLayer<VectorSource>;
  private _mapIsInit = false;

  /**
   * @description
   * Event emitter for track selection from the layer.
   * Emits the ID of the selected track.
   */
  @Output() trackSelectedFromLayerEVT: EventEmitter<number> = new EventEmitter<number>();

  constructor(@Host() mapCmp: WmMapComponent) {
    super(mapCmp);
  }

  ngOnChanges(_: SimpleChanges): void {
    this._init();
  }

  ngOnInit(): void {
    this._init();
  }

  /**
   * @description
   * Handles changes to input properties and performs necessary actions.
   * It initializes the map and sets up the highlight layer for the selected track feature.
   * It adds a pointermove event listener to the map to detect when the mouse pointer is over a track feature.
   * If a track feature is detected, it updates the cursor style and displays the highlight feature on the highlight layer.
   * When the mouse pointer moves away from the track feature, the highlight layer is cleared and the cursor style is reset.
   * @param _: The SimpleChanges object.
   */
  private _init(): void {
    if (this.mapCmp.map != null && this.wmMapConf != null && this._mapIsInit == false) {
      this._mapIsInit = true;
      let highlightFeatureId = null;
      // Create the highlight layer for selected track feature
      this._highlightLayer = new VectorLayer({
        source: new VectorSource({
          format: new GeoJSON(),
        }),
        style: () => getLineStyle('#CA1551'),
        zIndex: SELECTED_TRACK_ZINDEX - 1,
      });
      // Add the highlight layer to the map
      this.mapCmp.map.addLayer(this._highlightLayer);
      // Add pointermove event listener to the map
      this.mapCmp.map.on('pointermove', (e: any) => {
        let added = this.mapCmp.map.forEachFeatureAtPixel(
          e.pixel,
          (f: RenderFeature, l: VectorTileLayer) => {
            if (f.getType != null) {
              const feature = toFeature(f);
              const featureId = feature.getProperties().id;
              // Check if the layer is visible and has high property
              if (l.getOpacity() === 1 && l.getProperties().high) {
                if (highlightFeatureId != featureId) {
                  this.mapCmp.map.getViewport().style.cursor = 'pointer';
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
          this.mapCmp.map.getViewport().style.cursor = 'pointer';
        } else {
          this._highlightLayer.getSource().clear();
          this.mapCmp.map.getViewport().style.cursor = '';
        }
      });
    }
  }

  //TODO: why the function _init is called 2 times on ngOnChanges and ngOnInit?
}
