import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  Component,
  ComponentFactoryResolver,
  SimpleChange
} from '@angular/core';
import { WmMapComponent } from '../components/map/map.component';
import { WmMapTrackDirective } from './track.directive';
import { By } from '@angular/platform-browser';
import { mockMapConf, mockTrack } from '../const.spec';
import { WmMapControls } from 'src/components';
import { AsyncPipe, CommonModule } from '@angular/common';
import { coordsFromLonLat, getLineStyle } from 'src/utils';
import FlowLine from 'ol-ext/style/FlowLine';
import { IonCard, IonCardContent } from '@ionic/angular';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import BaseEvent from 'ol/events/Event';
import { LineString, Point } from 'ol/geom';
import { ILineString } from 'src/types/model';
import { Feature } from 'ol';
import { PinchRotate } from 'ol/interaction';
import { WmMapPopover } from '../components/popover/popover.map';
import { BehaviorSubject } from 'rxjs';

@Component({
  template: `<wm-map
  [wmMapConf]="conf"
  wmMapTrack
  [track]="track"
  [trackElevationChartElements]="elevationChart"
></wm-map>`
})
class TestComponent {
  conf = mockMapConf;
  elevationChart = mockTrack.properties.elevation_chart_image;
  track = mockTrack;
}

@Component({
  template: `<wm-map
  [wmMapConf]="conf"
  wmMapTrack
  [track]="track"
  [trackElevationChartElements]="elevationChart"
></wm-map>`
})
class TestComponentFlowLine {
  conf = { ...mockMapConf, ...{ flow_line_quote_show: true } };
  elevationChart = mockTrack.properties.elevation_chart_image;
  track = mockTrack;
}

