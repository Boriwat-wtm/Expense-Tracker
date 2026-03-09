import { useEffect, useRef } from "react";

// ── Palette ────────────────────────────────────────────────────────────────
const B  = "#F9A8C0"; // cat body (pastel pink)
const D  = "#C45878"; // dark pink – feet / tail tip
const E  = "#1E1E3A"; // eye pupil
const W  = "#FFF5F9"; // eye shine / belly
const N  = "#E07898"; // nose
const GO = "#FFD700"; // coin gold
const GS = "#FFF8DC"; // coin shine
const GD = "#8B6000"; // coin dark edge
const _  = null;      // transparent

// ── Cat sprite: 10 col × 9 row, faces LEFT by default ─────────────────────
// (flip = true when walking right)
const CAT_BASE: (string | null)[][] = [
  [_, B, _, _, B, _, _, _, _, _], // r0  ear tips
  [B, B, B, B, B, B, _, _, _, _], // r1  head
  [B, E, W, B, E, W, _, _, _, _], // r2  eyes (E=pupil, W=shine)
  [B, B, B, N, B, B, _, _, _, _], // r3  nose
  [B, W, W, W, W, B, _, _, _, _], // r4  belly
  [_, B, B, B, B, B, B, B, _, _], // r5  body
];
// Walk frame A – legs apart
const LEGS_A: (string | null)[][] = [
  [_, B, B, B, B, B, B, _, D, D], // r6  body + tail
  [_, B, _, B, B, _, _, _, _, D], // r7  legs open
  [_, D, _, D, D, _, _, _, _, _], // r8  feet
];
// Walk frame B – legs crossed
const LEGS_B: (string | null)[][] = [
  [_, B, B, B, B, B, B, _, D, D], // r6
  [_, _, B, _, _, B, _, _, _, D], // r7
  [_, _, D, _, _, D, _, _, _, _], // r8
];

const CAT_FRAMES = [
  [...CAT_BASE, ...LEGS_A],
  [...CAT_BASE, ...LEGS_B],
];

// ── Coin sprite: 6 col × 5 row ─────────────────────────────────────────────
const COIN: (string | null)[][] = [
  [_, GD, GD, GD, _, _],
  [GD, GO, GS, GO, GD, _],
  [GD, GO, GS, GO, GD, _],
  [GD, GO, GO, GO, GD, _],
  [_, GD, GD, GD, _, _],
];

// ── Piggy bank sprite: 14 col × 10 row ────────────────────────────────────
const PK = "#FFB6C8"; // piggy body
const PKD = "#D4607A"; // piggy dark
const PKN = "#FF8FAB"; // piggy nose
const PKE = "#1E1E3A"; // piggy eye
const PKC = "#FFD700"; // coin slot

const PIGGY: (string | null)[][] = [
  [_, _, _, _, PKD, _, _, _, _, _, _, _, _, _], // ear
  [_, _, _, PKD, PK, PKD, _, _, _, _, _, _, _, _],
  [_, _, PKD, PK, PK, PK, PKD, _, _, _, _, _, _, _],
  [_, PK, PK, PK, PK, PK, PK, PK, PK, PK, PK, _, _, _],
  [PK, PK, PKE, PK, PK, PK, PK, PK, PK, PKN, PKN, PK, _, _],
  [PK, PK, PK, PK, PK, PK, PK, PK, PK, PKN, PKN, PK, _, _],
  [_, PK, PK, PK, PKC, PKC, PK, PK, PK, PK, PK, _, _, _], // coin slot
  [_, _, PK, PK, PK, PK, PK, PK, PK, PK, _, _, _, _],
  [_, _, _, PKD, PK, _, PK, PKD, _, _, _, _, _, _], // legs
  [_, _, _, PKD, _, _, _, PKD, _, _, _, _, _, _],
];

