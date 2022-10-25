import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';

import {IonicModule} from '@ionic/angular';

import {WmMapControls} from './component/controls.map';
import {WmMapComponent} from './component/map.component';
import {WmMapSaveCustomTrackControls} from './component/save-custom-track.map';
import {WmMapCustomTracksDirective} from './custom-tracks.directive';
import {WmMapDrawTrackDirective} from './draw-track.directive';
import {WmMapLayerDirective} from './layer.directive';
import {WmMapPoisDirective} from './pois.directive';
import {WmMapRelatedPoisDirective} from './related-pois.directive';
import {WmMapTrackDirective} from './track.directive';
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
