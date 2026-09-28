/**
 * FloorPlanEditor.tsx
 * ---------------------------------------------------------------------------
 * Self-contained architectural floor-plan layout engine + editable SVG plan.
 *
 * Pipeline:
 *   requirements -> classification -> zoning -> size estimation ->
 *   zoned band/column placement (public front, private rear, spine passage) ->
 *   wall generation (merged, de-duplicated centre-line segments) ->
 *   doors (circulation-aware, collision-free) -> windows (exterior only) ->
 *   staircase -> dimensions -> SVG rendering.
 *
 * All geometry is in FEET. 1 ft = SCALE svg units.
 * ---------------------------------------------------------------------------
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, CSSProperties, WheelEvent as ReactWheelEvent, ReactElement } from "react";

/* ========================================================================= */
/* Input types                                                               */
/* ========================================================================= */

export interface RoomRequirement {
  type: string;
  quantity: number;
}
export interface FloorDimensions {
  length: number;
  breadth: number;
  wallHeight: number;
}
export interface InputWall {
  id: string;
  label: string;
  length: number;
  height: number;
  thickness?: number;
}
export interface InputOpening {
  id: string;
  label: string;
  referenceWallId: string;
  distanceFromCorner: number;
  width: number;
  height: number;
}
export type StairDirection = "straight" | "l-shaped" | "u-shaped" | "spiral";
export interface StaircaseSpec {
  included: boolean;
  referenceArea?: string;
  width?: number;
  length?: number;
  direction?: StairDirection;
}
export interface Floor {
  id: string;
  floorNumber: number;
  rooms: RoomRequirement[];
  dimensions: FloorDimensions;
  walls: InputWall[];
  doors: InputOpening[];
  windows: InputOpening[];
  staircase: StaircaseSpec;
  additionalNotes: string;
}
export interface FloorPlanData {
  numberOfFloors: number;
  floors: Floor[];
}

/* ========================================================================= */
/* Generated geometry types                                                  */
/* ========================================================================= */

export type Zone = "public" | "private" | "service" | "special" | "outdoor" | "circulation";
export type RoomKind =
  | "living" | "dining" | "kitchen" | "bath" | "store" | "puja" | "balcony"
  | "study" | "bed" | "dress" | "stair" | "passage" | "other";

