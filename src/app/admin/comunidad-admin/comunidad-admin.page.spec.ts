import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComunidadAdminPage } from './comunidad-admin.page';

describe('ComunidadAdminPage', () => {
  let component: ComunidadAdminPage;
  let fixture: ComponentFixture<ComunidadAdminPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ComunidadAdminPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
