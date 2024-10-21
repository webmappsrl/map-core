import {Component, ViewEncapsulation, ChangeDetectionStrategy} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'left-bar',
  templateUrl: './left-bar.component.html',
  styleUrls: ['./left-bar.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeftBarComponent {
  currentClick = '';
  listOfButtons = [
    {label: 'Component'},
    {route: 'map', label: 'Map'},
    {label: 'Directives'},
    {route: 'track', label: 'Track'},
    {route: 'custom-tracks', label: 'Custom tracks'},
    {route: 'pois', label: 'Pois'},
    {route: 'track-related-pois', label: 'Track related pois'},
    {route: 'layer', label: 'Layer'},
    {route: 'position', label: 'Position'},
  ];

  constructor(private _router: Router, private _route: ActivatedRoute) {}

  routeByClick(route: string): void {
    this._router.navigateByUrl(`/${route}`);
    this.currentClick = route;
  }
}
