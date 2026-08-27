import { Routes } from '@angular/router';
import { Home } from './main/pages/home/home';
import { LegalNotice } from './main/pages/legal-notice/legal-notice';
import { PrivacyPolicy } from './main/pages/privacy-policy/privacy-policy';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'legal-notice', component: LegalNotice },
  { path: 'privacy-policy', component: PrivacyPolicy },
  // projects/:slug kommt mit den Detailseiten dazu.
  { path: '**', redirectTo: '' },
];
