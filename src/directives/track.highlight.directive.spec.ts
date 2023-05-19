import {ComponentFixture, TestBed, fakeAsync, tick} from '@angular/core/testing';
import {WmMapTrackHighLightDirective} from './track.highlight.directive';
import {mockMapConf} from 'src/const.spec';
import {Component, SimpleChange, SimpleChanges} from '@angular/core';
import {WmMapComponent, WmMapControls} from 'src/components';
import {CommonModule} from '@angular/common';
import {By} from '@angular/platform-browser';
import VectorLayer from 'ol/layer/Vector';

@Component({
  template: `<wm-map
          wmMapTrackHighLight
          [wmMapConf]="conf"
        ></wm-map>`,
})
class TestComponent {
  conf = mockMapConf;
}

describe('WmMapTrackHighLightDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let wmMapTrackHighLightDirective: WmMapTrackHighLightDirective;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      declarations: [WmMapTrackHighLightDirective, TestComponent, WmMapComponent, WmMapControls],
      imports: [CommonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;

    const directiveEl = fixture.debugElement.query(By.directive(WmMapTrackHighLightDirective));
    wmMapTrackHighLightDirective = directiveEl.injector.get(WmMapTrackHighLightDirective);

    await wmMapTrackHighLightDirective.mapCmp.isInit$; //initialize map for all tests
    fixture.detectChanges();
  });

  it('_init: should initialize map, add highlight layer and add pointermove event', fakeAsync(() => {
    const addLayerSpy = spyOn(wmMapTrackHighLightDirective.mapCmp.map, 'addLayer');
    const onSpy = spyOn(wmMapTrackHighLightDirective.mapCmp.map, 'on').and.callThrough();

    wmMapTrackHighLightDirective.ngOnChanges({
      wmMapConf: new SimpleChange(null, mockMapConf, true),
    });
    fixture.detectChanges();

    expect(addLayerSpy).toHaveBeenCalled();
    expect(onSpy).toHaveBeenCalledWith('pointermove' as any, jasmine.any(Function));
    expect(wmMapTrackHighLightDirective['_mapIsInit']).toEqual(true);

    // Verify that the added layer is of type VectorLayer
    const addedLayer = addLayerSpy.calls.mostRecent().args[0];
    expect(addedLayer).toBeInstanceOf(VectorLayer);

    // Test the logic of the 'pointermove' event
    const callback = onSpy.calls.mostRecent().args[1]; // Take the 'pointermove' event callback
    const fakeEvent: any = {pixel: [0, 0]};
    const renderFeature = {
      getType: () => 'Point',
      getId: () => 'testId',
      getProperties: () => ({id: 1}),
      getFlatCoordinates: () => [0, 0],
    };
    const vectorTileLayer = {getOpacity: () => 1, getProperties: () => ({high: true})};

    wmMapTrackHighLightDirective.mapCmp.map.forEachFeatureAtPixel = jasmine
      .createSpy()
      .and.callFake((_, callback) => {
        return callback(renderFeature, vectorTileLayer);
      });

    callback(fakeEvent);
    tick();

    expect(wmMapTrackHighLightDirective.mapCmp.map.getViewport().style.cursor).toEqual('pointer');

    // reset the mock
    wmMapTrackHighLightDirective.mapCmp.map.forEachFeatureAtPixel = jasmine
      .createSpy()
      .and.returnValue(false);

    callback(fakeEvent);
    tick();

    expect(wmMapTrackHighLightDirective.mapCmp.map.getViewport().style.cursor).toEqual('');
  }));
});
