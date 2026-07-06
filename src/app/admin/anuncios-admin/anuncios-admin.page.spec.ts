import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnunciosAdminPage } from './anuncios-admin.page';

describe('AnunciosAdminPage', () => {
  let component: AnunciosAdminPage;
  let fixture: ComponentFixture<AnunciosAdminPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AnunciosAdminPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
