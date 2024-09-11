import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {LayerPageComponent} from './demo-layer-page.component';

const routes: Routes = [
  {
    path: '',
    component: LayerPageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LayerPageRoutingModule {}
