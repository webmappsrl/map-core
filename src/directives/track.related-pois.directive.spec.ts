import {Point, SimpleGeometry} from 'ol/geom';
import {Component, SimpleChange} from '@angular/core';
import {BehaviorSubject, Subscription, of} from 'rxjs';

import {WmMapTrackRelatedPoisDirective} from '.';
import {WmMapComponent, WmMapControls} from '../components';
import {DEF_LINE_COLOR} from '../readonly';
import {EGeojsonGeometryTypes, IGeojsonFeature, PoiMarker} from '../types/model';
import {mockExtent, mockMapConf, mockOptions, mockPoi, mockTrack, poiMarker} from 'src/const.spec';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {By} from '@angular/platform-browser';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {Feature} from 'ol';
import {fromLonLat} from 'ol/proj';
import Style from 'ol/style/Style';

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
  let wmMapTrackRelatedPoisDirective: WmMapTrackRelatedPoisDirective;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      declarations: [WmMapTrackRelatedPoisDirective, TestComponent, WmMapComponent, WmMapControls],
      imports: [CommonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;

    const directiveEl = fixture.debugElement.query(By.directive(WmMapTrackRelatedPoisDirective));
    wmMapTrackRelatedPoisDirective = directiveEl.injector.get(WmMapTrackRelatedPoisDirective);
    await wmMapTrackRelatedPoisDirective.mapCmp.isInit$; //initialize map for all tests
    fixture.detectChanges();
  });

  it('constructor: should initialize directive members correctly', () => {
    expect(wmMapTrackRelatedPoisDirective['_defaultFeatureColor']).toEqual(DEF_LINE_COLOR);
    expect(wmMapTrackRelatedPoisDirective['_initPois']).toBeFalse();
    expect(wmMapTrackRelatedPoisDirective['_onClickSub']).toEqual(Subscription.EMPTY);
    expect(wmMapTrackRelatedPoisDirective['_poiMarkers']).toEqual([]);
    expect(wmMapTrackRelatedPoisDirective['_poisLayer']).toBeUndefined();
    expect(wmMapTrackRelatedPoisDirective['_relatedPois']).toEqual([]);
    expect(wmMapTrackRelatedPoisDirective['_selectedPoiLayer']).toBeUndefined();
    expect(wmMapTrackRelatedPoisDirective['_selectedPoiMarker']).toBeUndefined();

    expect(wmMapTrackRelatedPoisDirective.currentRelatedPoi$.value).toBeNull();
  });

  it('ngOnChanges(2): should reset view and initialize pois if resetCondition is true', () => {
    spyOn<any>(wmMapTrackRelatedPoisDirective, '_resetView');
    const previousTrack = mockTrack;
    const currentTrack = {
      type: 'Feature',
      properties: {
        id: 5,
      },
      geometry: {
        type: EGeojsonGeometryTypes.POINT,
        coordinates: [9.044635, 40.528745],
      },
    };
    wmMapTrackRelatedPoisDirective.ngOnChanges({
      track: new SimpleChange(previousTrack, currentTrack, false),
    });
    fixture.detectChanges();

    expect(wmMapTrackRelatedPoisDirective['_resetView']).toHaveBeenCalled();
    expect(wmMapTrackRelatedPoisDirective['_initPois']).toBeFalse();
  });

  it('ngOnChanges(3): should initialize pois if track and related_pois are available', () => {
    spyOn<any>(wmMapTrackRelatedPoisDirective, '_resetView');
    spyOn<any>(wmMapTrackRelatedPoisDirective, '_addPoisMarkers');

    expect(wmMapTrackRelatedPoisDirective['_initPois']).toBeFalse();
    wmMapTrackRelatedPoisDirective.ngOnChanges({
      track: new SimpleChange(null, mockTrack, false),
    });
    fixture.detectChanges();
    expect(wmMapTrackRelatedPoisDirective['_resetView']).toHaveBeenCalled();
    expect(wmMapTrackRelatedPoisDirective['_addPoisMarkers']).toHaveBeenCalledWith(
      mockTrack.properties.related_pois as any,
    );
    expect(wmMapTrackRelatedPoisDirective['_relatedPois']).toBe(
      mockTrack.properties.related_pois as any,
    );
    expect(wmMapTrackRelatedPoisDirective['_initPois']).toBeTrue();
  });

  it('ngOnDestroy: should unsubscribe from click event subscription', () => {
    const unsubscribeSpy = spyOn(wmMapTrackRelatedPoisDirective['_onClickSub'], 'unsubscribe');

    wmMapTrackRelatedPoisDirective.ngOnDestroy();

    expect(unsubscribeSpy).toHaveBeenCalled();
  });

  it('poiNext: should switch to the next point of interest', () => {
    wmMapTrackRelatedPoisDirective['_relatedPois'] = [
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
    wmMapTrackRelatedPoisDirective.currentRelatedPoi$ = new BehaviorSubject(
      wmMapTrackRelatedPoisDirective['_relatedPois'][0],
    );

    const currentPoiIndex = wmMapTrackRelatedPoisDirective['_relatedPois']
      .map(f => f.properties.id)
      .indexOf(1);

    wmMapTrackRelatedPoisDirective.poiNext();
    fixture.detectChanges();

    const nextPoiId =
      wmMapTrackRelatedPoisDirective['_relatedPois'][
        (currentPoiIndex + 1) % wmMapTrackRelatedPoisDirective['_relatedPois'].length
      ].properties.id;

    expect(nextPoiId).toBe(2);
  });

  it('poiPrev: should switch to the next point of interest', () => {
    wmMapTrackRelatedPoisDirective['_relatedPois'] = [
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
    wmMapTrackRelatedPoisDirective.currentRelatedPoi$ = new BehaviorSubject(
      wmMapTrackRelatedPoisDirective['_relatedPois'][0],
    );

    const currentPoiIndex = wmMapTrackRelatedPoisDirective['_relatedPois']
      .map(f => f.properties.id)
      .indexOf(2);

    wmMapTrackRelatedPoisDirective.poiPrev();
    fixture.detectChanges();

    const prevPoiId =
      wmMapTrackRelatedPoisDirective['_relatedPois'][
        (currentPoiIndex - 1) % wmMapTrackRelatedPoisDirective['_relatedPois'].length
      ].properties.id;

    expect(prevPoiId).toBe(1);
  });

  xit('_addPoisMarkers: should add markers for all related points of interest', async () => {
    spyOn<any>(wmMapTrackRelatedPoisDirective, '_createIconFeature').and.returnValue(
      new Promise(resolve => {
        resolve({
          iconFeature: new Feature({
            type: 'icon',
            geometry: new Point(fromLonLat([7.044635, 40.528745])),
          }),
          style: new Style({}),
        });
      }),
    );
    spyOn<any>(wmMapTrackRelatedPoisDirective, '_createPoiCavasImage').and.returnValue(
      new Image() as HTMLImageElement,
    );
    spyOn<any>(wmMapTrackRelatedPoisDirective, '_addMarkerToLayer');

    const mockRelatedPois: IGeojsonFeature[] = [
      {
        type: 'Feature',
        properties: {id: 1},
        geometry: {type: EGeojsonGeometryTypes.POINT, coordinates: [0, 0]},
      },
      {
        type: 'Feature',
        properties: {id: 2},
        geometry: {type: EGeojsonGeometryTypes.POINT, coordinates: [1, 1]},
      },
    ];

    const res = await wmMapTrackRelatedPoisDirective['_createPoiCanvasIcon'](mockPoi);
    wmMapTrackRelatedPoisDirective['_addPoisMarkers'](mockRelatedPois);
    fixture.detectChanges();

    expect(wmMapTrackRelatedPoisDirective['_createPoiCanvasIcon']).toHaveBeenCalledTimes(
      mockRelatedPois.length,
    );
    expect(wmMapTrackRelatedPoisDirective['_addMarkerToLayer']).toHaveBeenCalledTimes(
      mockRelatedPois.length,
    );
  });

  it('_createIconFeature: should create an icon feature with the correct properties', async () => {
    const transparent = Boolean(Math.round(Math.random()));
    const size = 25;
    const result = await wmMapTrackRelatedPoisDirective['_createIconFeature'](
      mockPoi.geometry.coordinates as number[],
      new Image(),
      size,
      transparent,
    );
    const geometry = result.iconFeature.getGeometry() as SimpleGeometry;
    expect(geometry.getType()).toBe('Point');
    expect(geometry.getCoordinates()).toEqual(fromLonLat(mockPoi.geometry.coordinates as any));
    const styleOfIcon = result.iconFeature.getStyle() as Style;
    const style = result.style;
    expect(styleOfIcon).toEqual(style);
    const imageStyleOfIcon = styleOfIcon.getImage();
    expect(imageStyleOfIcon.getOpacity()).toEqual(transparent ? 0.5 : 1);
    expect(imageStyleOfIcon.getSize()).toEqual([size, size]);
  });

  it('_createPoiCanvasIcon: should create a canvas icon for the POI', async () => {
    spyOn<any>(wmMapTrackRelatedPoisDirective, '_createIconFeature').and.returnValue({
      iconFeature: new Feature({
        type: 'icon',
        geometry: new Point(fromLonLat([7.044635, 40.528745])),
      }),
      style: new Style({}),
    });

    spyOn<any>(wmMapTrackRelatedPoisDirective, '_createPoiCavasImage').and.returnValue(
      new Image() as HTMLImageElement,
    );

    const {marker, style} = await wmMapTrackRelatedPoisDirective['_createPoiCanvasIcon'](mockPoi);

    expect(wmMapTrackRelatedPoisDirective['_createIconFeature']).toHaveBeenCalledWith(
      mockPoi.geometry.coordinates as number[],
      jasmine.any(HTMLImageElement),
      46,
    );
    expect(marker.id).toBe('1');
    expect(marker.poi).toBe(mockPoi);

    const transparent = Boolean(Math.round(Math.random()));
    const size = 25;
    const result = await wmMapTrackRelatedPoisDirective['_createIconFeature'](
      mockPoi.geometry.coordinates as number[],
      new Image(),
      size,
      transparent,
    );
    const styleOfIcon = result.iconFeature.getStyle() as Style;
    const styleIcon = result.style;

    expect(style).toBe(styleIcon);
  });

  xit('_createPoiCanvasImage(1): should create a canvas image for the POI', async () => {
    /*TODO: fix the functions in utils used in the directive are not found by the tests.
    Error: <spyOn> : createCanvasForHtml() method does not exist*/
    spyOn<any>(wmMapTrackRelatedPoisDirective, '_createPoiMarkerHtmlForCanvas').and.returnValue(
      '<div>POI marker HTML</div>',
    );
    const createCanvasForHtml = spyOn<any>(
      wmMapTrackRelatedPoisDirective,
      'createCanvasForHtml',
    ).and.returnValue(new HTMLCanvasElement());
    const canvasImage = await wmMapTrackRelatedPoisDirective['_createPoiCavasImage'](
      mockPoi,
      false,
    );

    expect(canvasImage).toBeDefined();
    expect(canvasImage instanceof HTMLImageElement).toBe(true);
    expect(wmMapTrackRelatedPoisDirective['_createPoiMarkerHtmlForCanvas']).toHaveBeenCalledWith(
      mockPoi,
      false,
    );
    expect(wmMapTrackRelatedPoisDirective['_createPoiMarkerHtmlForCanvas']).toHaveBeenCalledWith(
      mockPoi,
      false,
    );
  });

  xit('_createPoiCanvasImage(2): should create a canvas image for the POI', async () => {
    /*TODO: fix the functions in utils used in the directive are not found by the tests.
    Error: <spyOn> : createCanvasForHtml() method does not exist*/
    spyOn<any>(wmMapTrackRelatedPoisDirective, '_createPoiMarkerHtmlForCanvas').and.returnValue(
      '<div>POI marker HTML</div>',
    );
    const createCanvasForHtml = spyOn<any>(
      wmMapTrackRelatedPoisDirective,
      'createCanvasForHtml',
    ).and.returnValue(new HTMLCanvasElement());
    const canvasImage = await wmMapTrackRelatedPoisDirective['_createPoiCavasImage'](
      mockPoi,
      false,
    );

    expect(wmMapTrackRelatedPoisDirective['createCanvasForHtml']).toHaveBeenCalledWith(
      '<div>POI marker HTML</div>',
      46,
    );
    expect(createCanvasForHtml).toHaveBeenCalledWith('<div>HTML canvas content</div>', 46);
  });
  //   const value = {
  //     properties: {
  //       feature_image: {
  //         sizes: {
  //           '108x137': 'https://example.com/image.jpg',
  //         },
  //       },
  //     },
  //   };
  //   const htmlTextCanvas = await wmMapTrackRelatedPoisDirective['_createPoiMarkerHtmlForCanvas'](
  //     mockPoi,
  //     selected,
  //   );

  //   const imageUtilsSpy = jasmine.createSpyObj('imageUtils', ['downloadBase64Img']);
  //   imageUtilsSpy.downloadBase64Img.and.returnValue(Promise.resolve('base64String'));

  //   expect(htmlTextCanvas).toContain(
  //     '<div class="webmapp-map-poimarker-container" style="position: relative;width: 30px;height: 60px;">',
  //   );
  //   expect(htmlTextCanvas).toContain(
  //     '<svg width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style=" position: absolute;  width: 46px;  height: 46px;  left: 0px;  top: 0px;">',
  //   );
  //   expect(htmlTextCanvas).toContain('<circle opacity="0.2" cx="23" cy="23" r="23" fill="red"/>');
  //   expect(htmlTextCanvas).toContain(
  //     '<rect x="5" y="5" width="36" height="36" rx="18" fill="url(#img)" stroke="white" stroke-width="2"/>',
  //   );
  //   expect(htmlTextCanvas).toContain(
  //     '<pattern height="100%" width="100%" patternContentUnits="objectBoundingBox" id="img">',
  //   );
  //   expect(htmlTextCanvas).toContain(
  //     '<image height="1" width="1" preserveAspectRatio="xMidYMid slice" xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC4AAAAuCAYAAABXuSs3AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAdeSURBVHgB7ZkLbFRVGsf/986j8+i0M9MHnZa+QKCuXVwE45YlAaKGZWsIZLeSbLtbVxOzkG5W08RHaDCiqCH4lhiMT7DaqFgRhRikCmpVQKGiDlWkhT6mdIaZdt4zd+4cz72jUy4z086rG',
  //   );
  // });

  it('_createPoiMarkerHtmlForCanvas(1): should create HTML content for POI marker on canvas', async () => {
    const selected = false;
    const value = {
      properties: {
        feature_image: {
          sizes: {
            '108x137': 'https://example.com/image.jpg',
          },
        },
      },
    };

    const expectedHtml =
      '\n    <div class="webmapp-map-poimarker-container" style="position: relative;width: 30px;height: 60px;">\n        <svg width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style=" position: absolute;  width: 46px;  height: 46px;  left: 0px;  top: 0px;">\n          <circle opacity="0.2" cx="23" cy="23" r="23" fill="red"/>\n          <rect x="5" y="5" width="36" height="36" rx="18" fill="url(#img)" stroke="white" stroke-width="2"/>\n          <defs>\n            <pattern height="100%" width="100%" patternContentUnits="objectBoundingBox" id="img">\n              <image height="1" width="1" preserveAspectRatio="xMidYMid slice" xlink:href="data:image/png;base64,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">\n              </image>\n            </pattern>\n          </defs>\n        </svg> </div>';
    const htmlTextCanvas = await wmMapTrackRelatedPoisDirective['_createPoiMarkerHtmlForCanvas'](
      mockPoi,
      selected,
    );

    expect(htmlTextCanvas).toEqual(expectedHtml);
  });

  it('_deselectCurrentPoi: should remove the selected poi layer', () => {
    const removeLayerSpy = spyOn(wmMapTrackRelatedPoisDirective.mapCmp.map, 'removeLayer');

    wmMapTrackRelatedPoisDirective['_selectedPoiLayer'] = new VectorLayer({
      source: new VectorSource(),
    });

    wmMapTrackRelatedPoisDirective['_selectedPoiMarker'] = {
      poi: mockPoi,
      icon: new Feature(),
      id: '1',
    };

    wmMapTrackRelatedPoisDirective['_deselectCurrentPoi']();
    fixture.detectChanges();

    expect(wmMapTrackRelatedPoisDirective['_selectedPoiLayer']).toBeUndefined();
  });

  xit('_fitView: should fit view with provided extent and options', () => {
    /*TODO: fix the function is not called.
    Expected spy fitView to have been called with:
    [ [ 0, 0, 10, 10 ], Object({ maxZoom: 10, duration: 100, size: [ 100, 100 ] }) ]
    but it was never called.*/
    spyOn<any>(wmMapTrackRelatedPoisDirective, '_fitView');
    spyOn<any>(wmMapTrackRelatedPoisDirective.mapCmp, 'fitView');

    wmMapTrackRelatedPoisDirective['_fitView'](mockExtent, mockOptions);
    fixture.detectChanges();
    expect(wmMapTrackRelatedPoisDirective.mapCmp.fitView).toHaveBeenCalledWith(
      mockExtent,
      mockOptions,
    );
  });

  it('_getPoi: should return the point of interest with the specified ID', () => {
    const id = 1;
    const mockRelatedPois: IGeojsonFeature[] = [
      {
        type: 'Feature',
        properties: {id: 1},
        geometry: {type: EGeojsonGeometryTypes.POINT, coordinates: [0, 0]},
      },
      {
        type: 'Feature',
        properties: {id: 2},
        geometry: {type: EGeojsonGeometryTypes.POINT, coordinates: [1, 1]},
      },
    ];

    wmMapTrackRelatedPoisDirective['_relatedPois'] = mockRelatedPois;
    const poi = wmMapTrackRelatedPoisDirective['_getPoi'](id);
    fixture.detectChanges();

    expect(poi).toBeDefined();
    const poiWithId = mockRelatedPois.find(p => p.properties.id === id);
    expect(poi).toEqual(poiWithId);
  });

  xit('_resetView: should reset the view', () => {
    //TODO: fix Error: <spyOn> : _poisLayer() method does not exist
    const fitViewSpy = spyOn(wmMapTrackRelatedPoisDirective.mapCmp, 'fitView');
    spyOn<any>(wmMapTrackRelatedPoisDirective, '_poisLayer');
    spyOn<any>(wmMapTrackRelatedPoisDirective, '_selectedPoiLayer');

    const selectedPoiLayer = (wmMapTrackRelatedPoisDirective['_selectedPoiLayer'] = new VectorLayer(
      {
        source: new VectorSource(),
      },
    ));

    wmMapTrackRelatedPoisDirective['_resetView']();
    fixture.detectChanges();

    expect(fitViewSpy).toHaveBeenCalledWith(mockExtent, mockOptions);
    expect(selectedPoiLayer).toBeUndefined();
  });

  xit('_selectCurrentPoi: should select the current point of interest', async () => {
    //TODO: fix Error: <spyOn> : _selectedPoiLayer() method does not exist
    spyOn<any>(wmMapTrackRelatedPoisDirective, '_deselectCurrentPoi');
    spyOn(wmMapTrackRelatedPoisDirective.mapCmp.map, 'addLayer');
    spyOn<any>(wmMapTrackRelatedPoisDirective, '_createPoiCanvasIcon').and.returnValue(
      Promise.resolve({marker: {icon: new Feature()}}),
    );
    spyOn<any>(wmMapTrackRelatedPoisDirective, '_selectedPoiLayer').and.callThrough();
    spyOn<any>(wmMapTrackRelatedPoisDirective, 'addFeatureToLayer');

    await wmMapTrackRelatedPoisDirective['_selectCurrentPoi'](poiMarker);

    expect(wmMapTrackRelatedPoisDirective['_deselectCurrentPoi']).toHaveBeenCalled();
    expect(wmMapTrackRelatedPoisDirective.mapCmp.map.addLayer).toHaveBeenCalledWith(
      wmMapTrackRelatedPoisDirective['_selectedPoiLayer'],
    );
    expect(wmMapTrackRelatedPoisDirective['_createPoiCanvasIcon']).toHaveBeenCalledWith(
      poiMarker.poi,
      null,
      true,
    );
  });
});
