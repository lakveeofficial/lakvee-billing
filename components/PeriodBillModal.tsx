"use client"

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface PeriodBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBillGenerated?: () => void;
}

interface Party {
  id: number;
  partyName: string;
}

export default function PeriodBillModal({ isOpen, onClose, onBillGenerated }: PeriodBillModalProps) {
  const [partyId, setPartyId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadParties();
    }
  }, [isOpen]);

  const loadParties = async () => {
    try {
      const response = await fetch('/api/parties?limit=1000', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setParties(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load parties', err);
    }
  };

  const handleSubmit = async () => {
    if (!partyId || !dateFrom || !dateTo) {
      setError('Please select a party and a date range.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/bills/period', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ partyId, dateFrom, dateTo }),
      });

      if (response.ok) {
        onBillGenerated?.();
        onClose();
      } else {
        const errData = await response.json();
        setError(errData.error || 'Failed to generate period bill.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Generate Period Bill</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="text-red-600 text-sm p-3 bg-red-50 rounded">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Party</label>
            <select
              value={partyId || ''}
              onChange={(e) => setPartyId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>Select a party</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>{p.partyName}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Bill'}
          </button>
        </div>
      </div>
    </div>
  );
}
