import {Component} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';

import {WmMapBaseDirective, WmMapCustomTracksDirective} from '.';
import {coordsToLonLat, createCircleFeature, getLineStyle} from '../../src/utils';
import {WmMapComponent, WmMapControls} from '../components';
import {ITrackElevationChartHoverElements} from '../types/track-elevation-charts';
import {mockMapConf, mockTrack} from 'src/const.spec';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {By} from '@angular/platform-browser';
import {toLonLat} from 'ol/proj';

@Component({
  template: `<wm-map
      wmMapCustomTracks
      [wmMapConf]="conf"
    ></wm-map>`,
})
class TestComponent {
  conf = mockMapConf;
}

describe('wmMapCustomTracks', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let wmMapCustomTracksDirective: WmMapCustomTracksDirective;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WmMapCustomTracksDirective, TestComponent, WmMapComponent, WmMapControls],
      imports: [CommonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;

    const directiveEl = fixture.debugElement.query(By.directive(WmMapCustomTracksDirective));
    wmMapCustomTracksDirective = directiveEl.injector.get(WmMapCustomTracksDirective);
    fixture.detectChanges();
  });

  it('(1):should initialize custom layers and BehaviorSubject correctly', () => {
    wmMapCustomTracksDirective.mapCmp.isInit$.next(true);
    expect(wmMapCustomTracksDirective).toBeTruthy();
    expect(wmMapCustomTracksDirective['_customTrackLayer']).toBeDefined();
    expect(wmMapCustomTracksDirective['_customPoiLayer']).toBeDefined();

    expect(wmMapCustomTracksDirective['_customTrackLayer']).toBeInstanceOf(VectorLayer);
    expect(wmMapCustomTracksDirective['_customPoiLayer']).toBeInstanceOf(VectorLayer);

    expect(wmMapCustomTracksDirective['_customTrackLayer'].getSource()).toBeInstanceOf(
      VectorSource,
    );
    expect(wmMapCustomTracksDirective['_customPoiLayer'].getSource()).toBeInstanceOf(VectorSource);
    expect(wmMapCustomTracksDirective['_savedTracks$']).toBeDefined();
    expect(wmMapCustomTracksDirective['_savedTracks$']).toBeInstanceOf(BehaviorSubject);
  });

  xit('_clear: should clear the custom track layer source and the custom Poi layer source', () => {
    const mockFeature = new Feature();
    wmMapCustomTracksDirective['_customTrackLayer'].getSource().addFeature(mockFeature);
    wmMapCustomTracksDirective['_customPoiLayer'].getSource().addFeature(mockFeature);
    wmMapCustomTracksDirective['_clear']();

    expect(wmMapCustomTracksDirective['_customTrackLayer'].getSource().getFeatures().length).toBe(
      0,
    );
    expect(wmMapCustomTracksDirective['_customPoiLayer'].getSource().getFeatures().length).toBe(0);
  });

  xit('_initLayer: should initialize the custom track layer and custom Poi layer', () => {
    const customTrackLayer = wmMapCustomTracksDirective['_customTrackLayer'];
    const customPoiLayer = wmMapCustomTracksDirective['_customPoiLayer'];

    wmMapCustomTracksDirective['_initLayer']();

    expect(customTrackLayer).toBeDefined();
    expect(customTrackLayer.getSource()).toBeInstanceOf(VectorSource);

    expect(customPoiLayer).toBeDefined();
    expect(customPoiLayer.getSource()).toBeInstanceOf(VectorSource);
  });

  xit('input() reloadCustomTracks: should reload tracks when reloadCustomTracks input is set', () => {
    const mockTracks = [mockTrack];
    localStorage.setItem('wm-saved-tracks', JSON.stringify(mockTracks));

    wmMapCustomTracksDirective.reloadCustomTracks = true;
    fixture.detectChanges();

    const directiveEl = fixture.debugElement.query(By.directive(WmMapCustomTracksDirective));
    const directiveInstance = directiveEl.injector.get(WmMapCustomTracksDirective);

    const customTrackLayer = directiveInstance['_customTrackLayer'];
    const features = customTrackLayer.getSource().getFeatures();

    expect(features.length).toBe(1);

    const featureCoords = features.map(feature => {
      const coordinates = (feature.getGeometry() as any).getCoordinates();
      return coordinates.map(coords => coordsToLonLat(coords).map(coord => coord.toFixed(6)));
    });

    const mockCoords = mockTracks.map(mock =>
      mock.geometry.coordinates.map(coord => coord.map(c => c.toFixed(6))),
    );

    for (let i = 0; i < features.length; i++) {
      expect(featureCoords[i]).toEqual(mockCoords[i]);
    }
  });

  xit('_loadSavedTracks(1): should handle saved tracks with different coordinates', () => {
    const mockSavedTracks = [mockTrack];

    localStorage.setItem('wm-saved-tracks', JSON.stringify(mockSavedTracks));

    wmMapCustomTracksDirective['_loadSavedTracks']();

    const savedTracks = wmMapCustomTracksDirective['_savedTracks$'].getValue();

    savedTracks.forEach((track, index) => {
      const expectedCoordinates = mockSavedTracks[index].geometry.coordinates.map(coords =>
        coords.map(coord => coord.toFixed(6)),
      );
      const actualCoordinates = (track.getGeometry() as LineString)
        .getCoordinates()
        .map(coords => toLonLat(coords).map(coord => coord.toFixed(6)));
      expect(actualCoordinates).toEqual(expectedCoordinates);
    });
  });

  xit('_loadSavedTracks(2): should load saved tracks from local storage', () => {
    const mockSavedTracks = [mockTrack];
    localStorage.setItem('wm-saved-tracks', JSON.stringify(mockSavedTracks));

    wmMapCustomTracksDirective['_loadSavedTracks']();
    const savedTracks = wmMapCustomTracksDirective['_savedTracks$'].getValue();

    expect(savedTracks.length).toBe(mockSavedTracks.length);
  });

  xit('_loadSavedTracks(3): should handle no saved tracks', () => {
    localStorage.removeItem('wm-saved-tracks');

    wmMapCustomTracksDirective['_loadSavedTracks']();

    expect(wmMapCustomTracksDirective['_savedTracks$'].getValue()).toEqual([]);
  });

  xit('_loadSavedTracks(4): should handle empty array from localStorage', () => {
    localStorage.setItem('wm-saved-tracks', JSON.stringify([]));

    wmMapCustomTracksDirective['_loadSavedTracks']();

    const savedTracks = wmMapCustomTracksDirective['_savedTracks$'].getValue();

    expect(savedTracks.length).toBe(0);
  });
});