export default function PixelBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const S = 4; // 1 sprite-pixel = 4 × 4 screen pixels

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const ctx = canvas.getContext("2d")!;

    // ── Draw helpers ─────────────────────────────────────────────────────────
    function drawBalloon(
      bx: number, by: number,
      color: string, highlight: string, stringColor: string,
    ) {
      const shape: (string | null)[][] = [
        [null, null, color, color, color, null, null],
        [null, color, color, color, color, color, null],
        [color, color, highlight, highlight, color, color, color],
        [color, color, highlight, color, color, color, color],
        [color, color, color, color, color, color, color],
        [color, color, color, color, color, color, color],
        [null, color, color, color, color, color, null],
        [null, null, color, color, color, null, null],
      ];
      drawSprite(shape, bx, by);
      // string
      ctx.fillStyle = stringColor;
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < 6; i++) {
        ctx.fillRect((bx + 3) * S, (by + 8 + i) * S, S, S);
      }
      ctx.globalAlpha = 1;
    }

    function drawSprite(
      sprite: (string | null)[][],
      ox: number,
      oy: number,
      flipX = false,
      alpha = 1,
    ) {
      const cols = sprite[0].length;
      ctx.globalAlpha = alpha;
      for (let ry = 0; ry < sprite.length; ry++) {
        const row = sprite[ry];
        for (let rx = 0; rx < row.length; rx++) {
          const c = row[rx];
          if (!c) continue;
          ctx.fillStyle = c;
          const dx = flipX ? cols - 1 - rx : rx;
          ctx.fillRect((ox + dx) * S, (oy + ry) * S, S, S);
        }
      }
      ctx.globalAlpha = 1;
    }

    // ── State ────────────────────────────────────────────────────────────────
    interface CoinObj { x: number; y: number; alpha: number }

    const balloons = [
      { x: 15,  baseY: 5,  vx:  0.07, phase: 0,              color: "#FFB0D8", hl: "#FFE0F0", str: "#E07898" },
      { x: 65,  baseY: 9,  vx: -0.05, phase: Math.PI * 0.7,  color: "#B8D8FF", hl: "#E0EEFF", str: "#6090C8" },
      { x: 110, baseY: 4,  vx:  0.06, phase: Math.PI * 1.4,  color: "#FFEEB0", hl: "#FFFAE0", str: "#C8A830" },
    ];

    // clouds float in the middle band (40-60% of screen height)
    const clouds = [
      { x: 20,  vy: 0.40, phase: 0.0              },
      { x: 80,  vy: 0.28, phase: Math.PI * 0.6    },
      { x: 145, vy: 0.35, phase: Math.PI * 1.2    },
    ];

    const cat = { x: 20, vx: 0.45, frame: 0, tick: 0 };
    const cat2 = { x: -1, vx: -0.3, frame: 1, tick: 5 }; // starts off-screen right
    const coins: CoinObj[] = [];

    const stars = Array.from({ length: 24 }, () => ({
      x: Math.random() * (window.innerWidth / S),
      y: Math.random() * ((window.innerHeight / S) * 0.62),
      phase: Math.random() * Math.PI * 2,
    }));

    // fixed grass positions once per session
    const grassXList = Array.from({ length: 65 }, () =>
      Math.floor(Math.random() * (window.innerWidth / S)),
    );

    let tick = 0;
    let raf: number;

    // ── Render loop ──────────────────────────────────────────────────────────
    function render() {
      tick++;
      const CW = canvas!.width;
      const CH = canvas!.height;
      const GY = Math.floor(CH / S) - 4;  // ground line in sprite-pixels
      const catY = GY - 9;               // cat sits on ground (9 rows tall)

      // Initialize cat2 x once we know canvas size
      if (cat2.x < 0) cat2.x = CW / S - 15;

      // ── Background gradient ───────────────────────────────────────────────
      const bg = ctx.createLinearGradient(0, 0, 0, CH);
      bg.addColorStop(0, "#FFF5FB");
      bg.addColorStop(0.5, "#F8F0FF");
      bg.addColorStop(1, "#EEF0FF");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CW, CH);

      // ── Balloons ──────────────────────────────────────────────────────────
      for (const b of balloons) {
        b.phase += 0.008;
        b.x += b.vx;
        const bMaxX = CW / S - 9;
        if (b.x > bMaxX) { b.x = bMaxX; b.vx = -Math.abs(b.vx); }
        if (b.x < 2)     { b.x = 2;     b.vx =  Math.abs(b.vx); }
        const curY = b.baseY + 2.5 * Math.sin(b.phase);
        drawBalloon(Math.floor(b.x), Math.floor(curY), b.color, b.hl, b.str);
      }

      // ── Clouds (middle band) ─────────────────────────────────────────────
      const midBase = Math.floor(CH / S * 0.40); // ~40% down
      for (const cl of clouds) {
        cl.phase += 0.006;
        const cx = Math.floor(cl.x);
        const cy = midBase + Math.round(3 * Math.sin(cl.phase));
        // draw a pixel-art cloud: 3 overlapping rounded lumps
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = "#FFFFFF";
        // lump 1 (left)
        ctx.fillRect((cx + 2) * S, (cy + 1) * S, 5 * S, 3 * S);
        ctx.fillRect((cx + 3) * S,  cy      * S, 3 * S, 5 * S);
        // lump 2 (center, tallest)
        ctx.fillRect((cx + 6) * S, (cy - 1) * S, 6 * S, 3 * S);
        ctx.fillRect((cx + 7) * S, (cy - 2) * S, 4 * S, 6 * S);
        // lump 3 (right)
        ctx.fillRect((cx + 11) * S,  cy      * S, 5 * S, 3 * S);
        ctx.fillRect((cx + 12) * S, (cy + 1) * S, 3 * S, 4 * S);
        // base bar connecting all lumps
        ctx.fillRect((cx + 2)  * S, (cy + 2) * S, 14 * S, 3 * S);
        // soft highlight (top-left of center lump)
        ctx.fillStyle = "#F0F4FF";
        ctx.fillRect((cx + 7) * S, (cy - 2) * S, 2 * S, 2 * S);
        ctx.globalAlpha = 1;

        // drift slowly left, wrap around
        cl.x -= 0.04;
        if (cl.x < -16) cl.x = CW / S + 4;
      }

      // ── Stars / sparkles ──────────────────────────────────────────────────
      for (const s of stars) {
        s.phase += 0.02;
        const a = 0.1 + 0.22 * (0.5 + 0.5 * Math.sin(s.phase));
        ctx.globalAlpha = a;
        ctx.fillStyle = "#FFB0D8";
        const px = s.x * S, py = s.y * S;
        ctx.fillRect(px, py, S, S);
        ctx.fillRect(px - S, py, S, S);
        ctx.fillRect(px + S, py, S, S);
        ctx.fillRect(px, py - S, S, S);
        ctx.fillRect(px, py + S, S, S);
      }
      ctx.globalAlpha = 1;

      // ── Ground ────────────────────────────────────────────────────────────
      ctx.fillStyle = "#B8EC98";
      ctx.fillRect(0, GY * S, CW, 5 * S);
      ctx.fillStyle = "#78C860"; // dark top edge
      ctx.fillRect(0, GY * S, CW, S);
      ctx.fillStyle = "#D8F8B8"; // bright highlight below
      ctx.fillRect(0, (GY + 5) * S, CW, S);

      // ── Grass tufts ───────────────────────────────────────────────────────
      ctx.fillStyle = "#50A030";
      for (const gx of grassXList) {
        if (gx * S >= CW) continue;
        ctx.fillRect(gx * S, (GY - 1) * S, S, S);
        if (gx > 0) ctx.fillRect((gx - 1) * S, GY * S, S, S);
        if (gx < CW / S - 1) ctx.fillRect((gx + 1) * S, GY * S, S, S);
      }

      // ── Piggy bank (sits near right edge) ─────────────────────────────────
      const pigX = Math.floor(CW / S) - 18;
      const pigY = GY - 10;
      drawSprite(PIGGY, pigX, pigY);

      // ── Coins ─────────────────────────────────────────────────────────────
      if (tick % 95 === 0) {
        // coin pops out above cat
        coins.push({ x: cat.x + 2, y: catY - 2, alpha: 1 });
      }
      if (tick % 95 === 48) {
        // second coin from cat2
        coins.push({ x: cat2.x + 2, y: catY - 2, alpha: 1 });
      }
      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i];
        c.y -= 0.3;
        c.alpha -= 0.006;
        if (c.alpha <= 0) { coins.splice(i, 1); continue; }
        drawSprite(COIN, Math.floor(c.x), Math.floor(c.y), false, c.alpha);
      }

      // ── Cat 1 ─────────────────────────────────────────────────────────────
      cat.tick++;
      if (cat.tick >= 12) { cat.frame ^= 1; cat.tick = 0; }
      cat.x += cat.vx;
      const maxX = CW / S - 12;
      if (cat.x > maxX) { cat.x = maxX; cat.vx = -0.45; }
      if (cat.x < 4)    { cat.x = 4;    cat.vx =  0.45; }
      // sprite faces LEFT → flip when going right (vx > 0)
      drawSprite(CAT_FRAMES[cat.frame], Math.floor(cat.x), catY, cat.vx > 0);

      // ── Cat 2 (walks opposite direction, slightly different speed) ─────────
      cat2.tick++;
      if (cat2.tick >= 14) { cat2.frame ^= 1; cat2.tick = 0; }
      cat2.x += cat2.vx;
      const max2 = CW / S - 12;
      if (cat2.x > max2) { cat2.x = max2; cat2.vx = -0.3; }
      if (cat2.x < 4)    { cat2.x = 4;    cat2.vx =  0.3; }
      // cat2 is a slightly darker rose tint – achieved by canvas filter
      ctx.filter = "sepia(0.3) saturate(1.2) hue-rotate(320deg)";
      drawSprite(CAT_FRAMES[cat2.frame], Math.floor(cat2.x), catY, cat2.vx > 0);
      ctx.filter = "none";

      raf = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0, pointerEvents: "none" }}
    />
  );
}
