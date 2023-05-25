import {Component} from '@angular/core';
import {ToastController} from '@ionic/angular';
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import SimpleGeometry from 'ol/geom/SimpleGeometry';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {coordsToLonLat} from '../../src/utils/ol';
import {WmMapComponent, WmMapControls} from '../components';
import {mockMapConf, mockTrack} from 'src/const.spec';
import {wmMapCustomTrackDrawTrackDirective} from './custom-tracks.draw.directive';
import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {By} from '@angular/platform-browser';

@Component({
  template: `<wm-map
        wmMapCustomTrackDrawTrack
        [wmMapConf]="conf"
      ></wm-map>`,
})
class TestComponent {
  conf = mockMapConf;
}

describe('wmMapCustomTrackDrawTrackDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let wmMapCustomTrackDrawTrack: wmMapCustomTrackDrawTrackDirective;
  let toastController: ToastController;
  let toastSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        wmMapCustomTrackDrawTrackDirective,
        TestComponent,
        WmMapComponent,
        WmMapControls,
      ],
      imports: [CommonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;

    const directiveEl = fixture.debugElement.query(
      By.directive(wmMapCustomTrackDrawTrackDirective),
    );
    wmMapCustomTrackDrawTrack = directiveEl.injector.get(wmMapCustomTrackDrawTrackDirective);
    wmMapCustomTrackDrawTrack['_customTrackLayer'] = new VectorLayer({
      source: new VectorSource(),
    });
    wmMapCustomTrackDrawTrack['_customPoiLayer'] = new VectorLayer({
      source: new VectorSource(),
    });

    toastController = TestBed.inject(ToastController);
    toastSpy = spyOn(toastController, 'create').and.callFake(() =>
      Promise.resolve({
        present: () => Promise.resolve(),
      } as HTMLIonToastElement),
    );
    fixture.detectChanges();
  });

  it('_clear: should clear the custom track layer source, the custom Poi layer source and the points array', () => {
    const mockFeature = new Feature();
    wmMapCustomTrackDrawTrack['_customTrackLayer'].getSource().addFeature(mockFeature);
    wmMapCustomTrackDrawTrack['_customPoiLayer'].getSource().addFeature(mockFeature);
    wmMapCustomTrackDrawTrack['_points'].push([0, 0]);
    wmMapCustomTrackDrawTrack['_clear']();

    expect(wmMapCustomTrackDrawTrack['_customTrackLayer'].getSource().getFeatures().length).toBe(0);
    expect(wmMapCustomTrackDrawTrack['_customPoiLayer'].getSource().getFeatures().length).toBe(0);
    expect(wmMapCustomTrackDrawTrack['_points'].length).toBe(0);
  });

  it('_message: should create a toast with the correct parameters', async () => {
    const message = 'Test message';

    await wmMapCustomTrackDrawTrack['_message'](message);

    expect(toastSpy).toHaveBeenCalledWith({
      message: message,
      duration: 1000,
    });
  });

  it('_redrawPoints: should redraw points on the custom Poi layer', () => {
    const mockPoints = [
      [1, 2],
      [3, 4],
      [5, 6],
    ];
    wmMapCustomTrackDrawTrack['_points'] = mockPoints;
    wmMapCustomTrackDrawTrack['_redrawPoints']();
    const customPoiSource = wmMapCustomTrackDrawTrack['_customPoiSource'];
    const features = customPoiSource.getFeatures();

    for (let i = 0; i < mockPoints.length; i++) {
      expect(mockPoints[i]).toEqual(
        coordsToLonLat((features[i].getGeometry() as SimpleGeometry).getCoordinates()),
      );
    }
  });

  it('_updateTrack: should update a track', () => {
    wmMapCustomTrackDrawTrack['_customTrack'] = mockTrack;
    wmMapCustomTrackDrawTrack['_updateTrack']();
    const customTrackLayer = wmMapCustomTrackDrawTrack['_customTrackLayer'];
    const customTrackSource = customTrackLayer.getSource();
    const feature = customTrackSource.getFeatures()[0];
    const coordinates = (feature.getGeometry() as SimpleGeometry).getCoordinates();
    const mockTrackCoordinates = mockTrack.geometry.coordinates;
    for (let i = 0; i < coordinates.length; i++) {
      const res = coordsToLonLat(coordinates[i]).map(coord => {
        return +coord.toFixed(6);
      });
      expect(res).toEqual(mockTrackCoordinates[i]);
    }
  });

  it('_initializeCustomTrackLayer: should initialize the custom track layer correctly', () => {
    wmMapCustomTrackDrawTrack['_customTrackLayer'] = null;
    wmMapCustomTrackDrawTrack['_customPoiLayer'] = null;
    const mockMap = wmMapCustomTrackDrawTrack.mapCmp.map;
    spyOn(mockMap, 'addLayer').and.callThrough();
    spyOn(mockMap, 'getRenderer').and.callThrough();

    wmMapCustomTrackDrawTrack['_initializeCustomTrackLayer']();

    expect(wmMapCustomTrackDrawTrack['_customTrackLayer']).toBeInstanceOf(VectorLayer);
    expect(wmMapCustomTrackDrawTrack['_customTrackLayer'].getZIndex()).toBe(1000);
    expect(wmMapCustomTrackDrawTrack['_customTrackLayer'].getSource()).toBeInstanceOf(VectorSource);
    expect(wmMapCustomTrackDrawTrack['_customTrackLayer'].getSource().getFormat()).toBeInstanceOf(
      GeoJSON,
    );
    expect(wmMapCustomTrackDrawTrack['_customPoiLayer']).toBeInstanceOf(VectorLayer);
    expect(wmMapCustomTrackDrawTrack['_customPoiLayer'].getZIndex()).toBe(1100);
    expect(mockMap.addLayer).toHaveBeenCalledWith(wmMapCustomTrackDrawTrack['_customTrackLayer']);
    expect(mockMap.addLayer).toHaveBeenCalledWith(wmMapCustomTrackDrawTrack['_customPoiLayer']);
    expect(mockMap.getRenderer).toHaveBeenCalled();
  });
  //TODO test constructor and _init
});
