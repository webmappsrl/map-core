import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NO_ERRORS_SCHEMA, SimpleChange} from '@angular/core';
import {WmMapControls} from './controls.map';
import {buildTileLayers} from '../../utils/ol';
import {mockTiles} from '../../const.spec';
import {ICONTROLS, ICONTROLSBUTTON} from '../../types/model';

describe('WmMapControls', () => {
  let component: WmMapControls;
  let fixture: ComponentFixture<WmMapControls>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WmMapControls],
      schemas: [NO_ERRORS_SCHEMA],
    });

    fixture = TestBed.createComponent(WmMapControls);
    component = fixture.componentInstance;
  });

  it('ngOnChanges: should showButton$ equals true when there is more than one tile layer', () => {
    const tileLayers = buildTileLayers(mockTiles);
    component.ngOnChanges({
      tileLayers: new SimpleChange(null, tileLayers, true),
    });
    fixture.detectChanges();
    expect(component.showButton$.value).toBe(true);
  });

  it('ngOnChanges: should showButton$ equals false when there is only one tile layer', () => {
    const tileLayers = buildTileLayers([mockTiles[0]]);
    component.ngOnChanges({
      tileLayers: new SimpleChange(null, tileLayers, true),
    });
    fixture.detectChanges();

    expect(component.showButton$.value).toBe(false);
  });

  it('selectTileLayer: should to be visible the selected layer ', () => {
    const tileLayers = buildTileLayers(mockTiles);
    component.tileLayers = tileLayers;
    const conf: ICONTROLS = {tiles: mockTiles, data: [], overlays: []};
    component.conf = conf;

    fixture.detectChanges();
    component.selectTileLayer(1);
    fixture.detectChanges();
    component.tileLayers.forEach((tile, tidx) => {
      expect(tile.getVisible()).toBe(1 === tidx);
    });
    expect(component.currentTileLayerIdx$.value).toBe(1);
  });

  const mockOverlayButton = (id: number): ICONTROLSBUTTON => ({
    label: {it: `overlay-${id}`},
    type: 'button',
    icon: '',
    id,
    url: 'layers',
  });

  it('wmMapControlClose: external close collapses panel but keeps currentOverlayIdx$ (regression: top-right emit after layer pick)', () => {
    const overlay = mockOverlayButton(42);
    component.toggle$.next(true);
    component.selectOverlay(overlay.id, overlay);
    expect(component.currentOverlayIdx$.value).toBe(42);
    expect(component.toggle$.value).toBe(true);

    component.wmMapControlClose = '';

    expect(component.toggle$.value).toBe(false);
    expect(component.currentOverlayIdx$.value).toBe(42);
  });

  it('wmMapControlClose: wm-map-controls selector does not collapse panel', () => {
    component.toggle$.next(true);
    component.wmMapControlClose = 'wm-map-controls';
    expect(component.toggle$.value).toBe(true);
  });

  it('selectOverlay: selects overlay then toggles off when same id is clicked again', () => {
    const overlay = mockOverlayButton(7);
    const emissions: (ICONTROLSBUTTON | null)[] = [];
    component.overlayEVT.subscribe(v => emissions.push(v));

    component.selectOverlay(7, overlay);
    expect(component.currentOverlayIdx$.value).toBe(7);
    expect(emissions).toEqual([overlay]);

    component.selectOverlay(7, overlay);
    expect(component.currentOverlayIdx$.value).toBe(-1);
    expect(emissions).toEqual([overlay, null]);
  });

  it('selectOverlay: switching id updates currentOverlayIdx$', () => {
    const a = mockOverlayButton(1);
    const b = mockOverlayButton(2);
    component.selectOverlay(1, a);
    expect(component.currentOverlayIdx$.value).toBe(1);
    component.selectOverlay(2, b);
    expect(component.currentOverlayIdx$.value).toBe(2);
  });
});
