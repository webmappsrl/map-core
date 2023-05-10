import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {WmMapPositionDirective} from './position.directive';
import {WmMapComponent, WmMapControls} from '../components';
import {mockMapConf} from 'src/const.spec';
import {SimpleChange} from '@angular/core';
import Map from 'ol/Map';
import {Point} from 'ol/geom';
import View, {FitOptions} from 'ol/View';
import {fromLonLat} from 'ol/proj';
import {circularPolygon, toRadians} from 'src/utils';
import {CommonModule} from '@angular/common';
import {By} from '@angular/platform-browser';
import {Icon, Style} from 'ol/style';
import VectorSource from 'ol/source/Vector';
import {POSITION_ZINDEX} from 'src/readonly';
import VectorLayer from 'ol/layer/Vector';

const mockLocation = {
  accuracy: 10,
  altitude: 100,
  bearing: 0,
  latitude: 45.464664,
  longitude: 9.18854,
};
const mockPoint = new Point([0, 0]);

@Component({
  template: `<wm-map
  wmMapPosition
  [wmMapConf]="conf"
></wm-map>`,
})
class TestComponent {
  conf = mockMapConf;
  currentLocation = {
    accuracy: 10,
    altitude: 100,
    bearing: 0,
    latitude: 45.464664,
    longitude: 9.18854,
  };
}

