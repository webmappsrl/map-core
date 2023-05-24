import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HttpClientModule} from '@angular/common/http';
import {TrackPageRoutingModule} from './track-page-routing.module';
import {TrackPageComponent} from './track-page.component';
import {WmMapModule} from 'src/map-core.module';
import {FormsModule} from '@angular/forms';

@NgModule({
  declarations: [TrackPageComponent],
  imports: [CommonModule, TrackPageRoutingModule, WmMapModule, FormsModule, HttpClientModule],
})
export class TrackPageModule {}