export interface PlanRoom {
  id: string;
  type: string;
  label: string;
  kind: RoomKind;
  zone: Zone;
  roomNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface PlanWall {
  id: string;
  label: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  length: number;
  height: number;
  thickness: number;
  exterior: boolean;
}
export interface PlanOpening {
  id: string;
  kind: "door" | "window";
  label: string;
  wallId: string;
  /** distance from the wall start to the opening start (distanceFromCorner) */
  offset: number;
  width: number;
  height: number;
  /** door only: swing side relative to wall normal (+x / +y) */
  swing: 1 | -1;
  hingeAtStart: boolean;
  /** cased opening with no leaf */
  cased: boolean;
  main: boolean;
}
export interface PlanStair {
  roomId: string;
  direction: StairDirection;
  width: number;
  length: number;
}
export interface GeneratedFloor {
  floorId: string;
  floorNumber: number;
  length: number;
  breadth: number;
  wallHeight: number;
  rooms: PlanRoom[];
  walls: PlanWall[];
  openings: PlanOpening[];
  stair: PlanStair | null;
  notes: string;
  northDirection?: "top" | "right" | "bottom" | "left";
}

export interface FloorPlanEditorProps {
  data: FloorPlanData;
  onChange?: (floors: GeneratedFloor[]) => void;
  generationSeed?: number;
  className?: string;
  height?: number;
}

/* ========================================================================= */
/* Constants & small helpers                                                 */
/* ========================================================================= */

const SCALE = 20;
const EXT_T = 0.75;
const INT_T = 0.375;
const EPS = 0.01;
const INK = "#111111";
const SELECT = "#1d6fe0";
const MIN_ROOM_SIZE = 6;
type NorthDirection = "top" | "right" | "bottom" | "left";

const r2 = (v: number) => Math.round(v * 2) / 2;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const near = (a: number, b: number) => Math.abs(a - b) < EPS;

export function formatFtIn(ft: number): string {
  const neg = ft < 0;
  const total = Math.round(Math.abs(ft) * 12);
  const f = Math.floor(total / 12);
  const i = total % 12;
  return `${neg ? "-" : ""}${f}'${i}"`;
}

const titleCase = (s: string) =>
  s.trim().replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function seededShuffle<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let state = (seed | 0) ^ 0x9e3779b9;
  for (let i = result.length - 1; i > 0; i -= 1) {
    state = Math.imul(state ^ (state >>> 16), 0x45d9f3b);
    state = Math.imul(state ^ (state >>> 16), 0x45d9f3b);
    state ^= state >>> 16;
    const j = Math.abs(state) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/* ========================================================================= */
/* 1. Classification & sizing                                                */
/* ========================================================================= */

interface RoomSpec {
  type: string;
  label: string;
  kind: RoomKind;
  zone: Zone;
  roomNumber: number;
  idealW: number;
  idealD: number;
}

export function classifyRoom(type: string): { kind: RoomKind; zone: Zone } {
  const t = type.toLowerCase();
  if (/living|hall|lounge|drawing|family/.test(t)) return { kind: "living", zone: "public" };
  if (/dining/.test(t)) return { kind: "dining", zone: "public" };
  if (/kitchen/.test(t)) return { kind: "kitchen", zone: "service" };
  if (/bath|toilet|wc|washroom|restroom|powder/.test(t)) return { kind: "bath", zone: "service" };
  if (/store|utility|pantry|laundry/.test(t)) return { kind: "store", zone: "service" };
  if (/puja|pooja|prayer|mandir|temple/.test(t)) return { kind: "puja", zone: "special" };
  if (/balcon|terrace|deck|verandah|veranda|sit ?out/.test(t)) return { kind: "balcony", zone: "outdoor" };
  if (/study|office|library|work/.test(t)) return { kind: "study", zone: "private" };
  if (/bed|master|guest|kid|child/.test(t)) return { kind: "bed", zone: "private" };
  return { kind: "other", zone: "private" };
}

const IDEAL: Record<RoomKind, [number, number]> = {
  living: [16, 14], dining: [12, 11], kitchen: [10, 10], bath: [6, 8], store: [6, 6],
  puja: [6, 6], balcony: [10, 5], study: [10, 10], bed: [12, 12], dress: [6, 5],
  stair: [4, 11], passage: [4, 4], other: [10, 10],
};

function expandRequirements(reqs: RoomRequirement[]): RoomSpec[] {
  const out: RoomSpec[] = [];
  let n = 1;
  for (const req of reqs) {
    const qty = Math.max(0, Math.floor(req.quantity || 0));
    const c = classifyRoom(req.type);
    for (let i = 0; i < qty; i++) {
      const [w, d] = IDEAL[c.kind];
      out.push({
        type: req.type,
        label: qty > 1 ? `${titleCase(req.type)} ${i + 1}` : titleCase(req.type),
        kind: c.kind, zone: c.zone, roomNumber: n++, idealW: w, idealD: d,
      });
    }
  }
  return out;
}

function synth(kind: RoomKind, label: string, zone: Zone): RoomSpec {
  const [w, d] = IDEAL[kind];
  return { type: label, label, kind, zone, roomNumber: 0, idealW: w, idealD: d };
}

/* ========================================================================= */
/* 2. Zoning into bands and columns                                          */
/* ========================================================================= */

interface Column {
  items: RoomSpec[]; // top -> bottom
  weight: number;
  fixedW?: number;
}

function stairFootprint(s: StaircaseSpec): { w: number; d: number } {
  const sw = clamp(s.width ?? 3.5, 2.5, 6);
  const sl = clamp(s.length ?? 11, 6, 18);
  switch (s.direction ?? "straight") {
    case "spiral": { const dia = Math.max(5, sw * 2); return { w: dia, d: dia }; }
    case "u-shaped": return { w: sw * 2 + 0.5, d: sl * 0.55 + sw };
    case "l-shaped": return { w: sw + sl * 0.45, d: sl * 0.55 + sw };
    default: return { w: sw, d: sl };
  }
}

function buildZones(specs: RoomSpec[], stair: StaircaseSpec, rearDepthHint: number, seed = 0) {
  const of = (k: RoomKind) => specs.filter((s) => s.kind === k);
  const living = seededShuffle(of("living"), seed + 11), dining = seededShuffle(of("dining"), seed + 13), kitchen = seededShuffle(of("kitchen"), seed + 17);
  const bath = seededShuffle(of("bath"), seed + 19), store = seededShuffle(of("store"), seed + 23), puja = seededShuffle(of("puja"), seed + 29);
  const balcony = seededShuffle(of("balcony"), seed + 31), study = seededShuffle(of("study"), seed + 37), bed = seededShuffle(of("bed"), seed + 41), other = seededShuffle(of("other"), seed + 43);

  const front: Column[] = [];
  const rear: Column[] = [];

  if (stair.included) {
    const fp = stairFootprint(stair);
    front.push({ items: [synth("stair", "Staircase", "circulation")], weight: fp.w, fixedW: r2(fp.w + 0.5) });
  }
  living.forEach((l) => front.push({ items: [l], weight: l.idealW }));
  dining.forEach((d) => front.push({ items: [d], weight: d.idealW }));

  // Bathrooms: attach to bedrooms first, remainder become common toilets
  const rearBaths = bath.slice(0, Math.min(bath.length, bed.length));
  const commonBaths = bath.slice(rearBaths.length);

  const pujaCol = [...puja, ...commonBaths, ...(kitchen.length ? [] : store)];
  if (pujaCol.length) front.push({ items: pujaCol, weight: 6.5 });
  if (kitchen.length) {
    kitchen.forEach((k, i) =>
      front.push({ items: i === 0 ? [...store, k] : [k], weight: k.idealW }),
    );
  }

  // Private rear band: bed, bath-pair, bed, bed, bath-pair ...
  const bathQ = [...rearBaths];
  bed.forEach((b, i) => {
    rear.push({ items: [b], weight: b.idealW });
    if (!bathQ.length) return;
    const next = bed[i + 1];
    if (i % 2 === 0 && next && bathQ.length >= 2) {
      rear.push({ items: [bathQ.shift()!, bathQ.shift()!], weight: 6 });
    } else if (i % 2 === 0 || !next) {
      const one = bathQ.shift()!;
      rear.push({ items: [synth("dress", "Dress", "private"), one], weight: 6 });
    }
  });
  while (bathQ.length) rear.push({ items: [bathQ.shift()!], weight: 6 });
  study.forEach((s) => rear.push({ items: [s], weight: s.idealW }));
  other.forEach((o) => rear.push({ items: [o], weight: o.idealW }));

  // Balcony: a strip on the exterior side of the last bedroom when deep enough
  balcony.forEach((bc, i) => {
    const bedCols = rear.filter((c) => c.items.length === 1 && c.items[0]?.kind === "bed");
    const host = bedCols[bedCols.length - 1 - i];
    if (host && rearDepthHint >= 15) host.items.unshift(bc);
    else rear.push({ items: [bc], weight: 6 });
  });

  // Rebalance if one band is empty
  if (!front.length && rear.length > 1) {
    const move = rear.splice(Math.ceil(rear.length / 2));
    front.push(...move);
  }
  if (seed % 2 === 1) front.reverse();
  if (seed % 3 === 1) rear.reverse();
  return { front, rear };
}

/* ========================================================================= */
/* 3. Size estimation (width distribution & stack splitting)                 */
/* ========================================================================= */

function distribute(cols: Column[], total: number): number[] {
  if (!cols.length) return [];
  const fixed = cols.reduce((a, c) => a + (c.fixedW ?? 0), 0);
  const flexW = cols.filter((c) => c.fixedW === undefined).reduce((a, c) => a + c.weight, 0);
  const avail = Math.max(0, total - fixed);
  const widths = cols.map((c) =>
    c.fixedW !== undefined ? c.fixedW : flexW > 0 ? r2((c.weight / flexW) * avail) : 0,
  );
  const diff = total - widths.reduce((a, b) => a + b, 0);
  // give rounding remainder to the widest flexible column
  let wi = 0;
  widths.forEach((w, i) => { if (cols[i]?.fixedW === undefined && w > (widths[wi] ?? 0)) wi = i; });
  widths[wi] = (widths[wi] ?? 0) + diff;
  return widths;
}

function splitDepth(items: RoomSpec[], depth: number): number[] {
  if (items.length === 1) return [depth];
  // dress + bath: bath takes its ideal depth, dress the rest
  const ideal = items.map((s) => s.idealD);
  const sum = ideal.reduce((a, b) => a + b, 0);
  const out = ideal.map((d) => r2((d / sum) * depth));
  out[out.length - 1] = depth - out.slice(0, -1).reduce((a, b) => a + b, 0);
  return out;
}

/* ========================================================================= */
/* 4. Placement                                                              */
/* ========================================================================= */

let uid = 0;
const nid = (p: string) => `${p}-${++uid}`;

function placeRooms(floor: Floor, L: number, B: number, seed = 0): { rooms: PlanRoom[]; stair: PlanStair | null } {
  const specs = expandRequirements(floor.rooms ?? []);
  const corrW = B >= 22 ? 3.5 : 3;
  const { front, rear } = buildZones(specs, floor.staircase ?? { included: false }, B * 0.45, seed);
  const rooms: PlanRoom[] = [];
  const mk = (s: RoomSpec, x: number, y: number, w: number, h: number): PlanRoom => ({
    id: nid("R"), type: s.type, label: s.label, kind: s.kind, zone: s.zone,
    roomNumber: s.roomNumber, x, y, width: w, height: h,
  });

  if (!rear.length || !front.length) {
    const cols = rear.length ? rear : front;
    const widths = distribute(cols, L);
    let x = 0;
    cols.forEach((c, ci) => {
      const w = widths[ci] ?? 0;
      const ds = splitDepth(c.items, B);
      let y = 0;
      c.items.forEach((s, i) => { const d = ds[i] ?? 0; rooms.push(mk(s, x, y, w, d)); y += d; });
      x += w;
    });
  } else {
    const avail = B - corrW;
    const fIdeal = Math.max(...front.flatMap((c) => [c.items.reduce((a, s) => a + s.idealD, 0) * (c.items.length > 1 ? 0.85 : 1)]), 10);
    const rIdeal = Math.max(...rear.map((c) => (c.items.length > 1 && c.items[0]?.kind === "balcony" ? 17 : 12)), 10);
    const rearD = r2(clamp((avail * rIdeal) / (fIdeal + rIdeal), 8, avail - 8));
    const corrTop = rearD;
    const corrBot = rearD + corrW;
    const frontD = B - corrBot;

    // Rear (private) band
    const rw = distribute(rear, L);
    let x = 0;
    rear.forEach((c, ci) => {
      const w = rw[ci] ?? 0;
      const ds = splitDepth(c.items, rearD);
      let y = 0;
      c.items.forEach((s, i) => { const d = ds[i] ?? 0; rooms.push(mk(s, x, y, w, d)); y += d; });
      x += w;
    });

    // Front (public/service) band; living rises through the passage depth
    const fw = distribute(front, L);
    x = 0;
    let passageStart = 0;
    let passageEnd = L;
    front.forEach((c, ci) => {
      const w = fw[ci] ?? 0;
      const tall = c.items[0]?.kind === "living" || c.items[0]?.kind === "stair";
      const y0 = tall ? corrTop : corrBot;
      const ds = splitDepth(c.items, B - y0);
      let y = y0;
      c.items.forEach((s, i) => { const d = ds[i] ?? 0; rooms.push(mk(s, x, y, w, d)); y += d; });
      if (tall && ci === passageStartIndex(front, ci)) passageStart = x + w;
      x += w;
    });
    // If a stair column sits at the far end it also spans the passage
    if (passageEnd - passageStart >= 3) rooms.push({
      id: nid("R"), type: "Passage", label: "Passage", kind: "passage", zone: "circulation",
      roomNumber: 0, x: passageStart, y: corrTop, width: passageEnd - passageStart, height: corrW,
    });
    void frontD;
  }

  const stairRoom = rooms.find((r) => r.kind === "stair");
  const st = floor.staircase;
  const stair: PlanStair | null = stairRoom && st?.included
    ? { roomId: stairRoom.id, direction: st.direction ?? "straight", width: clamp(st.width ?? 3.5, 2.5, 6), length: clamp(st.length ?? 11, 6, 18) }
    : null;
  return { rooms, stair };
}

/** leading tall columns (stair, living) are contiguous from x = 0 */
function passageStartIndex(front: Column[], ci: number): number {
  for (let i = 0; i <= ci; i++) {
    const k = front[i]?.items[0]?.kind;
    if (k !== "living" && k !== "stair") return -1;
  }
  return ci;
}

/* ========================================================================= */
/* 5. Wall generation                                                        */
/* ========================================================================= */

interface Seg { o: "h" | "v"; c: number; a: number; b: number }

function mergeIntervals(list: [number, number][]): [number, number][] {
  const s = [...list].sort((p, q) => p[0] - q[0]);
  const out: [number, number][] = [];
  for (const iv of s) {
    const last = out[out.length - 1];
    if (last && iv[0] <= last[1] + EPS) last[1] = Math.max(last[1], iv[1]);
    else out.push([iv[0], iv[1]]);
  }
  return out;
}

export function generateWalls(
  rooms: PlanRoom[], L: number, B: number, wallHeight: number,
  inputWalls: InputWall[] = [], previous: PlanWall[] = [],
): PlanWall[] {
  const extLabels = ["Wall A", "Wall B", "Wall C", "Wall D"];
  const extT = (i: number) => inputWalls[i]?.thickness ?? EXT_T;
  const walls: PlanWall[] = [];
  const mkWall = (id: string, label: string, s: Seg, t: number, ext: boolean): PlanWall => {
    const prev = previous.find((p) => p.exterior === ext && sameLine(p, s) && midInside(p, s));
    return {
      id, label,
      startX: s.o === "h" ? s.a : s.c, startY: s.o === "h" ? s.c : s.a,
      endX: s.o === "h" ? s.b : s.c, endY: s.o === "h" ? s.c : s.b,
      length: s.b - s.a, height: wallHeight, thickness: prev?.thickness ?? t, exterior: ext,
    };
  };
  // Exterior: A bottom (front), B right, C top (rear), D left — closed perimeter
  const ext: Seg[] = [
    { o: "h", c: B, a: 0, b: L }, { o: "v", c: L, a: 0, b: B },
    { o: "h", c: 0, a: 0, b: L }, { o: "v", c: 0, a: 0, b: B },
  ];
  ext.forEach((s, i) => walls.push(mkWall(`WE-${i}`, inputWalls[i]?.label ?? extLabels[i] ?? `Wall ${i}`, s, extT(i), true)));

  const hMap = new Map<number, [number, number][]>();
  const vMap = new Map<number, [number, number][]>();
  const add = (m: Map<number, [number, number][]>, c: number, a: number, b: number) => {
    const k = Math.round(c * 100) / 100;
    if (b - a < EPS) return;
    const arr = m.get(k) ?? [];
    arr.push([a, b]);
    m.set(k, arr);
  };
  for (const r of rooms) {
    const x0 = r.x, x1 = r.x + r.width, y0 = r.y, y1 = r.y + r.height;
    if (!near(y0, 0) && !near(y0, B)) add(hMap, y0, x0, x1);
    if (!near(y1, 0) && !near(y1, B)) add(hMap, y1, x0, x1);
    if (!near(x0, 0) && !near(x0, L)) add(vMap, x0, y0, y1);
    if (!near(x1, 0) && !near(x1, L)) add(vMap, x1, y0, y1);
  }
  let n = 0;
  for (const [c, list] of hMap) for (const [a, b] of mergeIntervals(list)) {
    n++; walls.push(mkWall(`WI-${n}`, `Partition ${n}`, { o: "h", c, a, b }, INT_T, false));
  }
  for (const [c, list] of vMap) for (const [a, b] of mergeIntervals(list)) {
    n++; walls.push(mkWall(`WI-${n}`, `Partition ${n}`, { o: "v", c, a, b }, INT_T, false));
  }
  return walls;
}

const wallOrient = (w: PlanWall): "h" | "v" => (near(w.startY, w.endY) ? "h" : "v");
const wallCoord = (w: PlanWall) => (wallOrient(w) === "h" ? w.startY : w.startX);
function sameLine(w: PlanWall, s: Seg) { return wallOrient(w) === s.o && near(wallCoord(w), s.c); }
function midInside(w: PlanWall, s: Seg) {
  const m = wallOrient(w) === "h" ? (w.startX + w.endX) / 2 : (w.startY + w.endY) / 2;
  return m > s.a - EPS && m < s.b + EPS;
}

function findWall(walls: PlanWall[], o: "h" | "v", c: number, a: number, b: number): PlanWall | undefined {
  return walls.find((w) => {
    if (wallOrient(w) !== o || !near(wallCoord(w), c)) return false;
    const s = o === "h" ? w.startX : w.startY;
    const e = o === "h" ? w.endX : w.endY;
    return a >= s - EPS && b <= e + EPS;
  });
}

const wallStart = (w: PlanWall) => (wallOrient(w) === "h" ? w.startX : w.startY);

function exteriorSideIndex(w: PlanWall, length: number, breadth: number): number {
  if (wallOrient(w) === "h") return near(wallCoord(w), 0) ? 0 : near(wallCoord(w), breadth) ? 2 : -1;
  return near(wallCoord(w), length) ? 1 : near(wallCoord(w), 0) ? 3 : -1;
}

/* ========================================================================= */
/* 6. Doors                                                                  */
/* ========================================================================= */

interface Shared { o: "h" | "v"; c: number; a: number; b: number }

function sharedEdge(p: PlanRoom, q: PlanRoom): Shared | null {
  const px1 = p.x + p.width, py1 = p.y + p.height, qx1 = q.x + q.width, qy1 = q.y + q.height;
  if (near(py1, q.y) || near(p.y, qy1)) {
    const a = Math.max(p.x, q.x), b = Math.min(px1, qx1);
    if (b - a > EPS) return { o: "h", c: near(py1, q.y) ? py1 : p.y, a, b };
  }
  if (near(px1, q.x) || near(p.x, qx1)) {
    const a = Math.max(p.y, q.y), b = Math.min(py1, qy1);
    if (b - a > EPS) return { o: "v", c: near(px1, q.x) ? px1 : p.x, a, b };
  }
  return null;
}

function collides(openings: PlanOpening[], wallId: string, off: number, w: number, gap = 0.4) {
  return openings.some((o) => o.wallId === wallId && off < o.offset + o.width + gap && off + w + gap > o.offset);
}

function tryPlace(
  openings: PlanOpening[], walls: PlanWall[], edge: Shared, width: number,
  prefer: "start" | "end" | "center",
): { wall: PlanWall; offset: number } | null {
  const wall = findWall(walls, edge.o, edge.c, edge.a, edge.b);
  if (!wall) return null;
  const ws = wallStart(wall);
  const margin = 0.6;
  const lo = edge.a - ws + margin;
  const hi = edge.b - ws - margin - width;
  if (hi < lo - EPS) return null;
  const cands = prefer === "center" ? [(lo + hi) / 2, lo, hi] : prefer === "end" ? [hi, lo, (lo + hi) / 2] : [lo, hi, (lo + hi) / 2];
  for (let t = 0; t <= 1.0001; t += 0.125) cands.push(lo + (hi - lo) * t);
  for (const c of cands) {
    const off = r2(clamp(c, lo, hi) * 2) / 2;
    if (!collides(openings, wall.id, off, width)) return { wall, offset: off };
  }
  return null;
}

const DOOR_W: Partial<Record<RoomKind, number>> = { bath: 2.5, store: 2.5, puja: 2.5, dress: 2.5, balcony: 3, kitchen: 3 };
const PREFS: Record<RoomKind, RoomKind[]> = {
  bath: ["bed", "passage", "living", "dining", "study"],
  dress: ["bed"],
  balcony: ["bed", "living", "dining", "passage", "study"],
  store: ["kitchen", "dining", "passage"],
  kitchen: ["dining", "passage", "living"],
  puja: ["passage", "dining", "living"],
  bed: ["passage", "living", "stair", "dining"],
  study: ["passage", "living", "dining", "stair"],
  other: ["passage", "living", "dining", "stair"],
  dining: ["kitchen", "passage", "living"],
  living: [], stair: [], passage: [],
};
const CIRC: RoomKind[] = ["living", "dining", "passage", "stair"];

function placeDoors(rooms: PlanRoom[], walls: PlanWall[], L: number, B: number, mainW: number, ground = true): PlanOpening[] {
  const openings: PlanOpening[] = [];
  let dn = 0;
  const push = (wall: PlanWall, offset: number, width: number, served: PlanRoom | null, opts: Partial<PlanOpening> = {}) => {
    const o = wallOrient(wall);
    const c = wallCoord(wall);
    const into = served ? (o === "h" ? served.y + served.height / 2 : served.x + served.width / 2) : c;
    openings.push({
      id: `D${++dn}`, kind: "door", label: opts.label ?? `D${dn}`, wallId: wall.id, offset, width,
      height: 7, swing: into >= c ? 1 : -1, hingeAtStart: true, cased: false, main: false, ...opts,
    });
  };

  // Main entrance: front (Wall A) into the living/entry zone
  const living = rooms.find((r) => r.kind === "living");
  const entryRoom = living ?? rooms.find((r) => near(r.y + r.height, B) && CIRC.includes(r.kind)) ?? rooms.find((r) => near(r.y + r.height, B));
  if (entryRoom && ground) {
    const edge: Shared = { o: "h", c: B, a: entryRoom.x, b: entryRoom.x + entryRoom.width };
    const pos = tryPlace(openings, walls, edge, mainW, "center");
    if (pos) push(pos.wall, pos.offset, mainW, entryRoom, { label: "Main Door", main: true, hingeAtStart: false });
  }

  // Cased openings between circulation/public spaces (living ↔ dining ↔ passage ↔ stair)
  const circ = rooms.filter((r) => CIRC.includes(r.kind));
  const linked = new Set<string>();
  for (let i = 0; i < circ.length; i++) for (let j = i + 1; j < circ.length; j++) {
    const p = circ[i]!, q = circ[j]!;
    const e = sharedEdge(p, q);
    if (!e || e.b - e.a < 3) continue;
    const hasPassage = p.kind === "passage" || q.kind === "passage";
    const w = r2(Math.min(e.b - e.a - (hasPassage ? 0.5 : 1.5), hasPassage ? 5 : 7));
    const pos = tryPlace(openings, walls, e, w, "center");
    if (pos) {
      push(pos.wall, pos.offset, w, null, { cased: true, label: "Opening" });
      linked.add(p.id); linked.add(q.id);
    }
  }

  // Leaf doors for every remaining room, following adjacency preferences
  const bathTaken = new Set<string>();
  const order = [...rooms].sort((a, b) => (a.kind === "bath" ? 1 : 0) - (b.kind === "bath" ? 1 : 0));
  for (const r of order) {
    if (r.kind === "living" || r.kind === "passage" || r.kind === "stair") continue;
    if (r.kind === "dining" && linked.has(r.id)) continue;
    const w = DOOR_W[r.kind] ?? 3;
    const prefs = PREFS[r.kind];
    let done = false;
    for (const kind of prefs) {
      const neighbours = rooms.filter((q) => q.kind === kind && q.id !== r.id && !(r.kind === "bath" && kind === "bed" && bathTaken.has(q.id)));
      for (const q of neighbours) {
        const e = sharedEdge(r, q);
        if (!e || e.b - e.a < w + 1.2) continue;
        const pos = tryPlace(openings, walls, e, w, "start");
        if (!pos) continue;
        push(pos.wall, pos.offset, w, r, { label: `D${dn + 1}` });
        if (r.kind === "bath" && kind === "bed") bathTaken.add(q.id);
        done = true;
        break;
      }
      if (done) break;
    }
    if (!done) {
      // fallback: any neighbour
      for (const q of rooms) {
        if (q.id === r.id) continue;
        const e = sharedEdge(r, q);
        if (!e || e.b - e.a < w + 1.2) continue;
        const pos = tryPlace(openings, walls, e, w, "start");
        if (pos) { push(pos.wall, pos.offset, w, r); break; }
      }
    }
  }
  void L;
  return openings;
}

/* ========================================================================= */
/* 7. Windows (exterior walls only)                                          */
/* ========================================================================= */

function exteriorEdges(r: PlanRoom, L: number, B: number): Shared[] {
  const out: Shared[] = [];
  if (near(r.y, 0)) out.push({ o: "h", c: 0, a: r.x, b: r.x + r.width });
  if (near(r.y + r.height, B)) out.push({ o: "h", c: B, a: r.x, b: r.x + r.width });
  if (near(r.x, 0)) out.push({ o: "v", c: 0, a: r.y, b: r.y + r.height });
  if (near(r.x + r.width, L)) out.push({ o: "v", c: L, a: r.y, b: r.y + r.height });
  return out;
}

function placeWindows(
  rooms: PlanRoom[], walls: PlanWall[], openings: PlanOpening[], L: number, B: number,
  inputWindows: InputOpening[], inputWalls: InputWall[],
) {
  let wn = 0;
  const add = (wall: PlanWall, offset: number, width: number, height: number, label?: string) => {
    wn++;
    openings.push({
      id: `W${wn}`, kind: "window", label: label ?? `W${wn}`, wallId: wall.id, offset, width, height,
      swing: 1, hingeAtStart: true, cased: false, main: false,
    });
  };
  // Honour user-specified windows on referenced exterior walls
  for (const iw of inputWindows) {
    const idx = inputWalls.findIndex((w) => w.id === iw.referenceWallId || w.label === iw.referenceWallId);
    const wall = walls.find((w) => w.id === `WE-${idx}`);
    if (!wall) continue;
    const width = clamp(iw.width || 4, 1.5, wall.length - 1);
    const off = clamp(iw.distanceFromCorner || 0, 0.5, wall.length - width - 0.5);
    if (!collides(openings, wall.id, off, width)) add(wall, off, width, iw.height || 4, iw.label);
  }
  // Natural light for every habitable room
  for (const r of rooms) {
    if (["passage", "stair", "store", "dress"].includes(r.kind)) continue;
    const edges = exteriorEdges(r, L, B).sort((a, b) => (b.b - b.a) - (a.b - a.a));
    const first = edges[0];
    if (!first) continue;
    const len = first.b - first.a;
    if (r.kind === "balcony") {
      const pos = tryPlace(openings, walls, first, r2(len - 1.5), "center");
      if (pos) add(pos.wall, pos.offset, r2(len - 1.5), 3.5, "Railing");
      continue;
    }
    const w = r.kind === "bath" || r.kind === "puja" ? 2 : r.kind === "kitchen" ? 4 : r2(clamp(len * 0.35, 3, 6));
    const pos = tryPlace(openings, walls, first, w, "center");
    if (pos) add(pos.wall, pos.offset, w, r.kind === "bath" ? 2 : 4);
    // Living / bedrooms on corners get a second window for cross-ventilation
    const second = edges[1];
    if (second && (r.kind === "living" || r.kind === "bed") && second.b - second.a >= 8) {
      const p2 = tryPlace(openings, walls, second, 4, "center");
      if (p2) add(p2.wall, p2.offset, 4, 4);
    }
  }
}

/* ========================================================================= */
/* 8. Floor generation & validation                                          */
/* ========================================================================= */

export function generateFloor(floor: Floor, seed = 0): GeneratedFloor {
  const L = r2(Math.max(16, floor.dimensions?.length || 40));
  const B = r2(Math.max(16, floor.dimensions?.breadth || 30));
  const H = floor.dimensions?.wallHeight || 10;
  const { rooms, stair } = placeRooms(floor, L, B, seed + (floor.floorNumber ?? 1) * 101);
  const walls = generateWalls(rooms, L, B, H, floor.walls ?? []);
  const mainW = clamp(floor.doors?.[0]?.width || 3.5, 3, 5);
  const openings = placeDoors(rooms, walls, L, B, mainW, (floor.floorNumber ?? 1) <= 1);
  placeWindows(rooms, walls, openings, L, B, floor.windows ?? [], floor.walls ?? []);
  return {
    floorId: floor.id, floorNumber: floor.floorNumber, length: L, breadth: B, wallHeight: H,
    rooms, walls, openings, stair, notes: floor.additionalNotes ?? "",
  };
}

const overlaps = (a: PlanRoom, b: PlanRoom) =>
  a.x < b.x + b.width - EPS && a.x + a.width > b.x + EPS && a.y < b.y + b.height - EPS && a.y + a.height > b.y + EPS;

export function validateFloor(f: GeneratedFloor): string[] {
  const out: string[] = [];
  f.rooms.forEach((r, i) => {
    if (r.width <= 0 || r.height <= 0) out.push(`${r.label}: non-positive size`);
    if (r.x < -EPS || r.y < -EPS || r.x + r.width > f.length + EPS || r.y + r.height > f.breadth + EPS)
      out.push(`${r.label}: outside exterior boundary`);
    f.rooms.slice(i + 1).forEach((q) => { if (overlaps(r, q)) out.push(`${r.label} overlaps ${q.label}`); });
    if (r.kind !== "passage" && r.kind !== "stair" && (r.width < 4 || r.height < 4)) out.push(`${r.label}: very small (${formatFtIn(r.width)} × ${formatFtIn(r.height)})`);
  });
  const keys = new Set<string>();
  for (const w of f.walls) {
    const k = `${w.startX},${w.startY},${w.endX},${w.endY}`;
    if (keys.has(k)) out.push(`${w.label}: duplicate wall`);
    keys.add(k);
    if (w.length <= 0 || w.thickness <= 0) out.push(`${w.label}: invalid size`);
  }
  for (const o of f.openings) {
    const w = f.walls.find((x) => x.id === o.wallId);
    if (!w) { out.push(`${o.label}: not attached to a wall`); continue; }
    if (o.offset < -EPS || o.offset + o.width > w.length + EPS) out.push(`${o.label}: exceeds ${w.label} length`);
    if (o.kind === "window" && !w.exterior) out.push(`${o.label}: window on interior wall`);
    if (collides(f.openings.filter((x) => x.id !== o.id), o.wallId, o.offset, o.width, 0)) out.push(`${o.label}: collides with another opening`);
  }
  return out;
}

/** Recompute walls after room edits and re-attach openings geometrically. */
function rebuild(f: GeneratedFloor, rooms: PlanRoom[], moved?: { id: string; dx: number; dy: number; before: PlanRoom }): GeneratedFloor {
  const walls = generateWalls(rooms, f.length, f.breadth, f.wallHeight, [], f.walls);
  const openings = f.openings.map((o) => {
    const ow = f.walls.find((w) => w.id === o.wallId);
    if (!ow) return o;
    const or = wallOrient(ow);
    let a = wallStart(ow) + o.offset;
    let c = wallCoord(ow);
    if (moved && onBoundary(moved.before, or, c, a + o.width / 2) && !ow.exterior) {
      if (or === "h") { a += moved.dx; c += moved.dy; } else { a += moved.dy; c += moved.dx; }
    }
    const nw = findWall(walls, or, c, a, a + o.width);
    return nw ? { ...o, wallId: nw.id, offset: a - wallStart(nw) } : { ...o, wallId: "" };
  });
  return { ...f, rooms, walls, openings };
}

function moveInternalWall(f: GeneratedFloor, wall: PlanWall, delta: number): GeneratedFloor | null {
  if (wall.exterior || Math.abs(delta) < EPS) return f;
  const orientation = wallOrient(wall);
  const coordinate = wallCoord(wall);
  const start = wallStart(wall);
  const end = start + wall.length;
  const rooms = f.rooms.map((room) => ({ ...room }));
  let changed = false;

  for (const room of rooms) {
    const overlapStart = orientation === "v"
      ? Math.max(room.y, start)
      : Math.max(room.x, start);
    const overlapEnd = orientation === "v"
      ? Math.min(room.y + room.height, end)
      : Math.min(room.x + room.width, end);
    if (overlapEnd - overlapStart <= EPS) continue;

    if (orientation === "v" && near(room.x + room.width, coordinate)) {
      const width = room.width + delta;
      if (width < MIN_ROOM_SIZE || room.x + width > f.length + EPS) return null;
      room.width = r2(width);
      changed = true;
    } else if (orientation === "v" && near(room.x, coordinate)) {
      const width = room.width - delta;
      const x = room.x + delta;
      if (width < MIN_ROOM_SIZE || x < -EPS || x + width > f.length + EPS) return null;
      room.x = r2(x);
      room.width = r2(width);
      changed = true;
    } else if (orientation === "h" && near(room.y + room.height, coordinate)) {
      const height = room.height + delta;
      if (height < MIN_ROOM_SIZE || room.y + height > f.breadth + EPS) return null;
      room.height = r2(height);
      changed = true;
    } else if (orientation === "h" && near(room.y, coordinate)) {
      const height = room.height - delta;
      const y = room.y + delta;
      if (height < MIN_ROOM_SIZE || y < -EPS || y + height > f.breadth + EPS) return null;
      room.y = r2(y);
      room.height = r2(height);
      changed = true;
    }
  }

  if (!changed) return null;
  const next = rebuild(f, rooms);
  const shiftedCoordinate = coordinate + delta;
  next.openings = f.openings.map((opening) => {
    if (opening.wallId !== wall.id) {
      return next.openings.find((candidate) => candidate.id === opening.id) ?? opening;
    }
    const openingStart = start + opening.offset;
    const movedWall = findWall(
      next.walls,
      orientation,
      shiftedCoordinate,
      openingStart,
      openingStart + opening.width,
    );
    if (!movedWall) return opening;
    return {
      ...opening,
      wallId: movedWall.id,
      offset: clamp(openingStart - wallStart(movedWall), 0, movedWall.length - opening.width),
    };
  });
  return next;
}

function onBoundary(r: PlanRoom, o: "h" | "v", c: number, m: number) {
  if (o === "h") return (near(c, r.y) || near(c, r.y + r.height)) && m > r.x && m < r.x + r.width;
  return (near(c, r.x) || near(c, r.x + r.width)) && m > r.y && m < r.y + r.height;
}

/* ========================================================================= */
/* 9. Rendering helpers                                                      */
/* ========================================================================= */

type Sel = { type: "room" | "wall" | "opening"; id: string } | null;

function wallPieces(w: PlanWall, ops: PlanOpening[]): [number, number][] {
  const cuts = ops.filter((o) => o.wallId === w.id).map((o) => [o.offset, o.offset + o.width] as [number, number]);
  const merged = mergeIntervals(cuts);
  const pieces: [number, number][] = [];
  let s = 0;
  for (const [a, b] of merged) { if (a > s) pieces.push([s, a]); s = Math.max(s, b); }
  if (s < w.length) pieces.push([s, w.length]);
  return pieces;
}

function WallShape({ w, ops, selected, hovered, direction, onDown, onEnter, onLeave }: { w: PlanWall; ops: PlanOpening[]; selected: boolean; hovered: boolean; direction?: string; onDown: (e: ReactPointerEvent) => void; onEnter: () => void; onLeave: () => void }) {
  const o = wallOrient(w);
  const t = w.thickness;
  const st = wallStart(w);
  const c = wallCoord(w);
  const mid = wallStart(w) + w.length / 2;
  const labelX = o === "h" ? mid : c + (o === "v" && c < 1 ? -1.1 : 1.1);
  const labelY = o === "h" ? c + (c < 1 ? -1.1 : 1.1) : mid;
  return (
    <g onPointerDown={onDown} onPointerEnter={onEnter} onPointerLeave={onLeave} style={{ cursor: w.exterior ? "pointer" : o === "v" ? "ew-resize" : "ns-resize" }}>
      {wallPieces(w, ops).map(([a, b], i) => {
        const ea = a <= EPS ? t / 2 : 0;
        const eb = b >= w.length - EPS ? t / 2 : 0;
        const s0 = st + a - ea, s1 = st + b + eb;
        const x = o === "h" ? s0 : c - t / 2, y = o === "h" ? c - t / 2 : s0;
        const ww = o === "h" ? s1 - s0 : t, hh = o === "h" ? t : s1 - s0;
        return <rect key={i} x={x * SCALE} y={y * SCALE} width={ww * SCALE} height={hh * SCALE} fill={selected ? SELECT : hovered && !w.exterior ? "#555" : INK} />;
      })}
      {direction && <text x={labelX * SCALE} y={labelY * SCALE} fontSize={7} textAnchor="middle" fill="#666" pointerEvents="none">{direction} Wall</text>}
    </g>
  );
}

function OpeningShape({ op, wall, selected, onDown }: { op: PlanOpening; wall: PlanWall; selected: boolean; onDown: (e: ReactPointerEvent) => void }) {
  const o = wallOrient(wall);
  const c = wallCoord(wall);
  const s0 = wallStart(wall) + op.offset;
  const s1 = s0 + op.width;
  const t = wall.thickness;
  const P = (s: number, n: number) => (o === "h" ? [s * SCALE, (c + n) * SCALE] : [(c + n) * SCALE, s * SCALE]) as [number, number];
  const col = selected ? SELECT : INK;
  const sw = 1.1;
  if (op.kind === "window") {
    const [ax, ay] = P(s0, -t / 2);
    const [bx, by] = P(s1, t / 2);
    const l1a = P(s0, -t / 6), l1b = P(s1, -t / 6), l2a = P(s0, t / 6), l2b = P(s1, t / 6);
    const railing = op.label === "Railing";
    return (
      <g onPointerDown={onDown} style={{ cursor: "grab" }}>
        <rect x={Math.min(ax, bx)} y={Math.min(ay, by)} width={Math.abs(bx - ax)} height={Math.abs(by - ay)} fill="#fff" stroke={col} strokeWidth={sw} />
        <line x1={l1a[0]} y1={l1a[1]} x2={l1b[0]} y2={l1b[1]} stroke={col} strokeWidth={0.8} />
        {!railing && <line x1={l2a[0]} y1={l2a[1]} x2={l2b[0]} y2={l2b[1]} stroke={col} strokeWidth={0.8} />}
      </g>
    );
  }
  // door jambs
  const j = [P(s0, -t / 2), P(s0, t / 2), P(s1, -t / 2), P(s1, t / 2)];
  const hit = (() => { const [ax, ay] = P(s0, -t); const [bx, by] = P(s1, t); return { x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(bx - ax), h: Math.abs(by - ay) }; })();
  if (op.cased) {
    return (
      <g onPointerDown={onDown} style={{ cursor: "grab" }}>
        <rect x={hit.x} y={hit.y} width={hit.w} height={hit.h} fill="transparent" />
        <line x1={j[0]![0]} y1={j[0]![1]} x2={j[1]![0]} y2={j[1]![1]} stroke={col} strokeWidth={sw} />
        <line x1={j[2]![0]} y1={j[2]![1]} x2={j[3]![0]} y2={j[3]![1]} stroke={col} strokeWidth={sw} />
      </g>
    );
  }
  const hs = op.hingeAtStart ? s0 : s1;
  const fs = op.hingeAtStart ? s1 : s0;
  const n = op.swing * (t / 2);
  const hinge = P(hs, n);
  const leafEnd = P(hs, n + op.swing * op.width);
  const free = P(fs, n);
  // sweep direction depends on orientation/side
  const cross = (leafEnd[0] - hinge[0]) * (free[1] - hinge[1]) - (leafEnd[1] - hinge[1]) * (free[0] - hinge[0]);
  const sweep = cross > 0 ? 1 : 0;
  const R = op.width * SCALE;
  return (
    <g onPointerDown={onDown} style={{ cursor: "grab" }}>
      <rect x={hit.x} y={hit.y} width={hit.w} height={hit.h} fill="transparent" />
      <line x1={j[0]![0]} y1={j[0]![1]} x2={j[1]![0]} y2={j[1]![1]} stroke={col} strokeWidth={sw} />
      <line x1={j[2]![0]} y1={j[2]![1]} x2={j[3]![0]} y2={j[3]![1]} stroke={col} strokeWidth={sw} />
      <line x1={hinge[0]} y1={hinge[1]} x2={leafEnd[0]} y2={leafEnd[1]} stroke={col} strokeWidth={op.main ? 2 : 1.4} />
      <path d={`M ${leafEnd[0]} ${leafEnd[1]} A ${R} ${R} 0 0 ${sweep} ${free[0]} ${free[1]}`} fill="none" stroke={col} strokeWidth={0.7} strokeDasharray={op.main ? undefined : "3 2"} />
    </g>
  );
}

function StairShape({ room, stair }: { room: PlanRoom; stair: PlanStair }) {
  const p = 0.35;
  const x = (room.x + p) * SCALE, y = (room.y + p) * SCALE;
  const w = (room.width - 2 * p) * SCALE, h = (room.height - 2 * p) * SCALE;
  const tread = 0.9 * SCALE;
  const lines: ReactElement[] = [];
  const st = { stroke: INK, strokeWidth: 0.7 };
  const arrow = (x1: number, y1: number, x2: number, y2: number, k: string) => {
    const ang = Math.atan2(y2 - y1, x2 - x1), a = 6;
    lines.push(
      <g key={k}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} {...st} />
        <path d={`M ${x2} ${y2} L ${x2 - a * Math.cos(ang - 0.4)} ${y2 - a * Math.sin(ang - 0.4)} L ${x2 - a * Math.cos(ang + 0.4)} ${y2 - a * Math.sin(ang + 0.4)} Z`} fill={INK} />
      </g>,
    );
  };
  const sw = Math.min(stair.width * SCALE, w);
  if (stair.direction === "spiral") {
    const cx = x + w / 2, cy = y + h / 2, rr = Math.min(w, h) / 2;
    lines.push(<circle key="c" cx={cx} cy={cy} r={rr} fill="none" {...st} />);
    lines.push(<circle key="p" cx={cx} cy={cy} r={rr * 0.12} fill="none" {...st} />);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      lines.push(<line key={`s${i}`} x1={cx + Math.cos(a) * rr * 0.12} y1={cy + Math.sin(a) * rr * 0.12} x2={cx + Math.cos(a) * rr} y2={cy + Math.sin(a) * rr} {...st} />);
    }
  } else if (stair.direction === "u-shaped") {
    const fw = (w - 0.5 * SCALE) / 2, land = Math.min(sw, h * 0.35);
    lines.push(<rect key="o" x={x} y={y} width={w} height={h} fill="none" {...st} />);
    lines.push(<line key="l" x1={x} y1={y + land} x2={x + w} y2={y + land} {...st} />);
    lines.push(<line key="m" x1={x + fw} y1={y + land} x2={x + fw} y2={y + h} {...st} />);
    lines.push(<line key="m2" x1={x + w - fw} y1={y + land} x2={x + w - fw} y2={y + h} {...st} />);
    for (let yy = y + land + tread; yy < y + h; yy += tread) {
      lines.push(<line key={`a${yy}`} x1={x} y1={yy} x2={x + fw} y2={yy} {...st} />);
      lines.push(<line key={`b${yy}`} x1={x + w - fw} y1={yy} x2={x + w} y2={yy} {...st} />);
    }
    arrow(x + fw / 2, y + h - 4, x + fw / 2, y + land / 2, "u1");
    arrow(x + fw / 2, y + land / 2, x + w - fw / 2, y + land / 2, "u2");
    arrow(x + w - fw / 2, y + land / 2, x + w - fw / 2, y + h - 6, "u3");
  } else if (stair.direction === "l-shaped") {
    const land = Math.min(sw, h * 0.4);
    lines.push(<path key="o" d={`M ${x} ${y + h} L ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + land} L ${x + sw} ${y + land} L ${x + sw} ${y + h} Z`} fill="none" {...st} />);
    lines.push(<line key="l1" x1={x} y1={y + land} x2={x + sw} y2={y + land} {...st} />);
    lines.push(<line key="l2" x1={x + sw} y1={y} x2={x + sw} y2={y + land} {...st} />);
    for (let yy = y + land + tread; yy < y + h; yy += tread) lines.push(<line key={`a${yy}`} x1={x} y1={yy} x2={x + sw} y2={yy} {...st} />);
    for (let xx = x + sw + tread; xx < x + w; xx += tread) lines.push(<line key={`b${xx}`} x1={xx} y1={y} x2={xx} y2={y + land} {...st} />);
    arrow(x + sw / 2, y + h - 4, x + sw / 2, y + land / 2, "l1a");
    arrow(x + sw / 2, y + land / 2, x + w - 6, y + land / 2, "l2a");
  } else {
    const sx = x + (w - sw) / 2;
    lines.push(<rect key="o" x={sx} y={y} width={sw} height={h} fill="none" {...st} />);
    for (let yy = y + tread; yy < y + h; yy += tread) lines.push(<line key={`t${yy}`} x1={sx} y1={yy} x2={sx + sw} y2={yy} {...st} />);
    arrow(sx + sw / 2, y + h - 4, sx + sw / 2, y + 6, "s");
  }
  return <g pointerEvents="none">{lines}<text x={x + w / 2} y={y + h + 0.1 * SCALE} fontSize={8} textAnchor="middle" fill={INK} dy={-4}>UP</text></g>;
}

