import React, { useEffect, useState } from 'react';
import { Monitor, Download, Clock, Camera, Shield, Bell } from 'lucide-react';

const WINDOWS_URL = '/downloads/latest/TekXAI-Agent-Setup.exe';
const MAC_URL     = '/downloads/latest/TekXAI-Agent.dmg';
const LINUX_URL   = '/downloads/latest/TekXAI-Agent.AppImage';

type Platform = 'windows' | 'mac' | 'linux' | 'unknown';

interface BuildMeta {
  version: string;
  buildDate: string;
  commit: string;
  platforms: string[];
}

function detectOS(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('win'))   return 'windows';
  if (ua.includes('mac'))   return 'mac';
  if (ua.includes('linux')) return 'linux';
  return 'unknown';
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return iso; }
}

const features = [
  { icon: <Clock size={20} />,  title: 'One-click Clock In/Out', desc: "Track your work hours directly from your desktop without opening a browser." },
  { icon: <Camera size={20} />, title: 'Auto Screenshots',        desc: "Automatic screen captures every 5 minutes while you're clocked in." },
  { icon: <Bell size={20} />,   title: 'System Tray',             desc: "Stays in your system tray so you can clock in/out without switching apps." },
  { icon: <Shield size={20} />, title: 'Secure & Private',        desc: "Uses your TekXAI credentials. Screenshots stored securely in your org's cloud." },
];

export default function DownloadApp() {
  const [os, setOs]       = useState<Platform>('unknown');
  const [meta, setMeta]   = useState<BuildMeta | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setOs(detectOS());
    fetch('/downloads/latest/metadata.json')
      .then(r => r.ok ? r.json() : null)
      .then((data: BuildMeta | null) => {
        if (data?.version) { setMeta(data); setReady(true); }
      })
      .catch(() => {});
  }, []);

  const platforms: {
    key: Platform; label: string; sub: string; emoji: string;
    url: string; disabled?: boolean; bg: string; hover: string; ext: string;
  }[] = [
    { key: 'windows', label: 'Windows', sub: 'Windows 10 / 11 (64-bit)',   emoji: '🪟', url: WINDOWS_URL, ext: '.exe',      bg: 'bg-[#005CDA]', hover: 'hover:bg-[#0047b3]' },
    { key: 'mac',     label: 'macOS',   sub: 'macOS 12 Monterey or later', emoji: '🍎', url: MAC_URL,     ext: '.dmg',      bg: 'bg-gray-900',  hover: 'hover:bg-gray-700' },
    { key: 'linux',   label: 'Linux',   sub: 'AppImage (x86_64)',           emoji: '🐧', url: LINUX_URL,   ext: '.AppImage', bg: 'bg-gray-400',  hover: '', disabled: true },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#005CDA] flex items-center justify-center text-white">
          <Monitor size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">TekXAI Desktop Agent</h1>
          <p className="text-gray-500 text-sm mt-0.5">Time tracking &amp; monitoring app for Windows and Mac</p>
        </div>
      </div>

      {/* Build metadata strip */}
      {meta && (
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <span><span className="font-semibold text-gray-700">Version</span> {meta.version}</span>
          <span><span className="font-semibold text-gray-700">Released</span> {formatDate(meta.buildDate)}</span>
          <span><span className="font-semibold text-gray-700">Build</span> {meta.commit.slice(0, 7)}</span>
          <span><span className="font-semibold text-gray-700">Platforms</span> {meta.platforms.join(', ')}</span>
        </div>
      )}

      {/* No builds yet */}
      {!ready && (
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
          const isRecommended = p.key === os;
          return (
            <div
              key={p.key}
              className={[
                'bg-white border rounded-2xl p-5 flex flex-col gap-4 shadow-sm',
                isRecommended ? 'border-[#005CDA] ring-2 ring-[#005CDA]/20' : 'border-gray-200',
              ].join(' ')}
            >
              <div className="flex items-start gap-2">
                <span className="text-2xl leading-none mt-0.5">{p.emoji}</span>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-gray-900 text-sm">{p.label}</span>
                    {isRecommended && (
                      <span className="text-[10px] font-bold bg-[#005CDA] text-white rounded-full px-2 py-0.5 leading-tight">
                        Recommended
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{p.sub}</div>
                </div>
              </div>

              {ready && !p.disabled ? (
                <a
                  href={p.url}
                  download
                  className={`flex items-center justify-center gap-2 h-10 rounded-xl text-white font-bold text-sm transition-colors ${p.bg} ${p.hover}`}
                >
                  <Download size={14} />
                  Download ({p.ext})
                </a>
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
