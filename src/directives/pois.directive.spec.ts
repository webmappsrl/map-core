import {Component, SimpleChange} from '@angular/core';

import {WmMapComponent, WmMapControls} from '../components';
import {mockExtent, mockMapConf, mockOptions, mockPoi} from 'src/const.spec';
import {ComponentFixture, TestBed, fakeAsync, tick, waitForAsync} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {By} from '@angular/platform-browser';
import {WmMapPoisDirective} from './pois.directive';
import {EGeojsonGeometryTypes, IGeojsonFeature, ILocaleString} from 'src/types/model';
import {createCluster} from 'src/utils';
import {FLAG_TRACK_ZINDEX} from 'src/readonly';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import {Cluster} from 'ol/source';
import {Select} from 'ol/interaction';

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

  beforeEach(async () => {
    TestBed.configureTestingModule({
      declarations: [WmMapPoisDirective, TestComponent, WmMapComponent, WmMapControls],
      imports: [CommonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;

    const directiveEl = fixture.debugElement.query(By.directive(WmMapPoisDirective));
    wmMapPoisDirective = directiveEl.injector.get(WmMapPoisDirective);

    await wmMapPoisDirective.mapCmp.isInit$; //initialize map for all tests

    fixture.detectChanges();
  });

  it('setPoi(1): should select correct POI given a valid ID', fakeAsync(() => {
    const mockPoiId = 1;
    wmMapPoisDirective['_wmMapPoisPois'].next({features: [mockPoi]});
    const spySelectIcon = spyOn<any>(wmMapPoisDirective, '_selectIcon');
    wmMapPoisDirective.setPoi(mockPoiId);
    tick(200);
    fixture.detectChanges();

    expect(spySelectIcon).toHaveBeenCalledWith(mockPoi);
  }));

  it('setPoi(2): should not select any POI given "reset"', fakeAsync(() => {
    const spy = spyOn<any>(wmMapPoisDirective, '_selectIcon');

    wmMapPoisDirective.setPoi('reset');
    tick(200);
    fixture.detectChanges();

    expect(spy).not.toHaveBeenCalled();
  }));

  it('setPoi(3): should select correct POI given a valid ID', fakeAsync(() => {
    const mockPoiId = -1;
    wmMapPoisDirective['_wmMapPoisPois'].next({features: [mockPoi]});
    const spy = spyOn<any>(wmMapPoisDirective, '_selectIcon');
    wmMapPoisDirective.setPoi(mockPoiId);
    tick(200);
    fixture.detectChanges();

    expect(spy).not.toHaveBeenCalled();
  }));

  xit('_addPoisFeature(1): should add features to the cluster layer', () => {
    const poiCollection: IGeojsonFeature[] = [
      {
        type: 'Feature',
        geometry: {
          type: EGeojsonGeometryTypes.POINT,
          coordinates: [0, 0],
        },
        properties: {
          id: 1,
          taxonomyIdentifiers: [
            'where_toscana',
            'where_pisa',
            'where_050037',
            'where_toscana',
            'where_pisa',
            'where_050037',
            'poi_type_beach',
          ],
          taxonomy: {
            poi_type: {
              id: 1,
              name: {it: 'Spiaggia', en: 'Beach'},
              color: '#F39C19',
            },
          },
        },
      },
      {
        type: 'Feature',
        geometry: {
          type: EGeojsonGeometryTypes.POINT,
          coordinates: [1, 1],
        },
        properties: {
          id: 2,
          taxonomyIdentifiers: [
            'where_toscana',
            'where_pisa',
            'where_050037',
            'where_toscana',
            'where_pisa',
            'where_050037',
            'poi_type_beach',
          ],
          taxonomy: {
            poi_type: {
              id: 2,
              name: {it: 'Spiaggia', en: 'Beach'},
              color: '#F39C19',
            },
          },
        },
      },
    ];

    let poisClusterLayer = new VectorLayer<Cluster>({
      source: new Cluster({
        source: new VectorSource(),
      }),
    });
    poisClusterLayer = createCluster(poisClusterLayer, FLAG_TRACK_ZINDEX);
    wmMapPoisDirective['_initDirective']();
    fixture.detectChanges();

    wmMapPoisDirective['_addPoisFeature'](poiCollection);
    fixture.detectChanges();

    expect(
      wmMapPoisDirective['_poisClusterLayer'].getSource().getSource().clear,
    ).toHaveBeenCalled();
    expect(
      wmMapPoisDirective['_poisClusterLayer'].getSource().getSource().addFeature,
    ).toHaveBeenCalledTimes(2);
    expect(
      wmMapPoisDirective['_poisClusterLayer'].getSource().getSource().changed,
    ).toHaveBeenCalled();
  });

  it('_checkZoom: should set layer visibility to true if newZoom is greater than or equal to poisMinZoom', () => {
    const poisClusterLayer = new VectorLayer<Cluster>();
    const poisMinZoom = 15;
    const view = wmMapPoisDirective.mapCmp.map.getView();
    spyOn(view, 'getZoom').and.returnValue(poisMinZoom);

    wmMapPoisDirective['_checkZoom'](poisClusterLayer);
    fixture.detectChanges();

    expect(poisClusterLayer.getVisible()).toBe(true);
  });

  it('_checkZoom: should set layer visibility to false if newZoom is lower than poisMinZoom', () => {
    const poisClusterLayer = new VectorLayer<Cluster>();
    const poisMinZoom = 5;
    const view = wmMapPoisDirective.mapCmp.map.getView();
    spyOn(view, 'getZoom').and.returnValue(poisMinZoom - 1);

    wmMapPoisDirective['_checkZoom'](poisClusterLayer);
    fixture.detectChanges();

    expect(poisClusterLayer.getVisible()).toBe(false);
  });

  it('_cleanObj: should return the same string if the input is a string', () => {
    const input = 'test string';
    const result = wmMapPoisDirective['_cleanObj'](input);
    fixture.detectChanges();

    expect(result).toBe(input);
  });

  it('_cleanObj: should filter out null or empty string values from the input object', () => {
    const input = {
      key1: 'value1',
      key2: null,
      key3: '',
      key4: 'value4',
    };
    const expectedResult = {
      key1: 'value1',
      key4: 'value4',
    };
    const result = wmMapPoisDirective['_cleanObj'](input);
    fixture.detectChanges();

    expect(result).toEqual(expectedResult);
  });

  it('_fitView(1): should fit the view to the given geometry or extent', () => {
    spyOn(wmMapPoisDirective.mapCmp.map.getView(), 'fit');

    wmMapPoisDirective['_fitView'](mockExtent, mockOptions);
    fixture.detectChanges();

    const mapView = wmMapPoisDirective.mapCmp.map.getView();
    expect(mapView.fit).toHaveBeenCalledWith(mockExtent, mockOptions);
  });

  it('_fitView(2): should use default options if fitOptions is not provided', () => {
    const mockMaxZoom = 4;
    const TRESHOLD_ENABLE_FIT = 4;
    const mockCurrentZoom = mockMaxZoom - TRESHOLD_ENABLE_FIT;

    const mockView = wmMapPoisDirective.mapCmp.map.getView();
    spyOn(mockView, 'getMaxZoom').and.returnValue(mockMaxZoom);
    spyOn(mockView, 'getZoom').and.returnValue(mockCurrentZoom);
    spyOn(mockView, 'fit');

    wmMapPoisDirective['_fitView'](mockExtent);
    fixture.detectChanges();

    expect(mockView.fit).toHaveBeenCalledWith(mockExtent, {
      maxZoom: mockMaxZoom - 4,
      duration: 500,
      padding: PADDING,
    });
  });

  it('_getIcnFromTaxonomies(1): should return the correct value', () => {
    const taxonomyIdentifiers = ['theme_ucvs', 'poi_type_1', 'poi_type_2'];
    const result = wmMapPoisDirective['_getIcnFromTaxonomies'](taxonomyIdentifiers);
    expect(result).toEqual('poi_type_1');
  });

  it('_getIcnFromTaxonomies(2): should return the first non-excluded string containing "poi_type"', () => {
    const taxonomies = ['theme_ucvs', 'poi_type_1', 'poi_type_2'];

    wmMapPoisDirective['_getIcnFromTaxonomies'](taxonomies);
    fixture.detectChanges();

    expect(wmMapPoisDirective['_getIcnFromTaxonomies'](taxonomies)).toEqual('poi_type_1');
  });

  it('_getIcnFromTaxonomies(3): should return the first string if all strings are excluded or none contain "poi_type"', () => {
    const taxonomies = ['theme_ucvs', 'non_poi_type_1', 'non_poi_type_2'];

    wmMapPoisDirective['_getIcnFromTaxonomies'](taxonomies);
    fixture.detectChanges();

    expect(wmMapPoisDirective['_getIcnFromTaxonomies'](taxonomies)).toEqual('non_poi_type_1');
  });

  it('_getIcnFromTaxonomies(4): should return the first string if there is no string containing "poi_type" and no excluded string', () => {
    const taxonomies = ['non_excluded_1', 'non_excluded_2', 'non_excluded_3'];

    wmMapPoisDirective['_getIcnFromTaxonomies'](taxonomies);
    fixture.detectChanges();

    expect(wmMapPoisDirective['_getIcnFromTaxonomies'](taxonomies)).toEqual('non_excluded_1');
  });

  xit('_getIcnFromTaxonomies(5): should return undefined if the array is empty', () => {
    const taxonomies = [];

    wmMapPoisDirective['_getIcnFromTaxonomies'](taxonomies);
    fixture.detectChanges();

    expect(wmMapPoisDirective['_getIcnFromTaxonomies'](taxonomies)).toBeUndefined();
  });

  it('_initDirective(1): should initialize the directive', waitForAsync(() => {
    fixture.detectChanges();

    fixture.whenStable().then(() => {
      wmMapPoisDirective['_initDirective']();
      tick(500);
      fixture.detectChanges();

      expect(wmMapPoisDirective).toBeTruthy();

      // Check the creation of layers
      expect(wmMapPoisDirective['_selectedPoiLayer']).toBeTruthy();
      expect(wmMapPoisDirective['_poisClusterLayer']).toBeTruthy();
      expect(wmMapPoisDirective['_hullClusterLayer']).toBeTruthy();

      // Check the addition of interactions
      const interactions = wmMapPoisDirective.mapCmp.map.getInteractions();
      const selectClusterInteraction = interactions
        .getArray()
        .find(interaction => interaction instanceof Select);
      expect(selectClusterInteraction).toBeTruthy();

      // Check the creation of the popup overlay
      expect(wmMapPoisDirective['_popupOverlay']).toBeTruthy();

      // Check the addition of layers and overlays to the map
      const layers = wmMapPoisDirective.mapCmp.map.getLayers().getArray();
      const overlays = wmMapPoisDirective.mapCmp.map.getOverlays().getArray();

      expect(layers).toContain(wmMapPoisDirective['_selectedPoiLayer']);
      expect(layers).toContain(wmMapPoisDirective['_poisClusterLayer']);
      expect(layers).toContain(wmMapPoisDirective['_hullClusterLayer']);

      expect(overlays).toContain(wmMapPoisDirective['_popupOverlay']);
    });
  }));

  xit('_initDirective(2): should handle click event and render complete', fakeAsync(() => {
    component.conf = {
      ...(mockMapConf as any),
      wmMapPoisPois: {
        type: 'FeatureCollection',
        features: mockPoi,
      },
    };

    wmMapPoisDirective.ngOnChanges({
      wmMapConf: new SimpleChange(null, mockMapConf, true),
    });

    fixture.detectChanges();

    const mapElement = fixture.debugElement.query(By.css('wm-map')).nativeElement;
    mapElement.dispatchEvent(new Event('click'));
    tick(100);

    expect(wmMapPoisDirective['_selectedPoiLayer'].getSource().getFeatures().length).toBe(1);

    wmMapPoisDirective.mapCmp.map.dispatchEvent(new Event('rendercomplete') as any);
    tick(100);
  }));

  it('_renderPois(1): should call _addPoisFeature with the correct features from inlineConf', () => {
    const mockFeatures = ['feature1', 'feature2'];
    const inlineConf = {features: mockFeatures};
    const addPoisFeatureSpy = spyOn<any>(wmMapPoisDirective, '_addPoisFeature');

    wmMapPoisDirective['_renderPois'](inlineConf);
    fixture.detectChanges();

    expect(addPoisFeatureSpy).toHaveBeenCalledWith(mockFeatures);
  });

  it('_renderPois(2): should call _addPoisFeature with the correct features', () => {
    const mockFeatures = ['feature1', 'feature2'];
    const wmMapPois = (wmMapPoisDirective.wmMapPoisPois = {features: mockFeatures});
    const addPoisFeatureSpy = spyOn<any>(wmMapPoisDirective, '_addPoisFeature');

    wmMapPoisDirective['_renderPois'](wmMapPois);
    fixture.detectChanges();

    expect(addPoisFeatureSpy).toHaveBeenCalledWith(mockFeatures);
  });

  xit('_updatePois: should update the POIs on the map when there are filters', () => {
    const mockFeatures: IGeojsonFeature[] = [
      {
        type: 'Feature',
        geometry: {
          type: EGeojsonGeometryTypes.POINT,
          coordinates: [0, 0],
        },
        properties: {
          id: 1,
          name: {en: 'POI 1', it: 'POI 1'} as ILocaleString,
        },
      },
      {
        type: 'Feature',
        geometry: {
          type: EGeojsonGeometryTypes.POINT,
          coordinates: [1, 1],
        },
        properties: {
          id: 2,
          name: {en: 'POI 2', it: 'POI 2'} as ILocaleString,
        },
      },
    ];

    wmMapPoisDirective['_olFeatures'] = mockFeatures;
    wmMapPoisDirective['wmMapPoisFilters'] = ['filter1', 'filter2'];
    wmMapPoisDirective['_updatePois']();
    fixture.detectChanges();

    const clusterSource = wmMapPoisDirective['_poisClusterLayer'].getSource();
    const featureSource = clusterSource.getSource();
    const addedFeatures = featureSource.getFeatures();

    expect(addedFeatures.length).toBeGreaterThan(0);
  });
});