function Fixtures({ r, L, B }: { r: PlanRoom; L: number; B: number }) {
  const st = { stroke: "#555", strokeWidth: 0.6, fill: "none" };
  const S = SCALE;
  if (r.kind === "bed" && r.width >= 9 && r.height >= 9) {
    const bw = Math.min(5.5, r.width - 3), bl = Math.min(6.5, r.height - 3);
    const atTop = near(r.y, 0) || !near(r.y + r.height, B);
    const bx = r.x + (r.width - bw) / 2;
    const by = atTop ? r.y + 0.4 : r.y + r.height - 0.4 - bl;
    const py = atTop ? by + 0.3 : by + bl - 1.5;
    return (
      <g pointerEvents="none">
        <rect x={bx * S} y={by * S} width={bw * S} height={bl * S} {...st} />
        <rect x={(bx + 0.3) * S} y={py * S} width={(bw / 2 - 0.45) * S} height={1.2 * S} rx={3} {...st} />
        <rect x={(bx + bw / 2 + 0.15) * S} y={py * S} width={(bw / 2 - 0.45) * S} height={1.2 * S} rx={3} {...st} />
      </g>
    );
  }
  if (r.kind === "kitchen") {
    const e = exteriorEdges(r, L, B)[0];
    const d = 2;
    let rect = { x: r.x + 0.3, y: r.y + 0.3, w: r.width - 0.6, h: d };
    if (e?.o === "h" && near(e.c, B)) rect = { x: r.x + 0.3, y: r.y + r.height - 0.3 - d, w: r.width - 0.6, h: d };
    if (e?.o === "v") rect = near(e.c, 0) ? { x: r.x + 0.3, y: r.y + 0.3, w: d, h: r.height - 0.6 } : { x: r.x + r.width - 0.3 - d, y: r.y + 0.3, w: d, h: r.height - 0.6 };
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    return (
      <g pointerEvents="none">
        <rect x={rect.x * S} y={rect.y * S} width={rect.w * S} height={rect.h * S} {...st} />
        <rect x={(cx - 0.9) * S} y={(cy - 0.6) * S} width={1.8 * S} height={1.2 * S} rx={2} {...st} />
      </g>
    );
  }
  if (r.kind === "bath" && r.width >= 4 && r.height >= 5) {
    const wx = r.x + r.width - 1.9, wy = r.y + 0.4;
    return (
      <g pointerEvents="none">
        <rect x={wx * S} y={wy * S} width={1.5 * S} height={0.6 * S} {...st} />
        <ellipse cx={(wx + 0.75) * S} cy={(wy + 1.5) * S} rx={0.65 * S} ry={0.9 * S} {...st} />
        <circle cx={(r.x + 1.1) * S} cy={(r.y + r.height - 1.1) * S} r={0.6 * S} {...st} />
      </g>
    );
  }
  return null;
}

