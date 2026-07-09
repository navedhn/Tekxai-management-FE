import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Monitor, CheckCircle, Package, Wrench, Filter, X, Plus, Search, RotateCcw, ClipboardList, Trash2, BarChart3, TrendingDown, AlertTriangle, Clock } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';

const STATUS_STYLE: Record<string, string> = {
  AVAILABLE:   'bg-green-100 text-green-700',
  ASSIGNED:    'bg-blue-100 text-blue-700',
  MAINTENANCE: 'bg-amber-100 text-amber-700',
  RETIRED:     'bg-gray-100 text-gray-500',
  LOST:        'bg-red-100 text-red-700',
};

const REQUEST_STATUS_STYLE: Record<string, string> = {
  PENDING:  'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const CONDITION_STYLE: Record<string, string> = {
  NEW:  'bg-green-100 text-green-700',
  GOOD: 'bg-blue-100 text-blue-700',
  FAIR: 'bg-yellow-100 text-yellow-700',
  POOR: 'bg-red-100 text-red-700',
};

const inputCls = 'w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400';
const labelCls = 'text-xs font-semibold text-gray-500 block mb-1.5';

// ─── Add Asset Modal ──────────────────────────────────────────────────────────

function CreateAssetModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { showToast } = useToastContext();

  const [categoryId, setCategoryId] = useState('');
  const [categoryMeta, setCategoryMeta] = useState<{ is_device: boolean; is_assignable: boolean } | null>(null);
  const [isOther, setIsOther] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [userId, setUserId] = useState('');

  const [form, setForm] = useState({
    name: '',
    brand: '',
    model: '',
    serial_number: '',
    condition: 'GOOD',
    purchase_date: '',
    purchase_cost: '',
    vendor: '',
    warranty_expiry: '',
    notes: '',
    processor: '',
    ram: '',
    storage: '',
    storage_type: '',
    generation: '',
    assigned_at: '',
  });

  const [err, setErr] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['asset-categories'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.ASSET.CATEGORIES),
    select: (r: any) => r?.payload || [],
  });

  const { data: users } = useQuery({
    queryKey: ['user-list-brief'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.USER.LIST}?limit=200&status=ACTIVE`),
    select: (r: any) => r?.payload?.records || [],
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: any) => apiRequest<any>(API_ENDPOINTS.ASSET.CATEGORIES, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  });

  const createAssetMutation = useMutation({
    mutationFn: (data: any) => apiRequest<any>(API_ENDPOINTS.ASSET.CREATE, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets-list'] });
      qc.invalidateQueries({ queryKey: ['asset-categories'] });
      showToast('Asset added successfully', 'success');
      onClose();
    },
    onError: (e: any) => setErr(e?.message || 'Failed to create asset'),
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleCategoryChange = (val: string) => {
    if (val === '__OTHER__') {
      setIsOther(true);
      setCategoryId('');
      setCategoryMeta(null);
    } else {
      setIsOther(false);
      setCategoryId(val);
      const found = (categories || []).find((c: any) => c.id === val);
      setCategoryMeta(found ? { is_device: found.is_device, is_assignable: found.is_assignable } : null);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setErr('Asset name is required'); return; }
    setErr('');

    let final_category_id = categoryId;

    // If "Other", create category first
    if (isOther) {
      if (!newCategoryName.trim()) { setErr('Category name is required'); return; }
      try {
        const res = await createCategoryMutation.mutateAsync({
          name: newCategoryName.trim(),
          is_device: false,
          is_assignable: false,
        });
        final_category_id = (res as any)?.payload?.id;
      } catch (e: any) {
        setErr(e?.message || 'Failed to create category');
        return;
      }
    }

    if (!final_category_id) { setErr('Please select a category'); return; }

    const payload: Record<string, any> = {
      name: form.name.trim(),
      brand: form.brand || undefined,
      model: form.model || undefined,
      serial_number: form.serial_number || undefined,
      condition: form.condition || undefined,
      purchase_date: form.purchase_date || undefined,
      purchase_cost: form.purchase_cost ? Number(form.purchase_cost) : undefined,
      notes: form.notes || undefined,
      warranty_expiry: form.warranty_expiry || undefined,
      category_id: final_category_id,
    };

    // Device fields
    if (categoryMeta?.is_device) {
      if (form.processor) payload.processor = form.processor;
      if (form.ram) payload.ram = form.ram;
      if (form.storage) payload.storage = form.storage;
      if (form.storage_type) payload.storage_type = form.storage_type;
      if (form.generation) payload.generation = form.generation;
    }

    // Assignment
    if (categoryMeta?.is_assignable && userId) {
      payload.user_id = userId;
      if (form.assigned_at) payload.assigned_at = form.assigned_at;
    }

    createAssetMutation.mutate(payload);
  };

  const isPending = createCategoryMutation.isPending || createAssetMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">Add New Asset</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          {/* Category */}
          <div>
            <label className={labelCls}>Category <span className="text-red-500">*</span></label>
            <select className={inputCls} value={isOther ? '__OTHER__' : categoryId} onChange={e => handleCategoryChange(e.target.value)}>
              <option value="">Select category</option>
              {(categories || []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value="__OTHER__">Other (create new)</option>
            </select>
          </div>

          {/* New category name if Other */}
          {isOther && (
            <div>
              <label className={labelCls}>New Category Name <span className="text-red-500">*</span></label>
              <input className={inputCls} value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="e.g. Projector" />
            </div>
          )}

          {/* Asset Name */}
          <div>
            <label className={labelCls}>Asset Name <span className="text-red-500">*</span></label>
            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. MacBook Pro 14-inch" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Brand</label>
              <input className={inputCls} value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Apple, Dell, HP…" />
            </div>
            <div>
              <label className={labelCls}>Model</label>
              <input className={inputCls} value={form.model} onChange={e => set('model', e.target.value)} placeholder="Model number or name" />
            </div>
            <div>
              <label className={labelCls}>Serial Number</label>
              <input className={inputCls} value={form.serial_number} onChange={e => set('serial_number', e.target.value)} placeholder="SN-XXXXXXX" />
            </div>
            <div>
              <label className={labelCls}>Condition</label>
              <select className={inputCls} value={form.condition} onChange={e => set('condition', e.target.value)}>
                <option value="NEW">New</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="POOR">Poor</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Purchase Date</label>
              <input className={inputCls} type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Purchase Price (PKR)</label>
              <input className={inputCls} type="number" value={form.purchase_cost} onChange={e => set('purchase_cost', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Vendor</label>
              <input className={inputCls} value={form.vendor} onChange={e => set('vendor', e.target.value)} placeholder="Supplier name" />
            </div>
            <div>
              <label className={labelCls}>Warranty Expiry</label>
              <input className={inputCls} type="date" value={form.warranty_expiry} onChange={e => set('warranty_expiry', e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <textarea rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
              value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes…" />
          </div>

          {/* Device-specific fields — show when is_device=true or undefined (old categories) */}
          {categoryMeta && categoryMeta.is_device !== false && (
            <>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Device Specifications</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Processor / CPU</label>
                    <input className={inputCls} value={form.processor} onChange={e => set('processor', e.target.value)} placeholder="e.g. Intel Core i7" />
                  </div>
                  <div>
                    <label className={labelCls}>RAM</label>
                    <input className={inputCls} value={form.ram} onChange={e => set('ram', e.target.value)} placeholder="e.g. 16GB" />
                  </div>
                  <div>
                    <label className={labelCls}>Storage</label>
                    <input className={inputCls} value={form.storage} onChange={e => set('storage', e.target.value)} placeholder="e.g. 512GB" />
                  </div>
                  <div>
                    <label className={labelCls}>Storage Type</label>
                    <select className={inputCls} value={form.storage_type} onChange={e => set('storage_type', e.target.value)}>
                      <option value="">Select type</option>
                      <option value="HDD">HDD</option>
                      <option value="SSD">SSD</option>
                      <option value="NVMe">NVMe</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Generation / Version</label>
                    <input className={inputCls} value={form.generation} onChange={e => set('generation', e.target.value)} placeholder="e.g. 13th Gen, M1 2021" />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Assignment section — show unless category explicitly marks is_assignable=false */}
          {categoryMeta && categoryMeta.is_assignable !== false && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Assignment (optional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Assign To</label>
                  <select className={inputCls} value={userId} onChange={e => setUserId(e.target.value)}>
                    <option value="">Leave unassigned (Available)</option>
                    {(users || []).map((u: any) => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                    ))}
                  </select>
                </div>
                {userId && (
                  <div>
                    <label className={labelCls}>Assignment Date</label>
                    <input className={inputCls} type="date" value={form.assigned_at} onChange={e => set('assigned_at', e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {err && <p className="text-red-500 text-xs mt-3">{err}</p>}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={!form.name || isPending}
            className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
            {isPending ? 'Saving…' : 'Add Asset'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Assign Modal ─────────────────────────────────────────────────────────────

function AssignModal({ asset, onClose }: { asset: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { showToast } = useToastContext();
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets-list'] });
      showToast('Asset assigned successfully', 'success');
      onClose();
    },
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
          <label className={labelCls}>Assign To <span className="text-red-500">*</span></label>
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

// ─── Return Modal ─────────────────────────────────────────────────────────────

function ReturnModal({ asset, onClose }: { asset: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { showToast } = useToastContext();
  const [condition, setCondition] = useState('GOOD');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.ASSET.RETURN(asset.id), {
      method: 'POST',
      body: JSON.stringify({ returned_condition: condition, notes }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets-list'] });
      showToast('Asset returned successfully', 'success');
      onClose();
    },
    onError: (e: any) => setErr(e?.message || 'Failed to return asset'),
  });

  const assignedUser = asset.assignments?.[0]?.user;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">Return Asset</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-1">Asset: <span className="font-semibold text-gray-900">{asset.name}</span></p>
        {assignedUser && (
          <p className="text-sm text-gray-500 mb-4">Returning from: <span className="font-semibold text-gray-900">{assignedUser.first_name} {assignedUser.last_name}</span></p>
        )}
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Return Condition</label>
            <select className={inputCls} value={condition} onChange={e => setCondition(e.target.value)}>
              <option value="NEW">New</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">Poor</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
              value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any remarks on return…" />
          </div>
        </div>
        {err && <p className="text-red-500 text-xs mt-3">{err}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 h-10 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 disabled:opacity-40">
            {mutation.isPending ? 'Returning…' : 'Confirm Return'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dispose Modal ────────────────────────────────────────────────────────────

function DisposeModal({ asset, onClose }: { asset: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { showToast } = useToastContext();
  const [reason, setReason] = useState('');
  const [disposalDate, setDisposalDate] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.ASSET.DISPOSALS, {
      method: 'POST',
      body: JSON.stringify({ asset_id: asset.id, reason, disposal_date: disposalDate || undefined, notes }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets-list'] });
      qc.invalidateQueries({ queryKey: ['asset-disposals'] });
      showToast('Asset disposed successfully', 'success');
      onClose();
    },
    onError: (e: any) => setErr(e?.message || 'Failed to dispose asset'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">Dispose Asset</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Disposing: <span className="font-semibold text-gray-900">{asset.name}</span></p>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Reason <span className="text-red-500">*</span></label>
            <input className={inputCls} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Beyond repair, end of life" />
          </div>
          <div>
            <label className={labelCls}>Disposal Date</label>
            <input className={inputCls} type="date" value={disposalDate} onChange={e => setDisposalDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
              value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes…" />
          </div>
        </div>
        {err && <p className="text-red-500 text-xs mt-3">{err}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={!reason.trim() || mutation.isPending}
            className="flex-1 h-10 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-40">
            {mutation.isPending ? 'Disposing…' : 'Confirm Disposal'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Asset Request Modal ───────────────────────────────────────────────

function CreateRequestModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { showToast } = useToastContext();
  const [categoryId, setCategoryId] = useState('');
  const [forUserId, setForUserId] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['asset-categories'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.ASSET.CATEGORIES),
    select: (r: any) => r?.payload || [],
  });

  const { data: users } = useQuery({
    queryKey: ['user-list-brief'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.USER.LIST}?limit=200&status=ACTIVE`),
    select: (r: any) => r?.payload?.records || [],
  });

  const mutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.ASSET.REQUESTS, {
      method: 'POST',
      body: JSON.stringify({
        asset_category_id: categoryId,
        requested_for_user_id: forUserId || undefined,
        reason: reason || undefined,
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-requests'] });
      showToast('Asset request submitted', 'success');
      onClose();
    },
    onError: (e: any) => setErr(e?.message || 'Failed to submit request'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">Request an Asset</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Category <span className="text-red-500">*</span></label>
            <select className={inputCls} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">Select category</option>
              {(categories || []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Requesting For</label>
            <select className={inputCls} value={forUserId} onChange={e => setForUserId(e.target.value)}>
              <option value="">Myself</option>
              {(users || []).map((u: any) => (
                <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Reason</label>
            <textarea rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
              value={reason} onChange={e => setReason(e.target.value)} placeholder="Why do you need this asset?" />
          </div>
        </div>
        {err && <p className="text-red-500 text-xs mt-3">{err}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={!categoryId || mutation.isPending}
            className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
            {mutation.isPending ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Approve Request Modal ─────────────────────────────────────────────────────

function ApproveRequestModal({ request, onClose }: { request: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { showToast } = useToastContext();
  const [assetId, setAssetId] = useState('');
  const [err, setErr] = useState('');

  const { data: assetsData } = useQuery({
    queryKey: ['assets-list', 'AVAILABLE', request.asset_category_id],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.ASSET.LIST}?status=AVAILABLE&category_id=${request.asset_category_id}&limit=200`),
    select: (r: any) => r?.payload?.records || [],
  });

  const mutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.ASSET.REQUEST_APPROVE(request.id), {
      method: 'POST',
      body: JSON.stringify({ asset_id: assetId }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-requests'] });
      qc.invalidateQueries({ queryKey: ['assets-list'] });
      showToast('Request approved and asset assigned', 'success');
      onClose();
    },
    onError: (e: any) => setErr(e?.message || 'Failed to approve request'),
  });

  const requester = request.requested_for || request.requester;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">Approve Request</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-1">Category: <span className="font-semibold text-gray-900">{request.category?.name}</span></p>
        <p className="text-sm text-gray-500 mb-4">For: <span className="font-semibold text-gray-900">{requester?.first_name} {requester?.last_name}</span></p>
        <div>
          <label className={labelCls}>Select Asset to Assign <span className="text-red-500">*</span></label>
          <select className={inputCls} value={assetId} onChange={e => setAssetId(e.target.value)}>
            <option value="">Select an available asset</option>
            {(assetsData || []).map((a: any) => (
              <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>
            ))}
          </select>
          {(assetsData || []).length === 0 && (
            <p className="text-xs text-amber-600 mt-1.5">No available assets in this category.</p>
          )}
        </div>
        {err && <p className="text-red-500 text-xs mt-3">{err}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={!assetId || mutation.isPending}
            className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
            {mutation.isPending ? 'Approving…' : 'Approve & Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reject Request Modal ───────────────────────────────────────────────────────

function RejectRequestModal({ request, onClose }: { request: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { showToast } = useToastContext();
  const [rejectionReason, setRejectionReason] = useState('');
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.ASSET.REQUEST_REJECT(request.id), {
      method: 'POST',
      body: JSON.stringify({ rejection_reason: rejectionReason || undefined }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-requests'] });
      showToast('Request rejected', 'success');
      onClose();
    },
    onError: (e: any) => setErr(e?.message || 'Failed to reject request'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">Reject Request</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Category: <span className="font-semibold text-gray-900">{request.category?.name}</span></p>
        <div>
          <label className={labelCls}>Rejection Reason</label>
          <textarea rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
            value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Explain why this request is rejected…" />
        </div>
        {err && <p className="text-red-500 text-xs mt-3">{err}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 h-10 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-40">
            {mutation.isPending ? 'Rejecting…' : 'Confirm Rejection'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AssetsPage() {
  const [tab, setTab] = useState<'assets' | 'requests' | 'disposals' | 'reports'>('assets');

  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [assignTarget, setAssignTarget] = useState<any>(null);
  const [returnTarget, setReturnTarget] = useState<any>(null);
  const [disposeTarget, setDisposeTarget] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [requestStatusFilter, setRequestStatusFilter] = useState('');
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [approveTarget, setApproveTarget] = useState<any>(null);
  const [rejectTarget, setRejectTarget] = useState<any>(null);

  const { data: assetsData, isLoading } = useQuery({
    queryKey: ['assets-list', categoryFilter, statusFilter, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (categoryFilter) params.set('category_id', categoryFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      return apiRequest<any>(`${API_ENDPOINTS.ASSET.LIST}?${params}`);
    },
    select: (r: any) => r?.payload,
  });

  const { data: categories } = useQuery({
    queryKey: ['asset-categories'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.ASSET.CATEGORIES),
    select: (r: any) => r?.payload || [],
  });

  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['asset-requests', requestStatusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (requestStatusFilter) params.set('status', requestStatusFilter);
      return apiRequest<any>(`${API_ENDPOINTS.ASSET.REQUESTS}?${params}`);
    },
    select: (r: any) => r?.payload,
    enabled: tab === 'requests',
  });

  const { data: disposalsData, isLoading: disposalsLoading } = useQuery({
    queryKey: ['asset-disposals'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.ASSET.DISPOSALS),
    select: (r: any) => r?.payload,
    enabled: tab === 'disposals',
  });

  const { data: depreciationData, isLoading: depreciationLoading } = useQuery({
    queryKey: ['asset-report-depreciation'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.ASSET.REPORT_DEPRECIATION),
    select: (r: any) => r?.payload,
    enabled: tab === 'reports',
  });

  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['asset-report-inventory'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.ASSET.REPORT_INVENTORY),
    select: (r: any) => r?.payload,
    enabled: tab === 'reports',
  });

  const assets: any[] = assetsData?.records || [];
  const total = assetsData?.total ?? assets.length;
  const assigned = assets.filter((a: any) => a.status === 'ASSIGNED').length;
  const available = assets.filter((a: any) => a.status === 'AVAILABLE').length;
  const maintenance = assets.filter((a: any) => a.status === 'MAINTENANCE').length;

  const requests: any[] = requestsData?.records || [];
  const disposals: any[] = disposalsData?.records || [];
  const depreciationRecords: any[] = depreciationData?.records || [];
  const inventoryByStatus: any[] = inventoryData?.by_status || [];
  const inventoryByCategory: any[] = inventoryData?.by_category || [];
  const warrantyAlerts: any[] = inventoryData?.warranty_alerts || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Assets</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track and manage company assets</p>
        </div>
        {tab === 'assets' && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
            <Plus size={16} />Add Asset
          </button>
        )}
        {tab === 'requests' && (
          <button onClick={() => setShowCreateRequest(true)}
            className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
            <Plus size={16} />New Request
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-100">
        {[
          { key: 'assets',    label: 'Assets',    icon: Package },
          { key: 'requests',  label: 'Requests',  icon: ClipboardList },
          { key: 'disposals', label: 'Disposals', icon: Trash2 },
          { key: 'reports',   label: 'Reports',   icon: BarChart3 },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
              tab === t.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-400 hover:text-gray-600'
            )}
          >
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'assets' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Package,     color: 'bg-blue-500',   label: 'Total Assets',  value: total },
              { icon: CheckCircle, color: 'bg-blue-400',   label: 'Assigned',      value: assigned },
              { icon: Monitor,     color: 'bg-green-500',  label: 'Available',     value: available },
              { icon: Wrench,      color: 'bg-amber-500',  label: 'Maintenance',   value: maintenance },
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

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-2 text-gray-400">
                <Filter size={15} />
                <span className="text-xs font-semibold">Filter:</span>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="h-10 pl-8 pr-3 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none focus:border-primary-400 w-48"
                  placeholder="Search assets…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                className="h-10 px-3 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none focus:border-primary-400">
                <option value="">All Categories</option>
                {(categories as any[] || []).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="h-10 px-3 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none focus:border-primary-400">
                <option value="">All Status</option>
                <option value="AVAILABLE">Available</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="RETIRED">Retired</option>
              </select>
              {(categoryFilter || statusFilter || search) && (
                <button onClick={() => { setCategoryFilter(''); setStatusFilter(''); setSearch(''); }}
                  className="h-10 px-3 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center gap-1">
                  <X size={12} /> Clear
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Asset', 'Category', 'Brand / Model', 'Serial No.', 'Assigned To', 'Condition', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={8} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                    ))
                  ) : assets.length === 0 ? (
                    <tr><td colSpan={8} className="py-12 text-center text-gray-400 text-sm">No assets found</td></tr>
                  ) : assets.map((asset: any) => {
                    const assignedUser = asset.assignments?.[0]?.user;
                    return (
                      <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-2">
                          <p className="font-semibold text-gray-900">{asset.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{asset.asset_tag}</p>
                        </td>
                        <td className="py-3 px-2 text-gray-500 whitespace-nowrap">{asset.category?.name || '—'}</td>
                        <td className="py-3 px-2 text-gray-600">
                          <p>{asset.brand || '—'}</p>
                          {asset.model && <p className="text-xs text-gray-400">{asset.model}</p>}
                        </td>
                        <td className="py-3 px-2 font-mono text-xs text-gray-500">{asset.serial_number || '—'}</td>
                        <td className="py-3 px-2 text-gray-700 whitespace-nowrap">
                          {assignedUser ? `${assignedUser.first_name} ${assignedUser.last_name || ''}`.trim() : '—'}
                        </td>
                        <td className="py-3 px-2">
                          {asset.condition ? (
                            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', CONDITION_STYLE[asset.condition] || 'bg-gray-100 text-gray-500')}>
                              {asset.condition}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-3 px-2">
                          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_STYLE[asset.status] || 'bg-gray-100 text-gray-500')}>
                            {asset.status || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1.5">
                            {asset.status === 'AVAILABLE' && (
                              <button onClick={() => setAssignTarget(asset)}
                                className="px-3 h-7 bg-primary-600 text-white rounded-lg text-xs font-semibold hover:bg-primary-700 transition-colors">
                                Assign
                              </button>
                            )}
                            {asset.status === 'ASSIGNED' && (
                              <button onClick={() => setReturnTarget(asset)}
                                className="flex items-center gap-1 px-3 h-7 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold hover:bg-amber-200 transition-colors">
                                <RotateCcw size={11} />Return
                              </button>
                            )}
                            {asset.status !== 'RETIRED' && (
                              <button onClick={() => setDisposeTarget(asset)}
                                className="flex items-center gap-1 px-3 h-7 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors">
                                <Trash2 size={11} />Dispose
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'requests' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2 text-gray-400">
              <Filter size={15} />
              <span className="text-xs font-semibold">Filter:</span>
            </div>
            <select value={requestStatusFilter} onChange={e => setRequestStatusFilter(e.target.value)}
              className="h-10 px-3 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none focus:border-primary-400">
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Requested For', 'Category', 'Reason', 'Requested By', 'Status', 'Reviewed By', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requestsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}><td colSpan={7} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                  ))
                ) : requests.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400 text-sm">No asset requests found</td></tr>
                ) : requests.map((req: any) => {
                  const forUser = req.requested_for || req.requester;
                  return (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-2 text-gray-700 whitespace-nowrap">
                        {forUser ? `${forUser.first_name} ${forUser.last_name || ''}`.trim() : '—'}
                      </td>
                      <td className="py-3 px-2 text-gray-500 whitespace-nowrap">{req.category?.name || '—'}</td>
                      <td className="py-3 px-2 text-gray-600 max-w-xs truncate">{req.reason || '—'}</td>
                      <td className="py-3 px-2 text-gray-500 whitespace-nowrap">
                        {req.requester ? `${req.requester.first_name} ${req.requester.last_name || ''}`.trim() : '—'}
                      </td>
                      <td className="py-3 px-2">
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', REQUEST_STATUS_STYLE[req.status] || 'bg-gray-100 text-gray-500')}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-gray-500 whitespace-nowrap">
                        {req.reviewer ? `${req.reviewer.first_name} ${req.reviewer.last_name || ''}`.trim() : '—'}
                      </td>
                      <td className="py-3 px-2">
                        {req.status === 'PENDING' && (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setApproveTarget(req)}
                              className="px-3 h-7 bg-primary-600 text-white rounded-lg text-xs font-semibold hover:bg-primary-700 transition-colors">
                              Approve
                            </button>
                            <button onClick={() => setRejectTarget(req)}
                              className="px-3 h-7 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors">
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'disposals' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Asset', 'Reason', 'Disposal Date', 'Notes'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {disposalsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}><td colSpan={4} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                  ))
                ) : disposals.length === 0 ? (
                  <tr><td colSpan={4} className="py-12 text-center text-gray-400 text-sm">No disposal records found</td></tr>
                ) : disposals.map((d: any) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2">
                      <p className="font-semibold text-gray-900">{d.asset?.name || '—'}</p>
                      <p className="text-xs text-gray-400 font-mono">{d.asset?.asset_tag}</p>
                    </td>
                    <td className="py-3 px-2 text-gray-600">{d.reason || '—'}</td>
                    <td className="py-3 px-2 text-gray-500 whitespace-nowrap">
                      {d.disposal_date ? new Date(d.disposal_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-2 text-gray-500 max-w-xs truncate">{d.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <>
          {/* Inventory summary tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Package,      color: 'bg-blue-500',   label: 'Total Value (Original)', value: depreciationData ? `PKR ${depreciationData.total_purchase_cost?.toLocaleString?.() ?? depreciationData.total_purchase_cost}` : '—' },
              { icon: TrendingDown, color: 'bg-amber-500',  label: 'Total Depreciation',      value: depreciationData ? `PKR ${depreciationData.total_depreciation?.toLocaleString?.() ?? depreciationData.total_depreciation}` : '—' },
              { icon: CheckCircle,  color: 'bg-green-500',  label: 'Current Book Value',      value: depreciationData ? `PKR ${depreciationData.total_current_value?.toLocaleString?.() ?? depreciationData.total_current_value}` : '—' },
              { icon: Clock,        color: 'bg-purple-500', label: 'Avg. Time Assigned (days)', value: inventoryData?.average_time_in_assignment_days ?? '—' },
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

          {/* Counts by status / category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Assets by Status</p>
              {inventoryLoading ? (
                <div className="h-4 bg-gray-100 rounded animate-pulse" />
              ) : inventoryByStatus.length === 0 ? (
                <p className="text-sm text-gray-400">No data</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {inventoryByStatus.map((s: any) => (
                    <span key={s.status} className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_STYLE[s.status] || 'bg-gray-100 text-gray-500')}>
                      {s.status}: {s.count}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Assets by Category</p>
              {inventoryLoading ? (
                <div className="h-4 bg-gray-100 rounded animate-pulse" />
              ) : inventoryByCategory.length === 0 ? (
                <p className="text-sm text-gray-400">No data</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {inventoryByCategory.map((c: any) => (
                    <span key={c.category_id} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                      {c.category_name}: {c.count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Warranty expiry alerts */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={15} className="text-amber-500" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Warranty Expiring Soon / Expired (within 90 days)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Asset', 'Category', 'Status', 'Warranty Expiry', 'Days Until Expiry'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {inventoryLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}><td colSpan={5} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                    ))
                  ) : warrantyAlerts.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-400 text-sm">No warranties expiring soon</td></tr>
                  ) : warrantyAlerts.map((a: any) => (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-2">
                        <p className="font-semibold text-gray-900">{a.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{a.asset_tag}</p>
                      </td>
                      <td className="py-3 px-2 text-gray-500 whitespace-nowrap">{a.category?.name || '—'}</td>
                      <td className="py-3 px-2">
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_STYLE[a.status] || 'bg-gray-100 text-gray-500')}>
                          {a.status || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-gray-500 whitespace-nowrap">
                        {a.warranty_expiry ? new Date(a.warranty_expiry).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-2">
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', a.is_expired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                          {a.is_expired ? 'Expired' : `${a.days_until_expiry}d`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Depreciation table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={15} className="text-gray-400" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Depreciation (straight-line, {depreciationData?.useful_life_months ?? 36}-month useful life)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Asset', 'Category', 'Purchase Date', 'Purchase Cost', 'Current Value', 'Depreciation to Date'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {depreciationLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={6} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                    ))
                  ) : depreciationRecords.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">No assets with purchase data found</td></tr>
                  ) : depreciationRecords.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-2">
                        <p className="font-semibold text-gray-900">{r.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{r.asset_tag}</p>
                      </td>
                      <td className="py-3 px-2 text-gray-500 whitespace-nowrap">{r.category?.name || '—'}</td>
                      <td className="py-3 px-2 text-gray-500 whitespace-nowrap">
                        {r.purchase_date ? new Date(r.purchase_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-2 text-gray-600 whitespace-nowrap">
                        {r.purchase_cost != null ? `PKR ${r.purchase_cost.toLocaleString?.() ?? r.purchase_cost}` : '—'}
                      </td>
                      <td className="py-3 px-2 text-gray-900 font-semibold whitespace-nowrap">
                        {r.current_value != null ? `PKR ${r.current_value.toLocaleString?.() ?? r.current_value}` : '—'}
                      </td>
                      <td className="py-3 px-2 text-amber-600 whitespace-nowrap">
                        {r.depreciation_to_date != null ? `PKR ${r.depreciation_to_date.toLocaleString?.() ?? r.depreciation_to_date}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showCreate && <CreateAssetModal onClose={() => setShowCreate(false)} />}
      {assignTarget && <AssignModal asset={assignTarget} onClose={() => setAssignTarget(null)} />}
      {returnTarget && <ReturnModal asset={returnTarget} onClose={() => setReturnTarget(null)} />}
      {disposeTarget && <DisposeModal asset={disposeTarget} onClose={() => setDisposeTarget(null)} />}
      {showCreateRequest && <CreateRequestModal onClose={() => setShowCreateRequest(false)} />}
      {approveTarget && <ApproveRequestModal request={approveTarget} onClose={() => setApproveTarget(null)} />}
      {rejectTarget && <RejectRequestModal request={rejectTarget} onClose={() => setRejectTarget(null)} />}
    </div>
  );
}
