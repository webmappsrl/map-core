import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {CustomTracksPageRoutingModule} from './custom-tracks-page-routing.module';
import {CustomTracksPageComponent} from './custom-tracks-page.component';
import {WmMapModule} from 'src/map-core.module';
import {FormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';

@NgModule({
  declarations: [CustomTracksPageComponent],
  imports: [
    CommonModule,
    CustomTracksPageRoutingModule,
    WmMapModule,
    FormsModule,
    HttpClientModule,
  ],
})
export class CustomTracksPageModule {}
