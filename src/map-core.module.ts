import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {WmMapPopover} from './components/popover/popover.map';

import {IonicModule} from '@ionic/angular';

import {WmMapControls} from './components/controls/controls.map';
import {WmMapComponent} from './components/map/map.component';
import {WmMapSaveCustomTrackControls} from './components/save-custom-track/save-custom-track.map';
import {
  wmMapCustomTrackDrawTrackDirective,
  WmMapCustomTracksDirective,
  WmMapFeatureCollectionDirective,
  WmMapLayerDirective,
  WmMapLayerProgressBarDirective,
  WmMapOverlayDirective,
  WmMapPoisDirective,
  WmMapPositionDirective,
  WmMapTrackDirective,
  wmMapTrackHighLightDirective,
  wmMapTrackRelatedPoisDirective,
} from './directives';
import {WmMapControlsModule} from './components/controls/controls.module';

const directives = [
  WmMapTrackDirective,
  WmMapLayerDirective,
  wmMapTrackRelatedPoisDirective,
  WmMapPoisDirective,
  wmMapCustomTrackDrawTrackDirective,
  WmMapCustomTracksDirective,
  wmMapTrackHighLightDirective,
  WmMapLayerProgressBarDirective,
  WmMapOverlayDirective,
  WmMapPositionDirective,
  WmMapFeatureCollectionDirective,
];
const components = [WmMapComponent, WmMapPopover, WmMapSaveCustomTrackControls];

@NgModule({
  declarations: [...components, ...directives],
  imports: [CommonModule, IonicModule, WmMapControlsModule],
  exports: [...components, ...directives],
})
export class WmMapModule {}
