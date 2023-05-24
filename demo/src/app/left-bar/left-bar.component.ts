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
  currentClick = 'map';
  listOfButtons = [
    {route: 'map', label: 'Map'},
    {route: 'track', label: 'Track'},
  ];

  constructor(private _router: Router, private _route: ActivatedRoute) {}

  routeByClick(route: string): void {
    this._router.navigateByUrl(`/${route}`);
    this.currentClick = route;
  }
}
