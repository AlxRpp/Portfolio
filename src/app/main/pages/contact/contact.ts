import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Animations } from '../../shared/service/animations';

type Zustand = 'ruhe' | 'sendet' | 'ok' | 'fehler';

/**
 * Wohin das Formular schickt.
 *
 * Die Datei liegt in public/ und wird dadurch mitgebaut. Im alten
 * Portfolio lag sie unter src/app/ und stand nicht in den Assets: Sie
 * landete nie im Build, der Endpunkt lieferte 404 und jede Nachricht ging
 * verloren. Deshalb hier ein relativer Pfad auf die eigene Domain statt
 * einer fest verdrahteten fremden Adresse.
 */
const ENDPUNKT = '/sendMail.php';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './contact.html',
  styleUrls: ['./contact.scss', './contact-mediaQuerrys.scss'],
})
export class Contact implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly anim = inject(Animations);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Zurueck an den Anfang. Sanft, ausser jemand hat weniger Bewegung
   * eingestellt: eine Seite, die dann ueber sechs Sektionen scrollt,
   * ist genau das, was diese Einstellung vermeiden soll.
   */
  protected nachOben(): void {
    const sanft = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: sanft ? 'smooth' : 'auto' });
  }

  protected readonly mailAdresse = 'info@alexander-ruppel.de';

  /** Ort aus dem Lebenslauf, dieselbe Angabe wie in der Hero. */
  protected readonly ort = 'Delbrück';

  /**
   * Die beiden anderen Saeulen neben dieser Seite. Bewusst hier und nicht
   * in einer Uebersetzungsdatei: Adressen sind keine Sprache.
   */
  protected readonly profile = [
    { name: 'GitHub', icon: 'github', url: 'https://github.com/AlxRpp' },
    {
      name: 'LinkedIn',
      icon: 'linkedin',
      url: 'https://www.linkedin.com/in/alexander-ruppel-450706375/',
    },
  ] as const;
  protected readonly zustand = signal<Zustand>('ruhe');

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    mail: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
    message: ['', [Validators.required, Validators.maxLength(5000)]],
    privacy: [false, Validators.requiredTrue],

    // Honigtopf. Menschen sehen dieses Feld nicht, Bots fuellen es aus.
    // Der Server meldet dann Erfolg, ohne eine Mail zu schicken.
    website: [''],
  });

  protected absenden(): void {
    if (this.zustand() === 'sendet') return;

    if (this.form.invalid) {
      // Erst nach dem Absendeversuch Fehler zeigen, nicht beim Tippen.
      this.form.markAllAsTouched();
      this.ersteFehlerhafteFokussieren();
      return;
    }

    this.zustand.set('sendet');

    this.http
      .post(ENDPUNKT, JSON.stringify(this.form.getRawValue()), {
        // text/plain wie im alten Portfolio, nicht application/json.
        //
        // text/plain gilt in CORS als einfache Anfrage und loest keinen
        // Preflight aus. application/json wuerde erst eine OPTIONS-Anfrage
        // schicken, die serverseitig beantwortet werden muss. Das Skript
        // liest den Rumpf ohnehin roh ueber php://input, der Kopf ist ihm
        // gleichgueltig. So faellt eine ganze Fehlerquelle weg.
        headers: { 'Content-Type': 'text/plain' },
        responseType: 'text',
      })
      .subscribe({
        next: (antwort) => {
          // Bewusst NICHT jedes 200 als Erfolg werten.
          //
          // Fehlt sendMail.php auf dem Server, liefert die
          // SPA-Rueckfallregel die index.html mit Status 200 aus. Das
          // Formular meldete dann Erfolg, obwohl nie eine Mail entstanden
          // ist. Genau so ist das Formular des alten Portfolios still
          // kaputtgegangen. Deshalb zaehlt nur die Antwort des Skripts.
          if (this.istErfolg(antwort)) {
            this.zustand.set('ok');
            this.form.reset();
          } else {
            this.zustand.set('fehler');
          }
        },
        error: () => this.zustand.set('fehler'),
      });
  }

  /**
   * Entscheidet, ob wirklich eine Mail entstanden ist.
   *
   * Drei Faelle sind zu unterscheiden:
   *   - Das neue Skript antwortet mit {"status":"ok"}.
   *   - Das alte Skript aus dem FTP-Verzeichnis gibt gar nichts aus. Ein
   *     leerer Rumpf gilt deshalb ebenfalls als Erfolg, damit das
   *     Formular auch mit der bewaehrten Datei funktioniert.
   *   - Fehlt die Datei, liefert die SPA-Rueckfallregel die index.html mit
   *     Status 200. Das faengt die Pruefung auf spitze Klammern ab. Genau
   *     dieser Fall hat das alte Formular still kaputtgemacht.
   */
  private istErfolg(antwort: unknown): boolean {
    if (typeof antwort !== 'string') return false;

    const rumpf = antwort.trim();
    if (rumpf === '') return true;
    if (rumpf.startsWith('<')) return false;

    try {
      return (JSON.parse(rumpf) as { status?: string }).status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Springt zum ersten Feld mit Fehler, damit man nicht suchen muss.
   *
   * Erst im naechsten Frame: markAllAsTouched setzt nur den Zustand, die
   * Klasse is-invalid haengt an der Klassenbindung und steht erst nach der
   * naechsten Aenderungserkennung im DOM. Vorher fände die Suche nichts.
   */
  private ersteFehlerhafteFokussieren(): void {
    requestAnimationFrame(() => {
      const feld = this.host.nativeElement.querySelector<HTMLElement>(
        '.contact__field.is-invalid input, .contact__field.is-invalid textarea',
      );

      // Fehlt ein Textfeld, liegt der Fehler bei der Zustimmung.
      const ziel =
        feld ??
        this.host.nativeElement.querySelector<HTMLElement>(
          '.contact__consent.is-invalid input',
        );

      ziel?.focus();
    });
  }

  protected fehlerhaft(name: string): boolean {
    const c = this.form.get(name);
    return Boolean(c && c.invalid && c.touched);
  }

  ngAfterViewInit(): void {
    const el = this.host.nativeElement;

    this.anim.staggerChildren(el, '.contact__head [data-reveal]', {
      scroll: true,
      stagger: 0.08,
      y: 20,
    });

    // Bewusst nur der dekorative Block. Die Formularfelder bleiben
    // ungeanimiert sichtbar: Wuerde ein Scroll-Ausloeser einmal nicht
    // feuern, waere sonst das gesamte Kontaktformular unsichtbar und die
    // Seite haette keinen Weg mehr zu Alexander. Bedienelemente duerfen
    // nicht davon abhaengen, dass eine Animation laeuft.
    this.anim.revealEach(el, '[data-block]', { y: 22, duration: 0.5 });

    // Dieselbe Bewegung wie beim Namen in der Hero. Anfang und Ende der
    // Seite tragen damit dieselbe Geste, statt dass ein weiterer Effekt
    // dazukommt.
    void document.fonts.ready.then(() => {
      const adresse = el.querySelector('.contact__mail-text');
      if (adresse) this.anim.splitHeadline(adresse, { scroll: true, delay: 0.1 });
    });
  }
}
