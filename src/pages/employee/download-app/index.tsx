import React, { useEffect, useState } from 'react';
import { Monitor, Download, Clock, Camera, Shield, Bell, CheckCircle2, XCircle, GitCommit, Calendar, User } from 'lucide-react';
import { DOWNLOADS_ENDPOINTS } from '@/services/api/endpoints';
import { BASE_URL } from '@/lib/queryClient';

type Platform = 'windows' | 'mac' | 'linux' | 'unknown';

interface BuildMeta {
  version: string | null;
  buildDate: string | null;
  commit: string | null;
  branch: string | null;
  author: string | null;
  commitMessage: string | null;
  platforms: string[];
  windows: string | null;
  mac: string | null;
  checksums: { windows: string | null; mac: string | null };
  releaseNotes: string | null;
  minimumBackendVersion: string;
}

const COMPAT = [
  { os: 'Windows 10',        supported: true },
  { os: 'Windows 11',        supported: true },
  { os: 'macOS 12 Monterey', supported: true },
  { os: 'macOS 13+',         supported: true },
  { os: 'Linux',             supported: false, note: 'Coming Soon' },
  { os: 'iOS / Android',     supported: false, note: 'Not supported' },
];

function detectOS(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('win'))   return 'windows';
  if (ua.includes('mac'))   return 'mac';
  if (ua.includes('linux')) return 'linux';
  return 'unknown';
}

function fmt(iso: string | null) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return iso; }
}

