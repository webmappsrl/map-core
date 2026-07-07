import {TestBed} from '@angular/core/testing';
import {HttpClient} from '@angular/common/http';
import {Store} from '@ngrx/store';
import {of, throwError} from 'rxjs';
import {take} from 'rxjs/operators';

import {WmMapButtonControls} from './button.controls.map';
import {ICONTROLSBUTTON} from '../../../types/model';
import {iconBlobsLocalForage} from '../../../utils';

const ICON_URL = 'https://example.com/icons/geologia-punti.png';

const mockControl: ICONTROLSBUTTON = {
  type: 'button',
  id: 1,
  label: {it: 'Geologia punti'},
  icon: '',
  icon_url: ICON_URL,
  url: 'data',
} as unknown as ICONTROLSBUTTON;

describe('WmMapButtonControls', () => {
  let component: WmMapButtonControls;
  let httpGetSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WmMapButtonControls],
      providers: [
        {provide: Store, useValue: {dispatch: () => {}}},
        {provide: HttpClient, useValue: {get: () => of(null)}},
      ],
    });
    const fixture = TestBed.createComponent(WmMapButtonControls);
    component = fixture.componentInstance;
    httpGetSpy = spyOn(TestBed.inject(HttpClient), 'get');
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('fetch riuscito: iconSrc$ emette un object URL e salva il blob in cache', done => {
    const blob = new Blob(['icon'], {type: 'image/png'});
    const saveSpy = spyOn(iconBlobsLocalForage, 'setItem').and.resolveTo(blob);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:mock-1');
    httpGetSpy.and.returnValue(of(blob));

    component.iconSrc$.pipe(take(1)).subscribe(src => {
      expect(src).toBe('blob:mock-1');
      expect(saveSpy).toHaveBeenCalledWith(ICON_URL, blob);
      done();
    });
    component.control = mockControl;
  });

  it('fetch fallito + cache presente: iconSrc$ emette un object URL dal blob di cache', done => {
    const cachedBlob = new Blob(['cached'], {type: 'image/png'});
    spyOn(iconBlobsLocalForage, 'getItem').and.resolveTo(cachedBlob);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:mock-cache');
    httpGetSpy.and.returnValue(throwError(() => new Error('offline')));

    component.iconSrc$.pipe(take(1)).subscribe(src => {
      expect(src).toBe('blob:mock-cache');
      done();
    });
    component.control = mockControl;
  });

  it('fetch fallito + cache assente: iconSrc$ emette l\'URL diretto (fallback invariato)', done => {
    spyOn(iconBlobsLocalForage, 'getItem').and.resolveTo(null);
    httpGetSpy.and.returnValue(throwError(() => new Error('offline')));

    component.iconSrc$.pipe(take(1)).subscribe(src => {
      expect(src).toBe(ICON_URL);
      done();
    });
    component.control = mockControl;
  });

  it('ngOnDestroy: revoca l\'ultimo object URL creato', done => {
    const blob = new Blob(['icon'], {type: 'image/png'});
    const revokeSpy = spyOn(URL, 'revokeObjectURL');
    spyOn(URL, 'createObjectURL').and.returnValue('blob:mock-destroy');
    httpGetSpy.and.returnValue(of(blob));

    component.iconSrc$.pipe(take(1)).subscribe(() => {
      component.ngOnDestroy();
      expect(revokeSpy).toHaveBeenCalledWith('blob:mock-destroy');
      done();
    });
    component.control = mockControl;
  });
});
