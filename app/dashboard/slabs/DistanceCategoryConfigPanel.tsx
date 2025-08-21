"use client";
import { useState } from "react";
import { DistanceCategoryStorage } from "@/lib/distanceCategoryStorage";
import { INDIAN_STATES } from "@/types/party";
import { DistanceCategoryConfig, MetroCityConfig } from "@/types/slab";

export default function DistanceCategoryConfigPanel({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<DistanceCategoryConfig>(() => DistanceCategoryStorage.getConfig());
  const [newMetroState, setNewMetroState] = useState("");
  const [newMetroCity, setNewMetroCity] = useState("");
  const [newOtherState, setNewOtherState] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Metro city add
  const handleAddMetroCity = () => {
    if (!newMetroState || !newMetroCity) {
      setError("Select state and enter city name");
      return;
    }
    DistanceCategoryStorage.addMetroCity(newMetroState, newMetroCity);
    setConfig(DistanceCategoryStorage.getConfig());
    setNewMetroCity("");
    setError(null);
  };
  // Metro city remove
  const handleRemoveMetroCity = (state: string, city: string) => {
    DistanceCategoryStorage.removeMetroCity(state, city);
    setConfig(DistanceCategoryStorage.getConfig());
  };
  // Other state add
  const handleAddOtherState = () => {
    if (!newOtherState) {
      setError("Select state");
      return;
    }
    DistanceCategoryStorage.addOtherState(newOtherState);
    setConfig(DistanceCategoryStorage.getConfig());
    setNewOtherState("");
    setError(null);
  };
  // Other state remove
  const handleRemoveOtherState = (state: string) => {
    DistanceCategoryStorage.removeOtherState(state);
    setConfig(DistanceCategoryStorage.getConfig());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg max-w-2xl w-full p-6 relative">
        <button className="absolute top-2 right-2 text-gray-500 hover:text-black" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-4">Configure Distance Slab Categories</h2>
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Metro Cities</h3>
          <div className="flex mb-2 gap-2">
            <select value={newMetroState} onChange={e => setNewMetroState(e.target.value)} className="border rounded px-2 py-1">
              <option value="">Select State</option>
              {INDIAN_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            <input
              type="text"
              value={newMetroCity}
              onChange={e => setNewMetroCity(e.target.value)}
              placeholder="City name"
              className="border rounded px-2 py-1"
            />
            <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={handleAddMetroCity}>Add</button>
          </div>
          <ul className="list-disc ml-6">
            {config.metroCities.map((mc: MetroCityConfig) => (
              <li key={mc.state}>
                <span className="font-semibold">{mc.state}:</span> {mc.cities.map(city => (
                  <span key={city} className="inline-flex items-center mr-2">
                    {city}
                    <button
                      className="ml-1 text-xs text-red-600 hover:underline"
                      onClick={() => handleRemoveMetroCity(mc.state, city)}
                    >Remove</button>
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </div>
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Other States (Special/Remote)</h3>
          <div className="flex mb-2 gap-2">
            <select value={newOtherState} onChange={e => setNewOtherState(e.target.value)} className="border rounded px-2 py-1">
              <option value="">Select State</option>
              {INDIAN_STATES.filter(state => !config.otherStates.includes(state)).map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={handleAddOtherState}>Add</button>
          </div>
          <ul className="list-disc ml-6">
            {config.otherStates.map(state => (
              <li key={state} className="flex items-center">
                {state}
                <button
                  className="ml-2 text-xs text-red-600 hover:underline"
                  onClick={() => handleRemoveOtherState(state)}
                >Remove</button>
              </li>
            ))}
          </ul>
        </div>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <button className="mt-4 px-4 py-2 rounded bg-gray-500 text-white" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
