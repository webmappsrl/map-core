import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

const routes: Routes = [
  {
    path: 'map',
    loadChildren: () => import('./pages/map-page/map-page.module').then(m => m.MapPageModule),
  },
  {
    path: 'track',
    loadChildren: () => import('./pages/track-page/track-page.module').then(m => m.TrackPageModule),
  },
  {
    path: 'custom-tracks',
    loadChildren: () =>
      import('./pages/custom-tracks-page/custom-tracks-page.module').then(
        m => m.CustomTracksPageModule,
      ),
  },
  {
    path: 'pois',
    loadChildren: () => import('./pages/pois-page/pois-page.module').then(m => m.PoisPageModule),
  },
  {
    path: 'track-related-pois',
    loadChildren: () =>
      import('./pages/track-related-pois-page/track-related-pois-page.module').then(
        m => m.TrackRelatedPoisPageModule,
      ),
  },
  {
    path: 'overlay',
    loadChildren: () =>
      import('./pages/overlay-page/overlay-page.module').then(m => m.OverlayPageModule),
  },
  {
    path: 'layer',
    loadChildren: () => import('./pages/layer-page/layer-page.module').then(m => m.LayerPageModule),
  },
  {
    path: 'position',
    loadChildren: () =>
      import('./pages/position-page/position-page.module').then(m => m.PositionPageModule),
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