function trackDownload(platform: string, version: string | null) {
  fetch(`${BASE_URL}${DOWNLOADS_ENDPOINTS.TRACK}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform, version }),
    credentials: 'include',
  }).catch(() => {});
}

const features = [
  { icon: <Clock size={20} />,  title: 'One-click Clock In/Out', desc: "Track your work hours directly from your desktop." },
  { icon: <Camera size={20} />, title: 'Auto Screenshots',        desc: "Captures every 5 minutes while you're clocked in." },
  { icon: <Bell size={20} />,   title: 'System Tray',             desc: "Stays in your system tray — always one click away." },
  { icon: <Shield size={20} />, title: 'Secure & Private',        desc: "Uses your TekXAI credentials. Data stored in your org's cloud." },
];

export default function DownloadApp() {
  const [os, setOs]     = useState<Platform>('unknown');
  const [meta, setMeta] = useState<BuildMeta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setOs(detectOS());
    fetch(`${BASE_URL}${DOWNLOADS_ENDPOINTS.LATEST}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.payload?.version) setMeta(d.payload); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const ready = !!meta;

  const platforms: {
    key: Platform; label: string; sub: string; emoji: string;
    url: string | null; disabled?: boolean; bg: string; hover: string; ext: string;
    checksum: string | null;
  }[] = [
    { key: 'windows', label: 'Windows', sub: 'Windows 10 / 11 (64-bit)',   emoji: '🪟', url: meta?.windows ?? null, checksum: meta?.checksums.windows ?? null, ext: '.exe',      bg: 'bg-[#005CDA]', hover: 'hover:bg-[#0047b3]' },
    { key: 'mac',     label: 'macOS',   sub: 'macOS 12 Monterey or later', emoji: '🍎', url: meta?.mac ?? null,     checksum: meta?.checksums.mac ?? null,     ext: '.dmg',      bg: 'bg-gray-900',  hover: 'hover:bg-gray-700' },
    { key: 'linux',   label: 'Linux',   sub: 'AppImage — coming soon',      emoji: '🐧', url: null,                  checksum: null,                            ext: '.AppImage', bg: 'bg-gray-400',  hover: '', disabled: true },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#005CDA] flex items-center justify-center text-white flex-shrink-0">
          <Monitor size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">TekXAI Desktop Agent</h1>
          <p className="text-gray-500 text-sm mt-0.5">Time tracking &amp; monitoring — Windows and Mac</p>
        </div>
      </div>

      {/* Build metadata strip */}
      {meta && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="font-semibold text-gray-700">v{meta.version}</span></span>
          {meta.buildDate && <span className="flex items-center gap-1"><Calendar size={11} /> {fmt(meta.buildDate)}</span>}
          {meta.commit    && <span className="flex items-center gap-1"><GitCommit size={11} /> <code className="font-mono">{meta.commit.slice(0, 7)}</code></span>}
          {meta.author    && <span className="flex items-center gap-1"><User size={11} /> {meta.author}</span>}
          {meta.branch    && <span className="flex items-center gap-1"><span className="font-mono text-[10px] bg-gray-200 rounded px-1">{meta.branch}</span></span>}
        </div>
      )}

      {/* No builds yet */}
      {!loading && !ready && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <span className="text-xl mt-0.5">🚧</span>
          <div>
            <p className="font-bold text-amber-800 text-sm">Installer builds coming soon</p>
            <p className="text-amber-700 text-xs mt-1 leading-relaxed">
              Downloads will be available here once the first CI build completes.
            </p>
          </div>
        </div>
      )}

      {/* Download cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {platforms.map(p => {
          const isRec = p.key === os;
          return (
            <div
              key={p.key}
              className={[
                'bg-white border rounded-2xl p-5 flex flex-col gap-3 shadow-sm',
                isRec ? 'border-[#005CDA] ring-2 ring-[#005CDA]/20' : 'border-gray-200',
              ].join(' ')}
            >
              <div className="flex items-start gap-2">
                <span className="text-2xl leading-none mt-0.5">{p.emoji}</span>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-gray-900 text-sm">{p.label}</span>
                    {isRec && (
                      <span className="text-[10px] font-bold bg-[#005CDA] text-white rounded-full px-2 py-0.5 leading-tight">
                        Recommended
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{p.sub}</div>
                </div>
              </div>

              {ready && !p.disabled && p.url ? (
                <>
                  <a
                    href={p.url}
                    download
                    onClick={() => trackDownload(p.key, meta?.version ?? null)}
                    className={`flex items-center justify-center gap-2 h-10 rounded-xl text-white font-bold text-sm transition-colors ${p.bg} ${p.hover}`}
                  >
                    <Download size={14} />
                    Download ({p.ext})
                  </a>
                  {p.checksum && (
                    <p className="text-[10px] text-gray-400 text-center font-mono leading-tight break-all">
                      SHA256: {p.checksum.slice(0, 16)}…
                    </p>
                  )}
                </>
              ) : (
                <button disabled className="flex items-center justify-center gap-2 h-10 rounded-xl bg-gray-100 text-gray-400 font-bold text-sm cursor-not-allowed">
                  <Download size={14} />
                  Coming Soon
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Compatibility */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-black text-gray-900 mb-4">System Requirements</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {COMPAT.map(c => (
            <div key={c.os} className="flex items-center gap-2 text-sm">
              {c.supported
                ? <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                : <XCircle     size={16} className="text-gray-300 flex-shrink-0" />}
              <span className={c.supported ? 'text-gray-800' : 'text-gray-400'}>
                {c.os}{c.note ? <span className="ml-1 text-xs text-gray-400">({c.note})</span> : null}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Release notes */}
      {meta?.commitMessage && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-black text-gray-900 mb-3">Release Notes — v{meta.version}</h2>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{meta.commitMessage}</p>
          {meta.releaseNotes && meta.releaseNotes !== meta.commitMessage && (
            <p className="mt-2 text-xs text-gray-500 whitespace-pre-wrap">{meta.releaseNotes}</p>
          )}
        </div>
      )}

      {/* Features */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-black text-gray-900 mb-4">What's included</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map(f => (
            <div key={f.title} className="flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#005CDA]/10 text-[#005CDA] flex items-center justify-center flex-shrink-0">
                {f.icon}
              </div>
              <div>
                <div className="font-bold text-sm text-gray-900">{f.title}</div>
                <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Install instructions */}
      <div className="bg-[#F0F5FF] border border-[#005CDA]/20 rounded-2xl p-6 space-y-3">
        <h2 className="text-base font-black text-gray-900">How to install</h2>
        <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
          <li>Download the installer for your operating system above.</li>
          <li><strong>Windows:</strong> Run the <code>.exe</code> and follow the setup wizard.</li>
          <li><strong>Mac:</strong> Open the <code>.dmg</code>, drag TekXAI Agent to Applications.</li>
          <li>Launch the app and sign in with your TekXAI credentials.</li>
          <li>Click <strong>Clock In</strong> to start tracking — it stays in your system tray.</li>
        </ol>
      </div>
    </div>
  );
}
