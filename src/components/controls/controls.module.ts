import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {WmMapControls} from './controls.map';
import {WmMapButtonControls} from './button/button.controls.map';
import {IonicModule} from '@ionic/angular';
import {ControlIsBtn} from './control-is-btn.pipe';
const declarations = [WmMapControls, WmMapButtonControls, ControlIsBtn];
@NgModule({
  imports: [CommonModule, IonicModule],
  declarations,
  exports: declarations,
})
export class WmMapControlsModule {}
