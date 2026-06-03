import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from '@angular/core';

@Component({
  selector: 'wm-btn-orientation',
  templateUrl: './btn-orientation.component.html',
  styleUrls: ['./btn-orientation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: false,
})
export class BtnOrientation {
  @Input() degrees: number = 0;
}
