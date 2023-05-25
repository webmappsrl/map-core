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
    path: '',
    redirectTo: 'map',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
