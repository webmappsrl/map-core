import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';

import {IonicModule} from '@ionic/angular';

import {WmMapControls} from './components/controls/controls.map';
import {WmMapComponent} from './components/map/map.component';
import {WmMapSaveCustomTrackControls} from './components/save-custom-track/save-custom-track.map';
import {
  WmMapCustomTracksDirective,
  WmMapDrawTrackDirective,
  WmMapLayerDirective,
  WmMapPoisDirective,
  WmMapTrackDirective,
  WmMapRelatedPoisDirective,
} from './directives';

const directives = [
  WmMapTrackDirective,
  WmMapLayerDirective,
  WmMapRelatedPoisDirective,
  WmMapPoisDirective,
  WmMapDrawTrackDirective,
  WmMapCustomTracksDirective,
];
const components = [WmMapComponent, WmMapControls, WmMapSaveCustomTrackControls];

@NgModule({
  declarations: [...components, ...directives],
  imports: [CommonModule, IonicModule],
  exports: [...components, ...directives],
})
export class WmMapModule {}
