import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {MAP} from 'demo/src/mocks/conf';
import {BehaviorSubject, of} from 'rxjs';

@Component({
  selector: 'map-page',
  templateUrl: './map-page.component.html',
  styleUrls: ['./map-page.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPageComponent {
  confMAP$ = of(MAP);
  paddingValue: number[] = [0, 0, 0, 0];
  wmMapPadding$: BehaviorSubject<number[]> = new BehaviorSubject<number[]>([0, 0, 0, 0]);

  addPaddingValue(): void {
    this.wmMapPadding$.next([...this.paddingValue]);
  }
}
