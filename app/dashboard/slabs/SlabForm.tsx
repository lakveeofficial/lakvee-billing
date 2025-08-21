"use client";

import { useState, useEffect } from "react";
import { RateSlab, SlabType, SlabDistanceCategory } from "@/types/slab";

interface SlabFormProps {
  initialSlab?: RateSlab | null;
  onSave: (slab: RateSlab) => void;
  onCancel: () => void;
}

const SLAB_TYPE_LABELS: Record<SlabType, string> = {
  weight: "Weight",
  distance: "Distance",
  volume: "Volume",
  cod: "COD Value"
};

const DISTANCE_CATEGORIES: SlabDistanceCategory[] = [
  "within_state",
  "metro_state",
  "out_of_state",
  "other_state"
];

export default function SlabForm({ initialSlab, onSave, onCancel }: SlabFormProps) {
  const [slabType, setSlabType] = useState<SlabType>(initialSlab?.slabType || "weight");
  const [slabLabel, setSlabLabel] = useState(initialSlab?.slabLabel || "");
  const [fromValue, setFromValue] = useState(initialSlab?.fromValue ?? 0);
  const [toValue, setToValue] = useState(initialSlab?.toValue ?? 0);
  const [unitType, setUnitType] = useState(initialSlab?.unitType || "");
  const [rate, setRate] = useState(initialSlab?.rate ?? 0);
  const [effectiveDate, setEffectiveDate] = useState(initialSlab?.effectiveDate || "");
  const [status, setStatus] = useState<"active" | "inactive">(initialSlab?.status || "active");
  const [distanceCategory, setDistanceCategory] = useState<SlabDistanceCategory | undefined>(initialSlab?.distanceCategory);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const slab: any = {
      slabType,
      slabLabel,
      fromValue,
      toValue,
      unitType,
      rate,
      effectiveDate,
      status,
      distanceCategory: slabType === "distance" ? distanceCategory : undefined
    };
    if (initialSlab?.id) slab.id = initialSlab.id; // Only include id for updates
    onSave(slab);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded shadow max-w-lg mx-auto">
      <div className="flex space-x-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Slab Type</label>
          <select
            className="w-full border px-2 py-1 rounded"
            value={slabType}
            onChange={e => setSlabType(e.target.value as SlabType)}
          >
            {Object.entries(SLAB_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            className="w-full border px-2 py-1 rounded"
            value={status}
            onChange={e => setStatus(e.target.value as "active" | "inactive")}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div className="flex space-x-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Label</label>
          <input
            className="w-full border px-2 py-1 rounded"
            value={slabLabel}
            onChange={e => setSlabLabel(e.target.value)}
            placeholder="e.g. 0-500g"
            required
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Unit</label>
          <input
            className="w-full border px-2 py-1 rounded"
            value={unitType}
            onChange={e => setUnitType(e.target.value)}
            placeholder="g, kg, km, Rs, etc."
            required
          />
        </div>
      </div>
      <div className="flex space-x-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">From Value</label>
          <input
            type="number"
            className="w-full border px-2 py-1 rounded"
            value={fromValue}
            onChange={e => setFromValue(Number(e.target.value))}
            required
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">To Value</label>
          <input
            type="number"
            className="w-full border px-2 py-1 rounded"
            value={toValue}
            onChange={e => setToValue(Number(e.target.value))}
            required
          />
        </div>
      </div>
      <div className="flex space-x-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Rate</label>
          <input
            type="number"
            className="w-full border px-2 py-1 rounded"
            value={rate}
            onChange={e => setRate(Number(e.target.value))}
            required
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Effective Date</label>
          <input
            type="date"
            className="w-full border px-2 py-1 rounded"
            value={effectiveDate}
            onChange={e => setEffectiveDate(e.target.value)}
            required
          />
        </div>
      </div>
      {slabType === "distance" && (
        <div>
          <label className="block text-sm font-medium mb-1">Distance Category</label>
          <select
            className="w-full border px-2 py-1 rounded"
            value={distanceCategory || ""}
            onChange={e => setDistanceCategory(e.target.value as SlabDistanceCategory)}
            required
          >
            <option value="">Select Category</option>
            {DISTANCE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex justify-end space-x-4 pt-2">
        <button
          type="button"
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          Save Slab
        </button>
      </div>
    </form>
  );
}
