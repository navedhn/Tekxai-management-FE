import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Monitor, CheckCircle, Package, Wrench, Filter, X, Plus } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';

const STATUS_STYLE: Record<string, string> = {
  AVAILABLE:   'bg-green-100 text-green-700',
  ASSIGNED:    'bg-blue-100 text-blue-700',
  MAINTENANCE: 'bg-amber-100 text-amber-700',
  RETIRED:     'bg-gray-100 text-gray-500',
  LOST:        'bg-red-100 text-red-700',
};

const inputCls = 'w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400';

function CreateAssetModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '', category: '', serial_number: '', purchase_date: '',
    purchase_price: '', vendor: '', location: '', condition: 'GOOD', notes: '',
  });
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.ASSET.LIST, {
      method: 'POST',
      body: JSON.stringify({ ...form, purchase_price: form.purchase_price ? +form.purchase_price : undefined }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets-list'] }); onClose(); },
    onError: (e: any) => setErr(e?.message || 'Failed to create asset'),
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">Add New Asset</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Asset Name <span className="text-red-500">*</span></label>
            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. MacBook Pro 14-inch" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Category</label>
              <input className={inputCls} value={form.category} onChange={e => set('category', e.target.value)} placeholder="Laptop, Phone, Furniture…" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Serial Number</label>
              <input className={inputCls} value={form.serial_number} onChange={e => set('serial_number', e.target.value)} placeholder="SN-XXXXXXX" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Purchase Date</label>
              <input className={inputCls} type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Purchase Price</label>
              <input className={inputCls} type="number" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Vendor</label>
              <input className={inputCls} value={form.vendor} onChange={e => set('vendor', e.target.value)} placeholder="Apple, Dell…" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Location</label>
              <input className={inputCls} value={form.location} onChange={e => set('location', e.target.value)} placeholder="Head Office, Room 3…" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Condition</label>
              <select className={inputCls} value={form.condition} onChange={e => set('condition', e.target.value)}>
                <option value="NEW">New</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="POOR">Poor</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Notes</label>
            <textarea rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
              value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes…" />
          </div>
        </div>
        {err && <p className="text-red-500 text-xs mt-3">{err}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={!form.name || mutation.isPending}
            className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
            {mutation.isPending ? 'Saving…' : 'Add Asset'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignModal({ asset, onClose }: { asset: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState('');
  const [err, setErr] = useState('');

  const { data: users } = useQuery({
    queryKey: ['user-list-brief'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.USER.LIST}?limit=200&status=ACTIVE`),
    select: (r: any) => r?.payload?.records || [],
  });

  const mutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.ASSET.ASSIGN(asset.id), {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets-list'] }); onClose(); },
    onError: (e: any) => setErr(e?.message || 'Failed to assign'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">Assign Asset</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Assigning: <span className="font-semibold text-gray-900">{asset.name}</span></p>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1.5">Assign To <span className="text-red-500">*</span></label>
          <select className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 text-gray-700"
            value={userId} onChange={e => setUserId(e.target.value)}>
            <option value="">Select employee</option>
            {(users || []).map((u: any) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
          </select>
        </div>
        {err && <p className="text-red-500 text-xs mt-3">{err}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={!userId || mutation.isPending}
            className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
            {mutation.isPending ? 'Assigning…' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AssetsPage() {
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assignTarget, setAssignTarget] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: assetsData, isLoading } = useQuery({
    queryKey: ['assets-list', categoryFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (categoryFilter) params.set('category', categoryFilter);
      if (statusFilter) params.set('status', statusFilter);
      return apiRequest<any>(`${API_ENDPOINTS.ASSET.LIST}?${params}`);
    },
    select: (r: any) => r?.payload,
  });

  const { data: categories } = useQuery({
    queryKey: ['asset-categories'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.ASSET.CATEGORIES),
    select: (r: any) => r?.payload?.records || r?.payload || [],
  });

  const assets: any[] = assetsData?.records || [];
  const stats = assetsData?.stats || {};
  const total = assets.length;
  const assigned = assets.filter((a: any) => a.status === 'ASSIGNED').length;
  const available = assets.filter((a: any) => a.status === 'AVAILABLE').length;
  const maintenance = assets.filter((a: any) => a.status === 'MAINTENANCE').length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Assets</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track and manage company assets</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
          <Plus size={16} />Add Asset
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Package,     color: 'bg-blue-500',   label: 'Total Assets',  value: stats.total ?? total },
          { icon: CheckCircle, color: 'bg-blue-400',   label: 'Assigned',      value: stats.assigned ?? assigned },
          { icon: Monitor,     color: 'bg-green-500',  label: 'Available',     value: stats.available ?? available },
          { icon: Wrench,      color: 'bg-amber-500',  label: 'Maintenance',   value: stats.in_maintenance ?? maintenance },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', s.color)}>
              <s.icon size={22} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{s.label}</p>
              <p className="text-2xl font-black text-gray-900 leading-tight">{s.value ?? '—'}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Filter size={15} />
            <span className="text-xs font-semibold">Filter:</span>
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="h-10 px-3 border border-gray-200 rounded-xl text-sm text-gray-600">
            <option value="">All Categories</option>
            {(categories as any[] || []).map((c: any) => (
              <option key={c.id || c} value={c.name || c}>{c.name || c}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="h-10 px-3 border border-gray-200 rounded-xl text-sm text-gray-600">
            <option value="">All Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="RETIRED">Retired</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Asset', 'Category', 'Serial No.', 'Location', 'Assigned To', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : assets.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400 text-sm">No assets found</td></tr>
              ) : assets.map((asset: any) => (
                <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2 font-semibold text-gray-900">{asset.name}</td>
                  <td className="py-3 px-2 text-gray-500">{asset.category?.name || asset.category || '—'}</td>
                  <td className="py-3 px-2 font-mono text-xs text-gray-500">{asset.serial_number || '—'}</td>
                  <td className="py-3 px-2 text-gray-600">{asset.location?.name || asset.location || '—'}</td>
                  <td className="py-3 px-2 text-gray-700">
                    {asset.assigned_to ? `${asset.assigned_to.first_name} ${asset.assigned_to.last_name}` : '—'}
                  </td>
                  <td className="py-3 px-2">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_STYLE[asset.status] || 'bg-gray-100 text-gray-500')}>
                      {asset.status || '—'}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    {asset.status === 'AVAILABLE' && (
                      <button onClick={() => setAssignTarget(asset)}
                        className="px-3 h-7 bg-primary-600 text-white rounded-lg text-xs font-semibold hover:bg-primary-700 transition-colors">
                        Assign
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && <CreateAssetModal onClose={() => setShowCreate(false)} />}
      {assignTarget && <AssignModal asset={assignTarget} onClose={() => setAssignTarget(null)} />}
    </div>
  );
}
