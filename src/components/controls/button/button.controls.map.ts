import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {ICONTROLSBUTTON, ICONTROLSTITLE} from '../../../types/model';
import {BehaviorSubject} from 'rxjs';
import {Store} from '@ngrx/store';
import {setTogglePartition} from '../../../store/map-core.actions';

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
<ng-container *ngIf="control.partitionProperties as partitionProperties">
  <div  class="wm-map-sub-button-control-button" *ngFor="let distinctPropertyLabel of partitionProperties" (click)="subClick(distinctPropertyLabel)">
  <ng-container *ngIf="distinctPropertyLabel.selected;else show">
  <ion-icon name="eye-off-outline" class="wm-map-button-control-icon"  [style.color]="distinctPropertyLabel.strokeColor"></ion-icon>
</ng-container>
  <ng-template #show>
    <ion-icon name="eye-outline" class="wm-map-button-control-icon" [style.color]="distinctPropertyLabel.strokeColor" ></ion-icon>
  </ng-template>
    <span class="wm-map-button-control-label" >{{translationCallback(distinctPropertyLabel.label)}}</span>
  </div>
</ng-container>
    `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['button.controls.map.scss'],
})
export class WmMapButtonControls {
  private _control: ICONTROLSTITLE | ICONTROLSBUTTON;

  @Input('wmMapButtonControl') set control(value: ICONTROLSTITLE | ICONTROLSBUTTON) {
    if (value.type === 'button' && value.partitionProperties != null) {
      const partitionProperties = value.partitionProperties.map(v => ({
        ...v,
        ...{selected: false},
      }));
      this._control = {...value, partitionProperties};
    } else {
      this._control = value;
    }
  }

  @Input('wmMapButtonControlSelect') set selected(val) {
    if (this._control != null && this._control.partitionProperties != null)
      this._control.partitionProperties.forEach(d => {
        d.selected = false;
      });
    this.wmMapButtonControlSelected$.next(val);
    this._cdr.detectChanges();
  }

  get control() {
    return this._control;
  }

  @Input('wmMapTranslationCallback') translationCallback: (any) => string = value => value;
  @Output('wmMapButtonContolClicked')
  clickedEvt: EventEmitter<number> = new EventEmitter<number>();

  wmMapButtonControlSelected$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(
    public sanitizer: DomSanitizer,
    private _cdr: ChangeDetectorRef,
    private _store: Store,
  ) {}

  click(id): void {
    this.clickedEvt.emit(id);
  }

  sanitaze(val): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(val);
  }

  subClick(partitionProperties): void {
    this._store.dispatch(setTogglePartition({toggle: partitionProperties.value}));
    partitionProperties.selected = !partitionProperties.selected;
    this._cdr.detectChanges();
  }
}
