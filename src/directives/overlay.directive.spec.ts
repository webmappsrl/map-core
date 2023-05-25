import {BehaviorSubject} from 'rxjs';
import {Component} from '@angular/core';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import {Fill, Stroke, Style} from 'ol/style';
import {WmMapComponent, WmMapControls} from '../components';
import {mockMapConf} from 'src/const.spec';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {WmMapOverlayDirective} from './overlay.directive';
import {CommonModule} from '@angular/common';
import {By} from '@angular/platform-browser';

@Component({
  template: `<wm-map
      wmMapOverlay
      [wmMapConf]="conf"
    ></wm-map>`,
})
class TestComponent {
  conf = mockMapConf;
}

describe('WmMapOverlayDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let wmMapOverlayDirective: WmMapOverlayDirective;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WmMapOverlayDirective, TestComponent, WmMapComponent, WmMapControls],
      imports: [CommonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;

    const directiveEl = fixture.debugElement.query(By.directive(WmMapOverlayDirective));
    wmMapOverlayDirective = directiveEl.injector.get(WmMapOverlayDirective);
    fixture.detectChanges();
  });

  it('should create an instance of WmMapOverlayDirective and initialize _enabled$ and _url$ as BehaviorSubject', () => {
    expect(wmMapOverlayDirective).toBeTruthy();
    expect(wmMapOverlayDirective['_enabled$']).toBeInstanceOf(BehaviorSubject);
    expect(wmMapOverlayDirective['_url$']).toBeInstanceOf(BehaviorSubject);
  });

  it('constructor(1): should call mapCmp.map.addLayer when _enabled$ is true and mapCmp.isInit$ is true', done => {
    const addLayerSpy = spyOn(wmMapOverlayDirective.mapCmp.map, 'addLayer');

    wmMapOverlayDirective.enabled = true;
    wmMapOverlayDirective.mapCmp.isInit$.next(true);

    wmMapOverlayDirective.mapCmp.map.once('precompose', () => {
      expect(addLayerSpy).toHaveBeenCalled();
      done();
    });

    wmMapOverlayDirective.mapCmp.map.dispatchEvent('precompose');
  });

  it('constructor(2): should not call mapCmp.map.addLayer when _enabled$ is false', done => {
    const addLayerSpy = spyOn(wmMapOverlayDirective.mapCmp.map, 'addLayer');

    wmMapOverlayDirective.enabled = false;
    wmMapOverlayDirective.mapCmp.isInit$.next(true);

    wmMapOverlayDirective.mapCmp.map.once('precompose', () => {
      expect(addLayerSpy).not.toHaveBeenCalled();
      done();
    });

    wmMapOverlayDirective.mapCmp.map.dispatchEvent('precompose');
  });

  it('constructor(3): should add a layer with the correct properties to the map when _enabled$ is true and mapCmp.isInit$ is true', () => {
    const testUrl = 'https://geohub.webmapp.it/api/taxonomy/where/geojson/13';
    wmMapOverlayDirective.url = testUrl;

    const expectedLayer = new VectorLayer({
      source: new VectorSource({
        format: new GeoJSON(),
        url: testUrl,
      }),
      style: new Style({
        fill: new Fill({
          color: 'rgba(255, 0, 0, 0)',
        }),
        stroke: new Stroke({
          color: 'rgba(0, 0, 0, 1)',
          width: 3,
        }),
      }),
      zIndex: 1,
    });
    expectedLayer.setOpacity(0.8);

    // Act
    wmMapOverlayDirective.enabled = true;
    wmMapOverlayDirective.mapCmp.isInit$.next(true);

    // Assertion is inside the callback of precompose event because addLayer is called inside the event handler.
    wmMapOverlayDirective.mapCmp.map.once('precompose', () => {
      const vectorLayer = wmMapOverlayDirective['_overlayLayer'];

      expect(vectorLayer).toBeDefined();
      expect((vectorLayer.getSource() as VectorSource).getUrl()).toEqual(
        expectedLayer.getSource().getUrl(),
      );
      expect(vectorLayer.getOpacity()).toEqual(expectedLayer.getOpacity());
      expect((vectorLayer.getStyle() as Style).getFill().getColor()).toEqual(
        (expectedLayer.getStyle() as Style).getFill().getColor(),
      );
      expect((vectorLayer.getStyle() as Style).getStroke().getColor()).toEqual(
        (expectedLayer.getStyle() as Style).getStroke().getColor(),
      );
      expect((vectorLayer.getStyle() as Style).getStroke().getWidth()).toEqual(
        (expectedLayer.getStyle() as Style).getStroke().getWidth(),
      );
    });

    // Need to dispatch precompose event because addLayer is called inside the event handler.
    wmMapOverlayDirective.mapCmp.map.dispatchEvent('precompose');
  });
});
