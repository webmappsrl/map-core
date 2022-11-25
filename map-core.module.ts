import {WmMapPopover} from './components/popover/popover.map';
import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';

import {IonicModule} from '@ionic/angular';

import {WmMapControls} from './components/controls/controls.map';
import {WmMapComponent} from './components/map/map.component';
import {WmMapSaveCustomTrackControls} from './components/save-custom-track/save-custom-track.map';
import {
  WmMapCustomTracksDirective,
  wmMapCustomTrackDrawTrackDirective,
  WmMapLayerDirective,
  WmMapPoisDirective,
  WmMapTrackDirective,
  wmMapTrackRelatedPoisDirective,
  wmMapTrackHighLightDirective,
  WmMapLayerProgressBarDirective,
  WmMapOverlayDirective,
  WmMapPositionDirective,
} from './directives';

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
];
const components = [WmMapComponent, WmMapControls, WmMapPopover, WmMapSaveCustomTrackControls];

@NgModule({
  declarations: [...components, ...directives],
  imports: [CommonModule, IonicModule],
  exports: [...components, ...directives],
})
export class WmMapModule {}
