import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';

@Component({
  selector: 'wm-btn-center-position',
  templateUrl: './btn-center-position.component.html',
  styleUrls: ['./btn-center-position.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: false,
})
export class BtnCenterPosition {}