function DimLine({ x1, y1, x2, y2, label, off }: { x1: number; y1: number; x2: number; y2: number; label: string; off: "above" | "left" }) {
  const S = SCALE;
  const h = near(y1, y2);
  const t = 4;
  const tick = (x: number, y: number, k: string) => <line key={k} x1={x * S - t} y1={y * S + t} x2={x * S + t} y2={y * S - t} stroke={INK} strokeWidth={0.9} />;
  const mx = ((x1 + x2) / 2) * S, my = ((y1 + y2) / 2) * S;
  return (
    <g pointerEvents="none">
      <line x1={x1 * S} y1={y1 * S} x2={x2 * S} y2={y2 * S} stroke={INK} strokeWidth={0.5} />
      {tick(x1, y1, "a")}{tick(x2, y2, "b")}
      {h ? (
        <text x={mx} y={my - 3} fontSize={8.5} textAnchor="middle" fill={INK} fontFamily="Arial, Helvetica, sans-serif">{label}</text>
      ) : (
        <text x={mx - 3} y={my} fontSize={8.5} textAnchor="middle" fill={INK} fontFamily="Arial, Helvetica, sans-serif" transform={`rotate(-90 ${mx - 3} ${my})`}>{label}</text>
      )}
      {off === "left" ? null : null}
    </g>
  );
}

