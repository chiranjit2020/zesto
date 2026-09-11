import type { Recipe } from '../domain/types';
import { INGREDIENT_BY_ID } from '../data/catalog';
import { equipmentLabel } from './format';

/**
 * Per-recipe shareable result card (§33). Renders to a PNG so it can travel as an actual
 * image attachment (WhatsApp/Instagram/etc via the Web Share API's `files`), not just a
 * link — the whole point of a "shareable moment" per §36.
 *
 * Brand-first, not recipe-first: every card leads with the real Zesto lockup on the same
 * dark grad-night treatment used for the mark elsewhere in the app (§3), so a card is
 * recognisably Zesto before it's recognisably any one recipe. Everything is drawn from
 * assets already shipped and precached — no network fetch, works offline.
 */

const W = 1080;
const HERO_H = 380;
const PAD = 72;
const MIN_H = 980;
const MAX_H = 1600;

const INK = '#0b0d16';
const HERO_TOP = '#201246';
const HERO_BOTTOM = '#0b1020';
const BODY_BG = '#141a2c';
const PURPLE = '#9035C0';
const BLUE = '#4CBDF7';
const YELLOW = '#FDCF00';
const TEXT = '#e9ecf5';
const TEXT_MUTED = '#a5acc5';
const TEXT_FAINT = '#767e9a';

const MARK_SRC = `${import.meta.env.BASE_URL}zesto-mark.png`;

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  try {
    const img = new Image();
    img.decoding = 'sync';
    img.src = src;
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load('700 60px Quicksand'),
      document.fonts.load('600 40px Quicksand'),
      document.fonts.load('500 32px Quicksand'),
    ]);
  } catch {
    /* falls back to the generic sans-serif already in the font stack below */
  }
}

/** The real ribbon-Z, drawn by hand as a canvas path — used only if the PNG asset fails
 *  to load/decode, so the hero band is never left blank. Same geometry as `ZMark`. */
function drawFallbackMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const s = size / 64;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(s, s);
  const grad = ctx.createLinearGradient(6, 0, 58, 64);
  grad.addColorStop(0, PURPLE);
  grad.addColorStop(0.5, YELLOW);
  grad.addColorStop(1, BLUE);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(18, 19);
  ctx.lineTo(46, 19);
  ctx.lineTo(18, 45);
  ctx.lineTo(46, 45);
  ctx.stroke();
  ctx.fillStyle = BLUE;
  ctx.beginPath();
  ctx.moveTo(48, 13);
  ctx.quadraticCurveTo(54, 16, 52, 22);
  ctx.quadraticCurveTo(46, 21, 48, 13);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Draws caps text with manual letter-spacing (canvas `letterSpacing` support is patchy). */
function fillSpacedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
}

function measureSpacedWidth(ctx: CanvasRenderingContext2D, text: string, spacing: number): number {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + spacing;
  return Math.max(0, w - spacing);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Wrap `text` to `maxWidth`, capped at `maxLines` (last line ellipsised if it overflows). */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = test;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) {
      last = last.slice(0, -1);
    }
    if (last !== lines[maxLines - 1]) lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

/** Packs pill labels into left-to-right rows that fit `maxWidth` (assumes `ctx.font` is
 *  already set to the pill font) — used identically for measuring and for drawing, so the
 *  two passes can never disagree about how many rows a card needs. */
function layoutPillRows(ctx: CanvasRenderingContext2D, labels: string[], maxWidth: number): string[][] {
  const rows: string[][] = [[]];
  let rowWidth = 0;
  for (const label of labels) {
    const w = ctx.measureText(label).width + 48 + 14;
    if (rowWidth + w > maxWidth && rowWidth > 0) {
      rows.push([]);
      rowWidth = 0;
    }
    rows[rows.length - 1].push(label);
    rowWidth += w;
  }
  return rows;
}

export interface ShareCardOptions {
  /** "I made this" (post-cook, actual cost known) vs "discovered this" (pre-cook). */
  variant: 'cooked' | 'discovered';
  /** actual logged cost, if this is a post-cook share — falls back to the recipe estimate */
  actualCostInr?: number | null;
}

const EYEBROW_FONT = '700 28px Quicksand, sans-serif';
const TITLE_FONT = '700 66px Quicksand, sans-serif';
const PILL_FONT = '600 30px Quicksand, sans-serif';
const LABEL_FONT = '700 24px Quicksand, sans-serif';
const ING_FONT = '600 36px Quicksand, sans-serif';
const HASH_FONT = '700 56px Quicksand, sans-serif';
const FOOT_FONT = '500 26px Quicksand, sans-serif';

