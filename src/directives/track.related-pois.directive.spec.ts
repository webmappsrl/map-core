import {
  Component,
  Directive,
  EventEmitter,
  Host,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChange,
  SimpleChanges,
} from '@angular/core';
import {BehaviorSubject, Subscription} from 'rxjs';

import Feature from 'ol/Feature';
import Geometry from 'ol/geom/Geometry';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import {fromLonLat} from 'ol/proj';
import Icon from 'ol/style/Icon';
import Style from 'ol/style/Style';
import {FitOptions} from 'ol/View';

import {preventDefault, stopPropagation} from 'ol/events/Event';
import VectorSource from 'ol/source/Vector';
import {filter, take} from 'rxjs/operators';
import {WmMapBaseDirective, wmMapTrackRelatedPoisDirective} from '.';
import {} from 'src/utils';
import {WmMapComponent, WmMapControls} from '../components';
import {DEF_LINE_COLOR, FLAG_TRACK_ZINDEX, logoBase64} from '../readonly';
import {EGeojsonGeometryTypes, IGeojsonFeature, PoiMarker} from '../types/model';
import {mockMapConf, mockTrack} from 'src/const.spec';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {By} from '@angular/platform-browser';
import * as olUtils from '../../src/utils/ol';
import {IPoint} from '../types/model';

@Component({
  template: `<wm-map
        wmMapTrackRelatedPois
        [wmMapConf]="conf"
      ></wm-map>`,
})
class TestComponent {
  conf = mockMapConf;
}

describe('wmMapTrackRelatedPoisDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let wmMapTrackRelatedPois: wmMapTrackRelatedPoisDirective;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [wmMapTrackRelatedPoisDirective, TestComponent, WmMapComponent, WmMapControls],
      imports: [CommonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;

    const directiveEl = fixture.debugElement.query(By.directive(wmMapTrackRelatedPoisDirective));
    wmMapTrackRelatedPois = directiveEl.injector.get(wmMapTrackRelatedPoisDirective);
    fixture.detectChanges();
  });

  it('constructor: should initialize directive members correctly', () => {
    expect(wmMapTrackRelatedPois['_defaultFeatureColor']).toEqual(DEF_LINE_COLOR);
    expect(wmMapTrackRelatedPois['_initPois']).toBeFalse();
    expect(wmMapTrackRelatedPois['_onClickSub']).toEqual(Subscription.EMPTY);
    expect(wmMapTrackRelatedPois['_poiMarkers']).toEqual([]);
    expect(wmMapTrackRelatedPois['_poisLayer']).toBeUndefined();
    expect(wmMapTrackRelatedPois['_relatedPois']).toEqual([]);
    expect(wmMapTrackRelatedPois['_selectedPoiLayer']).toBeUndefined();
    expect(wmMapTrackRelatedPois['_selectedPoiMarker']).toBeUndefined();

    expect(wmMapTrackRelatedPois.currentRelatedPoi$.value).toBeNull();
  });

  it('ngOnChanges(1): should reset view and initialize pois if track is null', () => {
    spyOn<any>(wmMapTrackRelatedPois, '_resetView');
    const track = mockTrack;
    wmMapTrackRelatedPois.ngOnChanges({
      track: new SimpleChange(null, track, false),
    });
    fixture.detectChanges();

    expect(wmMapTrackRelatedPois['_resetView']).toHaveBeenCalled();
    expect(wmMapTrackRelatedPois['_initPois']).toBeFalse();
  });

  it('ngOnChanges(2): should reset view and initialize pois if map is null', () => {
    spyOn<any>(wmMapTrackRelatedPois, '_resetView');
    const map = wmMapTrackRelatedPois.mapCmp.map;
    wmMapTrackRelatedPois.ngOnChanges({
        wmMapConf: new SimpleChange(null, mockMapConf, false),

    });
    fixture.detectChanges();

    expect(wmMapTrackRelatedPois['_resetView']).toHaveBeenCalled();
    expect(wmMapTrackRelatedPois['_initPois']).toBeFalse();
  });

  it('ngOnChanges(3): should reset view and initialize pois if resetCondition is true', () => {
    spyOn<any>(wmMapTrackRelatedPois, '_resetView');
    const previousTrack = mockTrack;
    const currentTrack = {
      type: 'Feature',
      properties: {
        id: 1,
      },
      geometry: {
        type: EGeojsonGeometryTypes.POINT,
        coordinates: [9.044635, 40.528745],
      },
    };
    wmMapTrackRelatedPois.ngOnChanges({
      track: new SimpleChange(previousTrack, currentTrack, false),
    });
    fixture.detectChanges();

    expect(wmMapTrackRelatedPois['_resetView']).toHaveBeenCalled();
    expect(wmMapTrackRelatedPois['_initPois']).toBeFalse();
  });

  xit('ngOnChanges(4): should initialize pois if track and related_pois are available', () => {
    spyOn<any>(wmMapTrackRelatedPois, '_resetView');
    spyOn<any>(wmMapTrackRelatedPois, '_addPoisMarkers');
    //spyOn<any>(wmMapTrackRelatedPois, 'calculateNearestPoint');

    const poisLayer: VectorLayer<VectorSource> = new VectorLayer();
    const map = wmMapTrackRelatedPois.mapCmp.map;

    wmMapTrackRelatedPois.ngOnChanges({
      track: new SimpleChange(null, mockTrack, false),
      wmMapConf: new SimpleChange(null, mockMapConf, true),
    });
    fixture.detectChanges();

    expect(wmMapTrackRelatedPois['_resetView']).toHaveBeenCalled();
    expect(wmMapTrackRelatedPois['_addPoisMarkers']).toHaveBeenCalledWith(
      mockTrack.properties.related_pois as any,
    );
    expect(wmMapTrackRelatedPois['_initPois']).toBeFalse();
    //expect(wmMapTrackRelatedPois['_relatedPois']).toBe(mockTrack.properties.related_pois as any);
    // expect(wmMapTrackRelatedPois['calculateNearestPoint']).toHaveBeenCalledWith(
    //   wmMapTrackRelatedPois.wmMapPositioncurrentLocation,
    //   poisLayer,
    //   wmMapTrackRelatedPois.wmMapTrackRelatedPoisAlertPoiRadius,
    // );
    //expect(wmMapTrackRelatedPois['_initPois']).toBeTrue();
  });

  xit('ngOnChanges(6): should calculate nearest poi when currentLocation changes', () => {
    const currentLocation = {latitude: 123, longitude: 456};
    const nearestPoiMock = jasmine.createSpyObj('Feature<Geometry>', ['getStyle']);
    const poisLayerMock = jasmine.createSpyObj('VectorLayer<VectorSource>', ['getSource']);
    poisLayerMock.getSource.and.returnValue({
      getClosestFeatureToCoordinate: jasmine.createSpy().and.returnValue(nearestPoiMock),
    });

    spyOn(olUtils, 'calculateNearestPoint').and.callThrough();

    wmMapTrackRelatedPois['_poisLayer'] = poisLayerMock;
    wmMapTrackRelatedPois.wmMapTrackRelatedPoisNearestPoiEvt = new EventEmitter();

    wmMapTrackRelatedPois.ngOnChanges({
      wmMapPositioncurrentLocation: new SimpleChange(null, currentLocation, false),
    });
    fixture.detectChanges();

    expect(olUtils.calculateNearestPoint).toHaveBeenCalledWith(
      currentLocation,
      poisLayerMock,
      wmMapTrackRelatedPois.wmMapTrackRelatedPoisAlertPoiRadius,
    );
    expect(nearestPoiMock.getStyle().getImage().setScale).toHaveBeenCalledWith(1.2);
    expect(wmMapTrackRelatedPois.wmMapTrackRelatedPoisNearestPoiEvt.emit).toHaveBeenCalledWith(
      nearestPoiMock,
    );
  });

  it('ngOnDestroy: should unsubscribe from click event subscription', () => {
    const unsubscribeSpy = spyOn(wmMapTrackRelatedPois['_onClickSub'], 'unsubscribe');

    wmMapTrackRelatedPois.ngOnDestroy();

    expect(unsubscribeSpy).toHaveBeenCalled();
  });

  it('poiNext: should switch to the next point of interest', () => {
    wmMapTrackRelatedPois['_relatedPois'] = [
      {
        geometry: {type: EGeojsonGeometryTypes.POINT, coordinates: [7.044635, 40.528745]},
        properties: {id: 1},
        type: 'Feature',
      },
      {
        geometry: {type: EGeojsonGeometryTypes.POINT, coordinates: [7.046635, 40.528745]},
        properties: {id: 2},
        type: 'Feature',
      },
    ];
    wmMapTrackRelatedPois.currentRelatedPoi$ = new BehaviorSubject(
      wmMapTrackRelatedPois['_relatedPois'][0],
    );

    const currentPoiIndex = wmMapTrackRelatedPois['_relatedPois']
      .map(f => f.properties.id)
      .indexOf(1);

    wmMapTrackRelatedPois.poiNext();
    fixture.detectChanges();

    const nextPoiId =
      wmMapTrackRelatedPois['_relatedPois'][
        (currentPoiIndex + 1) % wmMapTrackRelatedPois['_relatedPois'].length
      ].properties.id;

    expect(nextPoiId).toBe(2);
  });

  it('poiPrev: should switch to the next point of interest', () => {
    wmMapTrackRelatedPois['_relatedPois'] = [
      {
        geometry: {type: EGeojsonGeometryTypes.POINT, coordinates: [7.044635, 40.528745]},
        properties: {id: 1},
        type: 'Feature',
      },
      {
        geometry: {type: EGeojsonGeometryTypes.POINT, coordinates: [7.046635, 40.528745]},
        properties: {id: 2},
        type: 'Feature',
      },
    ];
    wmMapTrackRelatedPois.currentRelatedPoi$ = new BehaviorSubject(
      wmMapTrackRelatedPois['_relatedPois'][0],
    );

    const currentPoiIndex = wmMapTrackRelatedPois['_relatedPois']
      .map(f => f.properties.id)
      .indexOf(2);

    wmMapTrackRelatedPois.poiPrev();
    fixture.detectChanges();

    const prevPoiId =
      wmMapTrackRelatedPois['_relatedPois'][
        (currentPoiIndex - 1) % wmMapTrackRelatedPois['_relatedPois'].length
      ].properties.id;

    expect(prevPoiId).toBe(1);
  });
  
});
