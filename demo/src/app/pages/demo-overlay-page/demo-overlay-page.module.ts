import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {OverlayPageRoutingModule} from './demo-overlay-page-routing.module';
import {OverlayPageComponent} from './demo-overlay-page.component';
import {WmMapModule} from 'src/map-core.module';
import {FormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';

@NgModule({
  declarations: [OverlayPageComponent],
  imports: [CommonModule, OverlayPageRoutingModule, WmMapModule, FormsModule, HttpClientModule],
})
export class OverlayPageModule {}
