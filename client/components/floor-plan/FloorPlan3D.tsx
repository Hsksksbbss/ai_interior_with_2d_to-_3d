/**
 * FloorPlan3D.tsx
 * ---------------------------------------------------------------------------
 * Architectural 3D viewer built directly from the structured 2D floor-plan
 * geometry produced by FloorPlanEditor (GeneratedFloor). No images are used.
 *
 * Units: 1 ft = 1 world unit.  2D (x, y) -> 3D (x, z); y-up is elevation.
 * The plan is centred on the origin so the camera orbits the building.
 * ---------------------------------------------------------------------------
 */
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Html,Text, Environment, Lightformer, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { generateFloor, formatFtIn } from "./FloorPlanEditor";
import type { FloorPlanData, Floor, GeneratedFloor, PlanRoom, PlanWall, PlanOpening, PlanStair } from "./FloorPlanEditor";

/* ========================================================================= */
/* Props & constants                                                         */
/* ========================================================================= */

export interface FloorPlan3DProps {
  /** Same input the 2D editor receives. */
  data?: FloorPlanData | null;
  /** Optional: edited floors from FloorPlanEditor's onChange (takes priority). */
  floors?: GeneratedFloor[] | null;
  className?: string;
  height?: number;
}

type ViewMode = "f1" | "f2" | "both";
type CamPreset = "iso" | "front" | "back" | "top";

const SLAB = 0.5; // floor slab thickness (ft)
const DOOR_H_DEFAULT = 7;
const WIN_SILL = 3;
const WIN_H_DEFAULT = 4;

const MAT = {
  wallExt: "#f2efe9",
  wallInt: "#faf8f4",
  slab: "#bdb7ad",
  floor: "#d9c7a8",
  floorWet: "#cfd6d8",
  floorSel: "#8fb4e8",
  ceiling: "#f5f5f2",
  door: "#8a5a36",
  frame: "#5b4636",
  glass: "#a9cfe0",
  stair: "#b9a58a",
  wood: "#a57c55",
  fabric: "#7d8793",
  white: "#f4f4f2",
  dark: "#3b3b3b",
  metal: "#9ea3a8",
};

/* ========================================================================= */
/* Data                                                                      */
/* ========================================================================= */

function normalise(data: FloorPlanData): Floor[] {
  const floors = [...(data?.floors ?? [])].filter(Boolean).sort((a, b) => a.floorNumber - b.floorNumber);
  const want = Math.max(1, data?.numberOfFloors || floors.length || 0);
  const base = floors[0];
  if (!base) return [];
  while (floors.length < want) {
    const n = floors.length + 1;
    floors.push({
      id: `floor-${n}`, floorNumber: n, rooms: [], dimensions: base.dimensions,
      walls: [], doors: [], windows: [], staircase: base.staircase ?? { included: false }, additionalNotes: "",
    });
  }
  return floors.slice(0, want);
}

function useGeneratedFloors(data?: FloorPlanData | null, floors?: GeneratedFloor[] | null): GeneratedFloor[] {
  return useMemo(() => {
    if (floors && floors.length) return [...floors].sort((a, b) => a.floorNumber - b.floorNumber);
    if (!data) return [];
    try {
      return normalise(data).map(generateFloor);
    } catch {
      return [];
    }
  }, [data, floors]);
}

/* ========================================================================= */
/* Geometry helpers                                                          */
/* ========================================================================= */

const wallDir = (w: PlanWall) => {
  const dx = w.endX - w.startX, dy = w.endY - w.startY;
  const len = Math.hypot(dx, dy) || 1;
  return { ux: dx / len, uy: dy / len, len, angle: Math.atan2(dy, dx) };
};

/** A box described in wall-local coordinates: along [a,b], vertical [y0,y1]. */
interface WallBox { a: number; b: number; y0: number; y1: number }

function wallBoxes(w: PlanWall, ops: PlanOpening[], H: number): WallBox[] {
  const { len } = wallDir(w);
  const sorted = ops
    .map((o) => ({ o, a: Math.max(0, o.offset), b: Math.min(len, o.offset + o.width) }))
    .filter((s) => s.b > s.a)
    .sort((p, q) => p.a - q.a);
  const out: WallBox[] = [];
  let cur = 0;
  for (const { o, a, b } of sorted) {
    if (a > cur) out.push({ a: cur, b: a, y0: 0, y1: H });
    if (o.kind === "door") {
      const dh = Math.min(H - 0.3, o.height || DOOR_H_DEFAULT);
      out.push({ a, b, y0: dh, y1: H });
    } else {
      const wh = o.height || WIN_H_DEFAULT;
      const sill = Math.min(WIN_SILL, Math.max(0.5, H - wh - 1));
      const top = Math.min(H - 0.3, sill + wh);
      out.push({ a, b, y0: 0, y1: sill });
      out.push({ a, b, y0: top, y1: H });
    }
    cur = Math.max(cur, b);
  }
  if (cur < len) out.push({ a: cur, b: len, y0: 0, y1: H });
  return out;
}

