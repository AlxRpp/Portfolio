import type { Pixelpunkt, Stuetzpunkt } from '../interfaces/signal.interface';

/** Eckenradius in Pixeln, wenn keiner angegeben wird. */
export const RADIUS = 12;

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
 * Getrennt vom Zeichnen, weil sich auf der Punktliste pruefen laesst,
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
    // Punkte wieder von ihrer Sollstelle weg.
    return { x: x + (p.xVersatz ?? 0), y: y + (p.yVersatz ?? 0) };
  });

  const alle: Pixelpunkt[] = [pixel[0]];
  for (let i = 1; i < pixel.length; i++) {
    const von = alle[alle.length - 1];
    // Die Kennzeichnung gehoert zum Zielpunkt des Segments.
    if (punkte[i].direkt) alle.push(pixel[i]);
    else alle.push(...route(von, pixel[i], Boolean(punkte[i].schraegeZuerst)));
  }

  return entdoppeln(alle);
}

/**
 * Versetzt einen Streckenzug senkrecht zu sich selbst.
 *
 * `d` groesser null versetzt nach rechts, bezogen auf die Laufrichtung.
 *
 * Das ist der einzige richtige Weg zu einem parallelen Buendel. Versetzt
 * man stattdessen die Stuetzpunkte von Hand, stimmt der Abstand nur auf
 * den Geraden: In einer 45-Grad-Schraege spreizt dasselbe Buendel um 41
 * Prozent auf, bei einer anderen Neigung um einen anderen Faktor. Hier
 * werden die Segmente selbst verschoben und die Ecken als deren
 * Schnittpunkte neu bestimmt. Damit stimmt der Abstand bei jedem Winkel.
 */
export function versetze(
  ecken: readonly Pixelpunkt[],
  d: number,
): Pixelpunkt[] {
  if (ecken.length < 2) return [];
  if (d === 0) return [...ecken];

  const richtung: Pixelpunkt[] = [];
  const normale: Pixelpunkt[] = [];

  for (let i = 0; i < ecken.length - 1; i++) {
    const dx = ecken[i + 1].x - ecken[i].x;
    const dy = ecken[i + 1].y - ecken[i].y;
    const l = Math.hypot(dx, dy);
    if (l < EPS) return [];
    const u = { x: dx / l, y: dy / l };
    richtung.push(u);
    // Rechte Normale in Bildschirmkoordinaten, y zeigt nach unten.
    normale.push({ x: -u.y, y: u.x });
  }

  const schieb = (p: Pixelpunkt, n: Pixelpunkt): Pixelpunkt => ({
    x: p.x + d * n.x,
    y: p.y + d * n.y,
  });

  const raus: Pixelpunkt[] = [schieb(ecken[0], normale[0])];

  for (let i = 1; i < ecken.length - 1; i++) {
    const vor = schieb(ecken[i], normale[i - 1]);
    const nach = schieb(ecken[i], normale[i]);
    // Laufen beide Segmente in dieselbe Richtung, gibt es keinen
    // Schnittpunkt. Dann liegen die verschobenen Punkte ohnehin
    // aufeinander und einer von beiden genuegt.
    raus.push(schneide(vor, richtung[i - 1], nach, richtung[i]) ?? nach);
  }

  raus.push(schieb(ecken[ecken.length - 1], normale[normale.length - 1]));
  return raus;
}

/**
 * Schreibt einen Streckenzug als d-String.
 *
 * `radius` null ergibt scharfe Gehrungen, und das ist der Regelfall fuer
 * ein Buendel: Gerundet braeuchte jede Linie ihren eigenen Radius, damit
 * die Boegen konzentrisch bleiben. Konstruierbar ist das nur, wenn die
 * angrenzenden Segmente mindestens doppelt so lang sind wie der groesste
 * dieser Radien. An der Ecke zum rechten Rand stehen dafuer 44 Pixel zur
 * Verfuegung, noetig waeren bis zu 61.
 *
 * Gibt bei jeder entarteten Eingabe den leeren String zurueck. Ein d mit
 * NaN darin rendert wortlos nichts und ist von Hand kaum zu finden.
 */
export function zeichne(
  ecken: readonly Pixelpunkt[],
  radius: number = 0,
): string {
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
    const r = Math.min(Math.max(radius, 0), l1 / 2, l2 / 2);

    if (r < EPS) {
      teile.push(`L ${n(p.x)},${n(p.y)}`);
      continue;
    }

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

/** Umrechnen, verbinden und zeichnen in einem Schritt. */
export function baueBahn(
  punkte: readonly Stuetzpunkt[],
  breite: number,
  hoehe: number,
  raster: number,
  radius: number = RADIUS,
): string {
  return zeichne(baueEcken(punkte, breite, hoehe, raster), radius);
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

/** Schnittpunkt zweier Geraden, jeweils aus Punkt und Richtung. */
function schneide(
  p1: Pixelpunkt,
  d1: Pixelpunkt,
  p2: Pixelpunkt,
  d2: Pixelpunkt,
): Pixelpunkt | null {
  const nenner = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(nenner) < 1e-9) return null;
  const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / nenner;
  return { x: p1.x + d1.x * t, y: p1.y + d1.y * t };
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