/**
 * Renders the card and resolves a PNG Blob, or `null` if canvas export genuinely isn't
 * available (very old browsers) — callers fall back to a text-only share in that case.
 *
 * Two passes over the same layout: a throwaway context measures how tall the body
 * actually needs to be for *this* recipe's title/pills/ingredients, then a canvas sized
 * to that content is drawn for real. This is what keeps the footer from either colliding
 * with a long title or floating in a wall of empty space under a short one.
 */
export async function buildShareCard(recipe: Recipe, opts: ShareCardOptions): Promise<Blob | null> {
  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) return null;

  const bodyW = W - PAD * 2;
  const cost = opts.actualCostInr ?? recipe.costInr;
  const eyebrow = opts.variant === 'cooked' ? 'I MADE THIS' : 'FOUND ON ZESTO';
  const pillLabels = [
    `₹${Math.round(cost)}`,
    `${recipe.timeMinutes} min`,
    recipe.equipment.map(equipmentLabel).join(' / '),
    `~${recipe.nutrition.calories} kcal`,
  ];
  const names = [
    ...new Set(
      recipe.ingredients
        .filter((i) => !i.optional)
        .map((i) => INGREDIENT_BY_ID.get(i.canonical[0])?.name ?? i.name),
    ),
  ];
  const shown = names.slice(0, 5);
  let ingredientLine = shown.join('  +  ');
  if (names.length > shown.length) ingredientLine += `  +${names.length - shown.length} more`;

  measure.font = TITLE_FONT;
  const titleLines = wrapText(measure, recipe.title, bodyW, 2);
  measure.font = PILL_FONT;
  const pillRows = layoutPillRows(measure, pillLabels, bodyW);
  measure.font = ING_FONT;
  const ingLines = wrapText(measure, ingredientLine, bodyW, 2);

  const pillH = 60;
  let contentBottom = HERO_H + 76; // eyebrow baseline
  contentBottom += 62; // gap to title
  contentBottom += titleLines.length * 74 + 20;
  contentBottom += pillRows.length * (pillH + 16) - 16 + 56;
  contentBottom += 46; // "INGREDIENTS" label
  contentBottom += ingLines.length * 46;

  const footerGap = 56;
  const hashY = contentBottom + footerGap + 56;
  const totalH = Math.max(MIN_H, Math.min(MAX_H, hashY + 44 + 64));

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  await ensureFonts();
  const mark = await loadImage(MARK_SRC);

  // ---- base ----
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, totalH);

  // ---- hero: the official lockup on the brand's own grad-night treatment (§3) ----
  const hero = ctx.createLinearGradient(0, 0, W * 0.75, HERO_H);
  hero.addColorStop(0, HERO_TOP);
  hero.addColorStop(0.62, HERO_BOTTOM);
  hero.addColorStop(1, HERO_BOTTOM);
  ctx.fillStyle = hero;
  ctx.fillRect(0, 0, W, HERO_H);

  // faint brand glow so the mark reads as "lit", same spirit as the in-app hero surfaces
  const heroCenterY = HERO_H * 0.46;
  const glow = ctx.createRadialGradient(W / 2, heroCenterY, 40, W / 2, heroCenterY, 380);
  glow.addColorStop(0, 'rgba(144,53,192,0.35)');
  glow.addColorStop(1, 'rgba(144,53,192,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, HERO_H);

  // lockup: mark + "Zesto" wordmark, vertically centered in the hero band
  ctx.textBaseline = 'alphabetic';
  const wordFont = '700 84px Quicksand, sans-serif';
  ctx.font = wordFont;
  const wordWidth = ctx.measureText('Zesto').width;
  const markSize = 116;
  const gap = 22;
  const lockupWidth = markSize + gap + wordWidth;
  const lockupX = (W - lockupWidth) / 2;
  const lockupY = HERO_H * 0.46 + 20;

  if (mark && mark.naturalWidth > 0) {
    const ar = mark.naturalWidth / mark.naturalHeight;
    const mh = markSize;
    const mw = markSize * ar;
    ctx.drawImage(mark, lockupX, lockupY - mh * 0.78, mw, mh);
  } else {
    drawFallbackMark(ctx, lockupX + markSize / 2, lockupY - markSize * 0.4, markSize);
  }

  const textGrad = ctx.createLinearGradient(lockupX + markSize + gap, 0, lockupX + lockupWidth, 0);
  textGrad.addColorStop(0, PURPLE);
  textGrad.addColorStop(1, BLUE);
  ctx.fillStyle = textGrad;
  ctx.font = wordFont;
  ctx.fillText('Zesto', lockupX + markSize + gap, lockupY);

  ctx.fillStyle = 'rgba(165,172,197,0.85)';
  ctx.font = '600 26px Quicksand, sans-serif';
  const tagline = 'WHAT CAN YOU MAKE RIGHT NOW?';
  const taglineW = measureSpacedWidth(ctx, tagline, 4);
  fillSpacedText(ctx, tagline, (W - taglineW) / 2, lockupY + 56, 4);

  // a hairline sliver of the recipe's own chapter colour, so cards stay visually varied
  // without the brand hero losing top billing
  ctx.fillStyle = recipeAccent(recipe);
  ctx.fillRect(0, HERO_H - 6, W, 6);

  // ---- body ----
  ctx.fillStyle = BODY_BG;
  ctx.fillRect(0, HERO_H, W, totalH - HERO_H);

  let y = HERO_H + 76;

  ctx.fillStyle = opts.variant === 'cooked' ? '#3dc28a' : BLUE;
  ctx.font = EYEBROW_FONT;
  fillSpacedText(ctx, eyebrow, PAD, y, 2);
  y += 62;

  ctx.fillStyle = TEXT;
  ctx.font = TITLE_FONT;
  for (const line of titleLines) {
    ctx.fillText(line, PAD, y);
    y += 74;
  }
  y += 20;

  // meta pills
  ctx.font = PILL_FONT;
  for (const row of pillRows) {
    let px = PAD;
    for (const label of row) {
      const w = ctx.measureText(label).width + 48;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      roundRect(ctx, px, y, w, pillH, pillH / 2);
      ctx.fill();
      ctx.fillStyle = TEXT;
      ctx.fillText(label, px + 24, y + 40);
      px += w + 14;
    }
    y += pillH + 16;
  }
  y += 56 - 16;

  // ingredients
  ctx.fillStyle = TEXT_FAINT;
  ctx.font = LABEL_FONT;
  fillSpacedText(ctx, 'INGREDIENTS', PAD, y, 2);
  y += 46;

  ctx.fillStyle = TEXT_MUTED;
  ctx.font = ING_FONT;
  for (const line of ingLines) {
    ctx.fillText(line, PAD, y);
    y += 46;
  }

  // ---- footer: the hashtag + brand line, right after the content (never overlapping) ----
  const hashGrad = ctx.createLinearGradient(PAD, 0, PAD + 260, 0);
  hashGrad.addColorStop(0, PURPLE);
  hashGrad.addColorStop(1, BLUE);
  ctx.fillStyle = hashGrad;
  ctx.font = HASH_FONT;
  ctx.fillText('#Zesto', PAD, hashY);

  ctx.fillStyle = TEXT_FAINT;
  ctx.font = FOOT_FONT;
  ctx.fillText('Tell Zesto your situation. Zesto tells you what you can eat.', PAD, hashY + 44);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png', 0.95));
}

