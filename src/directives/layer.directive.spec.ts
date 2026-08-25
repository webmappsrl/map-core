import {Component} from '@angular/core';
import {ComponentFixture, TestBed, fakeAsync, tick} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {By} from '@angular/platform-browser';
import {ActivatedRoute} from '@angular/router';
import {of} from 'rxjs';

import {WmMapComponent} from '../components/map/map.component';
import {WmMapControls} from '../components/controls/controls.map';
import {mockMapConf} from 'src/const.spec';
import {WmMapLayerDirective} from './layer.directive';

@Component({
  template: `<wm-map wmMapLayer [wmMapConf]="conf"></wm-map>`,
  standalone: false,
})
class TestComponent {
  conf = mockMapConf;
}

describe('WmMapLayerDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let wmMapLayerDirective: WmMapLayerDirective;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WmMapLayerDirective, TestComponent, WmMapComponent, WmMapControls],
      imports: [CommonModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { params: {} }, queryParams: of({}) },
        },
      ],
    }).compileComponents();
  });

  beforeEach(fakeAsync(() => {
    fixture = TestBed.createComponent(TestComponent);

    const directiveEl = fixture.debugElement.query(By.directive(WmMapLayerDirective));
    wmMapLayerDirective = directiveEl.injector.get(WmMapLayerDirective);

    // ngAfterViewInit subscribes to wmMapConf$ with a 250ms delay before
    // calling _initMap(); tick() lets that timer elapse so mapCmp.map is a
    // real, initialized OL Map by the time the specs run.
    fixture.detectChanges();
    tick(300);
    fixture.detectChanges();
  }));

  it('_removeMoveEndListenerIfExists: should not call map.un() when _moveEndListener was never assigned', () => {
    const mapUnSpy = spyOn<any>(wmMapLayerDirective.mapCmp.map, 'un').and.callThrough();

    expect(() => wmMapLayerDirective['_removeMoveEndListenerIfExists'](false)).not.toThrow();
    expect(mapUnSpy).not.toHaveBeenCalled();
  });

  it('_removeMoveEndListenerIfExists: should still call map.un() when the listener was previously registered on the map', () => {
    const dummyListener = () => {};
    wmMapLayerDirective['_moveEndListener'] = dummyListener;
    wmMapLayerDirective['_moveEndListenerRegistered'] = true;
    const mapUnSpy = spyOn<any>(wmMapLayerDirective.mapCmp.map, 'un');

    wmMapLayerDirective['_removeMoveEndListenerIfExists'](false);

    expect(mapUnSpy).toHaveBeenCalledWith('moveend', dummyListener);
    expect(wmMapLayerDirective['_moveEndListenerRegistered']).toBe(false);
  });

  it('wmMapLayerEnableFeaturesInViewport(false): should not throw when the feature was never enabled before', fakeAsync(() => {
    expect(() => {
      wmMapLayerDirective.wmMapLayerEnableFeaturesInViewport = false;
      tick();
    }).not.toThrow();
  }));

  it('wmMapLayerEnableFeaturesInViewport(true): should unsubscribe the previous _moveEndSubject$ subscription on repeated activation', fakeAsync(() => {
    wmMapLayerDirective.wmMapLayerEnableFeaturesInViewport = true;
    tick();
    const firstSubscription = wmMapLayerDirective['_featuresInViewportSubscription'];

    wmMapLayerDirective.wmMapLayerEnableFeaturesInViewport = true;
    tick();
    const secondSubscription = wmMapLayerDirective['_featuresInViewportSubscription'];

    expect(firstSubscription).toBeDefined();
    expect(firstSubscription.closed).toBe(true);
    expect(secondSubscription).not.toBe(firstSubscription);
    expect(secondSubscription.closed).toBe(false);
  }));

  it('wmMapLayerEnableFeaturesInViewport(true): should keep a single stable moveend listener registered across repeated activations', fakeAsync(() => {
    wmMapLayerDirective.wmMapLayerEnableFeaturesInViewport = true;
    tick();
    const firstListener = wmMapLayerDirective['_moveEndListener'];
    // Simula la registrazione effettiva sulla mappa, che in produzione avviene
    // dentro _enableFeaturesInViewportCallback al primo cambio di zoom utile.
    wmMapLayerDirective.mapCmp.map.on('moveend', firstListener);

    wmMapLayerDirective.wmMapLayerEnableFeaturesInViewport = true;
    tick();
    const secondListener = wmMapLayerDirective['_moveEndListener'];

    expect(secondListener).toBe(firstListener);
    expect(wmMapLayerDirective.mapCmp.map.getListeners('moveend')?.length).toBe(1);
  }));

  it('should not throw or warn when zoom changes while the feature was never enabled', fakeAsync(() => {
    const consoleWarnSpy = spyOn(console, 'warn');
    const view = wmMapLayerDirective.mapCmp.map.getView();

    expect(() => {
      view.setZoom((view.getZoom() ?? 10) + 1);
      tick();
    }).not.toThrow();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  }));
});
