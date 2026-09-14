import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Input, Modal, Pagination } from '../components/ui';
import { Sparkline } from '../components/svg/Sparkline';
import { usePredictStore } from '../stores/predictStore';
import { useSettingsStore } from '../stores/settingsStore';
import { toast } from '../stores/toastStore';
import { toCsv, downloadCsv } from '../lib/csv';
import { formatMultiplier, formatDateTime } from '../lib/format';
import { ExportIcon, FilterIcon, SearchIcon, TrashIcon } from '../components/svg/icons';

const PER_PAGE = 20;

export function History() {
  const { t } = useTranslation(['history', 'common']);
  const language = useSettingsStore((s) => s.language);
  const records = usePredictStore((s) => s.records);
  const loadRecords = usePredictStore((s) => s.loadRecords);
  const remove = usePredictStore((s) => s.remove);

  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState('');
  const [multMin, setMultMin] = useState('');
  const [multMax, setMultMax] = useState('');
  const [confMin, setConfMin] = useState('');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (query && !r.session_id.toLowerCase().includes(query.toLowerCase())) return false;
      if (multMin && r.prediction < Number(multMin)) return false;
      if (multMax && r.prediction > Number(multMax)) return false;
      if (confMin && r.confidence < Number(confMin)) return false;
      return true;
    });
  }, [records, query, multMin, multMax, confMin]);

  useEffect(() => setPage(1), [query, multMin, multMax, confMin]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const from = filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const to = Math.min(page * PER_PAGE, filtered.length);

  const onExport = () => {
    const rows = filtered.map((r) => ({
      timestamp: new Date(r.created_at).toISOString(),
      session_id: r.session_id,
      prediction: r.prediction,
      expected: r.expected,
      min: r.min_value,
      max: r.max_value,
      confidence: r.confidence,
      volatility: r.volatility,
      momentum: r.momentum,
      fib_weight: r.fib_weight,
      bayes_mean: r.bayes_mean,
      model: r.model,
      runs: r.runs,
    }));
    downloadCsv(`zala-predictions-${Date.now()}.csv`, toCsv(rows));
    toast(t('common:actions.export'), 'success');
  };

  const resetFilters = () => {
    setQuery('');
    setMultMin('');
    setMultMax('');
    setConfMin('');
  };

  const confirmDelete = () => {
    if (toDelete) {
      remove(toDelete);
      toast(t('deleted'), 'info');
    }
    setToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t('history:title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('history:subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" icon={<FilterIcon size={18} />} onClick={() => setShowFilters((s) => !s)}>
            {t('common:actions.filter')}
          </Button>
          <Button icon={<ExportIcon size={18} />} onClick={onExport} disabled={filtered.length === 0}>
            {t('history:export_csv')}
          </Button>
        </div>
      </div>

      {/* Search + filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Input
              icon={<SearchIcon size={18} />}
              placeholder={t('history:search_session')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t('history:search_session')}
            />
          </div>
        </div>
        {showFilters && (
          <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-3 animate-fadeUp">
            <Input
              label={t('history:mult_min')}
              type="number"
              step="0.1"
              value={multMin}
              onChange={(e) => setMultMin(e.target.value)}
              placeholder="1.50"
            />
            <Input
              label={t('history:mult_max')}
              type="number"
              step="0.1"
              value={multMax}
              onChange={(e) => setMultMax(e.target.value)}
              placeholder="50.00"
            />
            <Input
              label={t('history:conf_min')}
              type="number"
              step="1"
              value={confMin}
              onChange={(e) => setConfMin(e.target.value)}
              placeholder="40"
            />
            <div className="sm:col-span-3">
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                {t('common:actions.reset_filters')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {records.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">{t('history:empty_all')}</p>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">{t('history:empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="sticky top-0 bg-surface2/80 backdrop-blur">
                <tr className="text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">{t('history:timestamp')}</th>
                  <th className="px-4 py-3 font-medium">{t('history:multiplier')}</th>
                  <th className="px-4 py-3 font-medium">{t('history:confidence')}</th>
                  <th className="px-4 py-3 font-medium">{t('history:min')}</th>
                  <th className="px-4 py-3 font-medium">{t('history:max')}</th>
                  <th className="px-4 py-3 font-medium">{t('history:trend')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('history:actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageRows.map((r, i) => (
                  <tr key={r.id} className={i % 2 ? 'bg-surface/30' : ''}>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {formatDateTime(r.created_at, language)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-mono font-semibold ${
                          r.prediction > 2 ? 'text-success' : 'text-text'
                        }`}
                      >
                        {formatMultiplier(r.prediction)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted">{r.confidence}%</td>
                    <td className="px-4 py-3 font-mono text-muted">{formatMultiplier(r.min_value)}</td>
                    <td className="px-4 py-3 font-mono text-muted">{formatMultiplier(r.max_value)}</td>
                    <td className="px-4 py-3">
                      <Sparkline data={[r.min_value, r.prediction, r.max_value]} width={64} height={20} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setToDelete(r.id)}
                        className="rounded-lg p-2 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                        aria-label={t('common:actions.delete')}
                      >
                        <TrashIcon size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {filtered.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-muted">
            {t('history:showing', { from, to, total: filtered.length })}
          </p>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={t('common:actions.delete')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              {t('common:actions.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              {t('common:actions.confirm')}
            </Button>
          </>
        }
      >
        {t('history:delete_confirm')}
      </Modal>
    </div>
  );
}

export default History;
