'use client';

import { useState, useEffect } from 'react';
import { ToleranceBand } from '@prisma/client';
import Link from 'next/link';

const METRIC_NAMES: Record<number, string> = {
  1: 'Critical systems security coverage',
  2: 'Security incidents resolved',
  3: 'Vulnerability remediation time',
  4: 'Security awareness training completion',
  5: 'Phishing simulation click rate',
  6: 'Security control effectiveness',
  7: 'Mean time to detect (MTTD)',
  8: 'Mean time to respond (MTTR)',
  9: 'Security policy compliance',
  10: 'Third-party security assessments',
  11: 'Security budget utilization',
};

export default function SettingsPage() {
  const [tolerances, setTolerances] = useState<ToleranceBand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingMetric, setEditingMetric] = useState<number | null>(null);
  const [dataStatus, setDataStatus] = useState<{ periods: number; drafts: number; seedPeriods: number }>({ periods: 0, drafts: 0, seedPeriods: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [tolerancesRes, dataStatusRes] = await Promise.all([
        fetch('/api/tolerances'),
        fetch('/api/admin/data'),
      ]);

      const tolerancesData = await tolerancesRes.json();
      const statusData = await dataStatusRes.json();

      setTolerances(tolerancesData);
      setDataStatus(statusData);
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
    } catch (error) {
      console.error('Error saving tolerance:', error);
      alert('Failed to save tolerance');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSeedSampleData = async () => {
    if (dataStatus.periods > 0) {
      alert('Data already exists. Delete it first if you want to re-run the sample seed.');
      return;
    }
    try {
      setIsSaving(true);
      const res = await fetch('/api/admin/data', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to seed data');
      }
      await loadData();
    } catch (error) {
      console.error('Error seeding data:', error);
      alert('Failed to seed data');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSeedData = async () => {
    if (!confirm('Remove the sample seed data? Your own periods will stay.')) {
      return;
    }
    try {
      setIsSaving(true);
      const res = await fetch('/api/admin/data', { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete seed data');
      }
      await loadData();
    } catch (error) {
      console.error('Error deleting seed data:', error);
      alert('Failed to delete seed data');
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
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="mt-2 text-gray-600">Configure tolerance bands and dashboard settings</p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="space-y-6">
          {/* Data Controls */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Data controls</h2>
                <p className="text-sm text-gray-600">Seed the sample dataset or remove it later.</p>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">
                  Periods: {dataStatus.periods}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">
                  Drafts: {dataStatus.drafts}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">
                  Seed: {dataStatus.seedPeriods}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {dataStatus.periods === 0 ? (
                <button
                  onClick={handleSeedSampleData}
                  disabled={isSaving}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isSaving ? 'Working...' : 'Install sample data'}
                </button>
              ) : dataStatus.seedPeriods > 0 ? (
                <button
                  onClick={handleDeleteSeedData}
                  disabled={isSaving}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isSaving ? 'Working...' : 'Remove sample data'}
                </button>
              ) : null}
            </div>
            {dataStatus.periods === 0 && (
              <p className="mt-2 text-xs text-gray-600">
                The sample dataset installs 8 months of historical, finalised periods plus default tolerances.
              </p>
            )}
            {dataStatus.seedPeriods > 0 && (
              <p className="mt-2 text-xs text-gray-600">
                Removing sample data keeps any periods you have created yourself.
              </p>
            )}
          </div>

          {/* Tolerance Bands */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Tolerance Bands</h2>
            <div className="space-y-6">
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
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">
              Metric {tolerance.metricNumber} - {METRIC_NAMES[tolerance.metricNumber] ?? ''}
            </h3>
            <div className="mt-2 text-sm text-gray-600">
              <div>Green: {formatTolerance(tolerance.greenMin, tolerance.greenMax, tolerance.greenOperator)}</div>
              <div>Amber: {formatTolerance(tolerance.amberMin, tolerance.amberMax, tolerance.amberOperator)}</div>
              <div>Red: {formatTolerance(tolerance.redMin, tolerance.redMax, tolerance.redOperator)}</div>
              <div className="mt-1">
                Lower is better: {tolerance.isLowerBetter ? 'Yes' : 'No'} | Flat tolerance: {tolerance.flatTolerance}
              </div>
            </div>
          </div>
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-4">
      <h3 className="font-semibold text-gray-900 mb-4">
        Metric {tolerance.metricNumber} - {METRIC_NAMES[tolerance.metricNumber] ?? ''}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Green Band */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-green-700">Green Band</label>
          <select
            value={formData.greenOperator}
            onChange={(e) => setFormData(prev => ({ ...prev, greenOperator: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value=">=">&gt;= (Greater than or equal)</option>
            <option value="<=">&lt;= (Less than or equal)</option>
            <option value="==">= (Equal)</option>
            <option value="range">Range</option>
          </select>
          <input
            type="number"
            step="0.1"
            value={formData.greenMin ?? ''}
            onChange={(e) => setFormData(prev => ({ ...prev, greenMin: e.target.value ? parseFloat(e.target.value) : null }))}
            placeholder="Min"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <input
            type="number"
            step="0.1"
            value={formData.greenMax ?? ''}
            onChange={(e) => setFormData(prev => ({ ...prev, greenMax: e.target.value ? parseFloat(e.target.value) : null }))}
            placeholder="Max"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>

        {/* Amber Band */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-amber-700">Amber Band</label>
          <select
            value={formData.amberOperator}
            onChange={(e) => setFormData(prev => ({ ...prev, amberOperator: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value=">=">&gt;= (Greater than or equal)</option>
            <option value="<=">&lt;= (Less than or equal)</option>
            <option value="==">= (Equal)</option>
            <option value="range">Range</option>
          </select>
          <input
            type="number"
            step="0.1"
            value={formData.amberMin ?? ''}
            onChange={(e) => setFormData(prev => ({ ...prev, amberMin: e.target.value ? parseFloat(e.target.value) : null }))}
            placeholder="Min"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <input
            type="number"
            step="0.1"
            value={formData.amberMax ?? ''}
            onChange={(e) => setFormData(prev => ({ ...prev, amberMax: e.target.value ? parseFloat(e.target.value) : null }))}
            placeholder="Max"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>

        {/* Red Band */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-red-700">Red Band</label>
          <select
            value={formData.redOperator}
            onChange={(e) => setFormData(prev => ({ ...prev, redOperator: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value=">=">&gt;= (Greater than or equal)</option>
            <option value="<=">&lt;= (Less than or equal)</option>
            <option value="==">= (Equal)</option>
            <option value="range">Range</option>
          </select>
          <input
            type="number"
            step="0.1"
            value={formData.redMin ?? ''}
            onChange={(e) => setFormData(prev => ({ ...prev, redMin: e.target.value ? parseFloat(e.target.value) : null }))}
            placeholder="Min"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <input
            type="number"
            step="0.1"
            value={formData.redMax ?? ''}
            onChange={(e) => setFormData(prev => ({ ...prev, redMax: e.target.value ? parseFloat(e.target.value) : null }))}
            placeholder="Max"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <input
              type="checkbox"
              checked={formData.isLowerBetter}
              onChange={(e) => setFormData(prev => ({ ...prev, isLowerBetter: e.target.checked }))}
              className="mr-2"
            />
            Lower is better (for trend calculation)
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Flat Tolerance:
            <input
              type="number"
              step="0.1"
              value={formData.flatTolerance}
              onChange={(e) => setFormData(prev => ({ ...prev, flatTolerance: parseFloat(e.target.value) }))}
              className="ml-2 px-3 py-1 border border-gray-300 rounded-md text-sm w-24"
            />
          </label>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 text-sm"
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


