// @ts-nocheck — mock GeoJSON payloads vs strict WmFeatureCollection typing, same convention as pois.directive.spec.ts
import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {By} from '@angular/platform-browser';
import {HttpClient} from '@angular/common/http';
import {ActivatedRoute} from '@angular/router';
import {Store} from '@ngrx/store';
import {of, throwError} from 'rxjs';

import {WmMapComponent, WmMapControls} from '../components';
import {mockMapConf} from 'src/const.spec';
import {WmMapHitMapDirective} from './hit-map.directive';
import {hitMapBoundariesLocalForage} from '@map-core/utils';

const HIT_MAP_URL = 'https://carg.example/confini.geojson';

const validGeojson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {carg_code: '1-A', id: 1},
      geometry: {type: 'MultiPolygon', coordinates: []},
    },
  ],
};

@Component({
  standalone: false,
  template: `<wm-map wmMapHitMapCollection [wmMapHitMapUrl]="hitMapUrl" [wmMapConf]="conf"></wm-map>`,
})
class TestComponent {
  conf = mockMapConf;
  hitMapUrl = HIT_MAP_URL;
}

describe('WmMapHitMapDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let directive: WmMapHitMapDirective;
  let httpGetSpy: jasmine.Spy;

  async function setup(): Promise<void> {
    TestBed.configureTestingModule({
      declarations: [WmMapHitMapDirective, TestComponent, WmMapComponent, WmMapControls],
      imports: [CommonModule],
      providers: [
        {provide: HttpClient, useValue: {get: () => of(null)}},
        {provide: Store, useValue: {dispatch: () => {}, select: () => of(null)}},
        {provide: ActivatedRoute, useValue: {snapshot: {}, paramMap: of(null), queryParamMap: of(null)}},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    const directiveEl = fixture.debugElement.query(By.directive(WmMapHitMapDirective));
    directive = directiveEl.injector.get(WmMapHitMapDirective);
    const http = directiveEl.injector.get(HttpClient);
    httpGetSpy = spyOn(http, 'get');

    await directive.mapCmp.isInit$;
  }

  it('fetch riuscito con payload valido: costruisce il layer e salva in cache', async () => {
    await setup();
    const saveSpy = spyOn(hitMapBoundariesLocalForage, 'setItem').and.resolveTo(validGeojson);
    const buildSpy = spyOn<any>(directive, '_buildGeojson');
    const tileSpy = spyOn<any>(directive, '_addTileLayer');
    httpGetSpy.and.returnValue(of(validGeojson));

    fixture.detectChanges();
    directive.wmMapHitMapUrl = HIT_MAP_URL;
    await Promise.resolve();
    directive.mapCmp.map.dispatchEvent('precompose' as any);

    expect(saveSpy).toHaveBeenCalledWith(HIT_MAP_URL, validGeojson);
    expect(buildSpy).toHaveBeenCalledWith(validGeojson);
    expect(tileSpy).toHaveBeenCalled();
  });

  it('fetch fallito con cache presente: costruisce il layer dalla cache', async () => {
    await setup();
    spyOn(hitMapBoundariesLocalForage, 'getItem').and.resolveTo(validGeojson as any);
    const buildSpy = spyOn<any>(directive, '_buildGeojson');
    const tileSpy = spyOn<any>(directive, '_addTileLayer');
    httpGetSpy.and.returnValue(throwError(() => new Error('offline')));

    fixture.detectChanges();
    directive.wmMapHitMapUrl = HIT_MAP_URL;
    await Promise.resolve();
    await Promise.resolve();
    directive.mapCmp.map.dispatchEvent('precompose' as any);

    expect(buildSpy).toHaveBeenCalledWith(validGeojson);
    expect(tileSpy).toHaveBeenCalled();
  });

  it('fetch fallito e cache assente: nessun layer, nessuna eccezione', async () => {
    await setup();
    spyOn(hitMapBoundariesLocalForage, 'getItem').and.resolveTo(null);
    const buildSpy = spyOn<any>(directive, '_buildGeojson');
    const tileSpy = spyOn<any>(directive, '_addTileLayer');
    httpGetSpy.and.returnValue(throwError(() => new Error('offline')));

    expect(() => {
      fixture.detectChanges();
      directive.wmMapHitMapUrl = HIT_MAP_URL;
    }).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();

    expect(buildSpy).not.toHaveBeenCalled();
    expect(tileSpy).not.toHaveBeenCalled();
  });

  it('fetch riuscito con payload non valido: non sovrascrive la cache e fa fallback', async () => {
    await setup();
    const setItemSpy = spyOn(hitMapBoundariesLocalForage, 'setItem');
    spyOn(hitMapBoundariesLocalForage, 'getItem').and.resolveTo(validGeojson as any);
    const buildSpy = spyOn<any>(directive, '_buildGeojson');
    const tileSpy = spyOn<any>(directive, '_addTileLayer');
    httpGetSpy.and.returnValue(of({notAFeatureCollection: true}));

    fixture.detectChanges();
    directive.wmMapHitMapUrl = HIT_MAP_URL;
    await Promise.resolve();
    await Promise.resolve();
    directive.mapCmp.map.dispatchEvent('precompose' as any);

    expect(setItemSpy).not.toHaveBeenCalled();
    expect(buildSpy).toHaveBeenCalledWith(validGeojson);
    expect(tileSpy).toHaveBeenCalled();
  });

  it('cache con payload corrotto: la costruzione del layer non propaga eccezioni e non crea il tile layer', async () => {
    await setup();
    spyOn(hitMapBoundariesLocalForage, 'getItem').and.resolveTo(validGeojson as any);
    spyOn<any>(directive, '_buildGeojson').and.throwError('malformed geojson');
    const tileSpy = spyOn<any>(directive, '_addTileLayer');
    httpGetSpy.and.returnValue(throwError(() => new Error('offline')));

    fixture.detectChanges();
    expect(() => {
      directive.wmMapHitMapUrl = HIT_MAP_URL;
    }).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();

    expect(() => directive.mapCmp.map.dispatchEvent('precompose' as any)).not.toThrow();
    expect(tileSpy).not.toHaveBeenCalled();
  });

  it('componente distrutto durante il cache-lookup pendente: nessuna eccezione', async () => {
    await setup();
    let resolveCache: (value: any) => void;
    spyOn(hitMapBoundariesLocalForage, 'getItem').and.returnValue(
      new Promise(resolve => (resolveCache = resolve)),
    );
    httpGetSpy.and.returnValue(throwError(() => new Error('offline')));

    fixture.detectChanges();
    directive.wmMapHitMapUrl = HIT_MAP_URL;
    await Promise.resolve();

    fixture.destroy();
    expect(directive.mapCmp.map).toBeNull();

    expect(() => resolveCache(validGeojson)).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
  });
});
