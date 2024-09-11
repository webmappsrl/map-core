import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {LayerPageRoutingModule} from './demo-layer-page-routing.module';
import {LayerPageComponent} from './demo-layer-page.component';
import {HttpClientModule} from '@angular/common/http';
import {FormsModule} from '@angular/forms';
import {WmMapModule} from 'src/map-core.module';

@NgModule({
  declarations: [LayerPageComponent],
  imports: [CommonModule, LayerPageRoutingModule, WmMapModule, FormsModule, HttpClientModule],
})
export class LayerPageModule {}
