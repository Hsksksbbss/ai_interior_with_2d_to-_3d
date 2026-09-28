'use client';

import React, { useMemo, useState } from 'react';

/* ============================================================
   TYPES
   (Mirrors the shape produced by Analyze2DFloorPlan.tsx.
   Kept local/self-contained on purpose — no cross-file import.)
   ============================================================ */

const ROOM_TYPES = [
  'Living Room',
  'Bedroom',
  'Kitchen',
  'Bathroom',
  'Dining Room',
  'Study Room',
  'Puja Room',
  'Store Room',
  'Balcony',
  'Other Room',
] as const;

type RoomType = (typeof ROOM_TYPES)[number];

interface RoomCount {
  type: RoomType;
  quantity: number;
}

interface FloorDimensions {
  length: number;
  breadth: number;
  wallHeight: number;
}

interface Wall {
  id: string;
  label: string;
  length: number;
  height: number;
  thickness?: number;
}

interface Door {
  id: string;
  label: string;
  referenceWallId: string;
  distanceFromCorner: number;
  width: number;
  height: number;
}

interface WindowOpening {
  id: string;
  label: string;
  referenceWallId: string;
  distanceFromCorner: number;
  width: number;
  height: number;
}

type StaircaseDirection = 'straight' | 'l-shaped' | 'u-shaped' | 'spiral';

interface Staircase {
  included: boolean;
  referenceArea?: string;
  width?: number;
  length?: number;
  direction?: StaircaseDirection;
}

interface Floor {
  id: string;
  floorNumber: number;
  rooms: RoomCount[];
  dimensions: FloorDimensions;
  walls: Wall[];
  doors: Door[];
  windows: WindowOpening[];
  staircase: Staircase;
  additionalNotes: string;
}

interface FloorPlanData {
  numberOfFloors: number;
  floors: Floor[];
}

export interface FloorPlan2DProps {
  data: FloorPlanData;
  initialFloorIndex?: number;
  className?: string;
}

/* ============================================================
   GEOMETRY CONSTANTS & HELPERS
   ============================================================ */

const PX_PER_FT = 24;
const MARGIN = 64; // room reserved around the drawing for dimension labels
const DEFAULT_WALL_THICKNESS_FT = 0.5; // used when a wall has no thickness set
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

interface Point {
  x: number;
  y: number;
}

interface RectSide {
  name: 'top' | 'right' | 'bottom' | 'left';
  start: Point;
  end: Point;
  normal: Point; // unit vector pointing INTO the room
}

function getRectSides(widthPx: number, heightPx: number): RectSide[] {
  return [
    { name: 'top', start: { x: 0, y: 0 }, end: { x: widthPx, y: 0 }, normal: { x: 0, y: 1 } },
    { name: 'right', start: { x: widthPx, y: 0 }, end: { x: widthPx, y: heightPx }, normal: { x: -1, y: 0 } },
    { name: 'bottom', start: { x: widthPx, y: heightPx }, end: { x: 0, y: heightPx }, normal: { x: 0, y: -1 } },
    { name: 'left', start: { x: 0, y: heightPx }, end: { x: 0, y: 0 }, normal: { x: 1, y: 0 } },
  ];
}

function sideLengthPx(side: RectSide): number {
  return Math.hypot(side.end.x - side.start.x, side.end.y - side.start.y);
}

function unitVector(a: Point, b: Point): Point {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
}

function pointAlongSide(side: RectSide, distanceFt: number): Point {
  const dir = unitVector(side.start, side.end);
  const clampedPx = Math.max(0, Math.min(sideLengthPx(side), distanceFt * PX_PER_FT));
  return {
    x: side.start.x + dir.x * clampedPx,
    y: side.start.y + dir.y * clampedPx,
  };
}