const CHAPTER_ACCENT: Record<string, string> = {
  'Ultra-Quick 5–10 Minute Meals': BLUE,
  'Breakfast & Morning Meals': YELLOW,
  'Maggi/Noodles Reinvented': '#F7B200',
  'Rice & One-Pot Meals': PURPLE,
  'Roti/Bread-Based Meals': '#F7B200',
  'Egg-Based Meals': YELLOW,
  'Vegetarian Comfort Food': BLUE,
  'Budget Snacks & Late-Night Hunger': PURPLE,
  'Sweet/Cheap Comfort Recipes': YELLOW,
  'Emergency “Almost Nothing Left” Meals': PURPLE,
};

function recipeAccent(recipe: Recipe): string {
  return CHAPTER_ACCENT[recipe.chapter] ?? PURPLE;
}

/** Builds a `File` ready to hand to `navigator.share({ files: [...] })`, or `null`. */
export async function buildShareCardFile(recipe: Recipe, opts: ShareCardOptions): Promise<File | null> {
  const blob = await buildShareCard(recipe, opts);
  if (!blob) return null;
  return new File([blob], `zesto-${recipe.slug}.png`, { type: 'image/png' });
}

/**
 * Shares a recipe as the generated image card (§33, §36), falling back to a plain
 * text+link share, and finally to clipboard, when files can't be shared or the card
 * couldn't be generated (e.g. canvas unsupported, asset failed offline).
 */
export async function shareRecipe(
  recipe: Recipe,
  variant: ShareCardOptions['variant'],
  actualCostInr?: number,
) {
  const url = `${location.origin}/r/${recipe.slug}`;
  const cost = actualCostInr ?? recipe.costInr;
  const text =
    variant === 'cooked'
      ? `I made ${recipe.title} for ₹${cost} 🍳 #Zesto`
      : `I'm making ${recipe.title} — found it on Zesto`;
  const title = `Zesto · ${recipe.title}`;

  let file: File | null = null;
  try {
    file = await buildShareCardFile(recipe, { variant, actualCostInr });
  } catch {
    /* card generation failed — degrade to a text share below rather than error out */
  }

  try {
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title, text });
    } else if (navigator.share) {
      await navigator.share({ title, text, url });
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      alert('Copied — paste it anywhere');
    }
  } catch {
    /* cancelled */
  }
}
