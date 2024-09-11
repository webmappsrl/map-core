import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {DemoRoutingModule} from './demo-routing.module';
import {DemoComponent} from './demo.component';
import {WmMapModule} from 'src/map-core.module';
import {LeftBarModule} from './left-bar/left-bar.module';
import {IonicModule} from '@ionic/angular';

@NgModule({
  declarations: [DemoComponent],
  imports: [BrowserModule, DemoRoutingModule, WmMapModule, LeftBarModule, IonicModule.forRoot()],
  providers: [],
  bootstrap: [DemoComponent],
})
export class AppModule {}
