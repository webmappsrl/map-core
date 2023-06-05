import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {WmMapModule} from 'src/map-core.module';
import {LeftBarModule} from './left-bar/left-bar.module';
import {IonicModule} from '@ionic/angular';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, AppRoutingModule, WmMapModule, LeftBarModule, IonicModule.forRoot()],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
