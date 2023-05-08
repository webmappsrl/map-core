import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WmMapPositionDirective } from './position.directive';
import { WmMapComponent } from '../components';
import { mockMapConf } from 'src/const.spec';
import { SimpleChange } from '@angular/core';
import Map from 'ol/Map';
import { Point } from 'ol/geom';
import View, { FitOptions } from 'ol/View';
import { fromLonLat } from 'ol/proj';
import { circularPolygon } from 'src/utils';

@Component({
  template: `<wm-map
  [wmMapConf]="conf"
  wmMapPosition
  [wmMapPositioncurrentLocation]="currentLocation"
  [wmMapPositionCenter]="center"
  [wmMapPositionfocus]="focus"
></wm-map>`
})
class TestComponent {
  center = [0, 0];
  conf = mockMapConf;
  currentLocation = {
    accuracy: 10,
    altitude: 100,
    bearing: 0,
    latitude: 45.464664,
    longitude: 9.18854
  };
  focus = true;
}

describe('WmMapPositionDirective;', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let wmMapPosition: WmMapPositionDirective;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WmMapPositionDirective, TestComponent, WmMapComponent]
    });

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;

    const wmMapComponent = fixture.debugElement.children[0].componentInstance;
    wmMapPosition = new WmMapPositionDirective(wmMapComponent);
  });

  it('ngOnChanges: should update location when wmMapPositioncurrentLocation input changes', () => {
    const wmMapPositionAny = wmMapPosition as any;
    spyOn(wmMapPositionAny, '_setPositionByLocation');

    const mockLocation = {
      accuracy: 10,
      altitude: 100,
      bearing: 0,
      latitude: 45.464664,
      longitude: 9.18854
    };

    wmMapPosition.ngOnChanges({
      wmMapPositioncurrentLocation: new SimpleChange(null, mockLocation, true)
    });

    expect(wmMapPositionAny['_currentLocation']).toEqual(mockLocation);
    expect(wmMapPositionAny['_setPositionByLocation']).toHaveBeenCalledWith(
      mockLocation
    );
  });

  it('ngOnChanges: should call _centerPosition when wmMapPositionCenter input changes', () => {
    const wmMapPositionAny = wmMapPosition as any;
    spyOn(wmMapPositionAny, '_centerPosition');
    wmMapPosition.ngOnChanges({
      wmMapPositionCenter: new SimpleChange(null, true, true)
    });

    expect(wmMapPosition['_centerPosition']).toHaveBeenCalled();
  });

  it('ngOnChanges: should update focus and icon style when wmMapPositionfocus input changes', () => {
    const mockMap = jasmine.createSpyObj('Map', ['getView', 'render']);
    mockMap.getView.and.returnValue({
      getZoom: jasmine.createSpy('getZoom').and.returnValue(10),
      setZoom: jasmine.createSpy('setZoom')
    });

    const wmMapPositionAny = wmMapPosition as any;
    spyOn(wmMapPositionAny, '_setPositionByLocation');
    const mockSource = {
      changed: jasmine.createSpy('changed')
    };
    wmMapPositionAny._layerLocation = {
      setStyle: jasmine.createSpy('setStyle'),
      getSource: jasmine.createSpy('getSource').and.returnValue(mockSource)
    };

    wmMapPosition.mapCmp.map = mockMap;

    wmMapPosition.ngOnChanges({
      wmMapPositionfocus: new SimpleChange(null, true, true)
    });

    expect(wmMapPosition['_focus$'].value).toBe(true);
    expect(wmMapPosition['_layerLocation'].setStyle).toHaveBeenCalled();
    expect(wmMapPosition.mapCmp.map.getView().setZoom).toHaveBeenCalled();
  });

  it('_centerPosition: should call _updateGeometry and _followLocation when _centerPosition is called', () => {
    const wmMapPositionAny = wmMapPosition as any;

    const mockPoint = new Point([0, 0]);
    spyOn(wmMapPositionAny, '_updateGeometry').and.returnValue(mockPoint);
    spyOn(wmMapPositionAny, '_followLocation');

    wmMapPositionAny._centerPosition();

    expect(wmMapPositionAny._updateGeometry).toHaveBeenCalledWith(
      wmMapPositionAny._currentLocation
    );
    expect(wmMapPositionAny._followLocation).toHaveBeenCalledWith(mockPoint);
  });

  it('should convert degrees to radians correctly', () => {
    const testCases = [
      { degrees: 0, radians: 0 },
      { degrees: 45, radians: Math.PI / 4 },
      { degrees: 90, radians: Math.PI / 2 },
      { degrees: 180, radians: Math.PI },
      { degrees: 360, radians: 2 * Math.PI }
    ];

    for (const testCase of testCases) {
      const result = wmMapPosition['_degreesToRadians'](testCase.degrees);
      expect(result).toBeCloseTo(testCase.radians, 10);
    }
  });

  it('_fitView: should call fit with correct arguments when _fitView is called', () => {
    const mockPoint = new Point([0, 0]);
    const mockOptions: FitOptions = {
      maxZoom: 10,
      duration: 500,
      size: [100, 100]
    };

    const mockMap = new Map({});
    const mockView = new View();
    spyOn(mockView, 'fit');
    mockMap.setView(mockView);
    wmMapPosition.mapCmp.map = mockMap;

    wmMapPosition['_fitView'](mockPoint);

    expect(mockView.fit).toHaveBeenCalledOnceWith(
      mockPoint,
      jasmine.objectContaining({ duration: 500 })
    );

    (mockView.fit as jasmine.Spy).calls.reset();

    wmMapPosition['_fitView'](mockPoint, mockOptions);

    expect(mockView.fit).toHaveBeenCalledOnceWith(mockPoint, mockOptions);
    expect(mockView.fit).toHaveBeenCalledOnceWith(mockPoint, mockOptions);
  });

  it('_followLocation: should call _fitView and _rotate with correct arguments when _followLocation is called', () => {
    const mockPoint = new Point([0, 0]);
    const mockCurrentLocation = {
      accuracy: 10,
      altitude: 100,
      bearing: 0,
      latitude: 45.464664,
      longitude: 9.18854
    };
    wmMapPosition['_currentLocation'] = mockCurrentLocation;

    spyOn(wmMapPosition as any, '_fitView');
    spyOn(wmMapPosition as any, '_rotate');

    wmMapPosition['_followLocation'](mockPoint);

    expect(wmMapPosition['_fitView']).toHaveBeenCalledWith(mockPoint);

    expect(wmMapPosition['_rotate']).toHaveBeenCalledWith(
      -wmMapPosition['_runningAvg'](mockCurrentLocation.bearing),
      500
    );
  });

  it('_rotate: should call animate with correct arguments when _rotate is called', () => {
    const mockBearing = 0.5;
    const mockDuration = 500;

    const mockMap = new Map({});
    const mockView = new View();
    spyOn(mockView, 'animate');
    mockMap.setView(mockView);
    wmMapPosition.mapCmp.map = mockMap;

    wmMapPosition['_rotate'](mockBearing, mockDuration);

    expect(mockView.animate).toHaveBeenCalledWith({
      rotation: mockBearing,
      duration: mockDuration
    });

    wmMapPosition['_rotate'](mockBearing);

    expect(mockView.animate).toHaveBeenCalledWith({
      rotation: mockBearing,
      duration: 0
    });
  });

  xit(
    '_runningAvg: should calculate the running average of bearings in radians',
    () => {
      const bearings = [0, 90, 180, 270];
      const radianBearings = bearings.map(b =>
        wmMapPosition['_degreesToRadians'](b)
      );

      const expectedResult = [
        radianBearings[0],
        (radianBearings[0] + radianBearings[1]) / 2,
        (radianBearings[0] + radianBearings[1] + radianBearings[2]) / 3,
        (radianBearings[1] + radianBearings[2] + radianBearings[3]) / 3
      ];

      bearings.forEach((bearing, index) => {
        // Reset _lastBearings before each test case
        wmMapPosition['_lastBearings'] = [];
        for (let i = 0; i <= index; i++) {
          wmMapPosition['_runningAvg'](bearings[i]);
        }
        const result = wmMapPosition['_runningAvg'](bearing);
        expect(result).toBeCloseTo(expectedResult[index], 5);
      });

      // Test with a non-number bearing
      const nonNumberBearing = NaN;
      const nonNumberResult = wmMapPosition['_runningAvg'](nonNumberBearing);
      expect(nonNumberResult).toBe(0);

      // Test with a negative bearing
      const negativeBearing = -90;
      const negativeResult = wmMapPosition['_runningAvg'](negativeBearing);
      expect(negativeResult).toBe(0);
    }
  );

  it('_setPositionByLocation: should call _updateGeometry and _followLocation with correct parameters', () => {
    const mockLocation = {
      accuracy: 10,
      altitude: 100,
      bearing: 0,
      latitude: 45.464664,
      longitude: 9.18854
    };

    const mockPoint = new Point([0, 0]);

    spyOn(wmMapPosition as any, '_updateGeometry').and.returnValue(mockPoint);
    spyOn(wmMapPosition as any, '_followLocation');

    wmMapPosition['_focus$'].next(true);

    wmMapPosition['_setPositionByLocation'](mockLocation);

    expect(wmMapPosition['_updateGeometry']).toHaveBeenCalledWith(mockLocation);
    expect(wmMapPosition['_followLocation']).toHaveBeenCalledWith(mockPoint);
  });

  it('_setPositionByLocation: should call _updateGeometry but not _followLocation when _focus$.value is false', () => {
    const mockLocation = {
      accuracy: 10,
      altitude: 100,
      bearing: 0,
      latitude: 45.464664,
      longitude: 9.18854
    };

    const mockPoint = new Point([0, 0]);

    spyOn(wmMapPosition as any, '_updateGeometry').and.returnValue(mockPoint);
    spyOn(wmMapPosition as any, '_followLocation');

    wmMapPosition['_focus$'].next(false);

    wmMapPosition['_setPositionByLocation'](mockLocation);

    expect(wmMapPosition['_updateGeometry']).toHaveBeenCalledWith(mockLocation);
    expect(wmMapPosition['_followLocation']).not.toHaveBeenCalled();
  });

  it('_updateGeometry: should update the geometry of _featureLocation and _featureAccuracy', () => {
    const mockLocation = {
      accuracy: 10,
      altitude: 100,
      bearing: 0,
      latitude: 45.464664,
      longitude: 9.18854
    };

    const expectedPoint = new Point(
      fromLonLat([mockLocation.longitude, mockLocation.latitude])
    );
    const expectedGeometry = circularPolygon(
      [mockLocation.longitude, mockLocation.latitude],
      mockLocation.accuracy
    );

    const setGeometryLocationSpy = spyOn(
      wmMapPosition['_featureLocation'],
      'setGeometry'
    );
    const setGeometryAccuracySpy = spyOn(
      wmMapPosition['_featureAccuracy'],
      'setGeometry'
    );

    const resultPoint = wmMapPosition['_updateGeometry'](mockLocation);

    expect(setGeometryLocationSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        flatCoordinates: expectedPoint.getFlatCoordinates()
      })
    );
    expect(setGeometryAccuracySpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        flatCoordinates: expectedGeometry.getFlatCoordinates()
      })
    );

    expect(resultPoint.getCoordinates()).toEqual(
      expectedPoint.getCoordinates()
    );
  });
});
