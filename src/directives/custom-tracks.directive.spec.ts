import {Component} from '@angular/core';
import GeoJSON from 'ol/format/GeoJSON';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';

import {WmMapCustomTracksDirective} from '.';
import {WmMapComponent, WmMapControls} from '../components';
import {mockMapConf, mockSavedTracks} from 'src/const.spec';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {By} from '@angular/platform-browser';
import {Geometry} from 'ol/geom';

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WmMapCustomTracksDirective, TestComponent, WmMapComponent, WmMapControls],
      imports: [CommonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;

    const directiveEl = fixture.debugElement.query(By.directive(WmMapCustomTracksDirective));
    wmMapCustomTracksDirective = directiveEl.injector.get(WmMapCustomTracksDirective);
    fixture.detectChanges();
  });

  it('_initLayer(1): should initialize custom layers and BehaviorSubject correctly WITHOUT saved tracks', () => {
    spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify([]));
    wmMapCustomTracksDirective['_loadSavedTracks']();
    wmMapCustomTracksDirective['_initLayer']();
    fixture.detectChanges();
    expect(wmMapCustomTracksDirective['_customTrackLayer']).toBeDefined();
    expect(wmMapCustomTracksDirective['_customTrackLayer']).toBeInstanceOf(VectorLayer);
    expect(wmMapCustomTracksDirective['_customTrackLayer'].getSource()).toBeInstanceOf(
      VectorSource,
    );

    expect(wmMapCustomTracksDirective['_customPoiLayer']).toBeDefined();
    expect(wmMapCustomTracksDirective['_customPoiLayer']).toBeInstanceOf(VectorLayer);
    expect(wmMapCustomTracksDirective['_customPoiLayer'].getSource()).toBeInstanceOf(VectorSource);
    expect(wmMapCustomTracksDirective['_savedTracks$'].value).toEqual([]);
  });
  it('_initLayer(2): should initialize custom layers and BehaviorSubject correctly WITH saved tracks', () => {
    spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify(mockSavedTracks));
    wmMapCustomTracksDirective['_loadSavedTracks']();
    wmMapCustomTracksDirective['_initLayer']();
    fixture.detectChanges();
    expect(wmMapCustomTracksDirective['_customTrackLayer']).toBeDefined();
    expect(wmMapCustomTracksDirective['_customTrackLayer']).toBeInstanceOf(VectorLayer);
    expect(wmMapCustomTracksDirective['_customTrackLayer'].getSource()).toBeInstanceOf(
      VectorSource,
    );

    expect(wmMapCustomTracksDirective['_customPoiLayer']).toBeDefined();
    expect(wmMapCustomTracksDirective['_customPoiLayer']).toBeInstanceOf(VectorLayer);
    expect(wmMapCustomTracksDirective['_customPoiLayer'].getSource()).toBeInstanceOf(VectorSource);
    const mockedSavedFeatures: Feature<Geometry>[] = mockSavedTracks.map((f, idx) => {
      const feature = new GeoJSON({
        featureProjection: 'EPSG:3857',
      }).readFeature(f.geometry);
      feature.setProperties(f.properties);
      feature.setId(`${f.properties.id}-${idx}`);

      return feature;
    });
    const expectedSavedFeatures = wmMapCustomTracksDirective['_savedTracks$'].value;
    expect(expectedSavedFeatures.length).toBe(mockedSavedFeatures.length);
    expect(expectedSavedFeatures[0]).toBeInstanceOf(Feature);
    expect(
      JSON.stringify((expectedSavedFeatures[0].getGeometry() as LineString).getCoordinates()),
    ).toBe(JSON.stringify((mockedSavedFeatures[0].getGeometry() as LineString).getCoordinates()));
  });

  it('_clear: should clear the custom track layer source and the custom Poi layer source', () => {
    spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify(mockSavedTracks));
    wmMapCustomTracksDirective['_loadSavedTracks']();
    wmMapCustomTracksDirective['_initLayer']();
    fixture.detectChanges();
    wmMapCustomTracksDirective['_clear']();
    fixture.detectChanges();

    expect(wmMapCustomTracksDirective['_customTrackLayer'].getSource().getFeatures().length).toBe(
      0,
    );
    expect(wmMapCustomTracksDirective['_customPoiLayer'].getSource().getFeatures().length).toBe(0);
  });

  it('input() reloadCustomTracks: should reload tracks when reloadCustomTracks input is set', () => {
    wmMapCustomTracksDirective['_initLayer']();
    fixture.detectChanges();
    spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify(mockSavedTracks));
    wmMapCustomTracksDirective.reloadCustomTracks = true;
    fixture.detectChanges();
    const mockedSavedFeatures: Feature<Geometry>[] = mockSavedTracks.map((f, idx) => {
      const feature = new GeoJSON({
        featureProjection: 'EPSG:3857',
      }).readFeature(f.geometry);
      feature.setProperties(f.properties);
      feature.setId(`${f.properties.id}-${idx}`);

      return feature;
    });
    const expectedSavedFeatures = wmMapCustomTracksDirective['_savedTracks$'].value;
    expect(expectedSavedFeatures.length).toBe(mockedSavedFeatures.length);
    expect(expectedSavedFeatures[0]).toBeInstanceOf(Feature);
    expect(
      JSON.stringify((expectedSavedFeatures[0].getGeometry() as LineString).getCoordinates()),
    ).toBe(JSON.stringify((mockedSavedFeatures[0].getGeometry() as LineString).getCoordinates()));
  });
});
