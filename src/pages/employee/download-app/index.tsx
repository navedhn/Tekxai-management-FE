import React from 'react';
import { Monitor, Download, Clock, Camera, Shield, Bell, Construction } from 'lucide-react';

const WINDOWS_URL = '/downloads/TekXAI-Agent-Setup.exe';
const MAC_URL     = '/downloads/TekXAI-Agent.dmg';
const BUILDS_READY = false; // flip to true once installers are placed on the server

const features = [
  { icon: <Clock size={20} />,   title: 'One-click Clock In/Out',   desc: "Track your work hours directly from your desktop without opening a browser." },
  { icon: <Camera size={20} />,  title: 'Auto Screenshots',          desc: "Automatic screen captures every 5 minutes while you're clocked in for activity tracking." },
  { icon: <Bell size={20} />,    title: 'System Tray',               desc: "Stays in your system tray so you can clock in/out without switching apps." },
  { icon: <Shield size={20} />,  title: 'Secure & Private',          desc: "Uses your TekXAI credentials. Screenshots are stored securely in your organization's cloud." },
];

export default function DownloadApp() {
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

      {/* Coming soon banner */}
      {!BUILDS_READY && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <Construction size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 text-sm">Installer builds coming soon</p>
            <p className="text-amber-700 text-xs mt-1 leading-relaxed">
              The desktop app is ready but the installer files haven't been published yet.
              Downloads will be available here shortly.
            </p>
          </div>
        </div>
      )}

      {/* Download cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Windows */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🪟</div>
            <div>
              <div className="font-bold text-gray-900">Windows</div>
              <div className="text-xs text-gray-400">Windows 10 / 11 (64-bit)</div>
            </div>
          </div>
          {BUILDS_READY ? (
            <a
              href={WINDOWS_URL}
              className="flex items-center justify-center gap-2 h-11 rounded-xl bg-[#005CDA] text-white font-bold text-sm hover:bg-[#0047b3] transition-colors"
              download
            >
              <Download size={16} />
              Download for Windows (.exe)
            </a>
          ) : (
            <button disabled className="flex items-center justify-center gap-2 h-11 rounded-xl bg-gray-100 text-gray-400 font-bold text-sm cursor-not-allowed">
              <Download size={16} />
              Coming Soon
            </button>
          )}
        </div>

        {/* Mac */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🍎</div>
            <div>
              <div className="font-bold text-gray-900">macOS</div>
              <div className="text-xs text-gray-400">macOS 12 Monterey or later</div>
            </div>
          </div>
          {BUILDS_READY ? (
            <a
              href={MAC_URL}
              className="flex items-center justify-center gap-2 h-11 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-gray-700 transition-colors"
              download
            >
              <Download size={16} />
              Download for Mac (.dmg)
            </a>
          ) : (
            <button disabled className="flex items-center justify-center gap-2 h-11 rounded-xl bg-gray-100 text-gray-400 font-bold text-sm cursor-not-allowed">
              <Download size={16} />
              Coming Soon
            </button>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-black text-gray-900 mb-4">What's included</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f) => (
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
          <li><strong>Windows:</strong> Run the <code>.exe</code> file and follow the setup wizard.</li>
          <li><strong>Mac:</strong> Open the <code>.dmg</code>, drag TekXAI Agent to your Applications folder.</li>
          <li>Launch the app and sign in with your TekXAI credentials.</li>
          <li>Click <strong>Clock In</strong> to start tracking — the app stays in your system tray.</li>
        </ol>
      </div>
    </div>
  );
}
