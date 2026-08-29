import { Injectable, signal } from '@angular/core';
import {
  Project,
  ProjectCategory,
} from '../interfaces/project.interface';

const GITHUB = 'https://github.com/AlxRpp';

/**
 * Kuratierte Projektliste.
 *
 * Bewusst hier im Frontend und nicht aus einer API: Die Auswahl und ihre
 * Reihenfolge sind eine inhaltliche Entscheidung, keine Daten, die sich
 * ohne Zutun aendern.
 */
@Injectable({ providedIn: 'root' })
export class ProjectsData {
  readonly projects = signal<readonly Project[]>([
    {
      slug: 'fin-vergleichstool',
      category: 'work',
      title: 'FIN-Fahrzeug-Vergleichstool',
      status: 'live',
      year: 2026,
      confidential: true,
      tech: ['NestJS', 'React', 'Python', 'KI-Gateway'],
      descriptionKey: 'fin',
    },
    {
      slug: 'quizly',
      category: 'backend',
      title: 'Quizly',
      status: 'archived',
      year: 2026,
      confidential: false,
      tech: ['Django', 'Python', 'Whisper', 'Gemini API'],
      repoUrl: `${GITHUB}/Quizly_Backend`,
      descriptionKey: 'quizly',
      scopeKey: 'backendOnly',
    },
    {
      slug: 'homelab',
      category: 'current',
      title: 'HomeLab',
      status: 'ongoing',
      year: 2026,
      confidential: false,
      tech: ['Proxmox', 'Docker', 'Zigbee2MQTT', 'Home Assistant', 'MCP'],
      repoUrl: `${GITHUB}/HomeLAB`,
      descriptionKey: 'homelab',
    },
    {
      slug: 'coderr',
      category: 'backend',
      title: 'Coderr',
      status: 'live',
      year: 2026,
      confidential: false,
      tech: ['Django', 'DRF', 'PostgreSQL', 'Docker'],
      liveUrl: 'https://coderr.alexander-ruppel.de',
      repoUrl: `${GITHUB}/Coderr_Backend`,
      descriptionKey: 'coderr',
      scopeKey: 'backendOnly',
    },
    {
      slug: 'faime',
      category: 'work',
      title: 'FAIME',
      status: 'live',
      year: 2026,
      confidential: false,
      tech: ['JavaScript', 'PWA', 'Supabase', 'Firebase'],
      liveUrl: 'https://faime.de',
      descriptionKey: 'faime',
      scopeKey: 'employerCode',
    },

    // --- kompakte Liste ---

    {
      slug: 'videoflix',
      category: 'backend',
      title: 'Videoflix',
      status: 'archived',
      year: 2026,
      confidential: false,
      tech: ['Django', 'ffmpeg', 'HLS', 'Docker'],
      repoUrl: `${GITHUB}/Videoflix_Backend`,
      descriptionKey: 'videoflix',
      scopeKey: 'backendOnly',
    },
    {
      slug: 'kanmind',
      category: 'backend',
      title: 'Kanmind',
      status: 'archived',
      year: 2025,
      confidential: false,
      tech: ['Django', 'DRF'],
      repoUrl: `${GITHUB}/Kanmind_Backend`,
      descriptionKey: 'kanmind',
      scopeKey: 'backendOnly',
    },
    {
      slug: 'kioskbrowser',
      category: 'work',
      title: 'Kioskbrowser',
      status: 'archived',
      year: 2026,
      confidential: true,
      tech: ['Android SDK', 'Kiosk-Mode', 'REST-API'],
      descriptionKey: 'kioskbrowser',
    },
    {
      slug: 'join',
      image: 'join.jpg',
      category: 'frontend',
      title: 'JOIN',
      status: 'live',
      year: 2025,
      confidential: false,
      tech: ['JavaScript', 'HTML', 'CSS', 'Firebase'],
      liveUrl: 'https://join.alexander-ruppel.de',
      repoUrl: `${GITHUB}/JOIN`,
      descriptionKey: 'join',
    },
    {
      slug: 'pokedex',
      image: 'pokedex.jpg',
      category: 'frontend',
      title: 'PokeDex',
      status: 'live',
      year: 2025,
      confidential: false,
      tech: ['JavaScript', 'REST-API'],
      liveUrl: 'https://pokedex.alexander-ruppel.de',
      repoUrl: `${GITHUB}/PokeDex`,
      descriptionKey: 'pokedex',
    },
    {
      slug: 'alien-adventure',
      image: 'alien-adventure.jpg',
      category: 'frontend',
      title: 'Alien Adventure',
      status: 'live',
      year: 2025,
      confidential: false,
      tech: ['JavaScript', 'Canvas'],
      liveUrl: 'https://alien-adventure.alexander-ruppel.de',
      repoUrl: `${GITHUB}/AlienAdventure`,
      descriptionKey: 'alienAdventure',
    },
  ]);

  /** Alle Projekte einer Kategorie, in der Reihenfolge der Liste oben. */
  byCategory(category: ProjectCategory): readonly Project[] {
    return this.projects().filter((p) => p.category === category);
  }

  getBySlug(slug: string): Project | undefined {
    return this.projects().find((p) => p.slug === slug);
  }

  /** Naechster bzw. vorheriger Slug, laufend ueber alle Projekte. */
  nextSlug(current: string): string {
    return this.nachbar(current, 1);
  }

  prevSlug(current: string): string {
    return this.nachbar(current, -1);
  }

  private nachbar(current: string, richtung: 1 | -1): string {
    const slugs = this.projects().map((p) => p.slug);
    const i = slugs.indexOf(current);
    if (i === -1) return slugs[0];
    return slugs[(i + richtung + slugs.length) % slugs.length];
  }
}
