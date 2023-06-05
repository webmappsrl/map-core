import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {TrackRelatedPoisPageRoutingModule} from './track-related-pois-page-routing.module';
import {TrackRelatedPoisPageComponent} from './track-related-pois-page.component';
import {WmMapModule} from 'src/map-core.module';
import {FormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';

@NgModule({
  declarations: [TrackRelatedPoisPageComponent],
  imports: [
    CommonModule,
    TrackRelatedPoisPageRoutingModule,
    WmMapModule,
    FormsModule,
    HttpClientModule,
  ],
})
export class TrackRelatedPoisPageModule {}