describe('WmMapPositionDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let wmMapPositionDirective: WmMapPositionDirective;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WmMapPositionDirective, TestComponent, WmMapComponent, WmMapControls],
      imports: [CommonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;

    const directiveEl = fixture.debugElement.query(By.directive(WmMapPositionDirective));
    wmMapPositionDirective = directiveEl.injector.get(WmMapPositionDirective);
    console.log(wmMapPositionDirective);
    fixture.detectChanges();
  });

  it('ngOnChanges(1): should update location when wmMapPositioncurrentLocation input changes', () => {
    wmMapPositionDirective.ngOnChanges({
      wmMapPositioncurrentLocation: new SimpleChange(null, mockLocation, true),
    });
    fixture.detectChanges();
    expect(wmMapPositionDirective['_currentLocation']).toEqual(mockLocation);
  });

  it('ngOnChanges(2): should call _centerPosition when wmMapPositionCenter input changes', () => {
    spyOn<any>(wmMapPositionDirective, '_centerPosition');
    wmMapPositionDirective.ngOnChanges({
      wmMapPositionCenter: new SimpleChange(null, true, true),
    });
    fixture.detectChanges();
    expect(wmMapPositionDirective['_centerPosition']).toHaveBeenCalled();
  });

  it('ngOnChanges(3): should update focus and icon style when wmMapPositionfocus input changes', () => {
    const map = new Map({
      target: null,
      view: new View({center: [0, 0], zoom: 1}),
    });

    const wmMapComponent = new WmMapComponent();
    wmMapComponent.map = map;

    wmMapPositionDirective.mapCmp = wmMapComponent;

    spyOn<any>(wmMapPositionDirective, '_setPositionByLocation');

    const mockSource = new VectorSource({
      features: [wmMapPositionDirective['_featureLocation']],
    });

    const mockLayerLocation = new VectorLayer({
      source: mockSource,
      style: new Style({
        image: wmMapPositionDirective['_iconLocation'],
      }),
      zIndex: POSITION_ZINDEX,
    });

    wmMapPositionDirective['_layerLocation'] = mockLayerLocation;

    wmMapPositionDirective.ngOnChanges({
      wmMapPositioncurrentLocation: new SimpleChange(null, mockLocation, true),
      wmMapPositionfocus: new SimpleChange(null, true, true),
    });
    fixture.detectChanges();

    expect(wmMapPositionDirective['_focus$'].value).toBe(true);
    expect(
      ((wmMapPositionDirective['_layerLocation'].getStyle() as Style).getImage() as Icon).getSrc(),
    ).toEqual(wmMapPositionDirective['_iconLocationArrow'].getSrc());
    expect(wmMapPositionDirective.mapCmp.map.getView().getZoom()).toEqual(2);
    expect(wmMapPositionDirective['_setPositionByLocation']).toHaveBeenCalled();
    expect(mockSource.getFeatures()).toEqual([wmMapPositionDirective['_featureLocation']]);
  });

  it('_centerPosition: should call _updateGeometry and _followLocation when _centerPosition is called', () => {
    const spyUpdateGeometry = spyOn<any>(wmMapPositionDirective, '_updateGeometry');
    wmMapPositionDirective.ngOnChanges({
      wmMapPositioncurrentLocation: new SimpleChange(null, mockLocation, true),
      wmMapPositionCenter: new SimpleChange(null, true, true),
    });
    fixture.detectChanges();
    expect(spyUpdateGeometry).toHaveBeenCalledWith(mockLocation);
  });

  it('_fitView: should call fit with correct arguments when _fitView is called', () => {
    const mockOptions: FitOptions = {
      maxZoom: 10,
      duration: 500,
      size: [100, 100],
    };

    const mockMap = new Map({});
    const mockView = new View();
    spyOn(mockView, 'fit');
    mockMap.setView(mockView);
    wmMapPositionDirective.mapCmp.map = mockMap;

    wmMapPositionDirective['_fitView'](mockPoint);

    expect(mockView.fit).toHaveBeenCalledOnceWith(
      mockPoint,
      jasmine.objectContaining({duration: 500}),
    );

    (mockView.fit as jasmine.Spy).calls.reset();

    wmMapPositionDirective['_fitView'](mockPoint, mockOptions);

    expect(mockView.fit).toHaveBeenCalledOnceWith(mockPoint, mockOptions);
  });

  it('_followLocation: should call _fitView and _rotate with correct arguments when _followLocation is called', () => {
    wmMapPositionDirective['_currentLocation'] = mockLocation;

    spyOn<any>(wmMapPositionDirective, '_fitView');
    spyOn<any>(wmMapPositionDirective, '_rotate');

    wmMapPositionDirective['_followLocation'](mockPoint);

    expect(wmMapPositionDirective['_fitView']).toHaveBeenCalledWith(mockPoint);

    expect(wmMapPositionDirective['_rotate']).toHaveBeenCalledWith(
      -wmMapPositionDirective['_runningAvg'](mockLocation.bearing),
      500,
    );
  });

  it('_rotate: should call animate with correct arguments when _rotate is called', () => {
    const mockBearing = 0.5;
    const mockDuration = 500;

    const mockMap = new Map({});
    const mockView = new View();
    spyOn(mockView, 'animate');
    mockMap.setView(mockView);
    wmMapPositionDirective.mapCmp.map = mockMap;

    wmMapPositionDirective['_rotate'](mockBearing, mockDuration);

    expect(mockView.animate).toHaveBeenCalledWith({
      rotation: mockBearing,
      duration: mockDuration,
    });

    wmMapPositionDirective['_rotate'](mockBearing);

    expect(mockView.animate).toHaveBeenCalledWith({
      rotation: mockBearing,
      duration: 0,
    });
  });

  it('_runningAvg: should calculate the running average of bearings in radians', () => {
    const expect1 = 0;
    const expect2 = 0.39269908169872414;
    const expect3 = 0.7853981633974483;
    const expect4 = 1.1780972450961724;

    const test1 = wmMapPositionDirective['_runningAvg'](0);
    const test2 = wmMapPositionDirective['_runningAvg'](45);
    const test3 = wmMapPositionDirective['_runningAvg'](90);
    const test4 = wmMapPositionDirective['_runningAvg'](135);
    const test5 = wmMapPositionDirective['_runningAvg'](-45);

    expect(test1).toBeCloseTo(expect1);
    expect(test2).toBeCloseTo(expect2);
    expect(test3).toBeCloseTo(expect3);
    expect(test4).toBeCloseTo(expect4);
    expect(test5).toBeCloseTo(expect1);
  });

  it('_setPositionByLocation: should call _updateGeometry and _followLocation with correct parameters', () => {
    spyOn<any>(wmMapPositionDirective, '_updateGeometry').and.returnValue(mockPoint);
    spyOn<any>(wmMapPositionDirective, '_followLocation');

    wmMapPositionDirective['_focus$'].next(true);

    wmMapPositionDirective['_setPositionByLocation'](mockLocation);

    expect(wmMapPositionDirective['_updateGeometry']).toHaveBeenCalledWith(mockLocation);
    expect(wmMapPositionDirective['_followLocation']).toHaveBeenCalledWith(mockPoint);
  });

  it('_setPositionByLocation: should call _updateGeometry but not _followLocation when _focus$.value is false', () => {
    spyOn<any>(wmMapPositionDirective, '_updateGeometry').and.returnValue(mockPoint);
    spyOn<any>(wmMapPositionDirective, '_followLocation');

    wmMapPositionDirective['_focus$'].next(false);

    wmMapPositionDirective['_setPositionByLocation'](mockLocation);

    expect(wmMapPositionDirective['_updateGeometry']).toHaveBeenCalledWith(mockLocation);
    expect(wmMapPositionDirective['_followLocation']).not.toHaveBeenCalled();
  });

  it('_updateGeometry: should update the geometry of _featureLocation and _featureAccuracy', () => {
    const expectedPoint = new Point(fromLonLat([mockLocation.longitude, mockLocation.latitude]));
    const expectedGeometry = circularPolygon(
      [mockLocation.longitude, mockLocation.latitude],
      mockLocation.accuracy,
    );

    const setGeometryLocationSpy = spyOn(wmMapPositionDirective['_featureLocation'], 'setGeometry');
    const setGeometryAccuracySpy = spyOn(wmMapPositionDirective['_featureAccuracy'], 'setGeometry');

    const resultPoint = wmMapPositionDirective['_updateGeometry'](mockLocation);

    expect(setGeometryLocationSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        flatCoordinates: expectedPoint.getFlatCoordinates(),
      }),
    );
    expect(setGeometryAccuracySpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        flatCoordinates: expectedGeometry.getFlatCoordinates(),
      }),
    );

    expect(resultPoint.getCoordinates()).toEqual(expectedPoint.getCoordinates());
  });
});
