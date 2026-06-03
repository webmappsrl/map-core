import {Pipe, PipeTransform} from '@angular/core';
import {ICONTROL, ICONTROLSBUTTON} from '../../types/model';

@Pipe({
  standalone: false,
  name: 'controlIsBtn',
})
export class ControlIsBtn implements PipeTransform {
  transform(btn: ICONTROL[], ...args: unknown[]): ICONTROLSBUTTON[] {
    return btn as ICONTROLSBUTTON[];
  }
}