function offsetPoint(p: Point, dir: Point, distancePx: number): Point {
  return { x: p.x + dir.x * distancePx, y: p.y + dir.y * distancePx };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/* ============================================================
   ROOM PLACEHOLDER LAYOUT
   (No coordinates exist in the source data yet, so rooms are
   arranged in a simple grid sized to the floor footprint. This
   is intentionally simple and is the part most likely to be
   replaced once real room placement/editing is built.)
   ============================================================ */

interface RoomInstance {
  key: string;
  type: RoomType;
  instanceNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

function layoutRooms(
  rooms: RoomCount[],
  drawingWidthPx: number,
  drawingHeightPx: number,
): RoomInstance[] {
  const flat: { type: RoomType; instanceNumber: number }[] = [];
  rooms.forEach((r) => {
    for (let i = 0; i < Math.max(0, Math.floor(r.quantity)); i += 1) {
      flat.push({ type: r.type, instanceNumber: i + 1 });
    }
  });

  const total = flat.length;
  if (total === 0 || drawingWidthPx <= 0 || drawingHeightPx <= 0) return [];

  const aspect = drawingWidthPx / drawingHeightPx || 1;
  const cols = Math.min(total, Math.max(1, Math.round(Math.sqrt(total * aspect))));
  const rows = Math.ceil(total / cols);
  const cellW = drawingWidthPx / cols;
  const cellH = drawingHeightPx / rows;

  return flat.map((entry, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const isLastCell = i === total - 1;
    const width = isLastCell ? drawingWidthPx - col * cellW : cellW;
    return {
      key: `${slugify(entry.type)}-${entry.instanceNumber}`,
      type: entry.type,
      instanceNumber: entry.instanceNumber,
      x: col * cellW,
      y: row * cellH,
      width,
      height: cellH,
    };
  });
}

/* ============================================================
   DOOR / WINDOW SYMBOL HELPERS
   ============================================================ */

function doorSwingPath(hinge: Point, leafEnd: Point, openingFar: Point, radiusPx: number): string {
  return `M ${leafEnd.x} ${leafEnd.y} A ${radiusPx} ${radiusPx} 0 0 1 ${openingFar.x} ${openingFar.y}`;
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function FloorPlan2D({ data, initialFloorIndex = 0, className }: FloorPlan2DProps) {
  const floors = data?.floors ?? [];
  const [activeFloorIndex, setActiveFloorIndex] = useState(
    Math.min(Math.max(initialFloorIndex, 0), Math.max(floors.length - 1, 0)),
  );
  const [zoom, setZoom] = useState(1);

  const activeFloor = floors[activeFloorIndex];

  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));
  const resetView = () => setZoom(1);
  // NOTE: with a vector viewBox + preserveAspectRatio, zoom level 1 already
  // fits the full drawing to the container. Once panning is introduced,
  // "fit to screen" should also re-center; for now it behaves like reset.
  const fitToScreen = () => setZoom(1);

  const geometry = useMemo(() => {
    if (!activeFloor) return null;

    const lengthFt = activeFloor.dimensions?.length || 0;
    const breadthFt = activeFloor.dimensions?.breadth || 0;
    if (lengthFt <= 0 || breadthFt <= 0) return null;

    const drawingWidthPx = lengthFt * PX_PER_FT;
    const drawingHeightPx = breadthFt * PX_PER_FT;
    const sides = getRectSides(drawingWidthPx, drawingHeightPx);
    const rooms = layoutRooms(activeFloor.rooms, drawingWidthPx, drawingHeightPx);

    return { lengthFt, breadthFt, drawingWidthPx, drawingHeightPx, sides, rooms };
  }, [activeFloor]);

  const viewBoxWidth = geometry ? geometry.drawingWidthPx + MARGIN * 2 : 0;
  const viewBoxHeight = geometry ? geometry.drawingHeightPx + MARGIN * 2 : 0;
  const viewW = viewBoxWidth / zoom;
  const viewH = viewBoxHeight / zoom;
  const viewX = (viewBoxWidth - viewW) / 2;
  const viewY = (viewBoxHeight - viewH) / 2;

  return (
    <div className={`mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 ${className ?? ''}`}>
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          2D floor plan
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Floor Plan Preview</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          A first architectural top-view of your floor, generated from the measurements you
          entered. Room positions are an initial approximation for now.
        </p>
      </div>

      {floors.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-400">
          No floor plan data available yet.
        </div>
      ) : (
        <>
          {/* Floor tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200">
            {floors.map((floor, index) => (
              <button
                key={floor.id}
                type="button"
                onClick={() => setActiveFloorIndex(index)}
                className={`relative -mb-px rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
                  index === activeFloorIndex
                    ? 'border border-b-white bg-white text-slate-900'
                    : 'border border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Floor {floor.floorNumber}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-800" />
              Wall
              <span className="ml-3 inline-block h-2.5 w-2.5 rounded-sm bg-amber-400" />
              Door
              <span className="ml-3 inline-block h-2.5 w-2.5 rounded-sm bg-sky-400" />
              Window
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={zoomOut}
                className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                aria-label="Zoom out"
              >
                −
              </button>
              <span className="w-12 text-center text-xs tabular-nums text-slate-500">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={zoomIn}
                className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                aria-label="Zoom in"
              >
                +
              </button>
              <button
                type="button"
                onClick={resetView}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Reset view
              </button>
              <button
                type="button"
                onClick={fitToScreen}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Fit to screen
              </button>
            </div>
          </div>

          {/* Drawing surface */}
          <div className="mt-4 h-[560px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            {!geometry ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-400">
                Enter floor length and breadth for this floor to preview the layout.
              </div>
            ) : (
              <svg
                viewBox={`${viewX} ${viewY} ${viewW} ${viewH}`}
                width="100%"
                height="100%"
                preserveAspectRatio="xMidYMid meet"
                data-floor-id={activeFloor.id}
                role="img"
                aria-label={`2D floor plan for Floor ${activeFloor.floorNumber}`}
              >
                <defs>
                  <pattern id="fp-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                    <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e2e8f0" strokeWidth={0.5} />
                  </pattern>
                </defs>

                <g transform={`translate(${MARGIN}, ${MARGIN})`}>
                  {/* background grid, bounded to the drawing area */}
                  <rect
                    x={0}
                    y={0}
                    width={geometry.drawingWidthPx}
                    height={geometry.drawingHeightPx}
                    fill="url(#fp-grid)"
                  />

                  {/* Room placeholders */}
                  {geometry.rooms.map((room) => (
                    <g key={room.key}>
                      <rect
                        id={`room-${room.key}`}
                        data-element-type="room"
                        data-room-type={room.type}
                        x={room.x}
                        y={room.y}
                        width={room.width}
                        height={room.height}
                        fill="#ffffff"
                        stroke="#cbd5e1"
                        strokeDasharray="4 3"
                        strokeWidth={1}
                      />
                      <text
                        x={room.x + room.width / 2}
                        y={room.y + room.height / 2 - 6}
                        textAnchor="middle"
                        className="select-none"
                        fontSize={11}
                        fontWeight={600}
                        fill="#334155"
                      >
                        {room.type}
                        {room.instanceNumber > 1 || room.type === 'Other Room' ? ` ${room.instanceNumber}` : ''}
                      </text>
                      <text
                        x={room.x + room.width / 2}
                        y={room.y + room.height / 2 + 10}
                        textAnchor="middle"
                        className="select-none tabular-nums"
                        fontSize={9.5}
                        fill="#94a3b8"
                      >
                        {(room.width / PX_PER_FT).toFixed(1)}′ × {(room.height / PX_PER_FT).toFixed(1)}′
                      </text>
                    </g>
                  ))}

                  {/* Walls, doors and windows, side by side */}
                  {geometry.sides.map((side, sideIndex) => {
                    const wall = activeFloor.walls[sideIndex];
                    const wallId = wall ? `wall-W${sideIndex + 1}` : `wall-outer-${side.name}`;
                    const thicknessFt = wall?.thickness ? wall.thickness / 12 : DEFAULT_WALL_THICKNESS_FT;
                    const strokeWidthPx = Math.max(3, thicknessFt * PX_PER_FT);

                    const doorsOnWall = wall
                      ? activeFloor.doors.filter((d) => d.referenceWallId === wall.id)
                      : [];
                    const windowsOnWall = wall
                      ? activeFloor.windows.filter((w) => w.referenceWallId === wall.id)
                      : [];

                    const midX = (side.start.x + side.end.x) / 2;
                    const midY = (side.start.y + side.end.y) / 2;
                    const labelOffsetPx = 18;
                    const labelPoint = offsetPoint(
                      { x: midX, y: midY },
                      { x: -side.normal.x, y: -side.normal.y },
                      labelOffsetPx,
                    );

                    return (
                      <g key={side.name}>
                        <line
                          id={wallId}
                          data-element-type="wall"
                          data-wall-record-id={wall?.id}
                          x1={side.start.x}
                          y1={side.start.y}
                          x2={side.end.x}
                          y2={side.end.y}
                          stroke="#1e293b"
                          strokeWidth={strokeWidthPx}
                          strokeLinecap="square"
                        />

                        {/* dimension label */}
                        <text
                          x={labelPoint.x}
                          y={labelPoint.y}
                          textAnchor="middle"
                          className="select-none tabular-nums"
                          fontSize={10.5}
                          fill="#64748b"
                        >
                          {wall ? `${wall.length.toFixed(1)}′` : `${(sideLengthPx(side) / PX_PER_FT).toFixed(1)}′`}
                        </text>

                        {/* doors */}
                        {doorsOnWall.map((door, doorIndex) => {
                          const openingWidthPx = door.width * PX_PER_FT;
                          const hinge = pointAlongSide(side, door.distanceFromCorner);
                          const dir = unitVector(side.start, side.end);
                          const openingFar = offsetPoint(hinge, dir, openingWidthPx);
                          const leafEnd = offsetPoint(hinge, side.normal, openingWidthPx);

                          return (
                            <g
                              key={door.id}
                              id={`door-D${doorIndex + 1}`}
                              data-element-type="door"
                              data-door-record-id={door.id}
                              data-reference-wall={wallId}
                            >
                              {/* gap in the wall */}
                              <line
                                x1={hinge.x}
                                y1={hinge.y}
                                x2={openingFar.x}
                                y2={openingFar.y}
                                stroke="#f8fafc"
                                strokeWidth={strokeWidthPx + 1}
                              />
                              {/* door leaf */}
                              <line
                                x1={hinge.x}
                                y1={hinge.y}
                                x2={leafEnd.x}
                                y2={leafEnd.y}
                                stroke="#d97706"
                                strokeWidth={1.5}
                              />
                              {/* swing arc */}
                              <path
                                d={doorSwingPath(hinge, leafEnd, openingFar, openingWidthPx)}
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth={1}
                                strokeDasharray="3 2"
                              />
                            </g>
                          );
                        })}

                        {/* windows */}
                        {windowsOnWall.map((win, winIndex) => {
                          const openingWidthPx = win.width * PX_PER_FT;
                          const start = pointAlongSide(side, win.distanceFromCorner);
                          const dir = unitVector(side.start, side.end);
                          const end = offsetPoint(start, dir, openingWidthPx);
                          const tick = 5;

                          return (
                            <g
                              key={win.id}
                              id={`window-W${winIndex + 1}`}
                              data-element-type="window"
                              data-window-record-id={win.id}
                              data-reference-wall={wallId}
                            >
                              {/* gap + window bar */}
                              <line
                                x1={start.x}
                                y1={start.y}
                                x2={end.x}
                                y2={end.y}
                                stroke="#38bdf8"
                                strokeWidth={strokeWidthPx * 0.6}
                              />
                              {/* end ticks, perpendicular to the wall */}
                              {[start, end].map((p, tickIndex) => (
                                <line
                                  key={tickIndex}
                                  x1={p.x - side.normal.x * tick}
                                  y1={p.y - side.normal.y * tick}
                                  x2={p.x + side.normal.x * tick}
                                  y2={p.y + side.normal.y * tick}
                                  stroke="#0284c7"
                                  strokeWidth={1.5}
                                />
                              ))}
                            </g>
                          );
                        })}
                      </g>
                    );
                  })}

                  {/* overall dimension labels */}
                  <text
                    x={geometry.drawingWidthPx / 2}
                    y={-1 * (MARGIN - 40)}
                    textAnchor="middle"
                    className="select-none tabular-nums"
                    fontSize={12}
                    fontWeight={600}
                    fill="#334155"
                  >
                    {geometry.lengthFt.toFixed(1)} ft
                  </text>
                  <text
                    x={-1 * (MARGIN - 22)}
                    y={geometry.drawingHeightPx / 2}
                    textAnchor="middle"
                    transform={`rotate(-90, ${-1 * (MARGIN - 22)}, ${geometry.drawingHeightPx / 2})`}
                    className="select-none tabular-nums"
                    fontSize={12}
                    fontWeight={600}
                    fill="#334155"
                  >
                    {geometry.breadthFt.toFixed(1)} ft
                  </text>
                </g>
              </svg>
            )}
          </div>

          {/* Extra walls beyond the 4 rectangle sides, not yet drawn geometrically */}
          {activeFloor.walls.length > 4 && (
            <p className="mt-3 text-xs text-slate-400">
              {activeFloor.walls.length - 4} additional wall
              {activeFloor.walls.length - 4 > 1 ? 's' : ''} beyond the outer rectangle (
              {activeFloor.walls
                .slice(4)
                .map((w) => w.label)
                .join(', ')}
              ) are recorded but not yet drawn in this first version.
            </p>
          )}

          {/* Staircase note (staircase geometry rendering comes later) */}
          {activeFloor.staircase?.included && (
            <p className="mt-2 text-xs text-slate-400">
              Staircase noted near {activeFloor.staircase.referenceArea || 'an unspecified area'} —
              not yet drawn in this first version.
            </p>
          )}
        </>
      )}
    </div>
  );
}
