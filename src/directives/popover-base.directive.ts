import {ComponentRef, Directive, ElementRef, Host, ViewContainerRef} from '@angular/core';
import {WmMapPopover} from '../components';
import {WmMapBaseDirective} from './base.directive';
import {WmMapComponent} from '../components';

@Directive()
export abstract class WmMapPopoverBaseDirective extends WmMapBaseDirective {
  protected _popoverRef: ComponentRef<WmMapPopover> = null;
  protected _popoverMsg: string;

  constructor(
    @Host() mapCmp: WmMapComponent,
    protected _viewContainerRef: ViewContainerRef,
    protected _element: ElementRef,
  ) {
    super(mapCmp);
  }

  protected _initPopover(): void {
    this._popoverRef = this._viewContainerRef.createComponent(WmMapPopover);
    this._popoverRef.setInput('cssClass', 'draw-path-alert');
    const host = this._element.nativeElement;
    host.insertBefore(this._popoverRef.location.nativeElement, host.firstChild);
  }

  protected _updatePopoverMessage(message: string | null): void {
    if (this._popoverRef?.instance) {
      this._popoverRef.instance.message$.next(message);
    }
  }
}
