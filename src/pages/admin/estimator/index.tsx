import React, { useState, useMemo } from 'react';
import { Calculator, RefreshCw } from 'lucide-react';

const inputCls = 'w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 text-right font-semibold';

const ROLES = [
  { key: 'frontend',  label: 'Frontend Developer', color: 'bg-blue-100 text-blue-700' },
  { key: 'backend',   label: 'Backend Developer',  color: 'bg-purple-100 text-purple-700' },
  { key: 'design',    label: 'UI/UX Designer',     color: 'bg-pink-100 text-pink-700' },
  { key: 'qa',        label: 'QA Engineer',        color: 'bg-amber-100 text-amber-700' },
  { key: 'pm',        label: 'Project Manager',    color: 'bg-green-100 text-green-700' },
  { key: 'devops',    label: 'DevOps',             color: 'bg-gray-100 text-gray-700' },
] as const;

type RoleKey = typeof ROLES[number]['key'];

const DEFAULT_RATES: Record<RoleKey, number> = {
  frontend: 25, backend: 30, design: 20, qa: 18, pm: 35, devops: 32,
};

export default function EstimatorPage() {
  const [projectName, setProjectName] = useState('');
  const [hours, setHours] = useState<Record<RoleKey, string>>({
    frontend: '', backend: '', design: '', qa: '', pm: '', devops: '',
  });
  const [rates, setRates] = useState<Record<RoleKey, string>>({
    frontend: '25', backend: '30', design: '20', qa: '18', pm: '35', devops: '32',
  });
  const [buffer, setBuffer] = useState('20');
  const [currency, setCurrency] = useState('USD');

  const breakdown = useMemo(() => {
    return ROLES.map(r => {
      const h = parseFloat(hours[r.key]) || 0;
      const rate = parseFloat(rates[r.key]) || DEFAULT_RATES[r.key];
      return { ...r, hours: h, rate, subtotal: h * rate };
    }).filter(r => r.hours > 0);
  }, [hours, rates]);

  const subtotal = breakdown.reduce((s, r) => s + r.subtotal, 0);
  const bufferAmt = subtotal * ((parseFloat(buffer) || 0) / 100);
  const total = subtotal + bufferAmt;
  const totalHours = breakdown.reduce((s, r) => s + r.hours, 0);

  const reset = () => {
    setProjectName('');
    setHours({ frontend: '', backend: '', design: '', qa: '', pm: '', devops: '' });
    setBuffer('20');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Project Estimator</h1>
          <p className="text-sm text-gray-400 mt-0.5">Calculate project costs by role and hours</p>
        </div>
        <button onClick={reset} className="flex items-center gap-2 px-4 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
          <RefreshCw size={15} />Reset
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Project Name</label>
            <input className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
              value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. E-Commerce Platform" />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Contingency Buffer %</label>
              <input type="number" min="0" max="100" className={inputCls}
                value={buffer} onChange={e => setBuffer(e.target.value)} placeholder="20" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Currency</label>
              <select className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 text-gray-700"
                value={currency} onChange={e => setCurrency(e.target.value)}>
                {['USD', 'PKR', 'GBP', 'EUR', 'AED'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-3">Hours & Hourly Rate by Role</p>
            <div className="space-y-3">
              {ROLES.map(role => (
                <div key={role.key} className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg w-[148px] flex-shrink-0 ${role.color}`}>{role.label}</span>
                  <div className="flex-1">
                    <input type="number" min="0"
                      className={inputCls}
                      value={hours[role.key]}
                      onChange={e => setHours(p => ({ ...p, [role.key]: e.target.value }))}
                      placeholder="Hours" />
                  </div>
                  <div className="w-24 flex-shrink-0">
                    <input type="number" min="0"
                      className={inputCls}
                      value={rates[role.key]}
                      onChange={e => setRates(p => ({ ...p, [role.key]: e.target.value }))}
                      placeholder="Rate" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-gray-400 w-[148px] flex-shrink-0 pl-1">Role</span>
              <span className="flex-1 text-xs text-gray-400 text-right">Hours</span>
              <span className="w-24 flex-shrink-0 text-xs text-gray-400 text-right">/hr ({currency})</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-black text-gray-800 mb-4">Cost Breakdown</h2>
            {breakdown.length === 0 ? (
              <div className="py-8 text-center">
                <Calculator size={28} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-300">Enter hours to see breakdown</p>
              </div>
            ) : (
              <div className="space-y-3">
                {breakdown.map(r => (
                  <div key={r.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${r.color}`}>{r.label}</span>
                      <span className="text-xs text-gray-400">{r.hours}h × {currency} {r.rate}</span>
                    </div>
                    <span className="font-black text-gray-900">{currency} {r.subtotal.toLocaleString()}</span>
                  </div>
                ))}

                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Total Hours</span>
                    <span className="font-semibold text-gray-900">{totalHours}h</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-semibold text-gray-900">{currency} {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Buffer ({buffer}%)</span>
                    <span className="font-semibold text-amber-600">+ {currency} {bufferAmt.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-primary-50 rounded-xl p-4 flex items-center justify-between mt-2">
                  <div>
                    <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide">Total Estimate</p>
                    {projectName && <p className="text-xs text-primary-500 mt-0.5">{projectName}</p>}
                  </div>
                  <p className="text-2xl font-black text-primary-700">{currency} {Math.round(total).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
