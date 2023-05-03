import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { WmMapControls } from './controls.map';
import TileLayer from 'ol/layer/Tile';

describe('WmMapControls', () => {
  let component: WmMapControls;
  let fixture: ComponentFixture<WmMapControls>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WmMapControls],
      schemas: [NO_ERRORS_SCHEMA]
    });

    fixture = TestBed.createComponent(WmMapControls);
    component = fixture.componentInstance;
  });

  it('WmMapControls: should show the button when there is more than one tile layer', () => {
    component.tileLayers = [new TileLayer(), new TileLayer()];
    component.ngOnChanges({
      tileLayers: {
        currentValue: component.tileLayers,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true
      }
    });

    expect(component.showButton$.value).toBe(true);
  });

  it('WmMapControls: should not show the button when there is only one tile layer', () => {
    component.tileLayers = [new TileLayer()];
    component.ngOnChanges({
      tileLayers: {
        currentValue: component.tileLayers,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true
      }
    });

    expect(component.showButton$.value).toBe(false);
  });
});
