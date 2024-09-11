import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {PoisPageRoutingModule} from './demo-pois-page-routing.module';
import {PoisPageComponent} from './demo-pois-page.component';
import {WmMapModule} from 'src/map-core.module';
import {FormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';

@NgModule({
  declarations: [PoisPageComponent],
  imports: [CommonModule, PoisPageRoutingModule, WmMapModule, FormsModule, HttpClientModule],
})
export class PoisPageModule {}
