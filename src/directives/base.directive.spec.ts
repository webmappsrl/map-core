import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {mockMapConf} from 'src/const.spec';
import {WmMapBaseDirective} from './base.directive';
import {CommonModule} from '@angular/common';
import {WmMapComponent, WmMapControls} from 'src/components';
import {By} from '@angular/platform-browser';
import {Extent} from 'ol/extent';
import SimpleGeometry from 'ol/geom/SimpleGeometry';
import {FitOptions} from 'ol/View';
import {extentFromLonLat} from '../../src/utils';

const mockGeometryOrExtent = new SimpleGeometry();
const mockExtent: Extent = [0, 0, 100, 100];
const mockFitOptions: FitOptions = {
  duration: 500,
  padding: [10, 20, 30, 40],
  minResolution: 0,
  nearest: false,
  maxZoom: 10,
};

@Component({
  template: `<wm-map
    wmMapBase
    [wmMapConf]="conf"
  ></wm-map>`,
})
class TestComponent {
  conf = mockMapConf;
}

describe('WmMapBaseDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let wmMapBaseDirective: WmMapBaseDirective;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WmMapBaseDirective, TestComponent, WmMapComponent, WmMapControls],
      imports: [CommonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;

    const directiveEl = fixture.debugElement.query(By.directive(WmMapBaseDirective));
    wmMapBaseDirective = directiveEl.injector.get(WmMapBaseDirective);
    fixture.detectChanges();
  });

  it('fitView(1): should call fitView correctly', () => {
    const fitSpy = spyOn(wmMapBaseDirective.mapCmp.map.getView(), 'fit');

    wmMapBaseDirective.fitView(mockGeometryOrExtent, mockFitOptions);

    wmMapBaseDirective.mapCmp.map.dispatchEvent('rendercomplete');

    expect(fitSpy).toHaveBeenCalledWith(mockGeometryOrExtent, mockFitOptions);
  });

  it('fitView(2): should correctly work when geometryOrExtent is of type Extent', () => {
    const fitSpy = spyOn(wmMapBaseDirective.mapCmp.map.getView(), 'fit');

    wmMapBaseDirective.fitView(mockExtent, mockFitOptions);

    wmMapBaseDirective.mapCmp.map.dispatchEvent('rendercomplete');

    expect(fitSpy).toHaveBeenCalledWith(mockExtent, mockFitOptions);
  });

  it('fitView(3): should set default values for duration and padding if optOptions is not provided', () => {
    const view = wmMapBaseDirective.mapCmp.map.getView();

    spyOn(wmMapBaseDirective.mapCmp.map, 'getView').and.returnValue(view);

    const fitSpy = spyOn(view, 'fit');

    wmMapBaseDirective.fitView(mockGeometryOrExtent);

    wmMapBaseDirective.mapCmp.map.dispatchEvent('rendercomplete');

    expect(fitSpy).toHaveBeenCalledWith(mockGeometryOrExtent, {
      duration: 500,
      padding: wmMapBaseDirective.wmMapPadding ?? undefined,
    });
  });

  it('fitView(4): should use the provided optOptions for fitting', () => {
    const view = wmMapBaseDirective.mapCmp.map.getView();

    spyOn(wmMapBaseDirective.mapCmp.map, 'getView').and.returnValue(view);

    const fitSpy = spyOn(view, 'fit');

    wmMapBaseDirective.fitView(mockGeometryOrExtent, mockFitOptions);

    wmMapBaseDirective.mapCmp.map.dispatchEvent('rendercomplete');

    expect(fitSpy).toHaveBeenCalledWith(mockGeometryOrExtent, mockFitOptions);
  });

  it('fitView(4): should not call fit if view is null', () => {
    const fitSpy = spyOn(wmMapBaseDirective.mapCmp.map.getView(), 'fit');

    spyOn(wmMapBaseDirective.mapCmp.map, 'getView').and.returnValue(null);

    wmMapBaseDirective.fitView(mockGeometryOrExtent, mockFitOptions);

    wmMapBaseDirective.mapCmp.map.dispatchEvent('rendercomplete');

    expect(fitSpy).not.toHaveBeenCalled();
  });

  it('fitView(5): should handle when mapCmp.map is null', () => {
    wmMapBaseDirective.mapCmp.map = null;

    expect(() => {
      wmMapBaseDirective.fitView(mockGeometryOrExtent, mockFitOptions);
    }).not.toThrow();
  });

  it('fitView(6): should handle when mapCmp.map.getView() is null', () => {
    spyOn(wmMapBaseDirective.mapCmp.map, 'getView').and.returnValue(null);

    expect(() => {
      wmMapBaseDirective.fitView(mockGeometryOrExtent, mockFitOptions);
    }).not.toThrow();
  });

  it('fitViewFromLonLat(1): should call fitViewFromLonLat correctly', () => {
    const fitSpy = spyOn(wmMapBaseDirective.mapCmp.map.getView(), 'fit');

    const transformedGeometryOrExtent = extentFromLonLat(mockGeometryOrExtent as any);

    wmMapBaseDirective.fitViewFromLonLat(mockGeometryOrExtent, mockFitOptions);

    wmMapBaseDirective.mapCmp.map.dispatchEvent('rendercomplete');

    expect(fitSpy).toHaveBeenCalledWith(transformedGeometryOrExtent, mockFitOptions);
  });

  it('fitViewFromLonLat(2): should correctly work when geometryOrExtent is of type Extent', () => {
    const fitSpy = spyOn<any>(wmMapBaseDirective.mapCmp.map.getView(), 'fit');

    const transformedExtent = extentFromLonLat(mockExtent as any);

    wmMapBaseDirective.fitViewFromLonLat(mockExtent, mockFitOptions);

    wmMapBaseDirective.mapCmp.map.dispatchEvent('rendercomplete');

    expect(fitSpy).toHaveBeenCalledWith(transformedExtent, mockFitOptions);
  });

  it('fitViewFromLonLat(3): should set default values for padding and maxZoom if optOptions is not provided', () => {
    const view = wmMapBaseDirective.mapCmp.map.getView();

    spyOn(wmMapBaseDirective.mapCmp.map, 'getView').and.returnValue(view);

    const fitSpy = spyOn(view, 'fit');

    const transformedGeometryOrExtent = extentFromLonLat(mockGeometryOrExtent as any);

    wmMapBaseDirective.fitViewFromLonLat(mockGeometryOrExtent);

    wmMapBaseDirective.mapCmp.map.dispatchEvent('rendercomplete');

    expect(fitSpy).toHaveBeenCalledWith(transformedGeometryOrExtent, {
      padding: wmMapBaseDirective.wmMapPadding ?? undefined,
      maxZoom: wmMapBaseDirective.wmMapConf.defZoom,
    });
  });

  it('fitViewFromLonLat(4): should use the provided optOptions for fitting', () => {
    const view = wmMapBaseDirective.mapCmp.map.getView();

    spyOn(wmMapBaseDirective.mapCmp.map, 'getView').and.returnValue(view);

    const fitSpy = spyOn(view, 'fit');

    const transformedGeometryOrExtent = extentFromLonLat(mockGeometryOrExtent as any);

    wmMapBaseDirective.fitViewFromLonLat(mockGeometryOrExtent, mockFitOptions);

    wmMapBaseDirective.mapCmp.map.dispatchEvent('rendercomplete');

    expect(fitSpy).toHaveBeenCalledWith(transformedGeometryOrExtent, mockFitOptions);
  });

  it('fitViewFromLonLat(5): should not call fit if view is null', () => {
    const fitSpy = spyOn(wmMapBaseDirective.mapCmp.map.getView(), 'fit');

    spyOn(wmMapBaseDirective.mapCmp.map, 'getView').and.returnValue(null);

    wmMapBaseDirective.fitViewFromLonLat(mockGeometryOrExtent, mockFitOptions);

    wmMapBaseDirective.mapCmp.map.dispatchEvent('rendercomplete');

    expect(fitSpy).not.toHaveBeenCalled();
  });

  it('fitViewFromLonLat(6): should handle when mapCmp.map is null', () => {
    wmMapBaseDirective.mapCmp.map = null;

    expect(() => {
      wmMapBaseDirective.fitViewFromLonLat(mockGeometryOrExtent, mockFitOptions);
    }).not.toThrow();
  });

  it('fitViewFromLonLat(7): should handle when mapCmp.map.getView() is null', () => {
    spyOn(wmMapBaseDirective.mapCmp.map, 'getView').and.returnValue(null);

    expect(() => {
      wmMapBaseDirective.fitViewFromLonLat(mockGeometryOrExtent, mockFitOptions);
    }).not.toThrow();
  });
});
