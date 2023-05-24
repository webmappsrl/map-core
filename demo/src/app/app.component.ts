import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';
import {of} from 'rxjs';
import {MAP} from '../mocks/conf';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent {
  confMAP$ = of(MAP);
  title = 'demo';
}
