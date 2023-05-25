import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {PoisPageComponent} from './pois-page.component';

const routes: Routes = [
  {
    path: '',
    component: PoisPageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PoisPageRoutingModule {}
