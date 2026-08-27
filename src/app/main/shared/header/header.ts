import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Language } from '../service/language';
import { MobileNavbar } from './mobile-navbar/mobile-navbar';

export interface NavItem {
  /** Anker der Sektion auf der Startseite. */
  fragment: string;
  /** i18n-Key des Beschriftungstextes. */
  labelKey: string;
}

/** Ab dieser Scrollhöhe bekommt der Header Grund und Kante. */
const SCROLL_THRESHOLD = 24;

/** Unterhalb dieser Breite gilt die mobile Navigation. */
const MOBILE_MAX = 800;

@Component({
  selector: 'app-header',
  imports: [RouterLink, TranslatePipe, MobileNavbar],
  templateUrl: './header.html',
  styleUrls: ['./header.scss', './header-mediaQuerrys.scss'],
})
export class Header {
  protected readonly lang = inject(Language);

  /**
   * Die Einträge stehen hier und nicht im Template, damit Header und
   * mobile Navigation garantiert dieselbe Liste rendern.
   */
  protected readonly nav: readonly NavItem[] = [
    { fragment: 'about', labelKey: 'header.nav.about' },
    { fragment: 'how-i-work', labelKey: 'header.nav.howIWork' },
    { fragment: 'projects', labelKey: 'header.nav.projects' },
    { fragment: 'stack', labelKey: 'header.nav.stack' },
    { fragment: 'contact', labelKey: 'header.nav.contact' },
  ];

  protected readonly scrolled = signal(false);
  protected readonly menuOpen = signal(false);

  @HostListener('window:scroll')
  protected onScroll(): void {
    this.scrolled.set(window.scrollY > SCROLL_THRESHOLD);
  }

  /** Wird der Viewport breit, ist das offene Mobilmenü gegenstandslos. */
  @HostListener('window:resize')
  protected onResize(): void {
    if (window.innerWidth > MOBILE_MAX) this.closeMenu();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.menuOpen()) this.closeMenu();
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
    this.setBackgroundActive(!this.menuOpen());
  }

  protected closeMenu(): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    this.setBackgroundActive(true);
  }

  /**
   * Legt die Seite hinter dem offenen Menü still.
   *
   * Ohne `inert` wandert der Tabulator vom letzten Menüpunkt weiter in
   * den verdeckten Inhalt, man tabbt dann sichtbar ins Nichts. Der
   * Scroll-Riegel verhindert, dass der Hintergrund mitläuft.
   */
  private setBackgroundActive(active: boolean): void {
    document.body.style.overflow = active ? '' : 'hidden';
    document.getElementById('main')?.toggleAttribute('inert', !active);
  }
}
