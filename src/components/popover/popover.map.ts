import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

@Component({
  selector: 'wm-map-popover',
  template: `
  <ng-container *ngIf="message$|async as message">
    <ion-card [ngClass]="cssClass">
      <ion-card-content>
        <span class="message"[innerHTML]="message"></span> 
        <a (click)="message$.next(null)">X</a>
      </ion-card-content>
    </ion-card>
  </ng-container>
`,
  styleUrls: ['popover.map.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WmMapPopover {
  @Input() cssClass;

  message$: BehaviorSubject<string | null> = new BehaviorSubject<string>(null);
}
