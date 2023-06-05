import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NO_ERRORS_SCHEMA, SimpleChange} from '@angular/core';
import {WmMapControls} from './controls.map';
import {buildTileLayers} from 'src/utils';
import {mockMapConf, mockTiles} from 'src/const.spec';

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
    component.conf = {tiles: mockTiles};

    fixture.detectChanges();
    component.selectTileLayer(1);
    fixture.detectChanges();
    component.tileLayers.forEach((tile, tidx) => {
      expect(tile.getVisible()).toBe(1 === tidx);
    });
    expect(component.currentTileLayerIdx$.value).toBe(1);
  });
});