function chain(points: number[]): [number, number][] {
  const u = [...new Set(points.map((p) => Math.round(p * 100) / 100))].sort((a, b) => a - b);
  const out: [number, number][] = [];
  for (let i = 0; i < u.length - 1; i++) out.push([u[i]!, u[i + 1]!]);
  return out.filter(([a, b]) => b - a > 0.9);
}

function Dimensions({ f }: { f: GeneratedFloor }) {
  const { length: L, breadth: B, rooms } = f;
  const top = rooms.filter((r) => near(r.y, 0)).flatMap((r) => [r.x, r.x + r.width]);
  const bot = rooms.filter((r) => near(r.y + r.height, B)).flatMap((r) => [r.x, r.x + r.width]);
  const right = rooms.filter((r) => near(r.x + r.width, L)).flatMap((r) => [r.y, r.y + r.height]);
  const els: ReactElement[] = [];
  chain([0, L, ...top]).forEach(([a, b], i) => els.push(<DimLine key={`t${i}`} x1={a} y1={-2} x2={b} y2={-2} label={formatFtIn(b - a)} off="above" />));
  els.push(<DimLine key="tt" x1={0} y1={-4.2} x2={L} y2={-4.2} label={formatFtIn(L)} off="above" />);
  chain([0, L, ...bot]).forEach(([a, b], i) => els.push(<DimLine key={`b${i}`} x1={a} y1={B + 2.4} x2={b} y2={B + 2.4} label={formatFtIn(b - a)} off="above" />));
  chain([0, B, ...right]).forEach(([a, b], i) => els.push(<DimLine key={`r${i}`} x1={L + 2.4} y1={a} x2={L + 2.4} y2={b} label={formatFtIn(b - a)} off="left" />));
  els.push(<DimLine key="ll" x1={-3} y1={0} x2={-3} y2={B} label={formatFtIn(B)} off="left" />);
  // extension lines
  const ext = [
    [0, -0.6, 0, -4.6], [L, -0.6, L, -4.6], [-0.6, 0, -3.4, 0], [-0.6, B, -3.4, B],
  ];
  ext.forEach(([a, b, c, d], i) => els.push(<line key={`e${i}`} x1={a! * SCALE} y1={b! * SCALE} x2={c! * SCALE} y2={d! * SCALE} stroke={INK} strokeWidth={0.4} />));
  return <g>{els}</g>;
}

