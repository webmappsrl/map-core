import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

const routes: Routes = [
  {
    path: 'map',
    loadChildren: () =>
      import('./pages/demo-map-page/demo-map-page.module').then(m => m.MapPageModule),
  },
  {
    path: 'track',
    loadChildren: () =>
      import('./pages/demo-track-page/demo-track-page.module').then(m => m.TrackPageModule),
  },
  {
    path: 'custom-tracks',
    loadChildren: () =>
      import('./pages/demo-custom-tracks-page/demo-custom-tracks-page.module').then(
        m => m.CustomTracksPageModule,
      ),
  },
  {
    path: 'pois',
    loadChildren: () =>
      import('./pages/demo-pois-page/demo-pois-page.module').then(m => m.PoisPageModule),
  },
  {
    path: 'track-related-pois',
    loadChildren: () =>
      import('./pages/demo-track-related-pois-page/demo-track-related-pois-page.module').then(
        m => m.TrackRelatedPoisPageModule,
      ),
  },
  {
    path: 'overlay',
    loadChildren: () =>
      import('./pages/demo-overlay-page/demo-overlay-page.module').then(m => m.OverlayPageModule),
  },
  {
    path: 'layer',
    loadChildren: () =>
      import('./pages/demo-layer-page/demo-layer-page.module').then(m => m.LayerPageModule),
  },
  {
    path: 'position',
    loadChildren: () =>
      import('./pages/demo-position-page/demo-position-page.module').then(
        m => m.PositionPageModule,
      ),
  },

  {
    path: '',
    redirectTo: 'map',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class DemoRoutingModule {}
