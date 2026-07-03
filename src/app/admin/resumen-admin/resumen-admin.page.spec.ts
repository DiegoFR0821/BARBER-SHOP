import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResumenAdminPage } from './resumen-admin.page';

describe('ResumenAdminPage', () => {
  let component: ResumenAdminPage;
  let fixture: ComponentFixture<ResumenAdminPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ResumenAdminPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