/* ========================================================================= */
/* 10. Component                                                             */
/* ========================================================================= */

function normaliseFloors(data: FloorPlanData): Floor[] {
  const floors = [...(data?.floors ?? [])].sort((a, b) => a.floorNumber - b.floorNumber);
  const want = Math.max(1, data?.numberOfFloors || floors.length || 1);
  const base = floors[0];
  while (floors.length < want) {
    const n = floors.length + 1;
    floors.push({
      id: `floor-${n}`, floorNumber: n, rooms: [],
      dimensions: base?.dimensions ?? { length: 40, breadth: 30, wallHeight: 10 },
      walls: [], doors: [], windows: [], staircase: base?.staircase ?? { included: false }, additionalNotes: "",
    });
  }
  return floors.slice(0, want);
}

interface View { x: number; y: number; w: number; h: number }
const fitView = (f: GeneratedFloor | undefined): View => {
  const L = f?.length ?? 40, B = f?.breadth ?? 30, m = 8;
  return { x: -m * SCALE, y: -m * SCALE, w: (L + 2 * m) * SCALE, h: (B + 2 * m) * SCALE };
};

type Drag =
  | { t: "room"; id: string; sx: number; sy: number; ox: number; oy: number; before: PlanRoom; base: GeneratedFloor }
  | { t: "opening"; id: string }
  | { t: "wall"; id: string; sx: number; sy: number; base: GeneratedFloor }
  | { t: "pan"; sx: number; sy: number; v: View };