describe('WmMapTrackDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let wmMapTrackDirective: WmMapTrackDirective;
  let componentFlowLine: TestComponentFlowLine;
  let fixtureFlowLine: ComponentFixture<TestComponentFlowLine>;
  let wmMapTrackDirectiveFlowLine: WmMapTrackDirective;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [
        WmMapTrackDirective,
        TestComponent,
        TestComponentFlowLine,
        WmMapComponent,
        WmMapControls,
        WmMapPopover,
        AsyncPipe,
        IonCard,
        IonCardContent
      ],
      imports: [CommonModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    fixtureFlowLine = TestBed.createComponent(TestComponentFlowLine);
    component = fixture.componentInstance;
    componentFlowLine = fixtureFlowLine.componentInstance;

    fixture.detectChanges();
    fixtureFlowLine.detectChanges();

    const directiveEl = fixture.debugElement.query(
      By.directive(WmMapTrackDirective)
    );
    wmMapTrackDirective = directiveEl.injector.get(WmMapTrackDirective);
    const directiveElFlowLine = fixtureFlowLine.debugElement.query(
      By.directive(WmMapTrackDirective)
    );
    wmMapTrackDirectiveFlowLine = directiveElFlowLine.injector.get(
      WmMapTrackDirective
    );
  });

  it('drawTrack: track should have default color', () => {
    wmMapTrackDirective.ngOnChanges({
      wmMapConf: new SimpleChange(null, mockMapConf, true),
      track: new SimpleChange(null, mockTrack, true)
    });
    fixture.detectChanges();
    const trackLayer = wmMapTrackDirective['_trackLayer'];
    const styleFn = trackLayer.getStyle() as any;
    const trackLayerStyle = styleFn()[styleFn().length - 1];
    const style = getLineStyle(wmMapTrackDirective.wmMapTrackColor)[
      getLineStyle(wmMapTrackDirective.wmMapTrackColor).length - 1
    ];

    expect(style.getStroke().getColor()).toBe(
      trackLayerStyle.getStroke().getColor()
    );
  });

  it('drawTrack: track should have #cbdf15 color', () => {
    wmMapTrackDirective.ngOnChanges({
      wmMapConf: new SimpleChange(null, mockMapConf, true),
      track: new SimpleChange(null, mockTrack, true)
    });
    wmMapTrackDirective.wmMapTrackColor = '#cbdf15';
    fixture.detectChanges();
    const trackLayer = wmMapTrackDirective['_trackLayer'];
    const styleFn = trackLayer.getStyle() as any;
    const trackLayerStyle = styleFn()[styleFn().length - 1];
    const style = getLineStyle(wmMapTrackDirective.wmMapTrackColor)[
      getLineStyle(wmMapTrackDirective.wmMapTrackColor).length - 1
    ];

    expect(style.getStroke().getColor()).toBe(
      trackLayerStyle.getStroke().getColor()
    );
  });

  it('drawTrack: track should have flow line color', () => {
    wmMapTrackDirectiveFlowLine.ngOnChanges({
      wmMapConf: new SimpleChange(null, mockMapConf, true),
      track: new SimpleChange(null, mockTrack, true)
    });

    wmMapTrackDirectiveFlowLine.wmMapTrackColor = '#cbdf15';
    fixtureFlowLine.detectChanges();
    const trackLayer = wmMapTrackDirectiveFlowLine['_trackLayer'];
    const styleFn = trackLayer.getStyle() as any;
    const trackLayerStyle = styleFn();

    expect(trackLayerStyle).toBeInstanceOf(FlowLine);
  });

  it('_centerMapToTrack: should center the map view to the track', () => {
    wmMapTrackDirective.ngOnChanges({
      wmMapConf: new SimpleChange(null, mockMapConf, true),
      track: new SimpleChange(null, mockTrack, true)
    });

    spyOn(wmMapTrackDirective.mapCmp.map.getView(), 'fit');
    // extent iniziale della traccia
    const trackExt = wmMapTrackDirective['_trackLayer'].getSource().getExtent();
    wmMapTrackDirective['_centerMapToTrack']();
    wmMapTrackDirective.mapCmp.map.getView().setCenter([0, 0]); // va aggiunto se no da errore il calculateExtent
    wmMapTrackDirective.mapCmp.map.dispatchEvent(
      new BaseEvent('rendercomplete')
    );
    // extent dopo l'esecuzione della _centerMapToTrack
    const extAfterCenterMapToTrack = wmMapTrackDirective.mapCmp.map
      .getView()
      .calculateExtent();
    wmMapTrackDirective.mapCmp.map.getView().fit(trackExt, {
      padding: [80, 80, 80, 80],
      duration: 500
    });
    // extent ricalcolato partendo dall' extent della traccia
    const extMocked = wmMapTrackDirective.mapCmp.map
      .getView()
      .calculateExtent();
    // questo expect controlla se _centerMapToTrack venga chiamato effettivamente sull' extent della track
    expect(JSON.stringify(extAfterCenterMapToTrack)).toBe(
      JSON.stringify(extMocked)
    );
    // questo expect controlla se _centerMapToTrack viene chiamato con le opzioni esatte
    expect(
      wmMapTrackDirective.mapCmp.map.getView().fit
    ).toHaveBeenCalledWith(jasmine.any(Array), {
      padding: [80, 80, 80, 80],
      duration: 500
    });
  });

  it('_drawTemporaryLocationFeature: should draw a temporary location feature', () => {
    const location = {
      latitude: 45.0,
      longitude: 9.0,
      accuracy: 10,
      altitude: 100,
      altitudeAccuracy: 10,
      bearing: 0,
      speed: 1,
      time: 1234567890
    };
    const track = mockTrack;

    wmMapTrackDirective['_drawTemporaryLocationFeature'](location, track);

    expect(wmMapTrackDirective['_elevationChartSource']).toBeInstanceOf(
      VectorSource
    );
    expect(wmMapTrackDirective['_elevationChartLayer']).toBeInstanceOf(
      VectorLayer
    );

    const pointFeature = wmMapTrackDirective['_elevationChartPoint'];
    expect(pointFeature).toBeInstanceOf(Feature);
    expect(pointFeature.getGeometry().getCoordinates()).toEqual(
      new Point(
        coordsFromLonLat([location.longitude, location.latitude])
      ).getCoordinates()
    );

    const trackFeature = wmMapTrackDirective['_elevationChartTrack'];

    expect(trackFeature).toBeInstanceOf(Feature);
    expect(trackFeature.getGeometry().getCoordinates()).toEqual(
      new LineString(
        (track.geometry.coordinates as ILineString).map(value =>
          coordsFromLonLat(value)
        )
      ).getCoordinates()
    );
  });

  it('_getGeoJson: should return the geojson property if it exists', () => {
    const input = {
      geojson: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [10.267605401, 43.794218975]
        }
      },
      otherProperty: 'test'
    };

    const result = wmMapTrackDirective['_getGeoJson'](input);
    expect(result).toEqual(input.geojson);
  });

  it('_getGeoJson: should return the geometry property if it exists', () => {
    const input = {
      geometry: {
        type: 'LineString',
        coordinates: [10.280758, 43.777285, 2, 0]
      },
      otherProperty: 'test'
    };

    const result = wmMapTrackDirective['_getGeoJson'](input);
    expect(result).toEqual(input.geometry);
  });

  it('_getGeoJson: should return the _geometry property if it exists', () => {
    const input = {
      _geometry: { type: 'Point', coordinates: [10.267605401, 43.794218975] },
      type: 'Feature',
      properties: {
        id: 73649,
        created_at: '2023-03-13T12:40:00.000000Z',
        updated_at: '2023-04-27T10:44:42.000000Z',
        name: {
          it: 'Da Marina di Vecchiano a Viareggio',
          en: 'From Marina di Vecchiano to Viareggio',
          es: null
        }
      }
    };

    const result = wmMapTrackDirective['_getGeoJson'](input);
    expect(result).toEqual(input._geometry);
  });

  it('_getGeoJson: should return the input object if no geojson, geometry, or _geometry properties exist', () => {
    const input = {};

    const result = wmMapTrackDirective['_getGeoJson'](input);
    expect(result).toEqual(input);
  });

  it('_init: should add _startEndLayer to the map', () => {
    wmMapTrackDirective['_init']();

    const features = wmMapTrackDirective['_startEndLayer']
      .getSource()
      .getFeatures();
    expect(features.length).toBe(2);
    expect(features).toContain(wmMapTrackDirective['_startFeature']);
    expect(features).toContain(wmMapTrackDirective['_endFeature']);
  });

  it('_init: should draw the track on the map', () => {
    spyOn(wmMapTrackDirective, 'drawTrack').and.callThrough();
    wmMapTrackDirective['_init']();
    expect(wmMapTrackDirective.drawTrack).toHaveBeenCalledWith(
      wmMapTrackDirective.track
    );
  });

  it('_init: should add the PinchRotate interaction to the map', () => {
    wmMapTrackDirective['_init']();
    const interactions = wmMapTrackDirective.mapCmp.map.getInteractions();
    const pinchRotateInteraction = interactions
      .getArray()
      .find(interaction => interaction instanceof PinchRotate);
    expect(pinchRotateInteraction).toBeTruthy();
  });

  it('_initPopover: should create and insert a WmMapPopover component as the first child of wm-map', () => {
    const viewContainerRef = wmMapTrackDirective['viewContainerRef'];
    const createComponentSpy = spyOn(
      viewContainerRef,
      'createComponent'
    ).and.callThrough();
    const wmMapElement = wmMapTrackDirective['element'].nativeElement;
    const insertBeforeSpy = spyOn(
      wmMapElement,
      'insertBefore'
    ).and.callThrough();

    wmMapTrackDirective['_initPopover']();

    const componentFactoryResolver = TestBed.inject(ComponentFactoryResolver);
    expect(createComponentSpy).toHaveBeenCalledOnceWith(
      componentFactoryResolver.resolveComponentFactory(WmMapPopover)
    );

    const wmMapPopoverElement = createComponentSpy.calls.first().returnValue
      .location.nativeElement;
    expect(insertBeforeSpy).toHaveBeenCalledOnceWith(
      wmMapPopoverElement,
      jasmine.anything()
    );

    expect(wmMapElement.firstChild).toBe(wmMapPopoverElement);
  });

  it('_resetView: should reset all layers, sources, and popoverRef if defined', () => {
    const map = wmMapTrackDirective.mapCmp.map;

    wmMapTrackDirective['_elevationChartLayer'] = new VectorLayer();
    wmMapTrackDirective['_elevationChartSource'] = new VectorSource();
    wmMapTrackDirective['_elevationChartPoint'] = new Feature();
    wmMapTrackDirective['_elevationChartTrack'] = new Feature();
    wmMapTrackDirective['trackElevationChartElements'] = new VectorSource();
    wmMapTrackDirective['_startEndLayer'] = new VectorLayer();
    wmMapTrackDirective['_trackLayer'] = new VectorLayer();
    wmMapTrackDirective['_popoverRef'] = {
      instance: { message$: new BehaviorSubject(null) }
    } as any;

    spyOn(
      wmMapTrackDirective['_elevationChartSource'],
      'removeFeature'
    ).and.callThrough();
    spyOn(
      wmMapTrackDirective['_elevationChartSource'],
      'clear'
    ).and.callThrough();
    spyOn(map, 'removeLayer').and.callThrough();
    spyOn(
      wmMapTrackDirective['_popoverRef'].instance.message$,
      'next'
    ).and.callThrough();

    wmMapTrackDirective['_resetView']();

    expect(
      wmMapTrackDirective['_elevationChartSource'].removeFeature
    ).toHaveBeenCalledWith(jasmine.any(Feature));

    expect(
      wmMapTrackDirective['_elevationChartSource'].clear
    ).toHaveBeenCalled();
    expect(map.removeLayer).toHaveBeenCalledTimes(3);
    expect(
      wmMapTrackDirective['_popoverRef'].instance.message$.next
    ).toHaveBeenCalledWith(null);

    expect(wmMapTrackDirective['_elevationChartLayer']).toBeUndefined();
    expect(wmMapTrackDirective['_elevationChartPoint']).toBeUndefined();
    expect(wmMapTrackDirective['_elevationChartTrack']).toBeUndefined();
    expect(wmMapTrackDirective['trackElevationChartElements']).toBeUndefined();
    expect(wmMapTrackDirective['_startEndLayer']).toBeUndefined();
    expect(wmMapTrackDirective['_trackLayer']).toBeUndefined();
  });
});
