import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {ICONTROLSBUTTON, ICONTROLSTITLE} from '../../../types/model';
import {BehaviorSubject, Observable} from 'rxjs';
import {distinctUntilChanged, filter, map, switchMap} from 'rxjs/operators';
import {Store} from '@ngrx/store';
import {resetTogglePartition, setTogglePartition} from '../../../store/map-core.actions';
import {getIconBlobFromCache, isValidIconBlob, saveIconBlob, withCacheFallback} from '@map-core/utils';

@Component({
  standalone: false,
  selector: 'wm-map-button-control',
  template: `
    <ng-container *ngIf="control.type==='title'">
        <ion-label class="wm-map-button-control-title">{{translationCallback(control.label)}}</ion-label>
    </ng-container>
    <div  class="wm-map-button-control-button" *ngIf="control.type === 'button'" (click)="click(control.id)">
      <img  class="wm-map-button-control-icon"  [src]="iconSrc$|async" *ngIf="control.icon_url as iconUrl;else sanitazeIcon" [ngClass]="[wmMapButtonControlSelected$.value?'selected':'']">
      <ng-template #sanitazeIcon>
        <div  class="wm-map-button-control-icon" [innerHtml]="sanitaze(control.icon)" [ngClass]="[wmMapButtonControlSelected$.value?'selected':'']"></div>
      </ng-template>
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
export class WmMapButtonControls implements OnDestroy {
  private _control: ICONTROLSTITLE | ICONTROLSBUTTON;
  private _iconUrl$ = new BehaviorSubject<string | null>(null);
  private _lastObjectUrl: string | null = null;

  iconSrc$: Observable<string>;

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
    if (value.type === 'button' && value.icon_url != null) {
      this._iconUrl$.next(value.icon_url);
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
    private _http: HttpClient,
  ) {
    this.iconSrc$ = this._iconUrl$.pipe(
      filter(url => url != null),
      distinctUntilChanged(),
      switchMap(url =>
        this._http.get(url, {responseType: 'blob'}).pipe(
          withCacheFallback(
            blob => saveIconBlob(url, blob),
            () => getIconBlobFromCache(url),
            'control icon',
            isValidIconBlob,
          ),
          map(blob => (blob != null ? this._toObjectUrl(blob) : url)),
        ),
      ),
    );
  }

  ngOnDestroy(): void {
    if (this._lastObjectUrl) {
      URL.revokeObjectURL(this._lastObjectUrl);
    }
  }

  private _toObjectUrl(blob: Blob): string {
    if (this._lastObjectUrl) {
      URL.revokeObjectURL(this._lastObjectUrl);
    }
    this._lastObjectUrl = URL.createObjectURL(blob);
    return this._lastObjectUrl;
  }

  click(id): void {
    this._store.dispatch(resetTogglePartition());
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
