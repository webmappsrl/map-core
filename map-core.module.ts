import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';

import {IonicModule} from '@ionic/angular';

import {WmMapControls} from './components/controls/controls.map';
import {WmMapComponent} from './components/map/map.component';
import {WmMapSaveCustomTrackControls} from './components/save-custom-track/save-custom-track.map';
import {WmMapCustomTracksDirective} from './directives/custom-tracks.directive';
import {WmMapDrawTrackDirective} from './directives/draw-track.directive';
import {WmMapLayerDirective} from './directives/layer.directive';
import {WmMapPoisDirective} from './directives/pois.directive';
import {WmMapRelatedPoisDirective} from './directives/related-pois.directive';
import {WmMapTrackDirective} from './directives/track.directive';
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
