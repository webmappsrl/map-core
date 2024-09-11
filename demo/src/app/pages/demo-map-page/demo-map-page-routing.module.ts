import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {MapPageComponent} from './demo-map-page.component';

const routes: Routes = [
  {
    path: '',
    component: MapPageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MapPageRoutingModule {}
