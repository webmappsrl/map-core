import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {WmMapModule} from 'src/map-core.module';
import {LeftBarModule} from './left-bar/left-bar.module';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, AppRoutingModule, WmMapModule, LeftBarModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
