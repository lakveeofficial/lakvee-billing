"use client"

import { useEffect, useState } from "react"
import { RateSlab, SlabType, SlabDistanceCategory } from "@/types/slab"
// Removed SlabStorage and DistanceCategoryStorage imports; using backend API for slabs.

interface Props {
  value: {
    weightSlabId?: string
    distanceSlabId?: string
    distanceCategory?: SlabDistanceCategory
    volumeSlabId?: string
    codSlabId?: string
  }
  onChange: (val: Props["value"]) => void
}

const SLAB_TYPES: { type: SlabType; label: string }[] = [
  { type: "weight", label: "Weight" },
  { type: "distance", label: "Distance" },
  { type: "volume", label: "Volume" },
  { type: "cod", label: "COD Value" },
]

export default function PartySlabAssignmentSection({ value, onChange }: Props) {
  const [weightSlabs, setWeightSlabs] = useState<RateSlab[]>([])
  const [distanceSlabs, setDistanceSlabs] = useState<RateSlab[]>([])
  const [volumeSlabs, setVolumeSlabs] = useState<RateSlab[]>([])
  const [codSlabs, setCodSlabs] = useState<RateSlab[]>([])
  const [distanceCategories, setDistanceCategories] = useState<SlabDistanceCategory[]>([])
  const [distanceCategoryLabels, setDistanceCategoryLabels] = useState<Record<SlabDistanceCategory, string>>({
    within_state: "Within State",
    metro_state: "Metro State",
    out_of_state: "Out of State",
    other_state: "Other State (Special/Remote)",
  })

  useEffect(() => {
    async function fetchSlabs() {
      try {
        const res = await fetch('/api/slabs');
        if (!res.ok) throw new Error('Failed to fetch slabs');
        const slabs: RateSlab[] = await res.json();
        setWeightSlabs(slabs.filter(s => s.slabType === 'weight'));
        setDistanceSlabs(slabs.filter(s => s.slabType === 'distance'));
        setVolumeSlabs(slabs.filter(s => s.slabType === 'volume'));
        setCodSlabs(slabs.filter(s => s.slabType === 'cod'));
      } catch (error) {
        setWeightSlabs([]);
        setDistanceSlabs([]);
        setVolumeSlabs([]);
        setCodSlabs([]);
      }
      setDistanceCategories(["within_state", "metro_state", "out_of_state", "other_state"]);
    }
    fetchSlabs();
  }, []);

  // Error states for missing slabs or categories
  const noWeightSlabs = weightSlabs.length === 0;
  const noVolumeSlabs = volumeSlabs.length === 0;
  const noCodSlabs = codSlabs.length === 0;
  const noDistanceSlabs = distanceSlabs.length === 0;
  const noDistanceCategories = distanceCategories.length === 0;

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-8">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Rate Slab Assignment</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weight Slab */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Weight Slab</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={value.weightSlabId || ""}
            onChange={e => onChange({ ...value, weightSlabId: e.target.value })}
            disabled={noWeightSlabs}
          >
            <option value="">Select Weight Slab</option>
            {weightSlabs.map(slab => (
              <option key={slab.id} value={slab.id}>
                {slab.slabLabel} ({slab.fromValue}-{slab.toValue} {slab.unitType}): ₹{slab.rate}
              </option>
            ))}
          </select>
          {noWeightSlabs && (
            <div className="mt-1 text-xs text-red-600">No weight slabs available. Please add a weight slab in the Slab Master.</div>
          )}
        </div>
        {/* Volume Slab */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Volume Slab</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={value.volumeSlabId || ""}
            onChange={e => onChange({ ...value, volumeSlabId: e.target.value })}
            disabled={noVolumeSlabs}
          >
            <option value="">Select Volume Slab</option>
            {volumeSlabs.map(slab => (
              <option key={slab.id} value={slab.id}>
                {slab.slabLabel} ({slab.fromValue}-{slab.toValue} {slab.unitType}): ₹{slab.rate}
              </option>
            ))}
          </select>
          {noVolumeSlabs && (
            <div className="mt-1 text-xs text-red-600">No volume slabs available. Please add a volume slab in the Slab Master.</div>
          )}
        </div>
        {/* COD Slab */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">COD Value Slab</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={value.codSlabId || ""}
            onChange={e => onChange({ ...value, codSlabId: e.target.value })}
            disabled={noCodSlabs}
          >
            <option value="">Select COD Slab</option>
            {codSlabs.map(slab => (
              <option key={slab.id} value={slab.id}>
                {slab.slabLabel} ({slab.fromValue}-{slab.toValue} {slab.unitType}): ₹{slab.rate}
              </option>
            ))}
          </select>
          {noCodSlabs && (
            <div className="mt-1 text-xs text-red-600">No COD slabs available. Please add a COD slab in the Slab Master.</div>
          )}
        </div>
        {/* Distance Slab + Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Distance Slab & Category</label>
          <div className="flex gap-2">
            <select
              className="w-1/2 px-3 py-2 border border-gray-300 rounded-md"
              value={value.distanceSlabId || ""}
              onChange={e => onChange({ ...value, distanceSlabId: e.target.value })}
              disabled={noDistanceSlabs}
            >
              <option value="">Select Distance Slab</option>
              {distanceSlabs.map(slab => (
                <option key={slab.id} value={slab.id}>
                  {slab.slabLabel} ({slab.fromValue}-{slab.toValue} {slab.unitType}): ₹{slab.rate}
                </option>
              ))}
            </select>
            <select
              className="w-1/2 px-3 py-2 border border-gray-300 rounded-md"
              value={value.distanceCategory || ""}
              onChange={e => onChange({ ...value, distanceCategory: e.target.value as SlabDistanceCategory })}
              disabled={noDistanceCategories}
            >
              <option value="">Select Category</option>
              {distanceCategories.map(cat => (
                <option key={cat} value={cat}>
                  {distanceCategoryLabels[cat]}
                </option>
              ))}
            </select>
          </div>
          {noDistanceSlabs && (
            <div className="mt-1 text-xs text-red-600">No distance slabs available. Please add a distance slab in the Slab Master.</div>
          )}
          {noDistanceCategories && (
            <div className="mt-1 text-xs text-red-600">No distance categories configured. Please configure categories in Distance/Metro Config.</div>
          )}
        </div>
      </div>
    </div>
  )
}
