import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {WmMapPopover} from './components/popover/popover.map';

import {IonicModule} from '@ionic/angular';

import {WmMapComponent} from './components/map/map.component';
import {WmMapSaveCustomTrackControls} from './components/save-custom-track/save-custom-track.map';
import {
  wmMapCustomTrackDrawTrackDirective,
  WmMapCustomTracksDirective,
  WmMapFeatureCollectionDirective,
  WmMapHitMapDirective,
  WmMapLayerDirective,
  WmMapLayerProgressBarDirective,
  WmMapOverlayDirective,
  WmMapPoisDirective,
  WmMapPositionDirective,
  WmMapTrackDirective,
  WmMapTrackHighLightDirective,
  WmMapTrackRelatedPoisDirective,
} from './directives';
import {WmMapControlsModule} from './components/controls/controls.module';
import {WmMapGeojsonDirective} from './directives/geojson.directive';
import {StoreModule} from '@ngrx/store';
import {featureKey, MapCoreReducer} from './store/map-core.reducer';
import { WmMapUcgTracksDirective } from './directives/ugc-tracks.directive';

const directives = [
  WmMapTrackDirective,
  WmMapLayerDirective,
  WmMapTrackRelatedPoisDirective,
  WmMapPoisDirective,
  wmMapCustomTrackDrawTrackDirective,
  WmMapCustomTracksDirective,
  WmMapUcgTracksDirective,
  WmMapTrackHighLightDirective,
  WmMapLayerProgressBarDirective,
  WmMapOverlayDirective,
  WmMapPositionDirective,
  WmMapFeatureCollectionDirective,
  WmMapHitMapDirective,
  WmMapGeojsonDirective,
];
const components = [WmMapComponent, WmMapPopover, WmMapSaveCustomTrackControls];

@NgModule({
  declarations: [...components, ...directives],
  imports: [
    CommonModule,
    IonicModule,
    WmMapControlsModule,
    StoreModule.forFeature(featureKey, MapCoreReducer),
  ],
  exports: [...components, ...directives],
})
export class WmMapModule {}
