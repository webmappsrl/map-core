import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {MapPageRoutingModule} from './map-page-routing.module';
import {MapPageComponent} from './map-page.component';
import {WmMapModule} from 'src/map-core.module';
import {FormsModule} from '@angular/forms';
import {IonicModule} from '@ionic/angular';
import {HttpClientModule} from '@angular/common/http';

@NgModule({
  declarations: [MapPageComponent],
  imports: [
    CommonModule,
    MapPageRoutingModule,
    WmMapModule,
    FormsModule,
    IonicModule,
    HttpClientModule,
  ],
})
export class MapPageModule {}
