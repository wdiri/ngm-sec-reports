'use client';

import { useState, useEffect } from 'react';
import { ToleranceBand } from '@prisma/client';
import Link from 'next/link';
import { getMetricNamesMap } from '@/lib/domain/metrics';
import toast from 'react-hot-toast';
import { LogViewer } from '@/components/LogViewer';
import { SystemStatus } from '@/components/SystemStatus';

const METRIC_NAMES = getMetricNamesMap();

export default function SettingsPage() {
  const [tolerances, setTolerances] = useState<ToleranceBand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingMetric, setEditingMetric] = useState<number | null>(null);
  const [dataStatus, setDataStatus] = useState<{ periods: number; drafts: number; seedPeriods: number }>({ periods: 0, drafts: 0, seedPeriods: 0 });
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [tolerancesRes, dataStatusRes, configRes] = await Promise.all([
        fetch('/api/tolerances'),
        fetch('/api/admin/data'),
        fetch('/api/config'),
      ]);

      const tolerancesData = await tolerancesRes.json();
      const statusData = await dataStatusRes.json();
      const configData = await configRes.json();

      setTolerances(tolerancesData);
      setDataStatus(statusData);
      setHasApiKey(!!configData?.openaiApiKey);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveTolerance = async (metricNumber: number, tolerance: Partial<ToleranceBand>) => {
    try {
      setIsSaving(true);
      const response = await fetch(`/api/tolerances/${metricNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tolerance),
      });

      if (!response.ok) {
        throw new Error('Failed to save tolerance');
      }

      const updated = await response.json();
      setTolerances(prev => prev.map(t => t.metricNumber === metricNumber ? updated : t));
      setEditingMetric(null);
      toast.success('Tolerance saved successfully');
    } catch (error) {
      console.error('Error saving tolerance:', error);
      toast.error('Failed to save tolerance');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSeedSampleData = async () => {
    if (dataStatus.periods > 0) {
      toast.error('Data already exists. Delete it first if you want to re-run the seed.');
      return;
    }
    try {
      setIsSaving(true);
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      // Add admin secret if available in environment
      if (process.env.NEXT_PUBLIC_ADMIN_SECRET) {
        headers['x-admin-secret'] = process.env.NEXT_PUBLIC_ADMIN_SECRET;
      }
      const res = await fetch('/api/admin/data', { method: 'POST', headers });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error || 'Failed to seed data');
      }
      await loadData();
      toast.success('Seed data installed successfully');
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to seed data');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSeedData = async () => {
    if (!confirm('Remove the seed data? Your own periods will stay.')) {
      return;
    }
    try {
      setIsSaving(true);
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      // Add admin secret if available in environment
      if (process.env.NEXT_PUBLIC_ADMIN_SECRET) {
        headers['x-admin-secret'] = process.env.NEXT_PUBLIC_ADMIN_SECRET;
      }
      const res = await fetch('/api/admin/data', { method: 'DELETE', headers });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error || 'Failed to delete seed data');
      }
      await loadData();
      toast.success('Seed data removed successfully');
    } catch (error) {
      console.error('Error deleting seed data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete seed data');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveApiKey = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openaiApiKey: openaiApiKey.trim() || null }),
      });

      if (!response.ok) {
        throw new Error('Failed to save API key');
      }

      setHasApiKey(!!openaiApiKey.trim());
      setIsEditingApiKey(false);
      setOpenaiApiKey(''); // Clear the input for security
      toast.success('OpenAI API key saved successfully');
    } catch (error) {
      console.error('Error saving API key:', error);
      toast.error('Failed to save API key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveApiKey = async () => {
    if (!confirm('Remove the OpenAI API key? AI-enhanced insights will be disabled.')) {
      return;
    }
    try {
      setIsSaving(true);
      const response = await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openaiApiKey: null }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove API key');
      }

      setHasApiKey(false);
      setIsEditingApiKey(false);
      setOpenaiApiKey('');
      toast.success('OpenAI API key removed');
    } catch (error) {
      console.error('Error removing API key:', error);
      toast.error('Failed to remove API key');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ngm-bg pb-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mt-6">
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Left Column - Configuration */}
          <div className="lg:col-span-2 space-y-4">
            {/* Top Row: AI Configuration and Seed Data */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* AI Configuration */}
              <div className="bg-white rounded-lg shadow p-4 flex flex-col">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">AI Configuration</h2>
            {!isEditingApiKey ? (
              <div className="space-y-3 flex-grow flex flex-col">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${hasApiKey ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {hasApiKey ? '✓ Configured' : 'Not configured'}
                  </span>
                </div>
                {hasApiKey && (
                  <p className="text-xs text-gray-600 flex-grow">
                    AI-enhanced insights are enabled. Your API key is securely stored.
                  </p>
                )}
                {!hasApiKey && <div className="flex-grow"></div>}
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => setIsEditingApiKey(true)}
                    disabled={isSaving}
                    className="px-3 py-2 bg-ngm-cta text-white rounded-md hover:bg-ngm-cta-hover disabled:opacity-50 text-sm"
                  >
                    {hasApiKey ? 'Update Key' : 'Add API Key'}
                  </button>
                  {hasApiKey && (
                    <button
                      onClick={handleRemoveApiKey}
                      disabled={isSaving}
                      className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    OpenAI API Key
                  </label>
                  <input
                    type="password"
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-2 py-1.5 border border-ngm-border rounded-md text-xs"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your API key is stored securely and never exposed in the UI.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveApiKey}
                    disabled={isSaving}
                    className="px-3 py-2 bg-ngm-cta text-white rounded-md hover:bg-ngm-cta-hover disabled:opacity-50 text-sm"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingApiKey(false);
                      setOpenaiApiKey('');
                    }}
                    disabled={isSaving}
                    className="px-3 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
              </div>

              {/* Seed Data */}
              <div className="bg-white rounded-lg shadow p-4 flex flex-col">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Seed Data</h2>
                <div className="flex flex-wrap gap-2 mb-3 text-xs">
                  <span className="rounded-full bg-gray-100 px-2 py-1 font-semibold text-gray-700">
                    Seed: {dataStatus.seedPeriods}
                  </span>
                </div>
                <div className="flex gap-2 mt-auto">
                  {dataStatus.periods === 0 ? (
                    <button
                      onClick={handleSeedSampleData}
                      disabled={isSaving}
                      className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
                    >
                      {isSaving ? 'Working...' : 'Install'}
                    </button>
                  ) : dataStatus.seedPeriods > 0 ? (
                    <button
                      onClick={handleDeleteSeedData}
                      disabled={isSaving}
                      className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
                    >
                      {isSaving ? 'Working...' : 'Remove'}
                    </button>
                  ) : null}
                </div>
                {dataStatus.periods === 0 && (
                  <p className="mt-2 text-xs text-gray-600">
                    The seed dataset installs 8 months of historical, finalised periods plus default tolerances.
                  </p>
                )}
              </div>
            </div>

            {/* System Status - Full Width */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">System</h2>
              <SystemStatus />
            </div>

            {/* Tolerance Bands - Grid Layout */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Tolerance Bands</h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                {tolerances.map((tolerance) => (
                  <ToleranceEditor
                    key={tolerance.id}
                    tolerance={tolerance}
                    isEditing={editingMetric === tolerance.metricNumber}
                    onEdit={() => setEditingMetric(tolerance.metricNumber)}
                    onCancel={() => setEditingMetric(null)}
                    onSave={(updates) => handleSaveTolerance(tolerance.metricNumber, updates)}
                    isSaving={isSaving}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Logs */}
          <div className="lg:col-span-1">
            <LogViewer />
          </div>
        </div>
      </div>
    </div>
  );
}

function ToleranceEditor({
  tolerance,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  isSaving,
}: {
  tolerance: ToleranceBand;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (updates: Partial<ToleranceBand>) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState(tolerance);

  useEffect(() => {
    if (isEditing) {
      // Sync form state when switching into edit mode for a different tolerance band
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(tolerance);
    }
  }, [isEditing, tolerance]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isEditing) {
    return (
      <div className="border border-ngm-border rounded-lg p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm">
              M{tolerance.metricNumber} - {METRIC_NAMES[tolerance.metricNumber] ?? ''}
            </h3>
            <div className="mt-1.5 text-xs text-gray-600 space-y-0.5">
              <div className="flex gap-2">
                <span className="text-green-700 font-medium">G:</span>
                <span>{formatTolerance(tolerance.greenMin, tolerance.greenMax, tolerance.greenOperator)}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-amber-700 font-medium">A:</span>
                <span>{formatTolerance(tolerance.amberMin, tolerance.amberMax, tolerance.amberOperator)}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-red-700 font-medium">R:</span>
                <span>{formatTolerance(tolerance.redMin, tolerance.redMax, tolerance.redOperator)}</span>
              </div>
              <div className="mt-1 text-xs">
                {tolerance.isLowerBetter ? '↓' : '↑'} | Flat: {tolerance.flatTolerance}
              </div>
            </div>
          </div>
          <button
            onClick={onEdit}
            className="px-2 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-xs whitespace-nowrap"
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-ngm-border rounded-lg p-3">
      <h3 className="font-semibold text-gray-900 mb-3 text-sm">
        M{tolerance.metricNumber} - {METRIC_NAMES[tolerance.metricNumber] ?? ''}
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {/* Green Band */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-green-700">Green</label>
          <select
            value={formData.greenOperator}
            onChange={(e) => setFormData(prev => ({ ...prev, greenOperator: e.target.value }))}
            className="w-full px-2 py-1 border border-ngm-border rounded-md text-xs"
          >
            <option value=">=">&gt;=</option>
            <option value="<=">&lt;=</option>
            <option value="==">=</option>
            <option value="range">Range</option>
          </select>
          <input
            type="number"
            step="0.1"
            value={formData.greenMin ?? ''}
            onChange={(e) => setFormData(prev => ({ ...prev, greenMin: e.target.value ? parseFloat(e.target.value) : null }))}
            placeholder="Min"
            className="w-full px-2 py-1 border border-ngm-border rounded-md text-xs"
          />
          <input
            type="number"
            step="0.1"
            value={formData.greenMax ?? ''}
            onChange={(e) => setFormData(prev => ({ ...prev, greenMax: e.target.value ? parseFloat(e.target.value) : null }))}
            placeholder="Max"
            className="w-full px-2 py-1 border border-ngm-border rounded-md text-xs"
          />
        </div>

        {/* Amber Band */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-amber-700">Amber</label>
          <select
            value={formData.amberOperator}
            onChange={(e) => setFormData(prev => ({ ...prev, amberOperator: e.target.value }))}
            className="w-full px-2 py-1 border border-ngm-border rounded-md text-xs"
          >
            <option value=">=">&gt;=</option>
            <option value="<=">&lt;=</option>
            <option value="==">=</option>
            <option value="range">Range</option>
          </select>
          <input
            type="number"
            step="0.1"
            value={formData.amberMin ?? ''}
            onChange={(e) => setFormData(prev => ({ ...prev, amberMin: e.target.value ? parseFloat(e.target.value) : null }))}
            placeholder="Min"
            className="w-full px-2 py-1 border border-ngm-border rounded-md text-xs"
          />
          <input
            type="number"
            step="0.1"
            value={formData.amberMax ?? ''}
            onChange={(e) => setFormData(prev => ({ ...prev, amberMax: e.target.value ? parseFloat(e.target.value) : null }))}
            placeholder="Max"
            className="w-full px-2 py-1 border border-ngm-border rounded-md text-xs"
          />
        </div>

        {/* Red Band */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-red-700">Red</label>
          <select
            value={formData.redOperator}
            onChange={(e) => setFormData(prev => ({ ...prev, redOperator: e.target.value }))}
            className="w-full px-2 py-1 border border-ngm-border rounded-md text-xs"
          >
            <option value=">=">&gt;=</option>
            <option value="<=">&lt;=</option>
            <option value="==">=</option>
            <option value="range">Range</option>
          </select>
          <input
            type="number"
            step="0.1"
            value={formData.redMin ?? ''}
            onChange={(e) => setFormData(prev => ({ ...prev, redMin: e.target.value ? parseFloat(e.target.value) : null }))}
            placeholder="Min"
            className="w-full px-2 py-1 border border-ngm-border rounded-md text-xs"
          />
          <input
            type="number"
            step="0.1"
            value={formData.redMax ?? ''}
            onChange={(e) => setFormData(prev => ({ ...prev, redMax: e.target.value ? parseFloat(e.target.value) : null }))}
            placeholder="Max"
            className="w-full px-2 py-1 border border-ngm-border rounded-md text-xs"
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="flex items-center text-xs text-gray-700">
          <input
            type="checkbox"
            checked={formData.isLowerBetter}
            onChange={(e) => setFormData(prev => ({ ...prev, isLowerBetter: e.target.checked }))}
            className="mr-1.5"
          />
          Lower is better
        </label>
        <label className="flex items-center text-xs text-gray-700">
          Flat:
          <input
            type="number"
            step="0.1"
            value={formData.flatTolerance}
            onChange={(e) => setFormData(prev => ({ ...prev, flatTolerance: parseFloat(e.target.value) }))}
            className="ml-1 px-2 py-0.5 border border-ngm-border rounded-md text-xs w-16"
          />
        </label>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={isSaving}
          className="px-3 py-1.5 bg-ngm-cta text-white rounded-md hover:bg-ngm-cta-hover disabled:opacity-50 text-xs"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 text-xs"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function formatTolerance(min: number | null, max: number | null, operator: string): string {
  switch (operator) {
    case '>=':
      return min !== null ? `>=${min}` : '';
    case '<=':
      return max !== null ? `<=${max}` : '';
    case '==':
      return min !== null ? `=${min}` : '';
    case 'range':
      if (min !== null && max !== null) return `${min}-${max}`;
      if (min !== null) return `>=${min}`;
      if (max !== null) return `<=${max}`;
      return '';
    default:
      return '';
  }
}


