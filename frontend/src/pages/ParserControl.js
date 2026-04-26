/**
 * Parser Control Center — Phase V/8/9 unified UI.
 *
 * Single page that consolidates the entire multi-source ingestion
 * architecture for the master-admin:
 *
 *   1. Top KPI strip (queue depth, online ext clients, observation
 *      cache size, drift / degraded counts).
 *   2. Architecture banner explaining the failover chain in plain
 *      Russian + English.
 *   3. WestMotors panel (Phase IV — INDEX scheduler).
 *   4. MultiSourcePanel (Phase V/8/9 — AA, EXT layer, clients,
 *      observations, AA smoke-test).
 *   5. Quick-links + Chrome extension installer card.
 *
 * Removed (per owner directive):
 *   - the legacy /api/ingestion/admin/parsers list (Copart, IAAI,
 *     bid.cars, carfast etc) which always rendered as inactive;
 *   - "Cards / Table" view-switcher and all per-source Run/Stop
 *     buttons that targeted those legacy parsers;
 *   - "BitMotors LIVE-FIRST" amber banner (now covered by the
 *     architecture banner below).
 */

import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  Database,
  Heartbeat,
  Pulse,
  Warning,
  Lightning,
  Browser,
  Plugs,
  Globe,
  ArrowSquareOut,
  ArrowClockwise,
  Clock,
  Gear,
} from '@phosphor-icons/react';
import { useAuth, API_URL } from '../App';
import WestMotorsPanel from '../components/admin/WestMotorsPanel';
import MultiSourcePanel from '../components/admin/MultiSourcePanel';

const POLL_INTERVAL = 5000;

