import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {CustomTracksPageComponent} from './demo-custom-tracks-page.component';

const routes: Routes = [
  {
    path: '',
    component: CustomTracksPageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CustomTracksPageRoutingModule {}
