import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
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
  });

  it('BtnOrientation: should set the rotation correctly based on input degrees', () => {
    const rotationInDegrees = 45;
    component.degrees = rotationInDegrees;
    fixture.detectChanges();

    const divElement = fixture.debugElement.query(By.css('div')).nativeElement;
    const expectedRotation = `rotate(${rotationInDegrees}deg)`;

    expect(divElement.style.transform).toContain(expectedRotation);
  });
});
