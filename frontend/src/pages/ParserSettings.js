import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Settings, 
  Activity, 
  Users, 
  Zap, 
  RefreshCw, 
  Shield,
  ShieldOff,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff,
  Download,
  Cookie,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

export default function ParserSettings() {
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [config, setConfig] = useState({
    enabled: true,
    rateLimit: 2000,
    minScore: 0.3,
    debug: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Carfast V4.0 state
  const [carfastStatus, setCarfastStatus] = useState(null);
  const [carfastSessions, setCarfastSessions] = useState([]);
  const [extensionInfo, setExtensionInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, sessionsRes, configRes, carfastStatusRes, carfastSessionsRes, extInfoRes] = await Promise.all([
        axios.get(`${API_URL}/api/v3/stats`),
        axios.get(`${API_URL}/api/v3/sessions`),
        axios.get(`${API_URL}/api/v3/config`),
        axios.get(`${API_URL}/api/carfast/session/status`).catch(() => ({ data: null })),
        axios.get(`${API_URL}/api/carfast/sessions`).catch(() => ({ data: { sessions: [] } })),
        axios.get(`${API_URL}/api/extension/info`).catch(() => ({ data: null }))
      ]);
      
      setStats(statsRes.data);
      setSessions(sessionsRes.data.sessions || []);
      setConfig(prev => ({
        ...prev,
        enabled: configRes.data.enabled,
        rateLimit: configRes.data.rateLimit,
        minScore: configRes.data.minScore,
        debug: configRes.data.debug
      }));
      setCarfastStatus(carfastStatusRes.data);
      setCarfastSessions(carfastSessionsRes.data?.sessions || []);
      setExtensionInfo(extInfoRes.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadExtension = async () => {
    setDownloading(true);
    try {
      const response = await axios.get(`${API_URL}/api/extension/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'carfast_extension_v4.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download extension');
    } finally {
      setDownloading(false);
    }
  };

  const refreshCarfastSession = async () => {
    try {
      await axios.post(`${API_URL}/api/carfast/session/refresh`);
      fetchData();
    } catch (err) {
      console.error('Failed to refresh session:', err);
    }
  };

  const clearExpiredSessions = async () => {
    try {
      await axios.post(`${API_URL}/api/carfast/session/clear-expired`);
      fetchData();
    } catch (err) {
      console.error('Failed to clear sessions:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const updateConfig = async (key, value) => {
    try {
      const newConfig = { ...config, [key]: value };
      setConfig(newConfig);
      
      await axios.post(`${API_URL}/api/v3/config`, {
        enabled: newConfig.enabled,
        rate_limit_ms: newConfig.rateLimit,
        min_score: newConfig.minScore,
        debug: newConfig.debug
      });
    } catch (err) {
      console.error('Failed to update config:', err);
    }
  };

  const disableSession = async (sessionId) => {
    try {
      await axios.post(`${API_URL}/api/v3/session/disable`, { sessionId });
      fetchData();
    } catch (err) {
      console.error('Failed to disable session:', err);
    }
  };

  const enableSession = async (sessionId) => {
    try {
      await axios.post(`${API_URL}/api/v3/session/enable`, { sessionId });
      fetchData();
    } catch (err) {
      console.error('Failed to enable session:', err);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getQualityBadge = (quality) => {
    const colors = {
      'A+': 'bg-green-500/20 text-green-400 border-green-500/30',
      'A': 'bg-green-500/20 text-green-400 border-green-500/30',
      'B': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'C': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'D': 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return colors[quality] || colors['D'];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="parser-settings">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#18181B] flex items-center gap-2">
            <Settings className="w-7 h-7 text-blue-600" />
            Parser Control Center
          </h1>
          <p className="text-[#71717A] mt-1">V3.2 Multi-Session Ingestion with Field Intelligence</p>
        </div>
        <button 
          onClick={fetchData}
          data-testid="refresh-btn"
          className="flex items-center gap-2 px-4 py-2 bg-[#18181B] hover:bg-[#27272A] rounded-lg text-[#18181B] transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E4E4E7] rounded-xl p-5 shadow-sm" data-testid="stat-sessions">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#71717A] text-sm">Active Sessions</p>
              <p className="text-3xl font-bold text-[#18181B] mt-1">
                {stats?.sessions?.active_sessions || 0}
              </p>
            </div>
            <Users className="w-10 h-10 text-blue-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white border border-[#E4E4E7] rounded-xl p-5" data-testid="stat-vins">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#71717A] text-sm">Total VINs</p>
              <p className="text-3xl font-bold text-[#18181B] mt-1">
                {stats?.sessions?.total_vins || 0}
              </p>
            </div>
            <Activity className="w-10 h-10 text-green-400 opacity-50" />
          </div>
        </div>

        <div className="bg-white border border-[#E4E4E7] rounded-xl p-5" data-testid="stat-queue">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#71717A] text-sm">Queue Size</p>
              <p className="text-3xl font-bold text-[#18181B] mt-1">
                {stats?.queue?.queue_size || 0}
              </p>
            </div>
            <Zap className="w-10 h-10 text-yellow-400 opacity-50" />
          </div>
        </div>

        <div className="bg-white border border-[#E4E4E7] rounded-xl p-5" data-testid="stat-score">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#71717A] text-sm">Avg Score</p>
              <p className="text-3xl font-bold text-[#18181B] mt-1">
                {(stats?.sessions?.avg_score || 0).toFixed(2)}
              </p>
            </div>
            <Star className="w-10 h-10 text-purple-400 opacity-50" />
          </div>
        </div>
      </div>

      {/* Config Panel */}
      <div className="bg-white border border-[#E4E4E7] rounded-xl p-6" data-testid="config-panel">
        <h2 className="text-lg font-semibold text-[#18181B] mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          Parser Configuration
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Parser Enabled */}
          <div className="space-y-2">
            <label className="text-[#71717A] text-sm">Parser Status</label>
            <button
              onClick={() => updateConfig('enabled', !config.enabled)}
              data-testid="toggle-parser"
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition ${
                config.enabled 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
              }`}
            >
              {config.enabled ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
              {config.enabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          {/* Rate Limit */}
          <div className="space-y-2">
            <label className="text-[#71717A] text-sm">Rate Limit (ms)</label>
            <input
              type="number"
              value={config.rateLimit}
              onChange={(e) => updateConfig('rateLimit', parseInt(e.target.value))}
              data-testid="input-rate-limit"
              className="w-full px-4 py-3 bg-[#F4F4F5] border border-[#E4E4E7] rounded-lg text-[#18181B] focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Min Score */}
          <div className="space-y-2">
            <label className="text-[#71717A] text-sm">Min Score</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={config.minScore}
              onChange={(e) => updateConfig('minScore', parseFloat(e.target.value))}
              data-testid="input-min-score"
              className="w-full px-4 py-3 bg-[#F4F4F5] border border-[#E4E4E7] rounded-lg text-[#18181B] focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Debug Mode */}
          <div className="space-y-2">
            <label className="text-[#71717A] text-sm">Debug Mode</label>
            <button
              onClick={() => updateConfig('debug', !config.debug)}
              data-testid="toggle-debug"
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition ${
                config.debug
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-[#F4F4F5] text-[#71717A] border border-[#E4E4E7]'
              }`}
            >
              {config.debug ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CARFAST V4.0 - Cookie Proxy Section */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6" data-testid="carfast-section">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#18181B] flex items-center gap-2">
              <Cookie className="w-6 h-6 text-blue-600" />
              Carfast V4.0 - Cookie Proxy
            </h2>
            <p className="text-[#71717A] mt-1">Server-side parsing with Cloudflare bypass</p>
          </div>
          
          {/* Download Button */}
          <button
            onClick={downloadExtension}
            disabled={downloading}
            data-testid="download-extension-btn"
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition shadow-lg shadow-blue-600/20"
          >
            <Download className="w-5 h-5" />
            {downloading ? 'Завантаження...' : 'Завантажити Extension'}
          </button>
        </div>

        {/* Session Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <span className="text-[#71717A] text-sm">Session Status</span>
              {carfastStatus?.hasSession ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <p className={`text-xl font-bold mt-1 ${carfastStatus?.hasSession ? 'text-green-600' : 'text-red-600'}`}>
              {carfastStatus?.hasSession ? 'Active' : 'No Session'}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <span className="text-[#71717A] text-sm">cf_clearance</span>
              {carfastStatus?.hasCfClearance ? (
                <Shield className="w-5 h-5 text-green-500" />
              ) : (
                <ShieldOff className="w-5 h-5 text-red-500" />
              )}
            </div>
            <p className={`text-xl font-bold mt-1 ${carfastStatus?.hasCfClearance ? 'text-green-600' : 'text-red-600'}`}>
              {carfastStatus?.hasCfClearance ? 'Present' : 'Missing'}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-blue-100">
            <span className="text-[#71717A] text-sm">Valid Sessions</span>
            <p className="text-xl font-bold text-[#18181B] mt-1">{carfastStatus?.validSessions || 0}</p>
          </div>

          <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-blue-100">
            <span className="text-[#71717A] text-sm">Total Cookies</span>
            <p className="text-xl font-bold text-[#18181B] mt-1">{carfastStatus?.cookieCount || 0}</p>
          </div>
        </div>

        {/* Warning if no session */}
        {!carfastStatus?.hasSession && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-amber-800 font-medium">Сесія Carfast не активна</p>
              <p className="text-amber-600 text-sm mt-1">
                Встановіть extension, відкрийте <a href="https://carfast.express" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">carfast.express <ExternalLink className="w-3 h-3" /></a>, 
                пройдіть Cloudflare і cookies автоматично синхронізуються.
              </p>
            </div>
          </div>
        )}

        {/* Best Session Details */}
        {carfastStatus?.bestSession && (
          <div className="bg-white/80 backdrop-blur rounded-lg p-4 mb-6 border border-green-200">
            <h3 className="text-sm font-medium text-[#71717A] mb-3">Активна сесія</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-[#71717A]">Session ID:</span>
                <p className="font-mono text-[#18181B]">{carfastStatus.bestSession.sessionId}</p>
              </div>
              <div>
                <span className="text-[#71717A]">Вік:</span>
                <p className={`font-bold ${carfastStatus.bestSession.ageMinutes > 25 ? 'text-amber-600' : 'text-green-600'}`}>
                  {carfastStatus.bestSession.ageMinutes} хв (TTL: 30 хв)
                </p>
              </div>
              <div>
                <span className="text-[#71717A]">Success/Fail:</span>
                <p className="font-bold">
                  <span className="text-green-600">{carfastStatus.bestSession.successCount}</span>
                  {' / '}
                  <span className="text-red-600">{carfastStatus.bestSession.failCount}</span>
                </p>
              </div>
              <div>
                <span className="text-[#71717A]">Статус:</span>
                <p className={`font-bold ${carfastStatus.bestSession.isExpired ? 'text-red-600' : 'text-green-600'}`}>
                  {carfastStatus.bestSession.isExpired ? 'Expired' : 'Valid'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={refreshCarfastSession}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-[#18181B] transition"
          >
            <RefreshCw className="w-4 h-4" />
            Запросити оновлення
          </button>
          <button
            onClick={clearExpiredSessions}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-[#18181B] transition"
          >
            <XCircle className="w-4 h-4" />
            Очистити протухлі
          </button>
        </div>

        {/* Carfast Sessions Table */}
        {carfastSessions.length > 0 && (
          <div className="mt-6 bg-white/80 backdrop-blur rounded-lg border border-blue-100 overflow-hidden">
            <div className="p-4 border-b border-blue-100">
              <h3 className="font-medium text-[#18181B]">Carfast Sessions ({carfastSessions.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-blue-50/50">
                  <tr>
                    <th className="text-left px-4 py-2 text-[#71717A] font-medium">Session</th>
                    <th className="text-left px-4 py-2 text-[#71717A] font-medium">cf_clearance</th>
                    <th className="text-left px-4 py-2 text-[#71717A] font-medium">Cookies</th>
                    <th className="text-left px-4 py-2 text-[#71717A] font-medium">Age</th>
                    <th className="text-left px-4 py-2 text-[#71717A] font-medium">Success/Fail</th>
                    <th className="text-left px-4 py-2 text-[#71717A] font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {carfastSessions.map((s, i) => (
                    <tr key={i} className="hover:bg-blue-50/30">
                      <td className="px-4 py-2 font-mono text-blue-600">{s.sessionId}</td>
                      <td className="px-4 py-2">
                        {s.hasCfClearance ? (
                          <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Yes</span>
                        ) : (
                          <span className="text-red-600 flex items-center gap-1"><XCircle className="w-4 h-4" /> No</span>
                        )}
                      </td>
                      <td className="px-4 py-2">{s.cookieCount}</td>
                      <td className="px-4 py-2">
                        <span className={s.ageMinutes > 25 ? 'text-amber-600' : 'text-[#18181B]'}>
                          {s.ageMinutes} хв
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-green-600">{s.successCount}</span>
                        {' / '}
                        <span className="text-red-600">{s.failCount}</span>
                      </td>
                      <td className="px-4 py-2">
                        {s.isBlocked ? (
                          <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs">Blocked</span>
                        ) : s.isExpired ? (
                          <span className="px-2 py-1 bg-amber-100 text-amber-600 rounded text-xs">Expired</span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-600 rounded text-xs">Active</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Installation Guide */}
        {extensionInfo && (
          <div className="mt-6 p-4 bg-white/60 rounded-lg border border-blue-100">
            <h3 className="font-medium text-[#18181B] mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600" />
              Інструкція встановлення
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-[#71717A]">
              {extensionInfo.installGuide?.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {/* Quality Distribution */}
      {stats?.aggregator?.quality_distribution && Object.keys(stats.aggregator.quality_distribution).length > 0 && (
        <div className="bg-white border border-[#E4E4E7] rounded-xl p-6" data-testid="quality-dist">
          <h2 className="text-lg font-semibold text-[#18181B] mb-4">Quality Distribution</h2>
          <div className="flex gap-4">
            {Object.entries(stats.aggregator.quality_distribution).map(([quality, count]) => (
              <div 
                key={quality}
                className={`px-4 py-2 rounded-lg border ${getQualityBadge(quality)}`}
              >
                <span className="font-bold">{quality}</span>
                <span className="ml-2 opacity-70">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sessions Table */}
      <div className="bg-white border border-[#E4E4E7] rounded-xl overflow-hidden" data-testid="sessions-table">
        <div className="p-6 border-b border-[#E4E4E7]">
          <h2 className="text-lg font-semibold text-[#18181B] flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Active Sessions ({sessions.length})
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F4F4F5]/50">
              <tr>
                <th className="text-left px-6 py-3 text-[#71717A] text-sm font-medium">Session</th>
                <th className="text-left px-6 py-3 text-[#71717A] text-sm font-medium">Status</th>
                <th className="text-left px-6 py-3 text-[#71717A] text-sm font-medium">Score</th>
                <th className="text-left px-6 py-3 text-[#71717A] text-sm font-medium">VINs</th>
                <th className="text-left px-6 py-3 text-[#71717A] text-sm font-medium">Success</th>
                <th className="text-left px-6 py-3 text-[#71717A] text-sm font-medium">Latency</th>
                <th className="text-left px-6 py-3 text-[#71717A] text-sm font-medium">Fields</th>
                <th className="text-left px-6 py-3 text-[#71717A] text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {sessions.map((session) => (
                <tr key={session.sessionId} className="hover:bg-[#F4F4F5]/30 transition">
                  <td className="px-6 py-4">
                    <code className="text-blue-600 bg-blue-500/10 px-2 py-1 rounded text-sm">
                      {session.shortId}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    {session.blocked ? (
                      <span className="flex items-center gap-1 text-red-400">
                        <ShieldOff className="w-4 h-4" />
                        Blocked
                      </span>
                    ) : session.active ? (
                      <span className="flex items-center gap-1 text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-zinc-500">
                        <Clock className="w-4 h-4" />
                        Idle
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-mono font-bold ${getScoreColor(session.score)}`}>
                      {session.score.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#18181B]">{session.vinCount}</td>
                  <td className="px-6 py-4">
                    <span className="text-green-400">{session.successCount}</span>
                    <span className="text-zinc-500"> / </span>
                    <span className="text-red-400">{session.failCount}</span>
                  </td>
                  <td className="px-6 py-4 text-[#71717A]">{session.avgLatency.toFixed(0)}ms</td>
                  <td className="px-6 py-4 text-[#71717A]">{(session.avgFields * 100).toFixed(0)}%</td>
                  <td className="px-6 py-4">
                    {session.blocked ? (
                      <button
                        onClick={() => enableSession(session.sessionId)}
                        className="flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition text-sm"
                      >
                        <Shield className="w-3 h-3" />
                        Enable
                      </button>
                    ) : (
                      <button
                        onClick={() => disableSession(session.sessionId)}
                        className="flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition text-sm"
                      >
                        <ShieldOff className="w-3 h-3" />
                        Block
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-zinc-500">
                    No sessions yet. Start the Chrome extension to begin parsing.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extension Installation Guide */}
      {sessions.length === 0 && (
        <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-blue-500/30 rounded-xl p-6" data-testid="extension-guide">
          <h2 className="text-lg font-semibold text-[#18181B] mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            Get Started with Chrome Extension
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-600 font-bold">1</div>
                <h3 className="text-[#18181B] font-medium">Download Extension</h3>
              </div>
              <p className="text-[#71717A] text-sm pl-11">
                Download the <code className="bg-[#F4F4F5] px-1 rounded">carfast_extension</code> folder from the project
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-600 font-bold">2</div>
                <h3 className="text-[#18181B] font-medium">Load in Chrome</h3>
              </div>
              <p className="text-[#71717A] text-sm pl-11">
                Go to <code className="bg-[#F4F4F5] px-1 rounded">chrome://extensions</code>, enable Developer Mode, and click "Load unpacked"
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-600 font-bold">3</div>
                <h3 className="text-[#18181B] font-medium">Start Parsing</h3>
              </div>
              <p className="text-[#71717A] text-sm pl-11">
                Visit <a href="https://carfast.express" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">carfast.express</a> and open any vehicle lot page
              </p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-white/50 rounded-lg">
            <h4 className="text-sm font-medium text-zinc-300 mb-2">Features V3.2</h4>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Session Tracking</span>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">Score-based Rate Limiting</span>
              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">Field Intelligence</span>
              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">Auto-blacklist</span>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-600 rounded text-xs">Remote Config</span>
              <span className="px-2 py-1 bg-pink-500/20 text-pink-400 rounded text-xs">Real-time Heartbeat</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
