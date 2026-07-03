import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {By} from '@angular/platform-browser';
import {mockMapConf} from 'src/const.spec';
import {WmMapComponent, WmMapControls} from 'src/components';
import {WmMapGeojsonDirective} from './geojson.directive';

const mockFeature = {
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: [11.33, 43.77],
  },
  properties: {},
};

@Component({
  standalone: false,
  template: `<wm-map
    wmMapGeojson
    [wmMapConf]="conf"
    [wmMapPadding]="padding"
    [wmMapGeojson]="geojson"
  ></wm-map>`,
})
class TestComponent {
  conf = mockMapConf;
  padding: number[] | null = null;
  geojson: any = null;
}

describe('WmMapGeojsonDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let component: TestComponent;
  let directive: WmMapGeojsonDirective;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WmMapGeojsonDirective, TestComponent, WmMapComponent, WmMapControls],
      imports: [CommonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;

    const directiveEl = fixture.debugElement.query(By.directive(WmMapGeojsonDirective));
    directive = directiveEl.injector.get(WmMapGeojsonDirective);
  });

  it('_buildGeojson(1): should pass wmMapPadding to view.fit() when set', () => {
    component.padding = [20, 20, 20, 20];
    fixture.detectChanges();

    const fitSpy = spyOn(directive.mapCmp.map.getView(), 'fit').and.callThrough();
    const size = directive.mapCmp.map.getSize();

    component.geojson = mockFeature;
    fixture.detectChanges();

    expect(fitSpy).toHaveBeenCalledWith(jasmine.any(Array), {
      duration: 0,
      maxZoom: 17,
      padding: [20, 20, 20, 20],
      size,
    });
  });

  it('_buildGeojson(2): should pass padding as undefined when wmMapPadding is not set', () => {
    fixture.detectChanges();

    const fitSpy = spyOn(directive.mapCmp.map.getView(), 'fit').and.callThrough();
    const size = directive.mapCmp.map.getSize();

    component.geojson = mockFeature;
    fixture.detectChanges();

    expect(fitSpy).toHaveBeenCalledWith(jasmine.any(Array), {
      duration: 0,
      maxZoom: 17,
      padding: undefined,
      size,
    });
  });
});
