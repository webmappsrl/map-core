import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

@Component({
  selector: 'wm-map-popover',
  template: `
  <ng-container *ngIf="message$|async as message">
    <ion-card>
      <ion-card-content>
        <div>{{message}} <a (click)="message$.next(null)">X</a></div>
      </ion-card-content>
    </ion-card>
  </ng-container>
`,
  styleUrls: ['popover.map.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmMapPopover {
  message$: BehaviorSubject<string | null> = new BehaviorSubject<string>(null);
}
