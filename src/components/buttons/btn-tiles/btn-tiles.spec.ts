import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BtnTiles } from './btn-tiles';
import TileLayer from 'ol/layer/Tile';
import { XYZ } from 'ol/source';
import { IonIcon } from '@ionic/angular';

describe('BtnTiles', () => {
  let component: BtnTiles;
  let fixture: ComponentFixture<BtnTiles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BtnTiles, IonIcon]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BtnTiles);
    component = fixture.componentInstance;
  });

  it('BtnTiles: should show the button when there is more than one tile layer', () => {
    const fakeTileLayers = [
      new TileLayer({
        source: new XYZ({
          url: 'https://api.webmapp.it/tiles/{z}/{x}/{y}.png'
        })
      }),
      new TileLayer({
        source: new XYZ({
          url:
            'https://api.maptiler.com/tiles/satellite/{z}/{x}/{y}.jpg?key=0Z7ou7nfFFXipdDXHChf'
        })
      })
    ];

    component.tileLayers = fakeTileLayers;
    component.ngOnChanges({
      tileLayers: {
        currentValue: fakeTileLayers,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true
      }
    });
    fixture.detectChanges();

    component.showButton$.subscribe(isVisible => {
      expect(isVisible).toBeTrue();
    });
  });

  it('BtnTiles: should not show the button when there is only one tile layer', () => {
    const fakeTileLayers = [
      new TileLayer({
        source: new XYZ({
          url: 'https://api.webmapp.it/tiles/{z}/{x}/{y}.png'
        })
      })
    ];

    component.tileLayers = fakeTileLayers;
    component.ngOnChanges({
      tileLayers: {
        currentValue: fakeTileLayers,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true
      }
    });
    fixture.detectChanges();

    component.showButton$.subscribe(isVisible => {
      expect(isVisible).toBeFalse();
    });
  });
});