/* ========================================================================= */
/* Building blocks                                                           */
/* ========================================================================= */

function Box({ p, s, color, rot = 0, cast = true, opacity }: { p: [number, number, number]; s: [number, number, number]; color: string; rot?: number; cast?: boolean; opacity?: number }) {
  return (
    <mesh position={p} rotation-y={rot} castShadow={cast} receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={color} roughness={0.8} transparent={opacity !== undefined} opacity={opacity ?? 1} />
    </mesh>
  );
}

function Wall3D({ w, ops, H }: { w: PlanWall; ops: PlanOpening[]; H: number }) {
  const { ux, uy, angle } = wallDir(w);
  const boxes = wallBoxes(w, ops, H);
  const t = w.thickness || (w.exterior ? 0.75 : 0.375);
  return (
    <group>
      {boxes.map((bx, i) => {
        const mid = (bx.a + bx.b) / 2;
        // extend full-height solid pieces by half thickness at the ends so corners close
        const ext = bx.y0 === 0 && bx.y1 === H ? t / 2 : 0;
        const len = bx.b - bx.a + (bx.a <= 0.001 ? ext : 0) + (bx.b >= wallDir(w).len - 0.001 ? ext : 0);
        const shift = ((bx.b >= wallDir(w).len - 0.001 ? ext : 0) - (bx.a <= 0.001 ? ext : 0)) / 2;
        const cx = w.startX + ux * (mid + shift), cz = w.startY + uy * (mid + shift);
        return (
          <mesh key={i} position={[cx, (bx.y0 + bx.y1) / 2, cz]} rotation-y={-angle} castShadow receiveShadow>
            <boxGeometry args={[len, bx.y1 - bx.y0, t]} />
            <meshStandardMaterial color={w.exterior ? MAT.wallExt : MAT.wallInt} roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

function Door3D({ op, w, H }: { op: PlanOpening; w: PlanWall; H: number }) {
  const { ux, uy, angle } = wallDir(w);
  const dh = Math.min(H - 0.3, op.height || DOOR_H_DEFAULT);
  const t = w.thickness || 0.5;
  const mid = op.offset + op.width / 2;
  const cx = w.startX + ux * mid, cz = w.startY + uy * mid;
  const open = op.main ? 0.35 : 1.0; // radians
  return (
    <group position={[cx, 0, cz]} rotation-y={-angle}>
      {/* frame */}
      <Box p={[-op.width / 2, dh / 2, 0]} s={[0.15, dh, t + 0.05]} color={MAT.frame} />
      <Box p={[op.width / 2, dh / 2, 0]} s={[0.15, dh, t + 0.05]} color={MAT.frame} />
      <Box p={[0, dh, 0]} s={[op.width + 0.15, 0.15, t + 0.05]} color={MAT.frame} />
      {!op.cased && (
        <group position={[op.hingeAtStart ? -op.width / 2 : op.width / 2, 0, 0]} rotation-y={(op.hingeAtStart ? 1 : -1) * open * op.swing}>
          <Box p={[(op.hingeAtStart ? 1 : -1) * (op.width - 0.1) / 2, dh / 2, 0]} s={[op.width - 0.1, dh - 0.05, 0.12]} color={MAT.door} />
        </group>
      )}
    </group>
  );
}

function Window3D({ op, w, H }: { op: PlanOpening; w: PlanWall; H: number }) {
  const { ux, uy, angle } = wallDir(w);
  const wh = op.height || WIN_H_DEFAULT;
  const sill = Math.min(WIN_SILL, Math.max(0.5, H - wh - 1));
  const top = Math.min(H - 0.3, sill + wh);
  const hgt = top - sill;
  const t = w.thickness || 0.5;
  const mid = op.offset + op.width / 2;
  return (
    <group position={[w.startX + ux * mid, sill, w.startY + uy * mid]} rotation-y={-angle}>
      <mesh position={[0, hgt / 2, 0]}>
        <boxGeometry args={[op.width, hgt, 0.06]} />
        <meshPhysicalMaterial color={MAT.glass} transparent opacity={0.35} roughness={0.05} metalness={0.1} />
      </mesh>
      <Box p={[0, 0.05, 0]} s={[op.width + 0.2, 0.1, t + 0.2]} color={MAT.white} />
      <Box p={[0, hgt - 0.05, 0]} s={[op.width, 0.1, t]} color={MAT.dark} />
      <Box p={[-op.width / 2, hgt / 2, 0]} s={[0.1, hgt, t]} color={MAT.dark} />
      <Box p={[op.width / 2, hgt / 2, 0]} s={[0.1, hgt, t]} color={MAT.dark} />
      <Box p={[0, hgt / 2, 0]} s={[0.07, hgt, 0.12]} color={MAT.dark} cast={false} />
    </group>
  );
}

function Room3D({ r, selected, onSelect, showLabel }: { r: PlanRoom; selected: boolean; onSelect: (r: PlanRoom) => void; showLabel: boolean }) {
  const wet = r.kind === "bath" || r.kind === "kitchen" || r.kind === "balcony";
  return (
    <group>
      <mesh
        position={[r.x + r.width / 2, 0.02, r.y + r.height / 2]}
        rotation-x={-Math.PI / 2}
        receiveShadow
        onClick={(e) => { e.stopPropagation(); onSelect(r); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = ""; }}
      >
        <planeGeometry args={[r.width, r.height]} />
        <meshStandardMaterial color={selected ? MAT.floorSel : wet ? MAT.floorWet : MAT.floor} roughness={0.7} />
      </mesh>
      {showLabel && r.kind !== "passage" && (
        <Html position={[r.x + r.width / 2, 0.1, r.y + r.height / 2]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
          <div style={labelStyle(selected)}>
            <div style={{ fontWeight: 600 }}>{r.label}</div>
            <div style={{ opacity: 0.75 }}>{formatFtIn(r.width)} × {formatFtIn(r.height)}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

/* ---------------------------- Staircase --------------------------------- */

interface Step { x: number; z: number; w: number; d: number; top: number }

function stairSteps(room: PlanRoom, stair: PlanStair, rise: number): Step[] {
  const p = 0.35;
  const x = room.x + p, y = room.y + p;
  const w = room.width - 2 * p, h = room.height - 2 * p;
  const sw = Math.min(stair.width || 3.5, w);
  const steps: Step[] = [];
  const riser = 0.6;
  const n = Math.max(8, Math.round(rise / riser));
  const r = rise / n;

  if (stair.direction === "u-shaped") {
    const fw = (w - 0.5) / 2, land = Math.min(sw, h * 0.35);
    const run = h - land;
    const n1 = Math.floor(n / 2), n2 = n - n1 - 1;
    const t1 = run / n1, t2 = run / Math.max(1, n2);
    for (let i = 0; i < n1; i++) steps.push({ x: x + fw / 2, z: y + h - t1 * (i + 0.5), w: fw, d: t1, top: r * (i + 1) });
    steps.push({ x: x + w / 2, z: y + land / 2, w, d: land, top: r * (n1 + 1) });
    for (let i = 0; i < n2; i++) steps.push({ x: x + w - fw / 2, z: y + land + t2 * (i + 0.5), w: fw, d: t2, top: r * (n1 + 2 + i) });
  } else if (stair.direction === "l-shaped") {
    const land = Math.min(sw, h * 0.4);
    const run1 = h - land, run2 = w - sw;
    const n1 = Math.max(1, Math.round((n - 1) * run1 / (run1 + run2))), n2 = Math.max(1, n - 1 - n1);
    for (let i = 0; i < n1; i++) steps.push({ x: x + sw / 2, z: y + h - (run1 / n1) * (i + 0.5), w: sw, d: run1 / n1, top: r * (i + 1) });
    steps.push({ x: x + sw / 2, z: y + land / 2, w: sw, d: land, top: r * (n1 + 1) });
    for (let i = 0; i < n2; i++) steps.push({ x: x + sw + (run2 / n2) * (i + 0.5), z: y + land / 2, w: run2 / n2, d: land, top: r * (n1 + 2 + i) });
  } else if (stair.direction === "spiral") {
    // handled separately by SpiralStair
  } else {
    const sx = x + (w - sw) / 2, t = h / n;
    for (let i = 0; i < n; i++) steps.push({ x: sx + sw / 2, z: y + h - t * (i + 0.5), w: sw, d: t, top: r * (i + 1) });
  }
  return steps;
}

function Staircase3D({ room, stair, rise }: { room: PlanRoom; stair: PlanStair; rise: number }) {
  if (stair.direction === "spiral") {
    const cx = room.x + room.width / 2, cz = room.y + room.height / 2;
    const rr = Math.min(room.width, room.height) / 2 - 0.4;
    const n = Math.max(12, Math.round(rise / 0.6));
    return (
      <group>
        <mesh position={[cx, rise / 2, cz]} castShadow><cylinderGeometry args={[0.25, 0.25, rise, 12]} /><meshStandardMaterial color={MAT.metal} /></mesh>
        {Array.from({ length: n }, (_, i) => {
          const a = (i / n) * Math.PI * 2 * 1.1;
          return (
            <group key={i} position={[cx, (rise / n) * (i + 1) - 0.1, cz]} rotation-y={-a}>
              <Box p={[rr / 2, 0, 0]} s={[rr, 0.2, 1.2]} color={MAT.stair} />
            </group>
          );
        })}
      </group>
    );
  }
  const steps = stairSteps(room, stair, rise);
  return (
    <group>
      {steps.map((s, i) => (
        <group key={i}>
          <Box p={[s.x, s.top - 0.1, s.z]} s={[s.w, 0.2, s.d + 0.05]} color={MAT.stair} />
          <Box p={[s.x, (s.top - 0.2) / 2, s.z]} s={[s.w * 0.96, Math.max(0.01, s.top - 0.2), s.d]} color={MAT.slab} />
        </group>
      ))}
    </group>
  );
}

/* ---------------------------- Furniture --------------------------------- */

function Furniture3D({ r }: { r: PlanRoom }) {
  const cx = r.x + r.width / 2, cz = r.y + r.height / 2;
  const W = r.width, D = r.height;
  const items: ReactElement[] = [];
  const add = (k: string, x: number, h: number, z: number, sx: number, sy: number, sz: number, color: string) =>
    items.push(<Box key={k} p={[x, h + sy / 2, z]} s={[sx, sy, sz]} color={color} />);
  const fit = (v: number, max: number) => Math.min(v, max);

  switch (r.kind) {
    case "bed": {
      const bw = fit(5, W - 2), bl = fit(6.5, D - 2.5);
      const bz = r.y + 0.6 + bl / 2;
      add("base", cx, 0, bz, bw, 1.4, bl, MAT.wood);
      add("mat", cx, 1.4, bz, bw - 0.2, 0.6, bl - 0.2, MAT.white);
      add("head", cx, 0, r.y + 0.6, bw, 3.2, 0.3, MAT.wood);
      add("pil", cx, 2.0, r.y + 1.3, bw - 1, 0.35, 1, MAT.fabric);
      if (W > bw + 3.5) {
        add("st1", cx - bw / 2 - 1, 0, r.y + 1.4, 1.5, 1.8, 1.5, MAT.wood);
        add("st2", cx + bw / 2 + 1, 0, r.y + 1.4, 1.5, 1.8, 1.5, MAT.wood);
      }
      if (D > bl + 4) add("ward", r.x + fit(3, W / 2) + 0.3, 0, r.y + D - 1.3, fit(6, W - 1), 7, 2, MAT.frame);
      break;
    }
    case "living": {
      const sw = fit(7, W - 2);
      add("sofa", cx, 0, r.y + D - 2, sw, 1.4, 2.8, MAT.fabric);
      add("back", cx, 1.4, r.y + D - 0.8, sw, 1.4, 0.5, MAT.fabric);
      add("ct", cx, 0, cz, fit(3.5, W / 2), 1.3, 2, MAT.wood);
      add("tv", cx, 0, r.y + 1, fit(6, W - 2), 1.8, 1.4, MAT.dark);
      add("scr", cx, 2.6, r.y + 0.9, fit(4.5, W - 3), 2.6, 0.12, MAT.dark);
      break;
    }
    case "dining": {
      const tw = fit(5, W - 3), td = fit(3, D - 3);
      add("top", cx, 2.3, cz, tw, 0.15, td, MAT.wood);
      add("leg", cx, 0, cz, 0.5, 2.3, 0.5, MAT.frame);
      const cs = [-1, 1];
      cs.forEach((sx) => cs.forEach((sz) => add(`ch${sx}${sz}`, cx + sx * tw / 4, 0, cz + sz * (td / 2 + 0.8), 1.4, 1.5, 1.4, MAT.fabric)));
      break;
    }
    case "kitchen": {
      add("ctr1", r.x + W / 2, 0, r.y + 1.25, W - 0.8, 3, 2, MAT.white);
      add("top1", r.x + W / 2, 3, r.y + 1.25, W - 0.8, 0.12, 2.1, MAT.dark);
      add("up", r.x + W / 2, 5, r.y + 0.8, W - 0.8, 2.2, 1.1, MAT.wood);
      if (D > 7) add("ctr2", r.x + 1.25, 0, cz + 1, 2, 3, D / 2, MAT.white);
      break;
    }
    case "bath": {
      add("wc", r.x + 1.2, 0, r.y + D - 1.4, 1.4, 1.4, 2.1, MAT.white);
      add("sink", r.x + W - 1.2, 2.2, r.y + 1, 1.6, 0.5, 1.3, MAT.white);
      add("vanity", r.x + W - 1.2, 0, r.y + 1, 1.6, 2.2, 1.3, MAT.wood);
      if (W > 5 && D > 5) {
        add("sh", r.x + 1.6, 0, r.y + 1.6, 3, 0.2, 3, MAT.floorWet);
        items.push(
          <mesh key="glass" position={[r.x + 3.1, 3.2, r.y + 1.6]}>
            <boxGeometry args={[0.05, 6.4, 3]} />
            <meshPhysicalMaterial color={MAT.glass} transparent opacity={0.3} />
          </mesh>,
        );
      }
      break;
    }
    case "study": {
      add("desk", cx, 2.4, r.y + 1.3, fit(4.5, W - 1.5), 0.15, 2, MAT.wood);
      add("dl", cx, 0, r.y + 1.3, fit(4.2, W - 1.8), 2.4, 1.6, MAT.frame);
      add("chair", cx, 0, r.y + 3.2, 1.6, 1.6, 1.6, MAT.fabric);
      add("shelf", r.x + W - 0.9, 0, cz, 1.2, 6, fit(4, D - 2), MAT.wood);
      break;
    }
    case "store":
      for (let i = 0; i < 4; i++) add(`sh${i}`, cx, 0.5 + i * 1.6, r.y + 1, W - 1, 0.12, 1.5, MAT.wood);
      add("sp1", r.x + 0.55, 0, r.y + 1, 0.12, 6.4, 1.5, MAT.wood);
      add("sp2", r.x + W - 0.55, 0, r.y + 1, 0.12, 6.4, 1.5, MAT.wood);
      break;
    case "puja":
      add("base", cx, 0, r.y + 1, fit(3, W - 1), 2.6, 1.6, MAT.white);
      add("mandir", cx, 2.6, r.y + 1, fit(2.4, W - 1.4), 2.4, 1.2, MAT.wood);
      add("dome", cx, 5.0, r.y + 1, fit(1.4, W - 2), 0.8, 0.9, MAT.door);
      break;
    case "balcony":
      add("rail", cx, 0, r.y + D - 0.3, W - 0.6, 3.3, 0.15, MAT.metal);
      add("chair", cx - 1, 0, cz, 1.5, 1.5, 1.5, MAT.wood);
      break;
    case "dress":
      add("ward", cx, 0, r.y + 1.1, W - 1, 7, 1.8, MAT.frame);
      break;
    default:
      break;
  }
  return <group>{items}</group>;
}

/* ---------------------------- Dimensions -------------------------------- */

function Dimension3D({
  a,
  b,
  label,
  color = "#222",
}: {
  a: [number, number, number];
  b: [number, number, number];
  label: string;
  color?: string;
}) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va).normalize();
    const n = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(0.5);
    const pts = [va, vb, va.clone().add(n), va.clone().sub(n), vb.clone().add(n), vb.clone().sub(n)];
    g.setFromPoints(pts);
    return g;
  }, [a, b]);
  useEffect(() => () => geom.dispose(), [geom]);
  const mid: [number, number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  return (
    <group>
      <lineSegments geometry={geom}>
        <lineBasicMaterial color={color} />
      </lineSegments>
      <Text
        position={mid}
        rotation={[-Math.PI / 2, 0, 0]}
        anchorX="center"
        anchorY="middle"
        fontSize={0.45}
        color={color}
        depthOffset={-1}
      >
        {label}
      </Text>
    </group>
  );
}

/* ---------------------------- Floor ------------------------------------- */

function Floor3D({
  f, elevation, nextRise, showCeiling, showLabels, showDims, selectedId, onSelect,
}: {
  f: GeneratedFloor; elevation: number; nextRise: number | null; showCeiling: boolean; showLabels: boolean; showDims: boolean;
  selectedId: string | null; onSelect: (r: PlanRoom, f: GeneratedFloor) => void;
}) {
  const H = f.wallHeight;
  const opsByWall = useMemo(() => {
    const m = new Map<string, PlanOpening[]>();
    for (const o of f.openings) m.set(o.wallId, [...(m.get(o.wallId) ?? []), o]);
    return m;
  }, [f.openings]);
  const wallById = useMemo(() => new Map(f.walls.map((w) => [w.id, w])), [f.walls]);
  const stairRoom = f.stair ? f.rooms.find((r) => r.id === f.stair!.roomId) : undefined;
  const sel = f.rooms.find((r) => r.id === selectedId);
  const off = 3;

  return (
    <group position={[-f.length / 2, elevation, -f.breadth / 2]}>
      {/* slab */}
      <Box p={[f.length / 2, -SLAB / 2, f.breadth / 2]} s={[f.length + 0.75, SLAB, f.breadth + 0.75]} color={MAT.slab} />
      {f.rooms.map((r) => (
        <Room3D key={r.id} r={r} selected={r.id === selectedId} onSelect={(rr) => onSelect(rr, f)} showLabel={showLabels} />
      ))}
      {f.walls.map((w) => <Wall3D key={w.id} w={w} ops={opsByWall.get(w.id) ?? []} H={H} />)}
      {f.openings.map((o) => {
        const w = wallById.get(o.wallId);
        if (!w) return null;
        return o.kind === "door" ? <Door3D key={o.id} op={o} w={w} H={H} /> : <Window3D key={o.id} op={o} w={w} H={H} />;
      })}
      {f.rooms.map((r) => <Furniture3D key={`fu-${r.id}`} r={r} />)}
      {stairRoom && f.stair && nextRise !== null && <Staircase3D room={stairRoom} stair={f.stair} rise={nextRise} />}
      {stairRoom && f.stair && nextRise === null && (
        <Box p={[stairRoom.x + stairRoom.width / 2, 1.6, stairRoom.y + stairRoom.height - 0.2]} s={[stairRoom.width - 0.4, 3.2, 0.1]} color={MAT.metal} />
      )}
      {showCeiling && (
        <Box p={[f.length / 2, H + SLAB / 2, f.breadth / 2]} s={[f.length + 0.75, SLAB, f.breadth + 0.75]} color={MAT.ceiling} />
      )}
      {showDims && (
        <>
          <Dimension3D a={[0, 0.05, -off]} b={[f.length, 0.05, -off]} label={`${formatFtIn(f.length)} overall`} />
          <Dimension3D a={[-off, 0.05, 0]} b={[-off, 0.05, f.breadth]} label={`${formatFtIn(f.breadth)} overall`} />
          <Dimension3D a={[f.length + off, 0, f.breadth + off]} b={[f.length + off, H, f.breadth + off]} label={`H ${formatFtIn(H)}`} />
          {sel && (
            <>
              <Dimension3D a={[sel.x, 0.15, sel.y + 0.8]} b={[sel.x + sel.width, 0.15, sel.y + 0.8]} label={formatFtIn(sel.width)} color="#1d6fe0" />
              <Dimension3D a={[sel.x + 0.8, 0.15, sel.y]} b={[sel.x + 0.8, 0.15, sel.y + sel.height]} label={formatFtIn(sel.height)} color="#1d6fe0" />
            </>
          )}
        </>
      )}
    </group>
  );
}

/* ---------------------------- Camera ------------------------------------ */

function CameraRig({ preset, target, size, nonce }: { preset: CamPreset; target: [number, number, number]; size: number; nonce: number }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: { target: THREE.Vector3; update: () => void } | null };
  useEffect(() => {
    const d = size * 1.25;
    const [tx, ty, tz] = target;
    const pos: Record<CamPreset, [number, number, number]> = {
      iso: [tx + d * 0.75, ty + d * 0.75, tz + d * 0.85],
      front: [tx, ty + d * 0.25, tz + d * 1.15],
      back: [tx, ty + d * 0.25, tz - d * 1.15],
      top: [tx, ty + d * 1.4, tz + 0.01],
    };
    camera.position.set(...pos[preset]);
    camera.lookAt(tx, ty, tz);
    if (controls) {
      controls.target.set(tx, ty, tz);
      controls.update();
    }
  }, [preset, target, size, nonce, camera, controls]);
  return null;
}

/* ========================================================================= */
/* Main component                                                            */
/* ========================================================================= */

export default function FloorPlan3D({ data, floors, className, height = 620 }: FloorPlan3DProps) {
  const gen = useGeneratedFloors(data, floors);
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<ViewMode>("both");
  const [preset, setPreset] = useState<CamPreset>("iso");
  const [nonce, setNonce] = useState(0);
  const [selected, setSelected] = useState<{ room: PlanRoom; floorNumber: number } | null>(null);
  const [showDims, setShowDims] = useState(true);
  const lastMode = useRef(mode);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (lastMode.current !== mode) { setSelected(null); lastMode.current = mode; }
  }, [mode]);

  const hasF2 = gen.length > 1;
  const effMode: ViewMode = !hasF2 && mode !== "f1" ? "f1" : mode;

  // Elevation stack: each floor sits on top of the previous floor's walls + slab.
  const elevations = useMemo(() => {
    const e: number[] = [];
    let acc = 0;
    gen.forEach((f) => { e.push(acc); acc += f.wallHeight + SLAB; });
    return e;
  }, [gen]);

  const visible = useMemo(() => {
    if (effMode === "f1") return gen[0] ? [0] : [];
    if (effMode === "f2") return gen[1] ? [1] : [];
    return gen.map((_, i) => i);
  }, [gen, effMode]);

  const maxDim = gen.length ? Math.max(...gen.map((f) => Math.max(f.length, f.breadth))) : 40;
  const totalH = gen.length ? (elevations[elevations.length - 1] ?? 0) + (gen[gen.length - 1]?.wallHeight ?? 10) : 10;
  const target = useMemo<[number, number, number]>(
    () => (effMode === "both" ? [0, totalH / 2, 0] : [0, 2, 0]),
    [effMode, totalH],
  );

  if (!gen.length || gen.every((f) => !f.rooms.length)) {
    return (
      <div className={className} style={{ ...wrapStyle, height, display: "grid", placeItems: "center" }}>
        <p style={{ color: "#555", fontSize: 14 }}>No floor-plan data available for 3D visualization.</p>
      </div>
    );
  }

  const selArea = selected ? Math.round(selected.room.width * selected.room.height * 10) / 10 : 0;

  return (
    <div className={className} style={{ ...wrapStyle, height }}>
      <div style={toolbar}>
        <Group label="Floor">
          <Btn active={effMode === "f1"} onClick={() => setMode("f1")}>Floor 1</Btn>
          <Btn active={effMode === "f2"} disabled={!hasF2} onClick={() => setMode("f2")}>Floor 2</Btn>
          <Btn active={effMode === "both"} disabled={!hasF2} onClick={() => setMode("both")}>Both Floors</Btn>
        </Group>
        <Group label="Camera">
          {(["iso", "front", "back", "top"] as CamPreset[]).map((p) => (
            <Btn key={p} active={preset === p} onClick={() => { setPreset(p); setNonce((n) => n + 1); }}>
              {p === "iso" ? "Isometric" : p.charAt(0).toUpperCase() + p.slice(1)}
            </Btn>
          ))}
        </Group>
        <Btn active={showDims} onClick={() => setShowDims((v) => !v)}>Dimensions</Btn>
      </div>

      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        {mounted && (
          <Canvas
            shadows
            dpr={[1, 2]}
            camera={{ position: [60, 50, 60], fov: 40, near: 0.5, far: 2000 }}
            onPointerMissed={() => setSelected(null)}
            style={{ position: "absolute", inset: 0 }}
          >
            <color attach="background" args={["#eef0f2"]} />
            <hemisphereLight args={["#ffffff", "#b8b2a6", 0.55]} />
            <directionalLight
              position={[maxDim * 0.8, maxDim * 1.4, maxDim * 0.6]}
              intensity={1.6}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-camera-left={-maxDim}
              shadow-camera-right={maxDim}
              shadow-camera-top={maxDim}
              shadow-camera-bottom={-maxDim}
              shadow-camera-far={maxDim * 5}
              shadow-bias={-0.0005}
            />
            <Suspense fallback={null}>
              <Environment resolution={64}>
                <Lightformer intensity={1.5} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
                <Lightformer intensity={0.8} color="#dde6ee" position={[-10, 3, 0]} rotation-y={Math.PI / 2} scale={[20, 4, 1]} />
              </Environment>
            </Suspense>

            {/* ground */}
            <mesh rotation-x={-Math.PI / 2} position={[0, (effMode === "f2" ? 0 : 0) - SLAB - 0.01, 0]} receiveShadow>
              <planeGeometry args={[maxDim * 6, maxDim * 6]} />
              <meshStandardMaterial color="#dfe3dc" roughness={1} />
            </mesh>
            <ContactShadows position={[0, -SLAB, 0]} scale={maxDim * 2} opacity={0.35} blur={2} far={20} />

            {visible.map((i) => {
              const f = gen[i];
              if (!f) return null;
              const elev = effMode === "both" ? (elevations[i] ?? 0) : 0;
              const isTop = i === gen.length - 1;
              const nextRise = gen[i + 1] ? f.wallHeight + SLAB : null;
              return (
                <Floor3D
                  key={f.floorId}
                  f={f}
                  elevation={elev}
                  nextRise={effMode === "both" || effMode === "f1" ? nextRise : null}
                  showCeiling={effMode === "both" && isTop}
                  showLabels={effMode !== "both"}
                  showDims={showDims && (effMode !== "both" || i === 0)}
                  selectedId={selected?.floorNumber === f.floorNumber ? selected.room.id : null}
                  onSelect={(room, fl) => setSelected({ room, floorNumber: fl.floorNumber })}
                />
              );
            })}

            <OrbitControls
              makeDefault
              enableDamping
              dampingFactor={0.1}
              minDistance={8}
              maxDistance={maxDim * 4}
              maxPolarAngle={Math.PI / 2 - 0.03}
              screenSpacePanning
            />
            <CameraRig preset={preset} target={target} size={Math.max(maxDim, totalH)} nonce={nonce + (effMode === "both" ? 1000 : effMode === "f1" ? 2000 : 3000)} />
          </Canvas>
        )}

        {selected && (
          <div style={infoPanel}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{selected.room.label}</div>
            <div style={infoKey}>Floor</div>
            <div style={infoVal}>Floor {selected.floorNumber}</div>
            <div style={infoKey}>Dimensions</div>
            <div style={infoVal}>{formatFtIn(selected.room.width)} × {formatFtIn(selected.room.height)}</div>
            <div style={infoKey}>Area</div>
            <div style={infoVal}>{selArea} sq ft</div>
          </div>
        )}
        <div style={hint}>Drag to rotate · Scroll to zoom · Right-drag to pan · Click a room for details</div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* UI bits                                                                   */
/* ========================================================================= */

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: "#666", marginRight: 4 }}>{label}</span>
      {children}
    </div>
  );
}

function Btn({ active, disabled, onClick, children }: { active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: "5px 10px", fontSize: 12, borderRadius: 4, cursor: disabled ? "not-allowed" : "pointer",
        border: "1px solid #222", background: active ? "#222" : "#fff", color: active ? "#fff" : "#222",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

const wrapStyle: CSSProperties = {
  display: "flex", flexDirection: "column", border: "1px solid #d4d4d4", borderRadius: 6, overflow: "hidden",
  background: "#fff", fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
};
const toolbar: CSSProperties = {
  display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", padding: "8px 10px", borderBottom: "1px solid #e2e2e2",
};
const infoPanel: CSSProperties = {
  position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.96)", border: "1px solid #ccc",
  borderRadius: 6, padding: "10px 12px", minWidth: 160, fontSize: 13, boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};
const infoKey: CSSProperties = { fontSize: 10, textTransform: "uppercase", color: "#777", marginTop: 4 };
const infoVal: CSSProperties = { fontSize: 13, color: "#111" };
const hint: CSSProperties = {
  position: "absolute", left: 10, bottom: 8, fontSize: 11, color: "#555", background: "rgba(255,255,255,0.8)",
  padding: "3px 6px", borderRadius: 4, pointerEvents: "none",
};
const dimLabel: CSSProperties = {
  fontSize: 10, fontWeight: 600, background: "rgba(255,255,255,0.85)", padding: "1px 4px", borderRadius: 3, whiteSpace: "nowrap",
};
const labelStyle = (sel: boolean): CSSProperties => ({
  fontSize: 10, lineHeight: 1.2, textAlign: "center", whiteSpace: "nowrap", padding: "2px 5px", borderRadius: 3,
  background: sel ? "rgba(29,111,224,0.9)" : "rgba(255,255,255,0.8)", color: sel ? "#fff" : "#222",
});
