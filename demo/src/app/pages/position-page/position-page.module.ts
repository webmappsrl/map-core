import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {PositionPageRoutingModule} from './position-page-routing.module';
import {PositionPageComponent} from './position-page.component';
import {HttpClientModule} from '@angular/common/http';
import {FormsModule} from '@angular/forms';
import {WmMapModule} from 'src/map-core.module';

@NgModule({
  declarations: [PositionPageComponent],
  imports: [CommonModule, PositionPageRoutingModule, WmMapModule, FormsModule, HttpClientModule],
})
export class PositionPageModule {}
