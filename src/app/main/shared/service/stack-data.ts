import { Injectable } from '@angular/core';
import { StackIcon } from '../interfaces/stack.interface';

/**
 * Die Technikzeichen fuer das Laufband, in zwei Reihen.
 *
 * Die Aufteilung ist nicht zufaellig: Oben laeuft der taegliche Stack,
 * unten alles Weitere. Dadurch traegt die obere Reihe das, woran man ihn
 * zuerst erkennen soll, auch wenn man nur kurz hinsieht.
 *
 * Die Zeichen liegen als einfarbige SVG im Projekt und werden per CSS-Maske
 * eingefaerbt. Bewusst nicht vom CDN geladen: Die Seite soll ohne fremde
 * Server auskommen, und zwanzig Markenfarben wuerden die Ein-Akzent-Regel
 * der Seite zerlegen.
 */
@Injectable({ providedIn: 'root' })
export class StackData {
  readonly rowTop: readonly StackIcon[] = [
    { name: 'Python', icon: 'python' },
    { name: 'Django', icon: 'django' },
    { name: 'JavaScript', icon: 'javascript' },
    { name: 'TypeScript', icon: 'typescript' },
    { name: 'Angular', icon: 'angular' },
    { name: 'Node.js', icon: 'nodedotjs' },
    { name: 'Docker', icon: 'docker' },
    { name: 'PostgreSQL', icon: 'postgresql' },
    { name: 'Redis', icon: 'redis' },
    { name: 'Linux', icon: 'linux' },
    { name: 'Git', icon: 'git' },
  ];

  readonly rowBottom: readonly StackIcon[] = [
    { name: 'React', icon: 'react' },
    { name: 'NestJS', icon: 'nestjs' },
    { name: 'Tailwind', icon: 'tailwindcss' },
    { name: 'SQLite', icon: 'sqlite' },
    { name: 'Firebase', icon: 'firebase' },
    { name: 'Supabase', icon: 'supabase' },
    { name: 'Proxmox', icon: 'proxmox' },
    { name: 'MQTT', icon: 'mqtt' },
    { name: 'Home Assistant', icon: 'homeassistant' },
    { name: 'GSAP', icon: 'greensock' },
    { name: 'Figma', icon: 'figma' },
  ];

  /**
   * Woran gerade gearbeitet wird und was als Naechstes ansteht.
   *
   * Die ersten sechs stehen so in der HomeLab-Dokumentation: Unraid laeuft
   * dort als Test-VM, Tailscale ist als Zugangsweg entschieden, WireGuard
   * steckt im Media-Stack, Caddy und ZFS sind geplant, Ollama gehoert zum
   * Zielbild. Kubernetes und Azure stehen bewusst daneben: Die sind noch
   * nirgends belegt, und genau deshalb traegt die Reihe eine eigene
   * Beschriftung statt einfach mitzulaufen.
   */
  readonly rowNext: readonly StackIcon[] = [
    { name: 'Unraid', icon: 'unraid' },
    { name: 'Tailscale', icon: 'tailscale' },
    { name: 'WireGuard', icon: 'wireguard' },
    { name: 'Caddy', icon: 'caddy' },
    { name: 'ZFS', icon: 'openzfs' },
    { name: 'Ollama', icon: 'ollama' },
    { name: 'Kubernetes', icon: 'kubernetes' },
    { name: 'Azure', icon: 'azure' },
  ];

  /** Alle Namen am Stueck, fuer die Ausgabe an Screenreader. */
  readonly alle = [...this.rowTop, ...this.rowBottom, ...this.rowNext].map(
    (i) => i.name,
  );
}
