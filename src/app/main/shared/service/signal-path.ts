import type { Pixelpunkt, Stuetzpunkt } from '../interfaces/signal.interface';

/** Eckenradius in Pixeln. */
const RADIUS = 12;

/**
 * Unterhalb dieser Laenge gelten zwei Punkte als derselbe. Verhindert
 * Segmente der Laenge null, an denen die Normierung durch null teilen
 * und NaN erzeugen wuerde.
 */
const EPS = 0.01;

/**
 * Rechnet die Stuetzpunkte in Pixel um und setzt die Strecke dazwischen
 * aus waagerechten, senkrechten und 45-Grad-Segmenten zusammen.
 *
 * Getrennt von `baueBahn`, weil sich auf der Punktliste pruefen laesst,
 * dass wirklich nur erlaubte Winkel entstehen. Am fertigen d-String mit
 * seinen Rundungen ginge das nicht mehr.
 */
export function baueEcken(
  punkte: readonly Stuetzpunkt[],
  breite: number,
  hoehe: number,
  raster: number,
): Pixelpunkt[] {
  if (punkte.length < 2) return [];
  if (!(breite > 0) || !(hoehe > 0)) return [];

  const pixel = punkte.map((p, i) => {
    // Erster und letzter Punkt rasten nie. Sie sind die Anschluesse an
    // der Naht. Die Regel steht hier und nicht in den Daten, damit ein
    // vergessenes Flag die Naht nicht verschieben kann.
    const amRand = i === 0 || i === punkte.length - 1;
    const rasten = Boolean(p.rasten) && !amRand && raster > 0;
    let x = p.x * breite;
    let y = p.y * hoehe;

    if (rasten) {
      x = Math.round(x / raster) * raster;
      y = Math.round(y / raster) * raster;
    }

    // Der Versatz kommt NACH dem Rasten, sonst zoege das Raster die
    // parallelen Linien wieder aufeinander.
    return { x: x + (p.xVersatz ?? 0), y: y + (p.yVersatz ?? 0) };
  });

  const alle: Pixelpunkt[] = [pixel[0]];
  for (let i = 1; i < pixel.length; i++) {
    const von = alle[alle.length - 1];
    // Die Kennzeichnung gehoert zum Zielpunkt des Segments.
    alle.push(...route(von, pixel[i], Boolean(punkte[i].schraegeZuerst)));
  }

  return entdoppeln(alle);
}

/**
 * Baut den d-String. Ecken werden ausgerundet, damit die Bahn wie eine
 * gefraeste Leiterbahn aussieht und nicht wie ein Treppenmuster.
 *
 * Gibt bei jeder entarteten Eingabe den leeren String zurueck. Ein d mit
 * NaN darin rendert wortlos nichts und ist von Hand kaum zu finden.
 */
export function baueBahn(
  punkte: readonly Stuetzpunkt[],
  breite: number,
  hoehe: number,
  raster: number,
): string {
  const ecken = baueEcken(punkte, breite, hoehe, raster);
  if (ecken.length < 2) return '';

  const teile = [`M ${n(ecken[0].x)},${n(ecken[0].y)}`];

  for (let i = 1; i < ecken.length - 1; i++) {
    const vor = ecken[i - 1];
    const p = ecken[i];
    const nach = ecken[i + 1];

    const l1 = laenge(vor, p);
    const l2 = laenge(p, nach);

    // Nie groesser als das halbe kuerzere Segment. Sonst ueberlappen sich
    // zwei Rundungen und der Pfad schlaegt zurueck.
    const r = Math.min(RADIUS, l1 / 2, l2 / 2);

    const a = zwischen(p, vor, r / l1);
    const b = zwischen(p, nach, r / l2);

    teile.push(`L ${n(a.x)},${n(a.y)}`);
    teile.push(`Q ${n(p.x)},${n(p.y)} ${n(b.x)},${n(b.y)}`);
  }

  const letzter = ecken[ecken.length - 1];
  teile.push(`L ${n(letzter.x)},${n(letzter.y)}`);

  const d = teile.join(' ');
  return d.includes('NaN') ? '' : d;
}

/**
 * Verbindet zwei Punkte mit hoechstens einem Knick, und zwar so, dass nur
 * gerade und 45-Grad-Segmente entstehen.
 */
function route(a: Pixelpunkt, b: Pixelpunkt, schraegeZuerst: boolean): Pixelpunkt[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);

  // Liegen die Punkte auf einer Achse, ist die Strecke bereits gerade.
  if (adx < EPS || ady < EPS) return [b];

  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  const d = Math.min(adx, ady);

  if (schraegeZuerst) {
    return [{ x: a.x + sx * d, y: a.y + sy * d }, b];
  }

  // Sonst erst auf der laengeren Achse vorlaufen, dann die Schraege.
  return adx > ady
    ? [{ x: a.x + sx * (adx - d), y: a.y }, b]
    : [{ x: a.x, y: a.y + sy * (ady - d) }, b];
}

function entdoppeln(punkte: Pixelpunkt[]): Pixelpunkt[] {
  const raus: Pixelpunkt[] = [];
  for (const p of punkte) {
    const letzter = raus[raus.length - 1];
    if (letzter && laenge(letzter, p) < EPS) continue;
    raus.push(p);
  }
  return raus;
}

function laenge(a: Pixelpunkt, b: Pixelpunkt): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Punkt auf der Strecke von `a` nach `b`, im Verhaeltnis `t`. */
function zwischen(a: Pixelpunkt, b: Pixelpunkt, t: number): Pixelpunkt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function n(wert: number): number {
  return Math.round(wert * 100) / 100;
}
