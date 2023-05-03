import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BtnOrientation } from './btn-orientation.component';

describe('BtnOrientation', () => {
  let component: BtnOrientation;
  let fixture: ComponentFixture<BtnOrientation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BtnOrientation]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BtnOrientation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('BtnOrientation: should create', () => {
    expect(component).toBeTruthy();
  });

  it('BtnOrientation: should set the rotation correctly based on input degrees', () => {
    component.degrees = 45;
    fixture.detectChanges();

    const ionFabButtonElement: HTMLElement = fixture.nativeElement.querySelector(
      'ion-fab-button'
    );
    const divElement: HTMLElement = ionFabButtonElement.querySelector('div');

    expect(divElement.style.transform).toContain('rotate(45deg)');
    expect((divElement.style as any).msTransform).toContain('rotate(45deg)');
  });
});
