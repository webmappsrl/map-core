import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {TrackPageComponent} from './track-page.component';

const routes: Routes = [
  {
    path: '',
    component: TrackPageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TrackPageRoutingModule {}
