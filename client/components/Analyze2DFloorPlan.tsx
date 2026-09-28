'use client';

import React, { useCallback,useEffect, useRef, useState } from 'react';
import FloorPlan2D from './floor-plan/FloorPlan2D';
import FloorPlanEditor from './floor-plan/FloorPlanEditor';
import { generateFloor } from './floor-plan/FloorPlanEditor';
import FloorPlan3D from './floor-plan/FloorPlan3D';
import type { GeneratedFloor } from './floor-plan/FloorPlanEditor';

/* ============================================================
   TYPES
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
  referenceArea: string;
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

/* ============================================================
   HELPERS
   ============================================================ */

let idSeed = 0;
function generateId(prefix: string): string {
  idSeed += 1;
  return `${prefix}-${Date.now()}-${idSeed}`;
}

function createDefaultRooms(): RoomCount[] {
  return ROOM_TYPES.map((type) => ({ type, quantity: 0 }));
}

function createEmptyFloor(floorNumber: number): Floor {
  return {
    id: generateId('floor'),
    floorNumber,
    rooms: createDefaultRooms(),
    dimensions: { length: 0, breadth: 0, wallHeight: 10 },
    walls: [],
    doors: [],
    windows: [],
    staircase: { included: false, referenceArea: '' },
    additionalNotes: '',
  };
}

const MAX_FLOORS = 4;
const FLOOR_PLAN_INPUT_STORAGE_KEY = 'ai-interior-designer-floor-plan-input';

