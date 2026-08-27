import { Routes } from '@angular/router';
import { Home } from './main/pages/home/home';

export const routes: Routes = [
  { path: '', component: Home },
  // projects/:slug, legal-notice und privacy-policy kommen mit ihren
  // Sektionen dazu.
  { path: '**', redirectTo: '' },
];
