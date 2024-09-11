import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {TrackRelatedPoisPageComponent} from './demo-track-related-pois-page.component';

const routes: Routes = [
  {
    path: '',
    component: TrackRelatedPoisPageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TrackRelatedPoisPageRoutingModule {}
