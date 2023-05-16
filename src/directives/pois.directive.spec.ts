import {
  ChangeDetectorRef,
  Component,
  Directive,
  EventEmitter,
  Host,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import Popup from 'ol-ext/overlay/popup';
import Feature from 'ol/Feature';
import MapBrowserEvent from 'ol/MapBrowserEvent';
import {FitOptions} from 'ol/View';
import {createEmpty, extend} from 'ol/extent';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import {fromLonLat} from 'ol/proj';
import Icon from 'ol/style/Icon';
import Style from 'ol/style/Style';
import {clusterHullStyle, fromHEXToColor} from '../../src/utils/styles';

import {Cluster} from 'ol/source';
import VectorSource from 'ol/source/Vector';
import {BehaviorSubject} from 'rxjs';
import {filter, take} from 'rxjs/operators';
import {
  clearLayer,
  createCluster,
  createHull,
  createLayer,
  intersectionBetweenArrays,
} from '../../src/utils';
import {WmMapComponent, WmMapControls} from '../components';
import {FLAG_TRACK_ZINDEX, ICN_PATH} from '../readonly';
import {IGeojsonFeature, IGeojsonGeneric} from '../types/model';
import {mockMapConf} from 'src/const.spec';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {By} from '@angular/platform-browser';
import {WmMapPoisDirective} from './pois.directive';
const PADDING = [80, 80, 80, 80];

@Component({
  template: `<wm-map
        wmMapPois
        [wmMapConf]="conf"
      ></wm-map>`,
})
class TestComponent {
  conf = mockMapConf;
}

describe('WmMapPoisDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let wmMapPoisDirective: WmMapPoisDirective;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [
        WmMapPoisDirective,
        TestComponent,
        WmMapComponent,
        WmMapControls,
      ],
      imports: [CommonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;

    const directiveEl = fixture.debugElement.query(By.directive(WmMapPoisDirective));
    wmMapPoisDirective = directiveEl.injector.get(WmMapPoisDirective);
    fixture.detectChanges();
  });

  it('_fitView(1): should fit view with provided extent and options', () => {
    const mockMap = wmMapPoisDirective.mapCmp.map;
    const view = wmMapPoisDirective.mapCmp.map.getView();
    const mockExtent = [0, 0, 10, 10];
    const mockOptions: FitOptions = {
      maxZoom: 10,
      duration: 100,
      padding: [100, 20, 50, 80],
    };

    spyOn(view, 'fit');

    wmMapPoisDirective['_fitView'](mockExtent, mockOptions);
    fixture.detectChanges();

    expect(view.fit).toHaveBeenCalledWith(mockExtent, mockOptions);
  });

  it('_fitView(2): should fit view with provided extent and default options when no options are provided', () => {
    const view = wmMapPoisDirective.mapCmp.map.getView();
    const mockExtent = [0, 0, 10, 10];
    const defaultMockOptions: FitOptions = {
      maxZoom: wmMapPoisDirective.mapCmp.map.getView().getMaxZoom() - 4,
      duration: 500,
      padding: PADDING,
    };

    spyOn(view, 'fit');

    wmMapPoisDirective['_fitView'](mockExtent);
    fixture.detectChanges();

    expect(view.fit).toHaveBeenCalledWith(mockExtent, defaultMockOptions);
  });

  it('_getIcnFromTaxonomies(1): should return the first non-excluded string containing "poi_type"', () => {
    const taxonomies = ['theme_ucvs', 'poi_type_1', 'poi_type_2'];

    wmMapPoisDirective['_getIcnFromTaxonomies'](taxonomies);
    fixture.detectChanges();
    
    expect(wmMapPoisDirective['_getIcnFromTaxonomies'](taxonomies)).toEqual('poi_type_1');
  });

  it('_getIcnFromTaxonomies(2): should return the first string if all strings are excluded or none contain "poi_type"', () => {
    const taxonomies = ['theme_ucvs', 'non_poi_type_1', 'non_poi_type_2'];

    wmMapPoisDirective['_getIcnFromTaxonomies'](taxonomies);
    fixture.detectChanges();

    expect(wmMapPoisDirective['_getIcnFromTaxonomies'](taxonomies)).toEqual('non_poi_type_1');
  });

  it('_getIcnFromTaxonomies(3): should return the first string if there is no string containing "poi_type" and no excluded string', () => {
    const taxonomies = ['non_excluded_1', 'non_excluded_2', 'non_excluded_3'];

    wmMapPoisDirective['_getIcnFromTaxonomies'](taxonomies);
    fixture.detectChanges();

    expect(wmMapPoisDirective['_getIcnFromTaxonomies'](taxonomies)).toEqual('non_excluded_1');
  });

  it('_getIcnFromTaxonomies(3): should return undefined if the array is empty', () => {
    const taxonomies = [];

    wmMapPoisDirective['_getIcnFromTaxonomies'](taxonomies);
    fixture.detectChanges();

    expect(wmMapPoisDirective['_getIcnFromTaxonomies'](taxonomies)).toBeUndefined();
  });

  it('_renderPois(1): should call _addPoisFeature with the correct features from inlineConf', () => {
    const mockFeatures = ['feature1', 'feature2'];
    const inlineConf = { features: mockFeatures };
    const addPoisFeatureSpy = spyOn<any>(wmMapPoisDirective, '_addPoisFeature');

    wmMapPoisDirective['_renderPois'](inlineConf);
    fixture.detectChanges();

    expect(addPoisFeatureSpy).toHaveBeenCalledWith(mockFeatures);
  });
 
  xit('_renderPois(2): should call _addPoisFeature with the correct features', () => {
    const mockFeatures = ['feature1', 'feature2'];
    wmMapPoisDirective.wmMapPoisPois = { features: mockFeatures };
    const mockPois = wmMapPoisDirective.wmMapPoisPois
    const addPoisFeatureSpy = spyOn<any>(wmMapPoisDirective, '_addPoisFeature');

    wmMapPoisDirective['_renderPois'](mockPois);
    fixture.detectChanges();

    expect(addPoisFeatureSpy).toHaveBeenCalledWith(mockFeatures);
  });

});