/* ============================================================
   SMALL PRESENTATIONAL PRIMITIVES
   ============================================================ */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-medium text-slate-600">
      {children}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  step = 0.1,
  suffix,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm tabular-nums text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">
      {text}
    </p>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function Analyze2DFloorPlan() {
  const [numberOfFloors, setNumberOfFloors] = useState<number>(1);
  const [floors, setFloors] = useState<Floor[]>(() => [createEmptyFloor(1)]);
  const [activeFloorIndex, setActiveFloorIndex] = useState<number>(0);
  const [generatedData, setGeneratedData] = useState<FloorPlanData | null>(null);
  const [generatedFloors, setGeneratedFloors] = useState<GeneratedFloor[] | null>(null);
  const [selectedFloors, setSelectedFloors] = useState<GeneratedFloor[] | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [generationSeed, setGenerationSeed] = useState(0);
  const [variation, setVariation] = useState(1);
  const [viewMode, setViewMode] = useState<'preview' | 'edit' | '3d'>('preview');
  const [savedInputAvailable, setSavedInputAvailable] = useState(false);
  const [inputMessage, setInputMessage] = useState<string | null>(null);
  const ignoreInitialEditorChange = useRef(false);

  useEffect(() => {
    setSavedInputAvailable(Boolean(localStorage.getItem(FLOOR_PLAN_INPUT_STORAGE_KEY)));
  }, []);

  function saveInput() {
    localStorage.setItem(
      FLOOR_PLAN_INPUT_STORAGE_KEY,
      JSON.stringify({ numberOfFloors, floors, activeFloorIndex }),
    );
    setSavedInputAvailable(true);
    setInputMessage('Floor plan input saved.');
  }

  function loadInput() {
    const saved = localStorage.getItem(FLOOR_PLAN_INPUT_STORAGE_KEY);
    if (!saved) {
      setInputMessage('No saved floor plan input found.');
      return;
    }

    try {
      const parsed = JSON.parse(saved) as {
        numberOfFloors?: number;
        floors?: Floor[];
        activeFloorIndex?: number;
      };

      if (!parsed.floors || !Array.isArray(parsed.floors) || parsed.floors.length === 0) {
        throw new Error('Invalid saved floor plan input');
      }

      const restoredFloorCount = Math.min(
        MAX_FLOORS,
        Math.max(1, parsed.numberOfFloors ?? parsed.floors.length),
      );
      const restoredFloors = parsed.floors.slice(0, restoredFloorCount);

      setNumberOfFloors(restoredFloorCount);
      setFloors(restoredFloors);
      setActiveFloorIndex(
        Math.min(
          Math.max(0, parsed.activeFloorIndex ?? 0),
          restoredFloors.length - 1,
        ),
      );
      setGeneratedData(null);
      setGeneratedFloors(null);
      setSelectedFloors(null);
      setHasUnsavedChanges(false);
      setViewMode('preview');
      setInputMessage('Saved floor plan input loaded.');
    } catch {
      setInputMessage('No saved floor plan input found.');
    }
  }

  function clearSavedInput() {
    localStorage.removeItem(FLOOR_PLAN_INPUT_STORAGE_KEY);
    setSavedInputAvailable(false);
    setInputMessage('Saved floor plan input cleared.');
  }

  /* ---------- floor count ---------- */

  function handleNumberOfFloorsChange(n: number) {
    setNumberOfFloors(n);
    setFloors((prev) => {
      if (n > prev.length) {
        const additions: Floor[] = [];
        for (let i = prev.length + 1; i <= n; i += 1) {
          additions.push(createEmptyFloor(i));
        }
        return [...prev, ...additions];
      }
      return prev.slice(0, n);
    });
    setActiveFloorIndex((prev) => Math.min(prev, n - 1));
  }

  /* ---------- generic floor updater ---------- */

  function updateFloor(floorId: string, updater: (floor: Floor) => Floor) {
    setFloors((prev) => prev.map((f) => (f.id === floorId ? updater(f) : f)));
  }

  /* ---------- rooms ---------- */

  function handleRoomQuantityChange(
    floorId: string,
    type: RoomType,
    quantity: number,
  ) {
    updateFloor(floorId, (f) => ({
      ...f,
      rooms: f.rooms.map((r) => (r.type === type ? { ...r, quantity } : r)),
    }));
  }

  /* ---------- dimensions ---------- */

  function handleDimensionChange(
    floorId: string,
    field: keyof FloorDimensions,
    value: number,
  ) {
    updateFloor(floorId, (f) => ({
      ...f,
      dimensions: { ...f.dimensions, [field]: value },
    }));
  }

  /* ---------- walls ---------- */

  function addWall(floorId: string) {
    updateFloor(floorId, (f) => ({
      ...f,
      walls: [
        ...f.walls,
        {
          id: generateId('wall'),
          label: `Wall ${f.walls.length + 1}`,
          length: 0,
          height: f.dimensions.wallHeight || 0,
          thickness: undefined,
        },
      ],
    }));
  }

  function updateWall(
    floorId: string,
    wallId: string,
    field: keyof Wall,
    value: string | number | undefined,
  ) {
    updateFloor(floorId, (f) => ({
      ...f,
      walls: f.walls.map((w) =>
        w.id === wallId ? { ...w, [field]: value } : w,
      ),
    }));
  }

  function removeWall(floorId: string, wallId: string) {
    updateFloor(floorId, (f) => ({
      ...f,
      walls: f.walls.filter((w) => w.id !== wallId),
    }));
  }

  /* ---------- doors ---------- */

  function addDoor(floorId: string, defaultWallId: string) {
    updateFloor(floorId, (f) => ({
      ...f,
      doors: [
        ...f.doors,
        {
          id: generateId('door'),
          label: `Door ${f.doors.length + 1}`,
          referenceWallId: defaultWallId,
          distanceFromCorner: 0,
          width: 2,
          height: 7,
        },
      ],
    }));
  }

  function updateDoor(
    floorId: string,
    doorId: string,
    field: keyof Door,
    value: string | number,
  ) {
    updateFloor(floorId, (f) => ({
      ...f,
      doors: f.doors.map((d) =>
        d.id === doorId ? { ...d, [field]: value } : d,
      ),
    }));
  }

  function removeDoor(floorId: string, doorId: string) {
    updateFloor(floorId, (f) => ({
      ...f,
      doors: f.doors.filter((d) => d.id !== doorId),
    }));
  }

  /* ---------- windows ---------- */

  function addWindow(floorId: string, defaultWallId: string) {
    updateFloor(floorId, (f) => ({
      ...f,
      windows: [
        ...f.windows,
        {
          id: generateId('window'),
          label: `Window ${f.windows.length + 1}`,
          referenceWallId: defaultWallId,
          distanceFromCorner: 0,
          width: 4,
          height: 4,
        },
      ],
    }));
  }

  function updateWindow(
    floorId: string,
    windowId: string,
    field: keyof WindowOpening,
    value: string | number,
  ) {
    updateFloor(floorId, (f) => ({
      ...f,
      windows: f.windows.map((w) =>
        w.id === windowId ? { ...w, [field]: value } : w,
      ),
    }));
  }

  function removeWindow(floorId: string, windowId: string) {
    updateFloor(floorId, (f) => ({
      ...f,
      windows: f.windows.filter((w) => w.id !== windowId),
    }));
  }

  /* ---------- staircase ---------- */

  function updateStaircase(floorId: string, partial: Partial<Staircase>) {
    updateFloor(floorId, (f) => ({
      ...f,
      staircase: { ...f.staircase, ...partial },
    }));
  }

  /* ---------- additional notes ---------- */

  function updateAdditionalNotes(floorId: string, value: string) {
    updateFloor(floorId, (f) => ({ ...f, additionalNotes: value }));
  }

  /* ---------- generate ---------- */

  function handleGenerate() {
    const data: FloorPlanData = { numberOfFloors, floors };
    setGeneratedData(data);
    setGeneratedFloors(floors.map((floor) => generateFloor(floor, 0)));
    setSelectedFloors(null);
    setHasUnsavedChanges(false);
    ignoreInitialEditorChange.current = true;
    setGenerationSeed(0);
    setVariation(1);
    setViewMode('preview');
  }

  function handleRegenerate() {
    setGenerationSeed((seed) => seed + 1);
    setVariation((current) => current + 1);
    setViewMode('edit');
  }

  function handleUseThisDesign() {
    if (!generatedFloors) {
      setInputMessage('Open Edit 2D Floor Plan before selecting a design.');
      return;
    }
    setSelectedFloors(generatedFloors.map((floor) => ({
      ...floor,
      rooms: floor.rooms.map((room) => ({ ...room })),
      walls: floor.walls.map((wall) => ({ ...wall })),
      openings: floor.openings.map((opening) => ({ ...opening })),
      stair: floor.stair ? { ...floor.stair } : null,
    })));
    setInputMessage('Current floor plan selected for 3D.');
  }

  const handleEditorChange = useCallback((nextFloors: GeneratedFloor[]) => {
    setGeneratedFloors(nextFloors);

    if (ignoreInitialEditorChange.current) {
        ignoreInitialEditorChange.current = false;
    } else {
        setHasUnsavedChanges(true);
    }
    }, []);

  function handleApply2DChanges() {
    if (!generatedFloors) return;
    setSelectedFloors(generatedFloors.map((floor) => ({
      ...floor,
      rooms: floor.rooms.map((room) => ({ ...room })),
      walls: floor.walls.map((wall) => ({ ...wall })),
      openings: floor.openings.map((opening) => ({ ...opening })),
      stair: floor.stair ? { ...floor.stair } : null,
    })));
    setHasUnsavedChanges(false);
    setInputMessage('2D changes saved.');
  }

  const activeFloor = floors[activeFloorIndex];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Floor plan intake
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Analyze 2D Floor Plan
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Describe your floors, rooms and measurements below. This data will
          be used to generate an editable 2D floor plan in a later step.
        </p>
      </div>

      {/* Number of floors */}
      <SectionCard
        title="Number of floors"
        description="Choose how many floors this house has (up to 4)."
      >
        <div className="max-w-xs">
          <SelectField
            label="Total floors"
            value={String(numberOfFloors)}
            onChange={(v) => handleNumberOfFloorsChange(parseInt(v, 10))}
            options={Array.from({ length: MAX_FLOORS }, (_, i) => i + 1).map(
              (n) => ({ value: String(n), label: `${n} Floor${n > 1 ? 's' : ''}` }),
            )}
          />
        </div>
      </SectionCard>

      {/* Floor tabs */}
      <div className="mt-6 flex gap-2 border-b border-slate-200">
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

      {activeFloor ? (
        <div key={activeFloor.id} className="mt-6 space-y-6">
          {/* A. Rooms */}
          <SectionCard
            title="Rooms"
            description="Specify how many of each room type this floor has."
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {activeFloor.rooms.map((room) => (
                <NumberField
                  key={room.type}
                  label={room.type}
                  value={room.quantity}
                  min={0}
                  step={1}
                  onChange={(v) =>
                    handleRoomQuantityChange(activeFloor.id, room.type, v)
                  }
                />
              ))}
            </div>
          </SectionCard>

          {/* B. Floor dimensions */}
          <SectionCard
            title="Floor dimensions"
            description="Overall footprint and wall height for this floor."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <NumberField
                label="Floor length"
                suffix="ft"
                value={activeFloor.dimensions.length}
                onChange={(v) =>
                  handleDimensionChange(activeFloor.id, 'length', v)
                }
              />
              <NumberField
                label="Floor breadth"
                suffix="ft"
                value={activeFloor.dimensions.breadth}
                onChange={(v) =>
                  handleDimensionChange(activeFloor.id, 'breadth', v)
                }
              />
              <NumberField
                label="Wall height"
                suffix="ft"
                value={activeFloor.dimensions.wallHeight}
                onChange={(v) =>
                  handleDimensionChange(activeFloor.id, 'wallHeight', v)
                }
              />
            </div>
          </SectionCard>

          {/* C. Walls */}
          <SectionCard
            title="Walls"
            description="Add each wall with its length and height."
            action={
              <button
                type="button"
                onClick={() => addWall(activeFloor.id)}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
              >
                + Add wall
              </button>
            }
          >
            {activeFloor.walls.length === 0 ? (
              <EmptyRow text="No walls added yet." />
            ) : (
              <div className="space-y-3">
                {activeFloor.walls.map((wall) => (
                  <div
                    key={wall.id}
                    className="grid grid-cols-2 gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-5 sm:items-end"
                  >
                    <TextField
                      label="Name"
                      value={wall.label}
                      onChange={(v) =>
                        updateWall(activeFloor.id, wall.id, 'label', v)
                      }
                    />
                    <NumberField
                      label="Length"
                      suffix="ft"
                      value={wall.length}
                      onChange={(v) =>
                        updateWall(activeFloor.id, wall.id, 'length', v)
                      }
                    />
                    <NumberField
                      label="Height"
                      suffix="ft"
                      value={wall.height}
                      onChange={(v) =>
                        updateWall(activeFloor.id, wall.id, 'height', v)
                      }
                    />
                    <NumberField
                      label="Thickness (optional)"
                      suffix="in"
                      value={wall.thickness}
                      onChange={(v) =>
                        updateWall(activeFloor.id, wall.id, 'thickness', v)
                      }
                    />
                    <button
                      type="button"
                      onClick={() => removeWall(activeFloor.id, wall.id)}
                      className="h-fit rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 hover:border-red-300 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* D. Doors */}
          <SectionCard
            title="Doors"
            description="Position each door relative to a wall."
            action={
              <button
                type="button"
                onClick={() =>
                  addDoor(activeFloor.id, activeFloor.walls[0]?.id ?? '')
                }
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
              >
                + Add door
              </button>
            }
          >
            {activeFloor.doors.length === 0 ? (
              <EmptyRow text="No doors added yet." />
            ) : (
              <div className="space-y-3">
                {activeFloor.doors.map((door) => (
                  <div
                    key={door.id}
                    className="grid grid-cols-2 gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-6 sm:items-end"
                  >
                    <TextField
                      label="Name"
                      value={door.label}
                      onChange={(v) =>
                        updateDoor(activeFloor.id, door.id, 'label', v)
                      }
                    />
                    <SelectField
                      label="Reference wall"
                      value={door.referenceWallId}
                      placeholder="Select wall"
                      options={activeFloor.walls.map((w) => ({
                        value: w.id,
                        label: w.label,
                      }))}
                      onChange={(v) =>
                        updateDoor(
                          activeFloor.id,
                          door.id,
                          'referenceWallId',
                          v,
                        )
                      }
                    />
                    <NumberField
                      label="From corner"
                      suffix="ft"
                      value={door.distanceFromCorner}
                      onChange={(v) =>
                        updateDoor(
                          activeFloor.id,
                          door.id,
                          'distanceFromCorner',
                          v,
                        )
                      }
                    />
                    <NumberField
                      label="Width"
                      suffix="ft"
                      value={door.width}
                      onChange={(v) =>
                        updateDoor(activeFloor.id, door.id, 'width', v)
                      }
                    />
                    <NumberField
                      label="Height"
                      suffix="ft"
                      value={door.height}
                      onChange={(v) =>
                        updateDoor(activeFloor.id, door.id, 'height', v)
                      }
                    />
                    <button
                      type="button"
                      onClick={() => removeDoor(activeFloor.id, door.id)}
                      className="h-fit rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 hover:border-red-300 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* E. Windows */}
          <SectionCard
            title="Windows"
            description="Position each window relative to a wall."
            action={
              <button
                type="button"
                onClick={() =>
                  addWindow(activeFloor.id, activeFloor.walls[0]?.id ?? '')
                }
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
              >
                + Add window
              </button>
            }
          >
            {activeFloor.windows.length === 0 ? (
              <EmptyRow text="No windows added yet." />
            ) : (
              <div className="space-y-3">
                {activeFloor.windows.map((win) => (
                  <div
                    key={win.id}
                    className="grid grid-cols-2 gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-6 sm:items-end"
                  >
                    <TextField
                      label="Name"
                      value={win.label}
                      onChange={(v) =>
                        updateWindow(activeFloor.id, win.id, 'label', v)
                      }
                    />
                    <SelectField
                      label="Reference wall"
                      value={win.referenceWallId}
                      placeholder="Select wall"
                      options={activeFloor.walls.map((w) => ({
                        value: w.id,
                        label: w.label,
                      }))}
                      onChange={(v) =>
                        updateWindow(
                          activeFloor.id,
                          win.id,
                          'referenceWallId',
                          v,
                        )
                      }
                    />
                    <NumberField
                      label="From corner"
                      suffix="ft"
                      value={win.distanceFromCorner}
                      onChange={(v) =>
                        updateWindow(
                          activeFloor.id,
                          win.id,
                          'distanceFromCorner',
                          v,
                        )
                      }
                    />
                    <NumberField
                      label="Width"
                      suffix="ft"
                      value={win.width}
                      onChange={(v) =>
                        updateWindow(activeFloor.id, win.id, 'width', v)
                      }
                    />
                    <NumberField
                      label="Height"
                      suffix="ft"
                      value={win.height}
                      onChange={(v) =>
                        updateWindow(activeFloor.id, win.id, 'height', v)
                      }
                    />
                    <button
                      type="button"
                      onClick={() => removeWindow(activeFloor.id, win.id)}
                      className="h-fit rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 hover:border-red-300 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* F. Staircase */}
          <SectionCard
            title="Staircase"
            description="Does this floor include a staircase?"
          >
            <div className="mb-4 flex gap-3">
              <button
                type="button"
                onClick={() =>
                  updateStaircase(activeFloor.id, { included: false })
                }
                className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                  !activeFloor.staircase.included
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 text-slate-500'
                }`}
              >
                No staircase
              </button>
              <button
                type="button"
                onClick={() =>
                  updateStaircase(activeFloor.id, { included: true })
                }
                className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                  activeFloor.staircase.included
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 text-slate-500'
                }`}
              >
                Staircase
              </button>
            </div>

            {activeFloor.staircase.included ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <TextField
                  label="Reference wall / area"
                  value={activeFloor.staircase.referenceArea}
                  placeholder="e.g. Wall 2 corner"
                  onChange={(v) =>
                    updateStaircase(activeFloor.id, { referenceArea: v })
                  }
                />
                <NumberField
                  label="Width"
                  suffix="ft"
                  value={activeFloor.staircase.width}
                  onChange={(v) =>
                    updateStaircase(activeFloor.id, { width: v })
                  }
                />
                <NumberField
                  label="Length"
                  suffix="ft"
                  value={activeFloor.staircase.length}
                  onChange={(v) =>
                    updateStaircase(activeFloor.id, { length: v })
                  }
                />
                <SelectField
                  label="Direction"
                  value={activeFloor.staircase.direction ?? ''}
                  placeholder="Select direction"
                  options={[
                    { value: 'straight', label: 'Straight' },
                    { value: 'l-shaped', label: 'L-shaped' },
                    { value: 'u-shaped', label: 'U-shaped' },
                    { value: 'spiral', label: 'Spiral' },
                  ]}
                  onChange={(v) =>
                    updateStaircase(activeFloor.id, {
                      direction: v as StaircaseDirection,
                    })
                  }
                />
              </div>
            ) : null}
          </SectionCard>

          {/* G. Additional information */}
          <SectionCard
            title="Additional information"
            description="Describe any extra measurements or requirements in your own words."
          >
            <textarea
              value={activeFloor.additionalNotes}
              onChange={(e) =>
                updateAdditionalNotes(activeFloor.id, e.target.value)
              }
              rows={5}
              placeholder={
                'e.g. Wall 1 is 10 ft long and 10 ft high. Wall 2 is 12.3 ft long. ' +
                'There are two doors on Wall 1. The first door is 1 ft from the corner.'
              }
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </SectionCard>
        </div>
      ) : null}

      {/* Generate */}
      <div className="mt-8 flex flex-col items-start gap-4 border-t border-slate-200 pt-6">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={saveInput}
            className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-500"
          >
            Save Input
          </button>
          <button
            type="button"
            onClick={loadInput}
            className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-500"
          >
            Load Saved Input
          </button>
          {savedInputAvailable ? (
            <button
              type="button"
              onClick={clearSavedInput}
              className="rounded-md border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-500 hover:border-red-300 hover:text-red-600"
            >
              Clear Saved Input
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleGenerate}
            className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-700"
          >
            Generate 2D Floor Plan
          </button>
        </div>

        {inputMessage ? (
          <p className="text-sm text-slate-600" role="status">
            {inputMessage}
          </p>
        ) : null}

        {generatedData ? (
          <>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRegenerate}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-500"
              >
                Regenerate 2D
              </button>
              <button
                type="button"
                onClick={handleUseThisDesign}
                disabled={!generatedFloors}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Use This Design
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`rounded-md border px-4 py-2 text-sm font-semibold transition-colors ${
                  viewMode === 'preview'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 text-slate-600 hover:border-slate-500'
                }`}
              >
                2D Preview
              </button>
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`rounded-md border px-4 py-2 text-sm font-semibold transition-colors ${
                  viewMode === 'edit'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 text-slate-600 hover:border-slate-500'
                }`}
              >
                Edit 2D Floor Plan
              </button>
              <button
                type="button"
                onClick={() => setViewMode('3d')}
                className={`rounded-md border px-4 py-2 text-sm font-semibold transition-colors ${
                  viewMode === '3d'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 text-slate-600 hover:border-slate-500'
                }`}
              >
                View in 3D
              </button>
              <span className="self-center text-sm text-slate-500">Variation: {variation}</span>
            </div>

            {viewMode === 'preview' ? (
              <FloorPlan2D data={generatedData} className="w-full" />
            ) : null}

            <div style={{ display: viewMode === 'edit' ? 'block' : 'none' }}>
              <FloorPlanEditor
                data={generatedData}
                onChange={handleEditorChange}
                generationSeed={generationSeed}
                className="w-full"
              />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleApply2DChanges}
                  className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-700"
                >
                  Save / Apply 2D Changes
                </button>
                {hasUnsavedChanges ? (
                  <span className="text-sm text-slate-500">Unsaved 2D changes</span>
                ) : null}
              </div>
            </div>

            {viewMode === '3d' && generatedData ? (
              <FloorPlan3D
                data={generatedData}
                floors={selectedFloors ?? generatedFloors}
                className="w-full"
              />
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