// ── small KPI tile ──────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, accent = false, tone = 'default' }) => {
  const toneCls =
    tone === 'red'
      ? 'text-red-600'
      : tone === 'amber'
      ? 'text-amber-600'
      : tone === 'emerald'
      ? 'text-emerald-600'
      : 'text-[#18181B]';
  return (
    <div
      className="bg-white rounded-xl border border-[#E4E4E7] p-4"
      data-testid={`pc-kpi-${label}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            accent ? 'bg-[#18181B]' : 'bg-[#F4F4F5]'
          }`}
        >
          <Icon
            size={20}
            weight="duotone"
            className={accent ? 'text-white' : 'text-[#18181B]'}
          />
        </div>
        <div className="min-w-0">
          <p className={`text-2xl font-bold tracking-tight truncate ${toneCls}`}>
            {value}
          </p>
          <p className="text-[10px] text-[#71717A] uppercase tracking-wide">
            {label}
          </p>
          {sub ? (
            <p className="text-[10px] text-[#A1A1AA] truncate">{sub}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// ── architecture chain row ──────────────────────────────
const ChainStep = ({ idx, label, sub, icon: Icon, color }) => (
  <div className="flex items-start gap-3">
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${color}`}
    >
      {idx}
    </div>
    <div className="min-w-0">
      <p className="text-sm font-semibold text-[#18181B] flex items-center gap-1.5">
        {Icon ? <Icon size={14} weight="duotone" className="text-[#52525B]" /> : null}
        {label}
      </p>
      {sub ? <p className="text-[11px] text-[#71717A] mt-0.5">{sub}</p> : null}
    </div>
  </div>
);

// ── main component ──────────────────────────────────────
const ParserControl = () => {
  const { user } = useAuth();
  const isMasterAdmin = ['master_admin', 'owner'].includes(user?.role);

  const [extHealth, setExtHealth] = useState(null);
  const [extClients, setExtClients] = useState(null);
  const [wmStatus, setWmStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [h, c, w] = await Promise.allSettled([
        axios.get(`${API_URL}/api/ext/health`),
        axios.get(`${API_URL}/api/ext/clients`),
        axios.get(`${API_URL}/api/westmotors/status`),
      ]);
      if (h.status === 'fulfilled') setExtHealth(h.value.data);
      if (c.status === 'fulfilled') setExtClients(c.value.data);
      if (w.status === 'fulfilled') setWmStatus(w.value.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, POLL_INTERVAL);
    return () => clearInterval(t);
  }, [fetchAll]);

  // Aggregated KPIs
  const queueDepth = extHealth?.queue_depth ?? 0;
  const onlineClients = extHealth?.online_clients ?? 0;
  const totalClients = extClients?.total ?? 0;
  const obsVins = extHealth?.observation_cache_vins ?? 0;
  const degraded = extHealth?.degraded_sources?.length ?? 0;
  const drifting = extHealth?.drifting_sources?.length ?? 0;
  const totalSources = Object.keys(extHealth?.sources || {}).length;
  const totalCalls = Object.values(extHealth?.sources || {}).reduce(
    (s, v) => s + (v?.calls || 0),
    0,
  );
  const totalErrors = Object.values(extHealth?.sources || {}).reduce(
    (s, v) => s + (v?.errors || 0),
    0,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#18181B] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <motion.div
      data-testid="parser-control-page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1
            className="text-xl sm:text-2xl font-bold tracking-tight text-[#18181B]"
            style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}
          >
            Parser Control Center
          </h1>
          <p className="text-xs sm:text-sm text-[#71717A] mt-1">
            Multi-source resolver · {totalSources} active sources · {onlineClients}{' '}
            extension clients online · queue {queueDepth}
          </p>
        </div>
        <button
          onClick={fetchAll}
          className="self-start sm:self-auto p-2 border border-[#E4E4E7] rounded-lg hover:bg-[#F4F4F5] transition-colors"
          data-testid="pc-refresh"
          title="Refresh all"
        >
          <ArrowClockwise size={16} className="text-[#71717A]" />
        </button>
      </div>

      {/* KPI strip */}
      <div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6"
        data-testid="pc-kpi-row"
      >
        <KpiCard icon={Database} label="Sources" value={totalSources} accent />
        <KpiCard
          icon={Plugs}
          label="EXT Clients"
          value={`${onlineClients}/${totalClients || '—'}`}
          sub={onlineClients === 0 ? 'install required' : `${onlineClients} online`}
          tone={onlineClients === 0 ? 'amber' : 'emerald'}
        />
        <KpiCard icon={Pulse} label="Total Calls" value={totalCalls} />
        <KpiCard
          icon={Warning}
          label="Errors"
          value={totalErrors}
          tone={totalErrors > 0 ? 'red' : 'default'}
        />
        <KpiCard
          icon={Heartbeat}
          label="Obs Cache"
          value={obsVins}
          sub="event-driven"
        />
        <KpiCard
          icon={Lightning}
          label="Issues"
          value={`${degraded}+${drifting}`}
          sub={
            degraded || drifting
              ? `${degraded} degraded · ${drifting} drift`
              : 'all healthy'
          }
          tone={degraded || drifting ? 'amber' : 'emerald'}
        />
      </div>

      {/* Architecture banner */}
      <div
        className="bg-gradient-to-br from-[#FAFAFA] to-white rounded-xl border border-[#E4E4E7] p-5 mb-6"
        data-testid="pc-architecture-banner"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2
              className="text-sm font-bold tracking-tight text-[#18181B] mb-1"
              style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}
            >
              Resolver Chain · Phase V/8/9
            </h2>
            <p className="text-[11px] text-[#71717A]">
              Cache → BitMotors → WestMotors → Lemon → AuctionAuto → Extension
              (poctra · cfw · aah · salvagebid) → BitMotors PAGE → NOT_FOUND
            </p>
          </div>
          <span className="text-[9px] px-2 py-1 rounded-md font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
            production+
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <ChainStep
            idx={1}
            label="LIVE primary"
            sub="BitMotors search · 1.5–2.5s"
            icon={Lightning}
            color="bg-amber-100 text-amber-800"
          />
          <ChainStep
            idx={2}
            label="INDEX fallback"
            sub="WestMotors · Lemon"
            icon={Database}
            color="bg-blue-100 text-blue-800"
          />
          <ChainStep
            idx={3}
            label="HTTP fallback"
            sub="AuctionAuto httpx"
            icon={Globe}
            color="bg-emerald-100 text-emerald-800"
          />
          <ChainStep
            idx={4}
            label="EXTENSION fallback"
            sub="poctra · cfw · aah · sb · CF bypass"
            icon={Browser}
            color="bg-purple-100 text-purple-800"
          />
        </div>
      </div>

      {/* WestMotors panel — INDEX tier admin */}
      <WestMotorsPanel />

      {/* Multi-Source resolver panel */}
      <MultiSourcePanel />

      {/* Chrome extension installer */}
      <div
        className="bg-gradient-to-br from-[#18181B] to-[#27272A] rounded-xl p-6 mb-6"
        data-testid="pc-extension-card"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center flex-shrink-0">
              <Browser size={24} className="text-white" weight="duotone" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">
                BIBI Cars Parser v4.1
              </h3>
              <p className="text-xs text-white/60 mt-0.5">
                Chrome extension · multi-client registry · event-driven
                observations · CF bypass for 4 sources
              </p>
              {onlineClients === 0 && (
                <p className="text-[11px] text-amber-300 mt-1">
                  ⚠ no active client — install on at least 2 machines to remove
                  extension SPOF
                </p>
              )}
            </div>
          </div>
          <a
            href="/admin/parser/chrome-extension"
            className="px-5 py-2.5 bg-white text-[#18181B] text-sm font-medium rounded-lg hover:bg-white/90 transition-colors flex items-center gap-2 self-start sm:self-auto"
            data-testid="pc-open-extension-page"
          >
            Setup & Download
            <ArrowSquareOut size={16} />
          </a>
        </div>
      </div>

      {/* WestMotors mini KPI when daemon is available */}
      {wmStatus?.scheduler_state && (
        <div
          className="text-[11px] text-[#A1A1AA] mb-4 px-2"
          data-testid="pc-westmotors-summary"
        >
          WestMotors scheduler:{' '}
          <span className="font-mono text-[#52525B]">
            full={String(wmStatus.scheduler_state.full_loop_running)} · incremental=
            {String(wmStatus.scheduler_state.incremental_loop_running)}
          </span>
        </div>
      )}

      {/* Quick links */}
      {isMasterAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: '/admin/parser/proxies', icon: Pulse, label: 'Proxy Manager' },
            { href: '/admin/parser/logs', icon: Clock, label: 'Parser Logs' },
            { href: '/admin/parser/settings', icon: Gear, label: 'Settings' },
            { href: '/admin/vehicles', icon: Database, label: 'Vehicles DB' },
          ].map(({ href, icon: Icon, label }) => (
            <a
              key={href}
              href={href}
              className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-[#E4E4E7] hover:border-[#18181B] transition-colors group"
              data-testid={`pc-quicklink-${label}`}
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
