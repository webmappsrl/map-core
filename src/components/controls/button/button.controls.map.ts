import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {ICONTROLSBUTTON, ICONTROLSTITLE} from '../../../types/model';
import {BehaviorSubject} from 'rxjs';

@Component({
  selector: 'wm-map-button-control',
  template: `
    <ng-container *ngIf="control.type==='title'">
        <ion-label class="wm-map-button-control-title">{{translationCallback(control.label)}}</ion-label>    
    </ng-container>
    <div  class="wm-map-button-control-button" *ngIf="control.type === 'button'" (click)="click(control.id)">
        <div  class="wm-map-button-control-icon" [innerHtml]="sanitaze(control.icon)" [ngClass]="[wmMapButtonControlSelected$.value?'selected':'']"></div>
        <span class="wm-map-button-control-label">{{translationCallback(control.label)}}</span>
    </div>
    `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['button.controls.map.scss'],
})
export class WmMapButtonControls {
  @Input('wmMapButtonControlSelect') set selected(val) {
    this.wmMapButtonControlSelected$.next(val);
  }

  @Input('wmMapButtonControl') control: ICONTROLSTITLE | ICONTROLSBUTTON;
  @Input('wmMapTranslationCallback') translationCallback: (any) => string = value => value;
  @Output('wmMapButtonContolClicked')
  clickedEvt: EventEmitter<number> = new EventEmitter<number>();

  wmMapButtonControlSelected$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(public sanitizer: DomSanitizer) {}

  click(id): void {
    this.clickedEvt.emit(id);
  }

  sanitaze(val): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(val);
  }
}