export default function FloorPlanEditor({ data, onChange, generationSeed = 0, className, height = 680 }: FloorPlanEditorProps) {
  const sourceFloors = useMemo(() => normaliseFloors(data), [data]);
  const generate = useCallback(() => {
  // Try the requested variation first
    const firstCandidate = sourceFloors.map((floor) =>
        generateFloor(floor, generationSeed)
    );

    if (firstCandidate.every((floor) => validateFloor(floor).length === 0)) {
        return firstCandidate;
    }

  // If invalid, try the next 10 seeds
    for (let offset = 1; offset <= 10; offset += 1) {
        const retrySeed = generationSeed + offset;

        const candidate = sourceFloors.map((floor) =>
            generateFloor(floor, retrySeed)
        );

        if (candidate.every((floor) => validateFloor(floor).length === 0)) {
            return candidate;
        }
    }

  // Final fallback
    return sourceFloors.map((floor) => generateFloor(floor, 0));
  }, [generationSeed, sourceFloors]);
  const [floors, setFloors] = useState<GeneratedFloor[]>(generate);
  const [active, setActive] = useState(0);
  const [sel, setSel] = useState<Sel>(null);
  const [view, setView] = useState<View>(() => fitView(floors[0]));
  const [msg, setMsg] = useState<string>("");
  const [addingDoor, setAddingDoor] = useState(false);
  const [hoveredWallId, setHoveredWallId] = useState<string | null>(null);
  const [roomNameDraft, setRoomNameDraft] = useState("");
  const [northDirection, setNorthDirection] = useState<NorthDirection>("top");
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<Drag | null>(null);

  useEffect(() => { const g = generate(); setFloors(g); setActive(0); setSel(null); setView(fitView(g[0])); }, [generate]);
  useEffect(() => {
    onChange?.(floors.map((floor) => ({ ...floor, northDirection })));
  }, [floors, northDirection, onChange]);

  const f = floors[active];
  const warnings = useMemo(() => (f ? validateFloor(f) : []), [f]);

  const updateFloor = (fn: (g: GeneratedFloor) => GeneratedFloor) =>
    setFloors((all) => all.map((g, i) => (i === active ? fn(g) : g)));

  const toPlan = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const m = svg.getScreenCTM();
    const p = m ? pt.matrixTransform(m.inverse()) : pt;
    return { x: p.x / SCALE, y: p.y / SCALE };
  };

  const onRoomDown = (r: PlanRoom) => (e: ReactPointerEvent) => {
    e.stopPropagation();
    setSel({ type: "room", id: r.id });
    if (!f) return;
    const p = toPlan(e);
    drag.current = { t: "room", id: r.id, sx: p.x, sy: p.y, ox: r.x, oy: r.y, before: r, base: f };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onOpeningDown = (o: PlanOpening) => (e: ReactPointerEvent) => {
    e.stopPropagation();
    setSel({ type: "opening", id: o.id });
    drag.current = { t: "opening", id: o.id };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const addDoorAtWall = (wall: PlanWall, point: { x: number; y: number }) => {
    const width = clamp(3.5, 1, wall.length);
    const position = wallOrient(wall) === "h" ? point.x : point.y;
    const offset = r2(clamp(position - wallStart(wall) - width / 2, 0, wall.length - width));
    if (collides(f?.openings ?? [], wall.id, offset, width)) {
      setMsg("Door blocked: it would overlap another opening.");
      return;
    }
    const nextDoor: PlanOpening = {
      id: nid("D"),
      kind: "door",
      label: `Door ${(f?.openings.filter((o) => o.kind === "door").length ?? 0) + 1}`,
      wallId: wall.id,
      offset,
      width,
      height: 7,
      swing: 1,
      hingeAtStart: true,
      cased: false,
      main: false,
    };
    updateFloor((g) => ({ ...g, openings: [...g.openings, nextDoor] }));
    setAddingDoor(false);
    setSel({ type: "opening", id: nextDoor.id });
    setMsg("");
  };
  const onWallDown = (w: PlanWall) => (e: ReactPointerEvent) => {
    e.stopPropagation();
    const p = toPlan(e);
    if (addingDoor) {
      addDoorAtWall(w, p);
      return;
    }
    setSel({ type: "wall", id: w.id });
    if (!w.exterior && f) {
      drag.current = { t: "wall", id: w.id, sx: p.x, sy: p.y, base: f };
      (e.target as Element).setPointerCapture?.(e.pointerId);
    }
  };
  const onBgDown = (e: ReactPointerEvent) => {
    setSel(null);
    drag.current = { t: "pan", sx: e.clientX, sy: e.clientY, v: view };
  };

  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d || !f) return;
    if (d.t === "pan") {
      const svg = svgRef.current;
      if (!svg) return;
      const k = d.v.w / svg.clientWidth;
      setView({ ...d.v, x: d.v.x - (e.clientX - d.sx) * k, y: d.v.y - (e.clientY - d.sy) * k });
      return;
    }
    const p = toPlan(e);
    if (d.t === "room") {
      const base = d.base;
      const r = d.before;
      const nx = r2(clamp(d.ox + p.x - d.sx, 0, base.length - r.width));
      const ny = r2(clamp(d.oy + p.y - d.sy, 0, base.breadth - r.height));
      const moved = { ...r, x: nx, y: ny };
      if (base.rooms.some((q) => q.id !== r.id && overlaps(moved, q))) { setMsg("Move blocked: rooms would overlap. Shrink a neighbour first."); return; }
      setMsg("");
      const rooms = base.rooms.map((q) => (q.id === r.id ? moved : q));
      updateFloor(() => rebuild(base, rooms, { id: r.id, dx: nx - r.x, dy: ny - r.y, before: r }));
      return;
    }
    if (d.t === "wall") {
      const wall = d.base.walls.find((candidate) => candidate.id === d.id);
      if (!wall) return;
      const delta = r2((wallOrient(wall) === "v" ? p.x - d.sx : p.y - d.sy) * 2) / 2;
      const moved = moveInternalWall(d.base, wall, delta);
      if (!moved) {
        setMsg("Wall move blocked: adjacent rooms must keep a valid size.");
        return;
      }
      setMsg(`Wall movement: ${formatFtIn(delta)}`);
      setFloors((all) => all.map((g) => (g.floorId === d.base.floorId ? moved : g)));
      return;
    }
    // opening: slide along its wall
    updateFloor((g) => {
      const op = g.openings.find((o) => o.id === d.id);
      const w = op && g.walls.find((x) => x.id === op.wallId);
      if (!op || !w) return g;
      const s = (wallOrient(w) === "h" ? p.x : p.y) - wallStart(w);
      const off = r2(clamp(s - op.width / 2, 0, w.length - op.width) * 2) / 2;
      return { ...g, openings: g.openings.map((o) => (o.id === op.id ? { ...o, offset: off } : o)) };
    });
  };
  const onUp = () => { drag.current = null; };

  const zoom = (k: number) => setView((v) => {
    const cx = v.x + v.w / 2, cy = v.y + v.h / 2, w = clamp(v.w * k, 200, 20000), h = v.h * (w / v.w);
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  });
  const onWheel = (e: ReactWheelEvent) => { zoom(e.deltaY > 0 ? 1.1 : 0.9); };

  /* ---------- property editing ---------- */
  const selRoom = sel?.type === "room" ? f?.rooms.find((r) => r.id === sel.id) : undefined;
  const selWall = sel?.type === "wall" ? f?.walls.find((w) => w.id === sel.id) : undefined;
  const selOp = sel?.type === "opening" ? f?.openings.find((o) => o.id === sel.id) : undefined;

  useEffect(() => {
    setRoomNameDraft(selRoom?.label ?? "");
  }, [selRoom?.id, selRoom?.label]);

  const editRoom = (patch: Partial<PlanRoom>) => {
    if (!f || !selRoom) return;
    const next = { ...selRoom, ...patch };
    if (next.width <= 0 || next.height <= 0) return setMsg("Size must be positive.");
    if (next.x + next.width > f.length + EPS || next.y + next.height > f.breadth + EPS) return setMsg("Room would exceed the exterior boundary.");
    if (f.rooms.some((q) => q.id !== next.id && overlaps(next, q))) return setMsg("Change blocked: room would overlap a neighbour.");
    setMsg("");
    updateFloor((g) => rebuild(g, g.rooms.map((q) => (q.id === next.id ? next : q))));
  };
  const applyRoomName = () => {
    const label = roomNameDraft.trim();
    if (!label) {
      setMsg("Room name cannot be empty.");
      return;
    }
    editRoom({ label });
  };
  const editWall = (patch: { length?: number; thickness?: number }) => {
    if (!selWall) return;
    if (selWall.exterior && patch.length !== undefined) {
      setMsg("Exterior boundary walls cannot be resized.");
      return;
    }
    updateFloor((g) => ({
      ...g,
      walls: g.walls.map((w) => {
        if (w.id !== selWall.id) return w;
        const n = { ...w };
        if (patch.thickness !== undefined) n.thickness = clamp(patch.thickness, 0.25, 2);
        if (patch.length !== undefined) {
          const len = Math.max(1, patch.length);
          n.length = len;
          if (wallOrient(w) === "h") n.endX = w.startX + len; else n.endY = w.startY + len;
        }
        return n;
      }),
    }));
  };
  const editOp = (patch: Partial<PlanOpening>) => {
    if (!selOp) return;
    updateFloor((g) => ({
      ...g,
      openings: g.openings.map((o) => {
        if (o.id !== selOp.id) return o;
        const w = g.walls.find((x) => x.id === o.wallId);
        const n = { ...o, ...patch };
        n.width = clamp(n.width, 1, w ? w.length : 20);
        n.height = clamp(n.height, 1, g.wallHeight);
        if (w) n.offset = clamp(n.offset, 0, w.length - n.width);
        return n;
      }),
    }));
  };

  const deleteSelectedDoor = () => {
    if (!selOp || selOp.kind !== "door") return;
    updateFloor((g) => ({
      ...g,
      openings: g.openings.filter((opening) => opening.id !== selOp.id),
    }));
    setSel(null);
    setMsg("");
  };

  if (!f) return <div className={className}>No floor data.</div>;

  const btn: CSSProperties = { border: `1px solid ${INK}`, background: "#fff", color: INK, padding: "4px 10px", fontSize: 12, cursor: "pointer", borderRadius: 3 };
  const num = (label: string, value: number, on: (v: number) => void, step = 0.5) => (
    <label style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, margin: "4px 0" }}>
      <span>{label}</span>
      <input type="number" step={step} value={Math.round(value * 100) / 100} onChange={(e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) on(v); }} style={{ width: 80, border: "1px solid #999", padding: "2px 4px" }} />
    </label>
  );

  const wallMap = new Map(f.walls.map((w) => [w.id, w]));
  const labelFont = "Arial, Helvetica, sans-serif";
  const sideDirections: Record<NorthDirection, string[]> = {
    top: ["North", "East", "South", "West"],
    right: ["West", "North", "East", "South"],
    bottom: ["South", "West", "North", "East"],
    left: ["East", "South", "West", "North"],
  };
  const directions = sideDirections[northDirection];
  const northRotation = { top: 0, right: 90, bottom: 180, left: 270 }[northDirection];

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: labelFont, color: INK }}>
      {/* toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        {floors.map((g, i) => (
          <button key={g.floorId} style={{ ...btn, background: i === active ? INK : "#fff", color: i === active ? "#fff" : INK }} onClick={() => { setActive(i); setSel(null); setView(fitView(g)); }}>
            Floor {g.floorNumber}
          </button>
        ))}
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
          North Direction
          <select value={northDirection} onChange={(e) => setNorthDirection(e.target.value as NorthDirection)} style={{ border: "1px solid #999", padding: "3px 5px" }}>
            <option value="top">↑ North</option>
            <option value="right">→ North</option>
            <option value="bottom">↓ North</option>
            <option value="left">← North</option>
          </select>
        </label>
        <button style={btn} onClick={() => { setAddingDoor((active) => !active); setMsg(""); }}>
          {addingDoor ? "Click Wall to Place Door" : "Add Door"}
        </button>
        <span style={{ flex: 1 }} />
        <button style={btn} onClick={() => zoom(0.8)}>Zoom +</button>
        <button style={btn} onClick={() => zoom(1.25)}>Zoom −</button>
        <button style={btn} onClick={() => setView(fitView(f))}>Fit</button>
        <button style={btn} onClick={() => { const g = generate(); setFloors(g); setSel(null); setView(fitView(g[active])); setMsg(""); }}>Reset</button>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <svg
          ref={svgRef}
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          style={{ flex: 1, height, background: "#fff", border: "1px solid #ccc", touchAction: "none", userSelect: "none" }}
          onPointerDown={onBgDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} onWheel={onWheel}
        >
          <g transform={`translate(${(f.length + 4) * SCALE} ${-4 * SCALE}) rotate(${northRotation})`}>
            <line x1={0} y1={16} x2={0} y2={-12} stroke={INK} strokeWidth={1.2} />
            <path d="M 0 -16 L -4 -8 L 0 -10 L 4 -8 Z" fill={INK} />
            <text x={0} y={-21} fontSize={10} fontWeight={700} textAnchor="middle" fill={INK}>N</text>
            <text x={0} y={28} fontSize={8} textAnchor="middle" fill={INK}>S</text>
            <text x={20} y={4} fontSize={8} textAnchor="middle" fill={INK}>E</text>
            <text x={-20} y={4} fontSize={8} textAnchor="middle" fill={INK}>W</text>
          </g>
          {/* room hit areas + selection */}
          {f.rooms.map((r) => (
            <rect key={r.id} x={r.x * SCALE} y={r.y * SCALE} width={r.width * SCALE} height={r.height * SCALE}
              fill={sel?.id === r.id ? "rgba(29,111,224,0.08)" : "#fff"} stroke={sel?.id === r.id ? SELECT : "none"} strokeWidth={1.5}
              onPointerDown={onRoomDown(r)} style={{ cursor: "move" }} />
          ))}
          {f.rooms.map((r) => <Fixtures key={`fx${r.id}`} r={r} L={f.length} B={f.breadth} />)}
          {f.stair && (() => { const sr = f.rooms.find((r) => r.id === f.stair!.roomId); return sr ? <StairShape room={sr} stair={f.stair} /> : null; })()}
          {/* walls: interior first, exterior on top */}
          {[...f.walls].sort((a, b) => Number(a.exterior) - Number(b.exterior)).map((w) => (
            <WallShape key={w.id} w={w} ops={f.openings} selected={sel?.id === w.id} hovered={hoveredWallId === w.id} direction={w.exterior ? directions[exteriorSideIndex(w, f.length, f.breadth)] : undefined} onDown={onWallDown(w)} onEnter={() => setHoveredWallId(w.id)} onLeave={() => setHoveredWallId(null)} />
          ))}
          {f.openings.map((o) => { const w = wallMap.get(o.wallId); return w ? <OpeningShape key={o.id} op={o} wall={w} selected={sel?.id === o.id} onDown={onOpeningDown(o)} /> : null; })}
          {/* labels */}
          {f.rooms.map((r) => {
            if (r.kind === "stair") return null;
            const cx = (r.x + r.width / 2) * SCALE, cy = (r.y + r.height / 2) * SCALE;
            const small = r.width < 6 || r.height < 6;
            const fs = small ? 7 : 9.5;
            return (
              <g key={`lb${r.id}`} pointerEvents="none" fontFamily={labelFont}>
                <text x={cx} y={cy - (r.kind === "passage" ? -3 : 2)} fontSize={fs} fontWeight={700} textAnchor="middle" fill={INK} letterSpacing={0.6}>{r.label.toUpperCase()}</text>
                {r.kind !== "passage" && <text x={cx} y={cy + fs + 1} fontSize={fs - 1.5} textAnchor="middle" fill={INK}>{`${formatFtIn(r.width)} × ${formatFtIn(r.height)}`}</text>}
              </g>
            );
          })}
          <Dimensions f={f} />
          <text x={0} y={(f.breadth + 6) * SCALE} fontSize={11} fontWeight={700} fill={INK} fontFamily={labelFont}>
            {`FLOOR ${f.floorNumber} PLAN  —  ${formatFtIn(f.length)} × ${formatFtIn(f.breadth)}  —  ${Math.round(f.length * f.breadth)} sq ft`}
          </text>
        </svg>

        {/* properties */}
        <div style={{ width: 230, border: "1px solid #ccc", padding: 10, fontSize: 12, overflowY: "auto", maxHeight: height }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Properties</div>
          {!sel && <div style={{ color: "#666" }}>Select a room, wall, door or window. Drag rooms, doors and windows to move them.</div>}
          {selRoom && (
            <div>
              <div style={{ fontWeight: 600 }}>{selRoom.label}</div>
              <div style={{ color: "#666", marginBottom: 4 }}>{selRoom.zone} zone</div>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, margin: "4px 0 8px" }}>
                <span>Room Name</span>
                <input
                  type="text"
                  value={roomNameDraft}
                  onChange={(e) => setRoomNameDraft(e.target.value)}
                  style={{ border: "1px solid #999", padding: "4px 6px" }}
                />
                <button style={btn} onClick={applyRoomName}>Apply Name</button>
              </label>
              {num("X (ft)", selRoom.x, (v) => editRoom({ x: v }))}
              {num("Y (ft)", selRoom.y, (v) => editRoom({ y: v }))}
              {num("Width (ft)", selRoom.width, (v) => editRoom({ width: v }))}
              {num("Height (ft)", selRoom.height, (v) => editRoom({ height: v }))}
              <div style={{ color: "#666", marginTop: 4 }}>
                Area: {Math.round(selRoom.width * selRoom.height * 100) / 100} sq ft
              </div>
            </div>
          )}
          {selWall && (
            <div>
              <div style={{ fontWeight: 600 }}>{selWall.label} {selWall.exterior ? "(exterior)" : "(interior)"}</div>
              {num("Length (ft)", selWall.length, (v) => editWall({ length: v }))}
              {num("Thickness (ft)", selWall.thickness, (v) => editWall({ thickness: v }), 0.125)}
              <div style={{ color: "#666" }}>Height: {formatFtIn(selWall.height)}</div>
            </div>
          )}
          {selOp && (
            <div>
              <div style={{ fontWeight: 600 }}>{selOp.kind === "door" ? "Door" : "Window"} {selOp.label}</div>
              <div style={{ color: "#666", marginBottom: 4 }}>on {wallMap.get(selOp.wallId)?.label ?? "—"}</div>
              {num("Distance from corner", selOp.offset, (v) => editOp({ offset: v }))}
              {num("Width (ft)", selOp.width, (v) => editOp({ width: v }))}
              {num("Height (ft)", selOp.height, (v) => editOp({ height: v }))}
              {selOp.kind === "door" && !selOp.cased && (
                <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                  <button style={btn} onClick={() => editOp({ swing: selOp.swing === 1 ? -1 : 1 })}>Flip swing</button>
                  <button style={btn} onClick={() => editOp({ hingeAtStart: !selOp.hingeAtStart })}>Flip hinge</button>
                </div>
              )}
              {selOp.kind === "door" && (
                <button style={{ ...btn, marginTop: 6, color: "#b00020", borderColor: "#b00020" }} onClick={deleteSelectedDoor}>
                  Delete Door
                </button>
              )}
            </div>
          )}
          {msg && <div style={{ color: "#b00020", marginTop: 8 }}>{msg}</div>}
          <div style={{ fontWeight: 700, marginTop: 12 }}>Validation</div>
          {warnings.length === 0 ? <div style={{ color: "#2e7d32" }}>Geometry valid</div> : (
            <ul style={{ paddingLeft: 16, margin: 4, color: "#b00020" }}>{warnings.slice(0, 12).map((w, i) => <li key={i}>{w}</li>)}</ul>
          )}
          {f.notes && <><div style={{ fontWeight: 700, marginTop: 12 }}>Notes</div><div style={{ color: "#444" }}>{f.notes}</div></>}
        </div>
      </div>
    </div>
  );
}
