import { WmMapComponent } from './map.component';
import * as ol from 'ol';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick
} from '@angular/core/testing';
import TileLayer from 'ol/layer/Tile';
import { XYZ } from 'ol/source';
import { FitOptions } from 'ol/View';
import { Extent } from 'ol/extent';
import { IMAP } from 'src/types/model';
import { toRadians } from 'src/utils';
import { WmMapControls } from '../controls/controls.map';

export const mockMapConf: IMAP = {
  tiles: [
    {
      webmapp: 'https://api.webmapp.it/tiles/{z}/{x}/{y}.png'
    },
    {
      satellite:
        'https://api.maptiler.com/tiles/satellite/{z}/{x}/{y}.jpg?key=0Z7ou7nfFFXipdDXHChf'
    }
  ],
  bbox: [10, 10, 20, 20],
  center: [15, 15],
  defZoom: 12,
  flow_line_quote_orange: 10,
  flow_line_quote_red: 20,
  flow_line_quote_show: true,
  layers: [],
  maxStrokeWidth: 5,
  maxZoom: 18,
  minStrokeWidth: 1,
  minZoom: 6,
  pois: {
    apppoisApiLayer: false,
    poiIconRadius: '10',
    poiIconZoom: '14',
    poiLabelMinZoom: '14',
    poiMaxRadius: '20',
    poiMinRadius: '5',
    poiMinZoom: '6',
    poi_interaction: 'tooltip',
    skipRouteIndexDownload: false,
    taxonomies: {}
  },
  ref_on_track_min_zoom: 10,
  ref_on_track_show: true,
  start_end_icons_min_zoom: 8,
  start_end_icons_show: true
};
describe('WmMapComponent', () => {
  let component: WmMapComponent;
  let fixture: ComponentFixture<WmMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WmMapComponent, WmMapControls]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WmMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('Inputs: should set all inputs correctly', () => {
    const mockTileLayers: TileLayer<XYZ>[] = [
      new TileLayer<XYZ>({
        source: new XYZ({
          url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        })
      })
    ];
    const mockMapTarget = 'ol-map';
    const mockWmMapPadding: number[] = [10, 20, 30, 40];

    component.wmMapConf = mockMapConf;
    component.tileLayers = mockTileLayers;
    component.wmMapTarget = mockMapTarget;
    component.wmMapPadding = mockWmMapPadding;

    expect(component.tileLayers).toEqual(mockTileLayers);
    expect(component.wmMapTarget).toEqual(mockMapTarget);
    expect(component.wmMapPadding).toEqual(mockWmMapPadding);
  });

  it('wmMapRotateEVT$: should emit when map is rotated', done => {
    component.wmMapConf = mockMapConf;
    component.map$.subscribe(map => {
      if (map != null) {
        const view = map.getView();
        view.setRotation(toRadians(45));
        component['_updateDegrees'];
      }
    });

    component.wmMapRotateEVT$.subscribe(rotationDegrees => {
      expect(rotationDegrees).toEqual(45);
      done();
    });
  });

  it(
    'FitView: should call _view.fit with correct parameters and debounce the call',
    fakeAsync(() => {
      const geometryOrExtent: Extent = [10, 10, 20, 20];
      const optOptions: FitOptions = {
        duration: 500
      };

      component['_view'] = new ol.View();
      spyOn(component['_view'], 'fit').and.callThrough();
      component.fitView(geometryOrExtent, optOptions);

      expect(component['_debounceFitTimer']).not.toBeNull();
      tick(500);
      expect(component['_debounceFitTimer']).toBeNull();
      expect(component['_view'].fit).toHaveBeenCalledWith(
        geometryOrExtent,
        optOptions
      );
    })
  );
});
