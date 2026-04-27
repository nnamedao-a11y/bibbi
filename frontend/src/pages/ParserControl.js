/**
 * Parser Control Center — monitoring-grade UI.
 *
 * Architecture rendered as decision panel, not data dump:
 *   1. SystemStatusBar  (full-width red/yellow/green hero)
 *   2. ExtensionStatusCard (CRITICAL — promoted to top)
 *   3. SourcesGrid (5 unified tiles: BitMotors, WestMotors, Lemon,
 *      AuctionAuto, Extension)
 *   4. PerformancePanel (P50 / P95 / Hit / Errors / Calls)
 *   5. AlertsPanel
 *   6. DebugPanel (probe a VIN through the chain)
 *
 * Single fetch from /api/control/overview every 5 s.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ShieldCheck,
  Warning,
  WarningCircle,
  CheckCircle,
  XCircle,
  Plugs,
  PlugsConnected,
  Browser,
  Lightning,
  Database,
  Globe,
  Pulse,
  ArrowClockwise,
  ArrowSquareOut,
  CircleNotch,
  MagnifyingGlass,
  CaretRight,
} from '@phosphor-icons/react';
import { useAuth, API_URL } from '../App';

const POLL_INTERVAL = 5000;

const STATUS_PRESET = {
  ok: {
    label: 'OK',
    bg: 'bg-emerald-500',
    bgSoft: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  warn: {
    label: 'WARN',
    bg: 'bg-amber-500',
    bgSoft: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  drift: {
    label: 'DRIFT',
    bg: 'bg-amber-500',
    bgSoft: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  down: {
    label: 'DOWN',
    bg: 'bg-red-500',
    bgSoft: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
};

const TIER_ICON = {
  LIVE: Lightning,
  INDEX: Database,
  HTTP: Globe,
  EXT: Browser,
};

// ── 1. SystemStatusBar ──────────────────────────────────
const SystemStatusBar = ({ system, alerts }) => {
  const status = system?.status || 'green';
  const isRed = status === 'red';
  const isYellow = status === 'yellow';
  const cls = isRed
    ? 'from-red-600 to-red-700 border-red-700'
    : isYellow
    ? 'from-amber-500 to-amber-600 border-amber-600'
    : 'from-emerald-600 to-emerald-700 border-emerald-700';
  const Icon = isRed ? XCircle : isYellow ? Warning : ShieldCheck;
  const headline = isRed
    ? 'SYSTEM DEGRADED'
    : isYellow
    ? 'SYSTEM PARTIAL'
    : 'SYSTEM HEALTHY';
  return (
    <div
      className={`relative bg-gradient-to-r ${cls} border-l-4 rounded-xl p-5 mb-5 text-white overflow-hidden`}
      data-testid="system-status-bar"
    >
      <div className="flex items-start gap-4">
        <Icon size={36} weight="fill" className="flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p
            className="text-lg sm:text-xl font-bold tracking-tight"
            style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}
          >
            {headline}
          </p>
          <p className="text-xs sm:text-sm text-white/85 mt-1">
            {alerts && alerts.length > 0
              ? alerts.slice(0, 2).join(' · ')
              : 'All sources operational · resolver chain intact'}
            {alerts && alerts.length > 2 && (
              <span className="ml-2 opacity-75">
                +{alerts.length - 2} more
              </span>
            )}
          </p>
        </div>
        <div className="hidden sm:block text-right flex-shrink-0">
          <p className="text-[10px] uppercase tracking-wider text-white/70">
            Status
          </p>
          <p className="text-2xl font-bold">{system?.label || '—'}</p>
        </div>
      </div>
    </div>
  );
};

// ── 2. ExtensionStatusCard ──────────────────────────────
const ExtensionStatusCard = ({ extension }) => {
  const online = extension?.online || 0;
  const total = extension?.total || 0;
  const obsVins = extension?.obs_cache_vins || 0;
  const queue = extension?.queue_depth || 0;
  const inFlight = extension?.in_flight || 0;
  const isDown = online === 0;
  const isWarn = online === 1;
  const cls = isDown
    ? 'border-red-300 bg-red-50'
    : isWarn
    ? 'border-amber-300 bg-amber-50'
    : 'border-emerald-300 bg-emerald-50';
  const Icon = isDown ? XCircle : isWarn ? Warning : PlugsConnected;
  const headline = isDown
    ? 'EXTENSION NOT WORKING'
    : isWarn
    ? 'EXTENSION SPOF — install second client'
    : 'EXTENSION OK';
  const headlineCls = isDown
    ? 'text-red-800'
    : isWarn
    ? 'text-amber-800'
    : 'text-emerald-800';
  return (
    <div
      className={`border-2 rounded-xl p-5 mb-5 ${cls}`}
      data-testid="extension-status-card"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isDown ? 'bg-red-100' : isWarn ? 'bg-amber-100' : 'bg-emerald-100'
            }`}
          >
            <Icon
              size={26}
              weight="fill"
              className={
                isDown
                  ? 'text-red-600'
                  : isWarn
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }
            />
          </div>
          <div className="min-w-0">
            <p
              className={`text-base sm:text-lg font-bold tracking-tight ${headlineCls}`}
              style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}
            >
              {headline}
            </p>
            <p className="text-xs text-[#52525B] mt-0.5">
              {online} online · {total - online} offline · queue {queue} · in-flight{' '}
              {inFlight} · obs cache {obsVins} VINs
            </p>
            {isDown && (
              <p className="text-[11px] text-red-700 mt-1.5 font-medium">
                ⚠ All Cloudflare-protected sources (poctra · cfw · aah · sb) are
                disabled until at least one client registers.
              </p>
            )}
          </div>
        </div>
        <a
          href="/admin/parser/chrome-extension"
          className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 self-start sm:self-auto flex-shrink-0 transition-colors ${
            isDown
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-white text-[#18181B] border border-[#E4E4E7] hover:bg-[#FAFAFA]'
          }`}
          data-testid="ext-setup-cta"
        >
          {isDown ? 'Setup Extension' : 'Manage'}
          <ArrowSquareOut size={14} />
        </a>
      </div>
      {extension?.clients?.length > 0 && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {extension.clients.map((c) => {
            const ok = c.online && !c.unhealthy;
            const sr = c.success_rate_recent;
            const srTxt =
              sr === null || sr === undefined ? '—' : `${Math.round(sr * 100)}%`;
            return (
              <div
                key={c.client_id}
                className="flex items-center justify-between bg-white border border-[#E4E4E7] rounded-md px-3 py-2"
                data-testid={`ext-client-${c.client_id}`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-mono text-[#18181B] truncate">
                    {(c.label || c.client_id).slice(0, 24)}
                  </p>
                  <p className="text-[10px] text-[#A1A1AA]">{c.version || '—'}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-[#71717A]">{srTxt}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      !c.online
                        ? 'bg-red-500'
                        : c.unhealthy
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    title={!c.online ? 'offline' : c.unhealthy ? 'unhealthy' : 'online'}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── 3. Source row (used inside SourcesGrid) ──────────────
const SourceRow = ({ row }) => {
  const preset = STATUS_PRESET[row.status] || STATUS_PRESET.ok;
  const TierIcon = TIER_ICON[row.tier] || Plugs;
  return (
    <div
      className="bg-white rounded-xl border border-[#E4E4E7] p-4 flex flex-col sm:flex-row sm:items-center gap-4"
      data-testid={`source-row-${row.key}`}
    >
      <div className="flex items-center gap-3 sm:w-60 min-w-0">
        <div
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${preset.dot} ${
            row.status === 'down' ? 'animate-pulse' : ''
          }`}
        />
        <div className="w-9 h-9 rounded-lg bg-[#F4F4F5] flex items-center justify-center flex-shrink-0">
          <TierIcon size={16} weight="duotone" className="text-[#18181B]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#18181B] truncate">
            {row.label}
          </p>
          <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wide">
            {row.tier}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 sm:gap-6 flex-1">
        <div>
          <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wide">
            P50
          </p>
          <p className="text-sm font-bold font-mono text-[#18181B]">
            {row.latency_p50_ms ? `${row.latency_p50_ms}ms` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wide">
            Hit
          </p>
          <p className="text-sm font-bold text-emerald-600">
            {row.calls > 0 ? `${Math.round((row.hit_ratio || 0) * 100)}%` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wide">
            Calls
          </p>
          <p className="text-sm font-bold text-[#18181B]">{row.calls}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wide">
            Errors
          </p>
          <p
            className={`text-sm font-bold ${
              row.errors > 0 ? 'text-red-600' : 'text-[#18181B]'
            }`}
          >
            {row.errors}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider ${preset.bgSoft} ${preset.text} border ${preset.border}`}
        >
          {row.status === 'ok'
            ? '● OK'
            : row.status === 'down'
            ? '● DOWN'
            : row.status === 'drift'
            ? '⚠ DRIFT'
            : '● WARN'}
        </span>
        {row.circuit_open && (
          <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-red-50 text-red-700 border border-red-200">
            circuit open
          </span>
        )}
        {row.key === 'extension' && row.clients_online === 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-red-50 text-red-700 border border-red-200">
            0 clients
          </span>
        )}
      </div>
    </div>
  );
};

// ── 3. SourcesGrid ──────────────────────────────────────
const SourcesGrid = ({ sources }) => (
  <div className="mb-5" data-testid="sources-grid">
    <div className="flex items-center justify-between mb-3">
      <h2
        className="text-sm font-bold text-[#18181B] tracking-tight"
        style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}
      >
        SOURCES
      </h2>
      <p className="text-[11px] text-[#A1A1AA]">
        Resolver chain order: LIVE → INDEX → HTTP → EXT
      </p>
    </div>
    <div className="space-y-2">
      {(sources || []).map((row) => (
        <SourceRow key={row.key} row={row} />
      ))}
    </div>
  </div>
);

// ── 4. PerformancePanel ──────────────────────────────────
const PerformancePanel = ({ performance }) => {
  const tiles = [
    {
      label: 'P50 latency',
      value: performance?.p50_ms ? `${performance.p50_ms}ms` : '—',
    },
    {
      label: 'P95 latency',
      value: performance?.p95_ms ? `${performance.p95_ms}ms` : '—',
    },
    {
      label: 'Hit rate',
      value: `${Math.round((performance?.hit_rate || 0) * 100)}%`,
      tone: performance?.hit_rate >= 0.7 ? 'ok' : performance?.hit_rate >= 0.4 ? 'warn' : 'down',
    },
    {
      label: 'Error rate',
      value: `${Math.round((performance?.error_rate || 0) * 100)}%`,
      tone: performance?.error_rate <= 0.05 ? 'ok' : performance?.error_rate <= 0.2 ? 'warn' : 'down',
    },
    {
      label: 'Total calls',
      value: performance?.total_calls ?? 0,
    },
  ];
  return (
    <div className="mb-5" data-testid="performance-panel">
      <h2
        className="text-sm font-bold text-[#18181B] tracking-tight mb-3"
        style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}
      >
        PERFORMANCE
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="bg-white rounded-xl border border-[#E4E4E7] p-4"
            data-testid={`perf-${t.label}`}
          >
            <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wide mb-1">
              {t.label}
            </p>
            <p
              className={`text-2xl font-bold tracking-tight ${
                t.tone === 'down'
                  ? 'text-red-600'
                  : t.tone === 'warn'
                  ? 'text-amber-600'
                  : 'text-[#18181B]'
              }`}
            >
              {t.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── 5. AlertsPanel ───────────────────────────────────────
const AlertsPanel = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <div
        className="mb-5 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3"
        data-testid="alerts-panel-empty"
      >
        <CheckCircle size={20} weight="fill" className="text-emerald-600 flex-shrink-0" />
        <p className="text-sm text-emerald-800 font-medium">
          No active alerts — system fully healthy.
        </p>
      </div>
    );
  }
  return (
    <div className="mb-5" data-testid="alerts-panel">
      <h2
        className="text-sm font-bold text-[#18181B] tracking-tight mb-3"
        style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}
      >
        ALERTS · <span className="text-red-600">{alerts.length}</span>
      </h2>
      <div className="bg-white border border-red-200 rounded-xl divide-y divide-red-100">
        {alerts.map((a, i) => (
          <div
            key={i}
            className="px-4 py-3 flex items-start gap-3"
            data-testid={`alert-${i}`}
          >
            <WarningCircle
              size={18}
              weight="fill"
              className="text-red-500 flex-shrink-0 mt-0.5"
            />
            <p className="text-xs text-[#27272A]">{a}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── 6. DebugPanel ────────────────────────────────────────
const CHAIN_STEPS = [
  { src: 'CACHE', label: 'Cache' },
  { src: 'SEARCH', label: 'BitMotors' },
  { src: 'WESTMOTORS', label: 'WestMotors' },
  { src: 'LEMON', label: 'Lemon' },
  { src: 'AUCTIONAUTO', label: 'AuctionAuto' },
  { src: 'POCTRA', label: 'Poctra' },
  { src: 'CARSFROMWEST', label: 'CarsFromWest' },
  { src: 'AUTOAUCTIONHISTORY', label: 'AAH' },
  { src: 'SALVAGEBID', label: 'SalvageBid' },
  { src: 'PAGE', label: 'BitMotors PAGE' },
];

const DebugPanel = () => {
  const [query, setQuery] = useState('5YJSA1E25HF199047');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    if (!query) return;
    setRunning(true);
    setResult(null);
    try {
      const r = await axios.post(`${API_URL}/api/control/debug/probe`, {
        query: query.trim().toUpperCase(),
      });
      setResult(r.data);
      if (r.data?.found) toast.success(`Found via ${r.data.source}`);
      else toast.message('Not found in any source');
    } catch (e) {
      const detail = e?.response?.data?.detail || String(e);
      setResult({ error: detail });
      toast.error(detail);
    } finally {
      setRunning(false);
    }
  };

  // Mark every chain step as ❌ except the one that answered.
  const winnerSource = (result?.source || '').toUpperCase();
  const winnerKey = winnerSource.replace(/_CACHED$/, '').replace(/_/g, '');

  return (
    <div className="mb-5" data-testid="debug-panel">
      <h2
        className="text-sm font-bold text-[#18181B] tracking-tight mb-3 flex items-center gap-2"
        style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}
      >
        <MagnifyingGlass size={16} weight="duotone" />
        DEBUG · VIN / LOT PROBE
      </h2>
      <div className="bg-white border border-[#E4E4E7] rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && run()}
            placeholder="VIN (17 chars) or LOT number"
            data-testid="debug-input"
            className="flex-1 px-3 py-2 text-sm font-mono border border-[#E4E4E7] rounded-lg focus:outline-none focus:border-[#18181B]"
          />
          <button
            onClick={run}
            disabled={running}
            data-testid="debug-run"
            className="px-5 py-2 text-xs font-semibold bg-[#18181B] text-white rounded-lg hover:bg-[#27272A] transition-colors disabled:opacity-50 disabled:cursor-wait flex items-center gap-2 justify-center"
          >
            {running ? (
              <>
                <CircleNotch size={14} className="animate-spin" />
                Probing…
              </>
            ) : (
              <>
                <Lightning size={14} weight="fill" />
                RUN
              </>
            )}
          </button>
        </div>
        {result && !result.error && (
          <div data-testid="debug-result">
            <div className="flex flex-wrap items-center gap-3 mb-3 pb-3 border-b border-[#F4F4F5]">
              <div className="flex items-center gap-2">
                {result.found ? (
                  <CheckCircle size={18} weight="fill" className="text-emerald-600" />
                ) : (
                  <XCircle size={18} weight="fill" className="text-red-500" />
                )}
                <span className="text-sm font-bold text-[#18181B]">
                  {result.found ? 'FOUND' : 'NOT FOUND'}
                </span>
              </div>
              {result.found && (
                <>
                  <span className="text-xs text-[#71717A]">
                    via{' '}
                    <code className="font-mono font-semibold text-[#18181B]">
                      {result.source}
                    </code>
                  </span>
                  <span className="text-xs text-[#71717A]">
                    {result.latency_ms}ms
                  </span>
                  {result.title && (
                    <span className="text-xs text-[#52525B]">
                      — {result.title}
                    </span>
                  )}
                </>
              )}
              {!result.found && (
                <span className="text-xs text-[#71717A]">
                  walked full chain · {result.latency_ms}ms
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {CHAIN_STEPS.map((step) => {
                const matches =
                  result.found && winnerKey === step.src.replace(/_/g, '');
                const Icon = matches ? CheckCircle : XCircle;
                return (
                  <div
                    key={step.src}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs ${
                      matches
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                        : 'bg-[#FAFAFA] border-[#F4F4F5] text-[#A1A1AA]'
                    }`}
                  >
                    <Icon
                      size={12}
                      weight="fill"
                      className={matches ? 'text-emerald-600' : 'text-[#D4D4D8]'}
                    />
                    {step.label}
                  </div>
                );
              })}
            </div>
            {result.found && result.image_count > 0 && (
              <p className="text-[11px] text-[#71717A] mt-3">
                year:{' '}
                <span className="text-[#18181B] font-medium">
                  {result.year || '—'}
                </span>{' '}
                · make:{' '}
                <span className="text-[#18181B] font-medium">
                  {result.make || '—'}
                </span>{' '}
                · model:{' '}
                <span className="text-[#18181B] font-medium">
                  {result.model || '—'}
                </span>{' '}
                · images:{' '}
                <span className="text-[#18181B] font-medium">
                  {result.image_count}
                </span>
              </p>
            )}
          </div>
        )}
        {result?.error && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {result.error}
          </p>
        )}
      </div>
    </div>
  );
};

// ── ParserControl page ───────────────────────────────────
const ParserControl = () => {
  const { user } = useAuth();
  const isMasterAdmin = ['master_admin', 'owner', 'admin'].includes(user?.role);

  const [overview, setOverview] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    try {
      const r = await axios.get(`${API_URL}/api/control/overview`);
      setOverview(r.data);
      setLoadErr(null);
    } catch (e) {
      setLoadErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    const t = setInterval(fetchOverview, POLL_INTERVAL);
    return () => clearInterval(t);
  }, [fetchOverview]);

  const total = overview?.sources?.length || 0;
  const healthy = useMemo(
    () => (overview?.sources || []).filter((r) => r.status === 'ok').length,
    [overview?.sources],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <CircleNotch size={32} className="animate-spin text-[#18181B]" />
      </div>
    );
  }

  return (
    <motion.div
      data-testid="parser-control-page"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1
            className="text-xl sm:text-2xl font-bold tracking-tight text-[#18181B]"
            style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}
          >
            Parser Control Center
          </h1>
          <p className="text-xs sm:text-sm text-[#71717A] mt-1">
            {healthy}/{total} sources healthy ·{' '}
            <CaretRight size={10} className="inline mx-1 text-[#A1A1AA]" />
            polled every {POLL_INTERVAL / 1000}s
          </p>
        </div>
        <button
          onClick={fetchOverview}
          className="self-start sm:self-auto p-2 border border-[#E4E4E7] rounded-lg hover:bg-[#F4F4F5] transition-colors"
          data-testid="pc-refresh"
          title="Refresh"
        >
          <ArrowClockwise size={16} className="text-[#71717A]" />
        </button>
      </div>

      {loadErr && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          load error: {loadErr}
        </div>
      )}

      <SystemStatusBar
        system={overview?.system}
        alerts={overview?.alerts}
      />
      <ExtensionStatusCard extension={overview?.extension} />
      <SourcesGrid sources={overview?.sources} />
      <PerformancePanel performance={overview?.performance} />
      <AlertsPanel alerts={overview?.alerts} />
      <DebugPanel />

      {/* Quick links — preserved for admins */}
      {isMasterAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
          {[
            { href: '/admin/parser/proxies', icon: Pulse, label: 'Proxy Manager' },
            { href: '/admin/parser/logs', icon: ArrowClockwise, label: 'Parser Logs' },
            { href: '/admin/parser/chrome-extension', icon: Browser, label: 'Extension' },
            { href: '/admin/vehicles', icon: Database, label: 'Vehicles DB' },
          ].map(({ href, icon: Icon, label }) => (
            <a
              key={href}
              href={href}
              className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-[#E4E4E7] hover:border-[#18181B] transition-colors group"
            >
              <Icon
                size={18}
                weight="duotone"
                className="text-[#71717A] group-hover:text-[#18181B] transition-colors"
              />
              <span className="text-xs font-medium text-[#52525B] group-hover:text-[#18181B] transition-colors">
                {label}
              </span>
              <ArrowSquareOut
                size={12}
                className="text-[#D4D4D8] ml-auto"
              />
            </a>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default ParserControl;
