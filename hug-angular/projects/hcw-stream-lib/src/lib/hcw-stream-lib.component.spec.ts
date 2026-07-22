import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HugAngularLibComponent } from './hcw-stream-lib.component';

describe('HugAngularLibComponent', () => {
  let component: HugAngularLibComponent;
  let fixture: ComponentFixture<HugAngularLibComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HugAngularLibComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HugAngularLibComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
