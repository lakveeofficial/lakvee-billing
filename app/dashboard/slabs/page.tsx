"use client";

import { useState, useEffect, useRef } from "react";
import { RateSlab, SlabType, SlabDistanceCategory } from "@/types/slab";
// import { SlabStorage } from "@/lib/slabStorage"; // Removed for API migration
import { DistanceCategoryStorage } from "@/lib/distanceCategoryStorage";
import { Plus, Edit, Trash2, Upload, Download } from "lucide-react";
import PageHeader from '@/components/PageHeader'
import SlabForm from "./SlabForm";
import DistanceCategoryConfigPanel from "./DistanceCategoryConfigPanel";
import Papa from "papaparse";

const SLAB_TYPE_LABELS: Record<SlabType, string> = {
  weight: "Weight",
  distance: "Distance",
  volume: "Volume",
  cod: "COD Value"
};

export default function SlabMasterPage() {
  // Get user from localStorage (same as dashboard layout)
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
  }, []);
  const [slabs, setSlabs] = useState<RateSlab[]>([]);
  const [distanceCategories, setDistanceCategories] = useState<SlabDistanceCategory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSlab, setEditingSlab] = useState<RateSlab | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [showDistanceConfig, setShowDistanceConfig] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RateSlab | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // CSV Import handler
  const isAdmin = user?.role === 'admin';

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const { data, errors } = results as Papa.ParseResult<any>;
        if (errors.length > 0) {
          setCsvError("CSV parse error: " + errors[0].message);
          return;
        }
        // Import each row via API
        let importErrors: any[] = [];
        for (const row of data) {
          const res = await fetch('/api/slabs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(row),
          });
          if (!res.ok) {
            importErrors.push({ error: `Row import failed: ${row.slabLabel || ''}` });
          }
        }
        // Refresh slabs
        const slabsRes = await fetch('/api/slabs');
        setSlabs(slabsRes.ok ? await slabsRes.json() : []);
        if (importErrors.length > 0) {
          setCsvError(
            `Imported with ${importErrors.length} errors. First: ${importErrors[0].error}`
          );
        } else {
          setCsvError(null);
        }
      },
      error: (err) => setCsvError("CSV parse error: " + err.message),
    });
    // Reset input value so same file can be re-imported
    e.target.value = "";
  };

  // CSV Export handler
  const handleExportCSV = () => {
    const csv = Papa.unparse(slabs);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rate_slabs.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    async function fetchSlabs() {
      const res = await fetch('/api/slabs');
      if (res.ok) {
        const data = await res.json();
        setSlabs(data);
      } else {
        setSlabs([]);
      }
    }
    fetchSlabs();
    setDistanceCategories([
      "within_state",
      "metro_state",
      "out_of_state",
      "other_state",
    ]);
  }, []);

  // Delete handler
  const handleDeleteSlab = (slab: RateSlab) => {
    setDeleteTarget(slab);
    setShowDeleteDialog(true);
  };
  const confirmDeleteSlab = async () => {
    if (deleteTarget) {
      const res = await fetch(`/api/slabs/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        // Refresh slabs from DB
        const slabsRes = await fetch('/api/slabs');
        setSlabs(slabsRes.ok ? await slabsRes.json() : []);
      }
      setDeleteTarget(null);
      setShowDeleteDialog(false);
    }
  };
  const cancelDeleteSlab = () => {
    setDeleteTarget(null);
    setShowDeleteDialog(false);
  };

  // Modal/modal logic for add/edit
  const handleSaveSlab = async (slab: RateSlab) => {
    const method = slab.id ? 'PUT' : 'POST';
    const url = slab.id ? `/api/slabs/${slab.id}` : '/api/slabs';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slab),
    });
    if (res.ok) {
      // Refresh slabs from DB
      const slabsRes = await fetch('/api/slabs');
      setSlabs(slabsRes.ok ? await slabsRes.json() : []);
      setShowForm(false);
      setEditingSlab(null);
    } else {
      // Optionally, show error
      alert('Failed to save slab');
    }
  };
  const handleCancelSlab = () => {
    setShowForm(false);
    setEditingSlab(null);
  };

  if (user && user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="bg-white p-8 rounded shadow text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-600">Access Denied</h2>
          <p className="text-gray-700">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Rate Slab Master"
        subtitle="Manage rate slabs and distance/metro categories"
        actions={
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
            onClick={() => {
              setEditingSlab(null);
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4 text-emerald-200" />
            New Slab
          </button>
        }
      />
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-30 flex items-center justify-center">
          <div className="bg-white rounded shadow-lg p-0 max-w-lg w-full relative">
            <SlabForm
              initialSlab={editingSlab}
              onSave={handleSaveSlab}
              onCancel={handleCancelSlab}
            />
          </div>
        </div>
      )}
      <div className="bg-white shadow rounded p-4">
        <div className="flex justify-between mb-4">
          <div>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              className="hidden"
              onChange={handleImportCSV}
            />
            <button
              className="flex items-center px-3 py-1 border rounded text-sm mr-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-1" /> Import CSV
            </button>
            <button
              className="flex items-center px-3 py-1 border rounded text-sm"
              onClick={handleExportCSV}
              disabled={!isAdmin}
              style={!isAdmin ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </button>
          </div>
          <button className="flex items-center px-3 py-1 border rounded text-sm" onClick={() => setShowDistanceConfig(true)} disabled={!isAdmin} style={!isAdmin ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
            Configure Distance/Metro
          </button>
        </div>
        {csvError && (
          <div className="mb-2 text-sm text-red-600">{csvError}</div>
        )}
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Label</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">From</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">To</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Effective Date</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Distance Category</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {slabs.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-6 text-gray-400">
                  No slabs found.
                </td>
              </tr>
            ) : (
              slabs.map((slab) => (
                <tr key={slab.id} className="border-b">
                  <td className="px-4 py-2">{SLAB_TYPE_LABELS[slab.slabType]}</td>
                  <td className="px-4 py-2">{slab.slabLabel}</td>
                  <td className="px-4 py-2">{slab.fromValue}</td>
                  <td className="px-4 py-2">{slab.toValue}</td>
                  <td className="px-4 py-2">{slab.unitType}</td>
                  <td className="px-4 py-2">{slab.rate}</td>
                  <td className="px-4 py-2">{slab.effectiveDate}</td>
                  <td className="px-4 py-2">
                    <span className={
                      slab.status === "active"
                        ? "inline-block px-2 py-1 text-xs rounded bg-green-100 text-green-700"
                        : "inline-block px-2 py-1 text-xs rounded bg-gray-200 text-gray-500"
                    }>
                      {slab.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">{slab.slabType === "distance" ? slab.distanceCategory : "-"}</td>
                  <td className="px-4 py-2 flex space-x-2">
                    <button
                      className="p-1 rounded hover:bg-gray-100"
                      title="Edit"
                      onClick={() => {
                        setEditingSlab(slab);
                        setShowForm(true);
                      }}
                      disabled={!isAdmin}
                      style={!isAdmin ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      className="p-1 rounded hover:bg-gray-100 text-red-600"
                      title="Delete"
                      onClick={() => handleDeleteSlab(slab)}
                      disabled={!isAdmin}
                      style={!isAdmin ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    {/* Delete Confirmation Dialog */}
    {showDeleteDialog && deleteTarget && (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-30 flex items-center justify-center">
        <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full">
          <h2 className="text-lg font-semibold mb-4">Delete Slab</h2>
          <p>Are you sure you want to delete the slab <span className="font-bold">{deleteTarget.slabLabel}</span>?</p>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
              onClick={cancelDeleteSlab}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
              onClick={confirmDeleteSlab}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
}
