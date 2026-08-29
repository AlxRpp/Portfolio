import { Injectable } from '@angular/core';
import { StackGroup } from '../interfaces/stack.interface';

/**
 * Der Stack, nach Zusammenhang geordnet statt nach Vertrautheit.
 *
 * Jede Spalte beantwortet die Frage "wo benutzt er das", nicht "wie gut
 * kann er das". Das ist die ehrlichere Aussage: Wo etwas steht, laesst
 * sich an den Projekten nachlesen, eine Koennensstufe koennte man nur
 * behaupten.
 *
 * Dopplungen sind Absicht. Python steht bei der Arbeit und im Backend,
 * Docker im Backend und im HomeLab, weil beides stimmt. Jede Technik
 * kuenstlich an genau einen Platz zu zwingen wuerde ein falsches Bild
 * geben.
 *
 * Bewusst nicht dabei: Kubernetes und Azure. Die sind in keinem Projekt
 * belegt, und in einer Spalte mit Kontext wuerden sie behaupten, sie
 * kaemen dort zum Einsatz. Git fehlt aus dem umgekehrten Grund, es
 * gehoert ueberall dazu und trennt deshalb nichts.
 *
 * Die Zeichen liegen als einfarbige SVG im Projekt und werden per
 * CSS-Maske eingefaerbt. Bewusst nicht vom CDN geladen: Die Seite soll
 * ohne fremde Server auskommen.
 */
@Injectable({ providedIn: 'root' })
export class StackData {
  readonly gruppen: readonly StackGroup[] = [
    {
      id: 'work',
      items: [
        { name: 'NestJS', icon: 'nestjs' },
        { name: 'Python', icon: 'python' },
        { name: 'React', icon: 'react' },
        { name: 'Angular', icon: 'angular' },
        { name: 'Expo', icon: 'expo' },
        { name: 'Vite', icon: 'vite' },
        { name: 'Supabase', icon: 'supabase' },
        { name: 'Firebase', icon: 'firebase' },
        { name: 'Railway', icon: 'railway' },
        { name: 'Azure', icon: 'azure' },
        { name: 'Kirby CMS', icon: 'kirby' },
      ],
    },
    {
      // Bewusst ohne Node.js: In den Repos taucht Node ausschliesslich als
      // Bauwerkzeug unter Angular auf, kein einziges Backend-Rahmenwerk in
      // irgendeiner package.json. Die einzige echte Node-Erfahrung ist
      // NestJS auf der Arbeit, und das steht in der Arbeitsspalte, wo es
      // belegt ist.
      id: 'backend',
      items: [
        { name: 'Django', icon: 'django' },
        { name: 'Python', icon: 'python' },
        { name: 'PostgreSQL', icon: 'postgresql' },
        { name: 'SQLite', icon: 'sqlite' },
        { name: 'Redis', icon: 'redis' },
        { name: 'Docker', icon: 'docker' },
        { name: 'FFmpeg', icon: 'ffmpeg' },
      ],
    },
    {
      id: 'frontend',
      items: [
        { name: 'JavaScript', icon: 'javascript' },
        { name: 'TypeScript', icon: 'typescript' },
        { name: 'Angular', icon: 'angular' },
        { name: 'Tailwind', icon: 'tailwindcss' },
        { name: 'Bootstrap', icon: 'bootstrap' },
        { name: 'Material Design', icon: 'materialdesign' },
        { name: 'GSAP', icon: 'greensock' },
        { name: 'Figma', icon: 'figma' },
      ],
    },
    {
      id: 'homelab',
      items: [
        { name: 'Proxmox', icon: 'proxmox' },
        { name: 'Linux', icon: 'linux' },
        { name: 'Docker', icon: 'docker' },
        { name: 'Unraid', icon: 'unraid' },
        { name: 'MQTT', icon: 'mqtt' },
        { name: 'Home Assistant', icon: 'homeassistant' },
        { name: 'WireGuard', icon: 'wireguard' },
      ],
    },
    {
      // Scrum und Kanban sind Vorgehensweisen und keine Marken, in der
      // Markenzeichen-Sammlung gibt es sie deshalb nicht. Die beiden
      // Zeichen stammen aus Material Symbols und sind Sinnbilder statt
      // Logos: ein Brett und eine laufende Figur fuer den Sprint. Bewusst
      // nicht das Logo der Scrum Alliance, das haette eine Zertifizierung
      // behauptet.
      id: 'method',
      items: [
        { name: 'VS Code', icon: 'visualstudiocode' },
        { name: 'Claude Code', icon: 'claudecode' },
        { name: 'MCP', icon: 'modelcontextprotocol' },
        { name: 'Git', icon: 'git' },
        { name: 'GitHub', icon: 'github' },
        { name: 'Postman', icon: 'postman' },
        { name: 'Microsoft 365', icon: 'microsoftoffice' },
        { name: 'Scrum', icon: 'scrum' },
        { name: 'Kanban', icon: 'kanban' },
      ],
    },
  ];
}
