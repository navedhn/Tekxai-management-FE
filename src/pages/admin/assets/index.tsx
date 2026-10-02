import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Monitor, CheckCircle, Package, Wrench, Filter, X, Plus, Search, RotateCcw, ClipboardList, Trash2, BarChart3, TrendingDown, AlertTriangle, Clock, Boxes, UserCheck2, Layers3, Repeat, Inbox, History, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useGetDepartmentsQuery } from '@/services/departmentService';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import StatusBadge from '@/components/ui/StatusBadge';
import Button, { IconButton, PageActionButton } from '@/components/ui/Button';
import { useMyPermissions } from '@/services/permissionsService';
import {
  downloadAssetExport,
  downloadAssetImportTemplate,
  previewAssetImport,
  commitAssetImport,
  downloadAssetImportErrorReport,
  downloadRelatedAssetExport,
  type AssetImportPreview,
  type AssetImportCommitResult,
  type RelatedAssetExportKind,
} from '@/services/assetImportExportService';

const v1 = 'api/v1';
const BUILDER = `${v1}/report/builder`;

const ASSET_DIMENSIONS = [
  { key: 'brand', label: 'By Brand', group_by: 'brand' },
  { key: 'department', label: 'By Department', group_by: 'department_id' },
  { key: 'office', label: 'By Office', group_by: 'location_id' },
];

const ASSET_DETAIL_REPORTS = [
  { key: 'ASSIGNED', label: 'Assigned Assets', icon: UserCheck2 },
  { key: 'AVAILABLE', label: 'Available Assets', icon: CheckCircle },
  { key: 'RETIRED', label: 'Retired Assets', icon: Trash2 },
  { key: 'MAINTENANCE', label: 'Under Repair', icon: Wrench },
];

const CONDITION_STYLE: Record<string, string> = {
  NEW:  'bg-green-100 text-green-700',
  GOOD: 'bg-blue-100 text-blue-700',
  FAIR: 'bg-yellow-100 text-yellow-700',
  POOR: 'bg-red-100 text-red-700',
};

const inputCls = 'w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400';
const labelCls = 'text-xs font-semibold text-gray-500 block mb-1.5';

function CreateAssetModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { success: showSuccessToast } = useToastContext();

  const [categoryId, setCategoryId] = useState('');
  const [categoryMeta, setCategoryMeta] = useState<{ is_device: boolean; is_assignable: boolean } | null>(null);
  const [isOther, setIsOther] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIsDevice, setNewCategoryIsDevice] = useState(false);
  const [newCategoryIsAssignable, setNewCategoryIsAssignable] = useState(true);
  const [userId, setUserId] = useState('');
  const [locationId, setLocationId] = useState('');

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
    select: (r: any) => [...(r?.payload?.records || [])].sort((a: any, b: any) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)),
  });

  const { data: locations } = useQuery({
    queryKey: ['asset-locations'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.ASSET.LOCATIONS),
    select: (r: any) => r?.payload || [],
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
      showSuccessToast('Asset added successfully');
      onClose();
    },
    onError: (e: any) => setErr(e?.message || 'Failed to create asset'),
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const effectiveMeta = isOther ? { is_device: newCategoryIsDevice, is_assignable: newCategoryIsAssignable } : categoryMeta;

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

    if (isOther) {
      if (!newCategoryName.trim()) { setErr('Category name is required'); return; }
      try {
        const res = await createCategoryMutation.mutateAsync({
          name: newCategoryName.trim(),
          is_device: newCategoryIsDevice,
          is_assignable: newCategoryIsAssignable,
        });
        final_category_id = (res as any)?.payload?.id;
      } catch (e: any) {
        setErr(e?.message || 'Failed to create category');
        return;
      }
    }

    if (!final_category_id) { setErr('Please select a category'); return; }
    if (!locationId) { setErr('Please select a location'); return; }

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
      location_id: locationId,
    };

    if (effectiveMeta?.is_device) {
      if (form.processor) payload.processor = form.processor;
      if (form.ram) payload.ram = form.ram;
      if (form.storage) payload.storage = form.storage;
      if (form.storage_type) payload.storage_type = form.storage_type;
      if (form.generation) payload.generation = form.generation;
    }

    if (effectiveMeta?.is_assignable && userId) {
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
          <IconButton icon={X} variant="ghost" size="sm" aria-label="Close" onClick={onClose} className="!h-auto !w-auto p-1.5 text-gray-400" />
        </div>

        <div className="space-y-4">

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

          {isOther && (
            <div className="flex flex-col gap-2">
              <label className={labelCls}>New Category Name <span className="text-red-500">*</span></label>
              <input className={inputCls} value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="e.g. Projector" />
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-600 mt-1">
                <input type="checkbox" className="w-4 h-4 rounded accent-primary-600" checked={newCategoryIsAssignable} onChange={e => setNewCategoryIsAssignable(e.target.checked)} />
                Assignable to employees
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                <input type="checkbox" className="w-4 h-4 rounded accent-primary-600" checked={newCategoryIsDevice} onChange={e => setNewCategoryIsDevice(e.target.checked)} />
                This is a device (laptop, phone, etc.)
              </label>
            </div>
          )}

          <div>
            <label className={labelCls}>Asset Name <span className="text-red-500">*</span></label>
            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. MacBook Pro 14-inch" />
          </div>

          <div>
            <label className={labelCls}>Location <span className="text-red-500">*</span></label>
            <select className={inputCls} value={locationId} onChange={e => setLocationId(e.target.value)}>
              <option value="">Select location</option>
              {(locations || []).map((l: any) => (
                <option key={l.id} value={l.id}>{[l.office, l.floor, l.room].filter(Boolean).join(' — ')}</option>
              ))}
            </select>
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

          {effectiveMeta && effectiveMeta.is_device !== false && (
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

          {effectiveMeta && effectiveMeta.is_assignable !== false && (
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
          <Button variant="outline" size="sm" animation="none" fullWidth onClick={onClose} className="!h-10 flex-1">Cancel</Button>
          <Button variant="primary" size="sm" fullWidth onClick={handleSubmit} disabled={!form.name || !locationId} loading={isPending} className="!h-10 flex-1">
            Add Asset
          </Button>
        </div>
      </div>
    </div>
  );
}

function parse_accessories(text: string): string[] | undefined {
  const items = text.split(',').map(s => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

async function upload_custody_attachment(assetId: string, eventId: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  return apiRequest<any>(API_ENDPOINTS.ASSET.CUSTODY_EVENT_ATTACHMENTS(assetId, eventId), { method: 'POST', body: form as any });
}

function AttachmentPicker({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }) {
  return (
    <div>
      <label className={labelCls}>Attachment / Photo (optional)</label>
      <input type="file" accept="image/*,.pdf"
        onChange={e => onChange(e.target.files?.[0] || null)}
        className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700" />
      {file && <p className="text-xs text-gray-400 mt-1">{file.name}</p>}
    </div>
  );
}

function AssignModal({ asset, onClose }: { asset: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { success: showSuccessToast } = useToastContext();
  const [userId, setUserId] = useState('');
  const [condition, setCondition] = useState('GOOD');
  const [accessories, setAccessories] = useState('');
  const [remarks, setRemarks] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState('');

  const { data: users } = useQuery({
    queryKey: ['user-list-brief'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.USER.LIST}?limit=200&status=ACTIVE`),
    select: (r: any) => [...(r?.payload?.records || [])].sort((a: any, b: any) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)),
  });

  const mutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.ASSET.ASSIGN(asset.id), {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        condition_at_handover: condition,
        accessories_issued: parse_accessories(accessories),
        notes: remarks || undefined,

        acknowledged_by: acknowledged ? userId : undefined,
        acknowledged_at: acknowledged ? new Date().toISOString() : undefined,
      }),
    }),
    onSuccess: async (res: any) => {
      const eventId = res?.payload?.custody_event?.id;
      if (file && eventId) await upload_custody_attachment(asset.id, eventId, file).catch(() => {});
      qc.invalidateQueries({ queryKey: ['assets-list'] });
      showSuccessToast('Asset handed over successfully');
      onClose();
    },
    onError: (e: any) => setErr(e?.message || 'Failed to assign'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">Asset Handover</h2>
          <IconButton icon={X} variant="ghost" size="sm" aria-label="Close" onClick={onClose} className="!h-auto !w-auto p-1.5 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 mb-4">Handing over: <span className="font-semibold text-gray-900">{asset.name}</span></p>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Recipient (Employee) <span className="text-red-500">*</span></label>
            <select className={inputCls} value={userId} onChange={e => setUserId(e.target.value)}>
              <option value="">Select employee</option>
              {(users || []).map((u: any) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Condition at Handover</label>
            <select className={inputCls} value={condition} onChange={e => setCondition(e.target.value)}>
              <option value="NEW">New</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">Poor</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Accessories Issued</label>
            <input className={inputCls} value={accessories} onChange={e => setAccessories(e.target.value)} placeholder="Charger, bag, mouse…" />
          </div>
          <div>
            <label className={labelCls}>Remarks</label>
            <textarea rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
              value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any notes on this handover…" />
          </div>
          <AttachmentPicker file={file} onChange={setFile} />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} className="rounded" />
            Recipient acknowledges receipt of this asset
          </label>
        </div>
        {err && <p className="text-red-500 text-xs mt-3">{err}</p>}
        <div className="flex gap-3 mt-5">
          <Button variant="outline" size="sm" animation="none" fullWidth onClick={onClose} className="!h-10 flex-1">Cancel</Button>
          <Button variant="primary" size="sm" fullWidth onClick={() => mutation.mutate()} disabled={!userId} loading={mutation.isPending} className="!h-10 flex-1">
            Confirm Handover
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReturnModal({ asset, onClose }: { asset: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { success: showSuccessToast } = useToastContext();
  const [condition, setCondition] = useState('GOOD');
  const [notes, setNotes] = useState('');
  const [accessoriesReturned, setAccessoriesReturned] = useState('');
  const [missingItems, setMissingItems] = useState('');
  const [dispositionStatus, setDispositionStatus] = useState('AVAILABLE');
  const [acknowledged, setAcknowledged] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState('');

  const assignedUser = asset.assignments?.[0]?.user;

  const mutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.ASSET.RETURN(asset.id), {
      method: 'POST',
      body: JSON.stringify({
        returned_condition: condition,
        notes,
        accessories_returned: parse_accessories(accessoriesReturned),
        missing_items: missingItems || undefined,
        disposition_status: dispositionStatus,
        acknowledged_by: acknowledged && assignedUser ? assignedUser.id : undefined,
        acknowledged_at: acknowledged ? new Date().toISOString() : undefined,
      }),
    }),
    onSuccess: async (res: any) => {
      const eventId = res?.payload?.id;
      if (file && eventId) await upload_custody_attachment(asset.id, eventId, file).catch(() => {});
      qc.invalidateQueries({ queryKey: ['assets-list'] });
      showSuccessToast('Asset returned successfully');
      onClose();
    },
    onError: (e: any) => setErr(e?.message || 'Failed to return asset'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">Asset Return</h2>
          <IconButton icon={X} variant="ghost" size="sm" aria-label="Close" onClick={onClose} className="!h-auto !w-auto p-1.5 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 mb-1">Asset: <span className="font-semibold text-gray-900">{asset.name}</span></p>
        {assignedUser && (
          <p className="text-sm text-gray-500 mb-4">Returning from: <span className="font-semibold text-gray-900">{assignedUser.first_name} {assignedUser.last_name}</span></p>
        )}
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Condition at Return</label>
            <select className={inputCls} value={condition} onChange={e => setCondition(e.target.value)}>
              <option value="NEW">New</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">Poor</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Asset Status After Return</label>
            <select className={inputCls} value={dispositionStatus} onChange={e => setDispositionStatus(e.target.value)}>
              <option value="AVAILABLE">Available</option>
              <option value="UNDER_REPAIR">Under Repair</option>
              <option value="RETIRED">Retired</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Accessories Returned</label>
            <input className={inputCls} value={accessoriesReturned} onChange={e => setAccessoriesReturned(e.target.value)} placeholder="Charger, bag, mouse…" />
          </div>
          <div>
            <label className={labelCls}>Missing Items</label>
            <input className={inputCls} value={missingItems} onChange={e => setMissingItems(e.target.value)} placeholder="e.g. Charger not returned" />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
              value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any remarks on return…" />
          </div>
          <AttachmentPicker file={file} onChange={setFile} />
          {assignedUser && (
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} className="rounded" />
              Employee confirmed this return in person
            </label>
          )}
        </div>
        {err && <p className="text-red-500 text-xs mt-3">{err}</p>}
        <div className="flex gap-3 mt-5">
          <Button variant="outline" size="sm" animation="none" fullWidth onClick={onClose} className="!h-10 flex-1">Cancel</Button>
          <Button variant="primary" size="sm" fullWidth onClick={() => mutation.mutate()} loading={mutation.isPending} className="!h-10 flex-1 !bg-amber-600 hover:!bg-amber-700">
            Confirm Return
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReceiveModal({ asset, onClose }: { asset: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { success: showSuccessToast } = useToastContext();
  const [fromUserId, setFromUserId] = useState('');
  const [condition, setCondition] = useState('GOOD');
  const [accessoriesReturned, setAccessoriesReturned] = useState('');
  const [missingItems, setMissingItems] = useState('');
  const [remarks, setRemarks] = useState('');
  const [dispositionStatus, setDispositionStatus] = useState('AVAILABLE');
  const [err, setErr] = useState('');

  const { data: users } = useQuery({
    queryKey: ['user-list-brief'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.USER.LIST}?limit=200&status=ACTIVE`),
    select: (r: any) => [...(r?.payload?.records || [])].sort((a: any, b: any) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)),
  });

  const mutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.ASSET.RECEIVE(asset.id), {
      method: 'POST',
      body: JSON.stringify({
        from_user_id: fromUserId || undefined,
        condition,
        accessories_returned: parse_accessories(accessoriesReturned),
        missing_items: missingItems || undefined,
        remarks: remarks || undefined,
        disposition_status: dispositionStatus,
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets-list'] });
      showSuccessToast('Asset receipt recorded');
      onClose();
    },
    onError: (e: any) => setErr(e?.message || 'Failed to record receipt'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">Receive Asset (No Prior Assignment)</h2>
          <IconButton icon={X} variant="ghost" size="sm" aria-label="Close" onClick={onClose} className="!h-auto !w-auto p-1.5 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 mb-4">
          For an asset an employee or another department is handing to IT that wasn't previously tracked as assigned.
        </p>
        <p className="text-sm text-gray-500 mb-4">Asset: <span className="font-semibold text-gray-900">{asset.name}</span></p>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Received From (optional)</label>
            <select className={inputCls} value={fromUserId} onChange={e => setFromUserId(e.target.value)}>
              <option value="">Unspecified / department</option>
              {(users || []).map((u: any) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Condition</label>
            <select className={inputCls} value={condition} onChange={e => setCondition(e.target.value)}>
              <option value="NEW">New</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">Poor</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Asset Status</label>
            <select className={inputCls} value={dispositionStatus} onChange={e => setDispositionStatus(e.target.value)}>
              <option value="AVAILABLE">Available</option>
              <option value="UNDER_REPAIR">Under Repair</option>
              <option value="RETIRED">Retired</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Accessories Returned</label>
            <input className={inputCls} value={accessoriesReturned} onChange={e => setAccessoriesReturned(e.target.value)} placeholder="Charger, bag…" />
          </div>
          <div>
            <label className={labelCls}>Missing Items</label>
            <input className={inputCls} value={missingItems} onChange={e => setMissingItems(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Remarks</label>
            <textarea rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
              value={remarks} onChange={e => setRemarks(e.target.value)} />
          </div>
        </div>
        {err && <p className="text-red-500 text-xs mt-3">{err}</p>}
        <div className="flex gap-3 mt-5">
          <Button variant="outline" size="sm" animation="none" fullWidth onClick={onClose} className="!h-10 flex-1">Cancel</Button>
          <Button variant="primary" size="sm" fullWidth onClick={() => mutation.mutate()} loading={mutation.isPending} className="!h-10 flex-1">
            Record Receipt
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReplaceModal({ asset, onClose }: { asset: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { success: showSuccessToast } = useToastContext();
  const [newAssetId, setNewAssetId] = useState('');
  const [reason, setReason] = useState('FAULTY');
  const [disposition, setDisposition] = useState('UNDER_REPAIR');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');

  const currentUser = asset.assignments?.[0]?.user;

  const { data: candidateAssets } = useQuery({
    queryKey: ['assets-list', 'AVAILABLE', asset.category_id, asset.category?.id],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.ASSET.LIST}?status=AVAILABLE&category_id=${asset.category_id || asset.category?.id}&limit=200`),
    select: (r: any) => (r?.payload?.records || []).filter((a: any) => a.id !== asset.id),
  });

  const mutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.ASSET.REPLACEMENTS, {
      method: 'POST',
      body: JSON.stringify({
        old_asset_id: asset.id,
        new_asset_id: newAssetId,
        user_id: currentUser?.id,
        reason,
        old_asset_disposition: disposition,
        notes: notes || undefined,
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets-list'] });
      showSuccessToast('Asset replaced successfully');
      onClose();
    },
    onError: (e: any) => setErr(e?.message || 'Failed to replace asset'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">Replace Asset</h2>
          <IconButton icon={X} variant="ghost" size="sm" aria-label="Close" onClick={onClose} className="!h-auto !w-auto p-1.5 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 mb-1">Old asset: <span className="font-semibold text-gray-900">{asset.name}</span></p>
        {currentUser ? (
          <p className="text-sm text-gray-500 mb-4">Responsible employee: <span className="font-semibold text-gray-900">{currentUser.first_name} {currentUser.last_name}</span></p>
        ) : (
          <p className="text-xs text-red-500 mb-4">This asset has no current assignee — assign it before replacing.</p>
        )}
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Replacement Asset <span className="text-red-500">*</span></label>
            <select className={inputCls} value={newAssetId} onChange={e => setNewAssetId(e.target.value)}>
              <option value="">Select an available asset in the same category</option>
              {(candidateAssets || []).map((a: any) => (
                <option key={a.id} value={a.id}>{a.name} ({a.asset_tag || 'no tag'})</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Reason for Replacement</label>
            <select className={inputCls} value={reason} onChange={e => setReason(e.target.value)}>
              <option value="FAULTY">Faulty</option>
              <option value="DAMAGED">Damaged</option>
              <option value="LOST">Lost</option>
              <option value="UPGRADE">Upgrade</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Old Asset Disposition</label>
            <select className={inputCls} value={disposition} onChange={e => setDisposition(e.target.value)}>
              <option value="AVAILABLE">Returned to Stock (Available)</option>
              <option value="UNDER_REPAIR">Under Repair</option>
              <option value="RETIRED">Retired</option>
              <option value="LOST">Lost</option>
              <option value="DAMAGED">Damaged</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        {err && <p className="text-red-500 text-xs mt-3">{err}</p>}
        <div className="flex gap-3 mt-5">
          <Button variant="outline" size="sm" animation="none" fullWidth onClick={onClose} className="!h-10 flex-1">Cancel</Button>
          <Button variant="primary" size="sm" fullWidth onClick={() => mutation.mutate()} disabled={!newAssetId || !currentUser} loading={mutation.isPending} className="!h-10 flex-1">
            Confirm Replacement
          </Button>
        </div>
      </div>
    </div>
  );
}

function CustodyHistoryModal({ asset, onClose }: { asset: any; onClose: () => void }) {
  const { data: events, isLoading } = useQuery({
    queryKey: ['asset-custody-events', asset.id],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.ASSET.CUSTODY_EVENTS(asset.id)),
    select: (r: any) => r?.payload || [],
  });

  const name = (u: any) => u ? `${u.first_name} ${u.last_name || ''}`.trim() : '—';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">Custody History — {asset.name}</h2>
          <IconButton icon={X} variant="ghost" size="sm" aria-label="Close" onClick={onClose} className="!h-auto !w-auto p-1.5 text-gray-400" />
        </div>
        {isLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : !events?.length ? (
          <p className="text-sm text-gray-400">No custody events recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {events.map((ev: any) => (
              <div key={ev.id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-primary-700">{ev.event_type.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-gray-400">{new Date(ev.occurred_at).toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                  <p>Recipient: <span className="font-medium text-gray-800">{name(ev.recipient)}</span></p>
                  <p>Department: <span className="font-medium text-gray-800">{ev.department?.name || '—'}</span></p>
                  <p>Handed over by: <span className="font-medium text-gray-800">{name(ev.handed_over_by_user)}</span></p>
                  <p>Received by: <span className="font-medium text-gray-800">{name(ev.received_by_user)}</span></p>
                  <p>Condition: <span className="font-medium text-gray-800">{ev.condition || '—'}</span></p>
                  <p>Quantity: <span className="font-medium text-gray-800">{ev.quantity ?? '—'}</span></p>
                  {ev.accessories_issued?.length > 0 && <p className="col-span-2">Accessories issued: {ev.accessories_issued.join(', ')}</p>}
                  {ev.accessories_returned?.length > 0 && <p className="col-span-2">Accessories returned: {ev.accessories_returned.join(', ')}</p>}
                  {ev.missing_items && <p className="col-span-2 text-red-600">Missing: {ev.missing_items}</p>}
                  {ev.remarks && <p className="col-span-2">Remarks: {ev.remarks}</p>}
                  {ev.acknowledged_by_user && (
                    <p className="col-span-2 text-green-700">Acknowledged by {name(ev.acknowledged_by_user)} on {ev.acknowledged_at ? new Date(ev.acknowledged_at).toLocaleDateString() : '—'}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DisposeModal({ asset, onClose }: { asset: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { success: showSuccessToast } = useToastContext();
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
      showSuccessToast('Asset disposed successfully');
      onClose();
    },
    onError: (e: any) => setErr(e?.message || 'Failed to dispose asset'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">Dispose Asset</h2>
          <IconButton icon={X} variant="ghost" size="sm" aria-label="Close" onClick={onClose} className="!h-auto !w-auto p-1.5 text-gray-400" />
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
          <Button variant="outline" size="sm" animation="none" fullWidth onClick={onClose} className="!h-10 flex-1">Cancel</Button>
          <Button variant="danger" size="sm" fullWidth onClick={() => mutation.mutate()} disabled={!reason.trim()} loading={mutation.isPending} className="!h-10 flex-1">
            Confirm Disposal
          </Button>
        </div>
      </div>
    </div>
  );
}

function CreateRequestModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { success: showSuccessToast } = useToastContext();
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
    select: (r: any) => [...(r?.payload?.records || [])].sort((a: any, b: any) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)),
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
      showSuccessToast('Asset request submitted');
      onClose();
    },
    onError: (e: any) => setErr(e?.message || 'Failed to submit request'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">Request an Asset</h2>
          <IconButton icon={X} variant="ghost" size="sm" aria-label="Close" onClick={onClose} className="!h-auto !w-auto p-1.5 text-gray-400" />
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
          <Button variant="outline" size="sm" animation="none" fullWidth onClick={onClose} className="!h-10 flex-1">Cancel</Button>
          <Button variant="primary" size="sm" fullWidth onClick={() => mutation.mutate()} disabled={!categoryId} loading={mutation.isPending} className="!h-10 flex-1">
            Submit Request
          </Button>
        </div>
      </div>
    </div>
  );
}

function ApproveRequestModal({ request, onClose }: { request: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { success: showSuccessToast } = useToastContext();
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
      showSuccessToast('Request approved and asset assigned');
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
          <IconButton icon={X} variant="ghost" size="sm" aria-label="Close" onClick={onClose} className="!h-auto !w-auto p-1.5 text-gray-400" />
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
          <Button variant="outline" size="sm" animation="none" fullWidth onClick={onClose} className="!h-10 flex-1">Cancel</Button>
          <Button variant="primary" size="sm" fullWidth onClick={() => mutation.mutate()} disabled={!assetId} loading={mutation.isPending} className="!h-10 flex-1">
            Approve & Assign
          </Button>
        </div>
      </div>
    </div>
  );
}

function RejectRequestModal({ request, onClose }: { request: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { success: showSuccessToast } = useToastContext();
  const [rejectionReason, setRejectionReason] = useState('');
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => apiRequest<any>(API_ENDPOINTS.ASSET.REQUEST_REJECT(request.id), {
      method: 'POST',
      body: JSON.stringify({ rejection_reason: rejectionReason || undefined }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-requests'] });
      showSuccessToast('Request rejected');
      onClose();
    },
    onError: (e: any) => setErr(e?.message || 'Failed to reject request'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">Reject Request</h2>
          <IconButton icon={X} variant="ghost" size="sm" aria-label="Close" onClick={onClose} className="!h-auto !w-auto p-1.5 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 mb-4">Category: <span className="font-semibold text-gray-900">{request.category?.name}</span></p>
        <div>
          <label className={labelCls}>Rejection Reason</label>
          <textarea rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none"
            value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Explain why this request is rejected…" />
        </div>
        {err && <p className="text-red-500 text-xs mt-3">{err}</p>}
        <div className="flex gap-3 mt-5">
          <Button variant="outline" size="sm" animation="none" fullWidth onClick={onClose} className="!h-10 flex-1">Cancel</Button>
          <Button variant="danger" size="sm" fullWidth onClick={() => mutation.mutate()} loading={mutation.isPending} className="!h-10 flex-1">
            Confirm Rejection
          </Button>
        </div>
      </div>
    </div>
  );
}

function AssetAggregateBreakdown() {
  const [dimKey, setDimKey] = useState(ASSET_DIMENSIONS[0].key);
  const dimension = ASSET_DIMENSIONS.find((d) => d.key === dimKey)!;

  const { data: departments } = useGetDepartmentsQuery();
  const { data: locations } = useQuery({
    queryKey: ['asset-locations'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.ASSET.LOCATIONS).then((r: any) => r?.payload || []),
  });

  const aggregateMutation = useMutation({
    mutationFn: (body: { entity: string; group_by: string }) =>
      apiRequest<any>(`${BUILDER}/aggregate`, { method: 'POST', body: JSON.stringify(body) }).then((r: any) => r?.payload),
  });

  React.useEffect(() => {
    aggregateMutation.mutate({ entity: 'assets', group_by: dimension.group_by });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimKey]);

  const rows = useMemo(() => {
    const raw = aggregateMutation.data?.rows || [];
    return raw.map((r: any) => {
      const value = r[dimension.group_by];
      let label = value ? String(value) : 'Unassigned';
      if (dimKey === 'department') label = (departments || []).find((d: any) => d.id === value)?.name || 'Unassigned';
      if (dimKey === 'office') label = (locations || []).find((l: any) => l.id === value)?.name || 'Unassigned';
      return { label, count: r.count };
    });
  }, [aggregateMutation.data, dimKey, dimension, departments, locations]);

  const maxCount = Math.max(1, ...rows.map((r: any) => r.count));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assets Breakdown</p>
        <div className="flex gap-1.5">
          {ASSET_DIMENSIONS.map((d) => (
            <button
              key={d.key}
              onClick={() => setDimKey(d.key)}
              className={cn('px-3 h-8 rounded-lg text-xs font-semibold transition-colors',
                dimKey === d.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
      {aggregateMutation.isPending ? (
        <div className="h-24 bg-gray-50 rounded-xl animate-pulse" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">No data for this dimension.</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r: any) => (
            <div key={r.label} className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-600 w-36 truncate">{r.label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full bg-primary-500" style={{ width: `${(r.count / maxCount) * 100}%` }} />
              </div>
              <span className="text-xs font-black text-gray-900 tabular-nums w-8 text-right">{r.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AssetDetailReports() {
  const [activeStatus, setActiveStatus] = useState<string | null>(null);

  const detailMutation = useMutation({
    mutationFn: (status: string) =>
      apiRequest<any>(`${BUILDER}/run`, {
        method: 'POST',
        body: JSON.stringify({ entity: 'assets', filters: { status }, limit: 100, sort_by: 'created_at', sort_dir: 'desc' }),
      }).then((r: any) => r?.payload),
  });

  const openReport = (status: string) => {
    setActiveStatus(status);
    detailMutation.mutate(status);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Detail Reports</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {ASSET_DETAIL_REPORTS.map((r) => (
          <button
            key={r.key}
            onClick={() => openReport(r.key)}
            className={cn('flex items-center gap-2 px-3.5 h-9 rounded-xl text-xs font-semibold transition-colors',
              activeStatus === r.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
          >
            <r.icon size={13} />{r.label}
          </button>
        ))}
      </div>
      {activeStatus && (
        <div className="overflow-x-auto">
          {detailMutation.isPending ? (
            <div className="h-24 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Tag', 'Name', 'Brand', 'Model', 'Condition', 'Purchase Cost'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-2 px-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(detailMutation.data?.data || []).length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-400 text-sm">No assets found for this status.</td></tr>
                ) : (detailMutation.data?.data || []).map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2 px-2 text-gray-500 font-mono text-xs">{a.asset_tag || '—'}</td>
                    <td className="py-2 px-2 font-semibold text-gray-900">{a.name}</td>
                    <td className="py-2 px-2 text-gray-600">{a.brand || '—'}</td>
                    <td className="py-2 px-2 text-gray-600">{a.model || '—'}</td>
                    <td className="py-2 px-2 text-gray-600">{a.condition || '—'}</td>
                    <td className="py-2 px-2 text-gray-600 whitespace-nowrap">{a.purchase_cost != null ? `PKR ${a.purchase_cost.toLocaleString?.() ?? a.purchase_cost}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-xs text-gray-400 mt-2">{detailMutation.data?.total ?? 0} total (showing up to 100)</p>
        </div>
      )}
    </div>
  );
}

function AssetKpiRow({ warrantyCount, categoriesCount }: { warrantyCount: number; categoriesCount: number }) {
  const kpi = (metric: string, filters?: Record<string, any>) => ({ entity: 'assets', metric, filters });

  const totalQ = useQuery({ queryKey: ['asset-kpi-total'], queryFn: () => apiRequest<any>(`${BUILDER}/kpi`, { method: 'POST', body: JSON.stringify(kpi('COUNT')) }).then((r: any) => r?.payload?.value) });
  const assignedQ = useQuery({ queryKey: ['asset-kpi-assigned'], queryFn: () => apiRequest<any>(`${BUILDER}/kpi`, { method: 'POST', body: JSON.stringify(kpi('COUNT', { status: 'ASSIGNED' })) }).then((r: any) => r?.payload?.value) });
  const availableQ = useQuery({ queryKey: ['asset-kpi-available'], queryFn: () => apiRequest<any>(`${BUILDER}/kpi`, { method: 'POST', body: JSON.stringify(kpi('COUNT', { status: 'AVAILABLE' })) }).then((r: any) => r?.payload?.value) });
  const repairQ = useQuery({ queryKey: ['asset-kpi-repair'], queryFn: () => apiRequest<any>(`${BUILDER}/kpi`, { method: 'POST', body: JSON.stringify(kpi('COUNT', { status: 'MAINTENANCE' })) }).then((r: any) => r?.payload?.value) });

  const cards = [
    { icon: Boxes, color: 'bg-indigo-500', label: 'Total Assets', value: totalQ.data },
    { icon: UserCheck2, color: 'bg-blue-500', label: 'Assigned Assets', value: assignedQ.data },
    { icon: CheckCircle, color: 'bg-green-500', label: 'Available Assets', value: availableQ.data },
    { icon: Wrench, color: 'bg-orange-500', label: 'Under Repair', value: repairQ.data },
    { icon: AlertTriangle, color: 'bg-amber-500', label: 'Expiring Warranty', value: warrantyCount },
    { icon: Layers3, color: 'bg-purple-500', label: 'Asset Categories', value: categoriesCount },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="flex flex-col gap-2 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', c.color)}>
            <c.icon size={16} className="text-white" />
          </div>
          <p className="text-xl font-black text-gray-900 leading-tight">{c.value ?? '—'}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

function RelatedExportButton({
  kind,
  label,
  eventType,
}: {
  kind: RelatedAssetExportKind;
  label: string;
  eventType?: string;
}) {
  const { success: showSuccessToast } = useToastContext();
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await downloadRelatedAssetExport({
        kind,
        format,
        event_type: eventType || undefined,
      });
      showSuccessToast(`${label} downloaded`);
    } catch (e: any) {
      alert(e?.message || 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        className="h-9 px-2 border border-gray-200 rounded-xl text-xs text-gray-600 focus:outline-none focus:border-primary-400"
        value={format}
        onChange={(e) => setFormat(e.target.value as 'xlsx' | 'csv')}
        aria-label={`${label} format`}
      >
        <option value="xlsx">Excel</option>
        <option value="csv">CSV</option>
      </select>
      <Button
        variant="outline"
        size="sm"
        animation="none"
        leftIcon={Download}
        loading={busy}
        onClick={run}
        className="!h-9"
      >
        {label}
      </Button>
    </div>
  );
}

function ExportAssetsModal({
  categories,
  onClose,
}: {
  categories: any[];
  onClose: () => void;
}) {
  const { success: showSuccessToast } = useToastContext();
  const [categoryId, setCategoryId] = useState('');
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const handleExport = async () => {
    setBusy(true);
    setErr('');
    try {
      await downloadAssetExport({ format, category_id: categoryId || undefined });
      showSuccessToast('Export downloaded');
      onClose();
    } catch (e: any) {
      setErr(e?.message || 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Export Assets</h2>
          <IconButton icon={X} variant="ghost" size="sm" aria-label="Close" onClick={onClose} className="!h-auto !w-auto p-1.5 text-gray-400" />
        </div>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Asset Type</label>
            <select className={inputCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">All Asset Types</option>
              {(categories || []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Format</label>
            <select className={inputCls} value={format} onChange={(e) => setFormat(e.target.value as 'xlsx' | 'csv')}>
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="csv">CSV (.csv)</option>
            </select>
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" size="sm" animation="none" fullWidth onClick={onClose} className="!h-10 flex-1">Cancel</Button>
          <Button variant="primary" size="sm" fullWidth onClick={handleExport} loading={busy} className="!h-10 flex-1" leftIcon={Download}>
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}

function ImportAssetsModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { success: showSuccessToast } = useToastContext();
  const [step, setStep] = useState<'select' | 'preview' | 'result'>('select');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<AssetImportPreview | null>(null);
  const [result, setResult] = useState<AssetImportCommitResult | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const flatErrors = preview?.rows?.flatMap((r) => r.errors || []) || result?.error_rows || [];

  const handleValidate = async () => {
    if (!file) { setErr('Select a file first'); return; }
    setBusy(true);
    setErr('');
    try {
      const p = await previewAssetImport(file);
      setPreview(p);
      setStep('preview');
    } catch (e: any) {
      setErr(e?.message || 'Validation failed');
    } finally {
      setBusy(false);
    }
  };

  const handleCommit = async () => {
    if (!file || busy) return;
    setBusy(true);
    setErr('');
    try {
      const r = await commitAssetImport(file);
      setResult(r);
      if (r.preview && !r.success && r.failed > 0 && !r.created && !r.updated) {
        setPreview(r.preview as any);
        setStep('preview');
        setErr(r.message || 'Import has validation errors');
      } else {
        setStep('result');
        qc.invalidateQueries({ queryKey: ['assets-list'] });
        if (r.success) showSuccessToast('Import completed');
      }
    } catch (e: any) {
      setErr(e?.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">
            {step === 'select' && 'Import Assets'}
            {step === 'preview' && 'Import Preview'}
            {step === 'result' && 'Import Result'}
          </h2>
          <IconButton icon={X} variant="ghost" size="sm" aria-label="Close" onClick={onClose} className="!h-auto !w-auto p-1.5 text-gray-400" />
        </div>

        {step === 'select' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Upload an Excel or CSV file using the Asset Import Template columns. Nothing is written until you confirm.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" animation="none" leftIcon={FileSpreadsheet}
                onClick={() => downloadAssetImportTemplate('xlsx').catch((e) => setErr(e.message))}>
                Download Template (Excel)
              </Button>
              <Button variant="outline" size="sm" animation="none" leftIcon={FileSpreadsheet}
                onClick={() => downloadAssetImportTemplate('csv').catch((e) => setErr(e.message))}>
                Download Template (CSV)
              </Button>
            </div>
            <div>
              <label className={labelCls}>Select File</label>
              <input type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700"
                onChange={(e) => { setFile(e.target.files?.[0] || null); setErr(''); }} />
              {file && <p className="text-xs text-gray-400 mt-1">{file.name}</p>}
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="sm" animation="none" fullWidth onClick={onClose} className="!h-10 flex-1">Cancel</Button>
              <Button variant="primary" size="sm" fullWidth onClick={handleValidate} disabled={!file} loading={busy} className="!h-10 flex-1">
                Validate
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Total Rows', value: preview.total_rows },
                { label: 'New Assets', value: preview.new_assets },
                { label: 'Existing', value: preview.existing_assets },
                { label: 'Unchanged', value: preview.unchanged },
                { label: 'Errors', value: preview.errors },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{s.label}</p>
                  <p className={cn('text-xl font-black', s.label === 'Errors' && s.value > 0 ? 'text-red-600' : 'text-gray-900')}>{s.value}</p>
                </div>
              ))}
            </div>

            {flatErrors.length > 0 && (
              <div className="border border-red-100 rounded-xl overflow-hidden">
                <div className="bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">Row-level errors</div>
                <div className="max-h-48 overflow-y-auto divide-y divide-red-50">
                  {flatErrors.slice(0, 100).map((e, i) => (
                    <div key={`${e.row}-${i}`} className="px-3 py-2 text-xs text-gray-700">
                      <span className="font-semibold">Row {e.row}</span>
                      {e.field ? <> · Field: {e.field}</> : null}
                      {e.value ? <> · Value: &quot;{e.value}&quot;</> : null}
                      <div className="text-red-600 mt-0.5">{e.error}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {err && <p className="text-sm text-red-600">{err}</p>}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="outline" size="sm" animation="none" onClick={() => { setStep('select'); setPreview(null); }} className="!h-10">
                Back
              </Button>
              {flatErrors.length > 0 && (
                <Button variant="outline" size="sm" animation="none" leftIcon={Download}
                  onClick={() => downloadAssetImportErrorReport(flatErrors).catch((e) => setErr(e.message))}
                  className="!h-10">
                  Download Error Report
                </Button>
              )}
              <div className="flex-1" />
              <Button variant="primary" size="sm" onClick={handleCommit}
                disabled={busy || preview.errors > 0 || (preview.new_assets + preview.existing_assets === 0)}
                loading={busy} className="!h-10">
                Confirm Import
              </Button>
            </div>
          </div>
        )}

        {step === 'result' && result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Successful', value: result.successful },
                { label: 'Created', value: result.created },
                { label: 'Updated', value: result.updated },
                { label: 'Unchanged', value: result.unchanged },
                { label: 'Failed', value: result.failed },
                { label: 'Skipped', value: result.skipped },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{s.label}</p>
                  <p className="text-xl font-black text-gray-900">{s.value}</p>
                </div>
              ))}
            </div>
            {(result.error_rows?.length || 0) > 0 && (
              <Button variant="outline" size="sm" animation="none" leftIcon={Download}
                onClick={() => downloadAssetImportErrorReport(result.error_rows || []).catch((e) => setErr(e.message))}>
                Download Error Report
              </Button>
            )}
            {err && <p className="text-sm text-red-600">{err}</p>}
            <Button variant="primary" size="sm" fullWidth onClick={onClose} className="!h-10">Done</Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AssetsPage() {
  const [tab, setTab] = useState<'assets' | 'requests' | 'disposals' | 'history' | 'reports'>('assets');
  const [historyEventTypeFilter, setHistoryEventTypeFilter] = useState('');

  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [search, setSearch] = useState('');
  const [assignTarget, setAssignTarget] = useState<any>(null);
  const [returnTarget, setReturnTarget] = useState<any>(null);
  const [disposeTarget, setDisposeTarget] = useState<any>(null);
  const [receiveTarget, setReceiveTarget] = useState<any>(null);
  const [replaceTarget, setReplaceTarget] = useState<any>(null);
  const [historyTarget, setHistoryTarget] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const [requestStatusFilter, setRequestStatusFilter] = useState('');
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [approveTarget, setApproveTarget] = useState<any>(null);
  const [rejectTarget, setRejectTarget] = useState<any>(null);

  const { data: myPerms } = useMyPermissions();
  const isSuperAdmin = !!myPerms?.is_super_admin;
  const canImport = isSuperAdmin
    || !!myPerms?.permissions?.includes('erp.assets.create')
    || !!myPerms?.permissions?.includes('erp.assets.edit');
  const canExport = isSuperAdmin || !!myPerms?.permissions?.includes('erp.assets.view');

  const { data: assetsData, isLoading } = useQuery({
    queryKey: ['assets-list', categoryFilter, statusFilter, locationFilter, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (categoryFilter) params.set('category_id', categoryFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (locationFilter) params.set('location_id', locationFilter);
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

  const { data: assetLocations } = useQuery({
    queryKey: ['asset-locations'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.ASSET.LOCATIONS),
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

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['asset-custody-history', historyEventTypeFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (historyEventTypeFilter) params.set('event_type', historyEventTypeFilter);
      params.set('limit', '50');
      return apiRequest<any>(`${API_ENDPOINTS.ASSET.ALL_CUSTODY_EVENTS}?${params}`);
    },
    select: (r: any) => r?.payload,
    enabled: tab === 'history',
  });

  const { data: replacementsData, isLoading: replacementsLoading } = useQuery({
    queryKey: ['asset-replacements-list'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.ASSET.REPLACEMENTS}?limit=50`),
    select: (r: any) => r?.payload,
    enabled: tab === 'history',
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
  const underRepair = assets.filter((a: any) => a.status === 'UNDER_REPAIR').length;

  const requests: any[] = requestsData?.records || [];
  const disposals: any[] = disposalsData?.records || [];
  const depreciationRecords: any[] = depreciationData?.records || [];
  const inventoryByStatus: any[] = inventoryData?.by_status || [];
  const inventoryByCategory: any[] = inventoryData?.by_category || [];
  const warrantyAlerts: any[] = inventoryData?.warranty_alerts || [];

  return (
    <div className="flex flex-col gap-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Assets</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track and manage company assets</p>
        </div>
        {tab === 'assets' && (
          <div className="flex flex-wrap items-center gap-2">
            {canExport && (
              <Button variant="outline" size="sm" animation="none" leftIcon={Download} onClick={() => setShowExport(true)} className="!h-10">
                Export
              </Button>
            )}
            {canExport && <RelatedExportButton kind="maintenance" label="Export Maintenance" />}
            {canImport && (
              <Button variant="outline" size="sm" animation="none" leftIcon={Upload} onClick={() => setShowImport(true)} className="!h-10">
                Import
              </Button>
            )}
            <PageActionButton leftIcon={Plus} onClick={() => setShowCreate(true)}>
              Add Asset
            </PageActionButton>
          </div>
        )}
        {tab === 'requests' && (
          <PageActionButton leftIcon={Plus} onClick={() => setShowCreateRequest(true)}>
            New Request
          </PageActionButton>
        )}
      </div>

      <div className="flex items-center gap-1 border-b border-gray-100">
        {[
          { key: 'assets',    label: 'Assets',    icon: Package },
          { key: 'requests',  label: 'Requests',  icon: ClipboardList },
          { key: 'disposals', label: 'Disposals', icon: Trash2 },
          { key: 'history',   label: 'Handover & Return History', icon: History },
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

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">

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
                <option value="UNDER_REPAIR">Under Repair</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="RETIRED">Retired</option>
              </select>
              <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
                className="h-10 px-3 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none focus:border-primary-400">
                <option value="">All Locations</option>
                {(assetLocations as any[] || []).map((l: any) => (
                  <option key={l.id} value={l.id}>{[l.office, l.floor, l.room].filter(Boolean).join(' — ')}</option>
                ))}
              </select>
              {(categoryFilter || statusFilter || locationFilter || search) && (
                <Button variant="outline" size="sm" animation="none" leftIcon={X} onClick={() => { setCategoryFilter(''); setStatusFilter(''); setLocationFilter(''); setSearch(''); }}
                  className="!h-10 !px-3 text-xs !text-gray-500">
                  Clear
                </Button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Tag', 'Asset', 'Category', 'Location', 'Brand / Model', 'Serial No.', 'Assigned To', 'Condition', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={10} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                    ))
                  ) : assets.length === 0 ? (
                    <tr><td colSpan={10} className="py-12 text-center text-gray-400 text-sm">No assets found</td></tr>
                  ) : assets.map((asset: any) => {
                    const assignedUser = asset.assignments?.[0]?.user;
                    return (
                      <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-2 font-mono text-xs text-gray-500 whitespace-nowrap">{asset.asset_tag || '—'}</td>
                        <td className="py-3 px-2">
                          <p className="font-semibold text-gray-900">{asset.name}</p>
                        </td>
                        <td className="py-3 px-2 text-gray-500 whitespace-nowrap">{asset.category?.name || '—'}</td>
                        <td className="py-3 px-2 text-gray-600 whitespace-nowrap">{asset.location?.office || '—'}</td>
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
                          <StatusBadge status={asset.status || '—'} />
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1.5">
                            {asset.status === 'AVAILABLE' && (
                              <Button variant="primary" size="sm" animation="none" rounded={false} onClick={() => setAssignTarget(asset)}
                                className="!px-3 !h-7 h-auto !shadow-none text-xs">
                                Assign
                              </Button>
                            )}
                            {asset.status === 'ASSIGNED' && (
                              <Button variant="ghost" size="sm" animation="none" rounded={false} leftIcon={RotateCcw} onClick={() => setReturnTarget(asset)}
                                className="!px-3 !h-7 h-auto !shadow-none text-xs !bg-amber-100 !text-amber-700 hover:!bg-amber-200">
                                Return
                              </Button>
                            )}
                            {asset.status === 'ASSIGNED' && (
                              <Button variant="ghost" size="sm" animation="none" rounded={false} leftIcon={Repeat} onClick={() => setReplaceTarget(asset)}
                                className="!px-3 !h-7 h-auto !shadow-none text-xs !bg-blue-100 !text-blue-700 hover:!bg-blue-200">
                                Replace
                              </Button>
                            )}
                            {asset.status !== 'ASSIGNED' && asset.status !== 'RETIRED' && (
                              <Button variant="ghost" size="sm" animation="none" rounded={false} leftIcon={Inbox} onClick={() => setReceiveTarget(asset)}
                                className="!px-3 !h-7 h-auto !shadow-none text-xs !bg-purple-100 !text-purple-700 hover:!bg-purple-200">
                                Receive
                              </Button>
                            )}
                            <IconButton icon={History} variant="ghost" size="sm" aria-label="Custody History" title="Custody History"
                              onClick={() => setHistoryTarget(asset)}
                              className="!h-7 !w-7 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100" />
                            {asset.status !== 'RETIRED' && (
                              <Button variant="ghost" size="sm" animation="none" rounded={false} leftIcon={Trash2} onClick={() => setDisposeTarget(asset)}
                                className="!px-3 !h-7 h-auto !shadow-none text-xs !bg-red-100 !text-red-700 hover:!bg-red-200">
                                Dispose
                              </Button>
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
                        <StatusBadge status={req.status} />
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">Disposal History</h3>
            {canExport && <RelatedExportButton kind="disposals" label="Export Disposals" />}
          </div>
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

      {tab === 'history' && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <h3 className="text-sm font-bold text-gray-900">Custody Events — Handovers, Returns &amp; Receipts</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={historyEventTypeFilter} onChange={e => setHistoryEventTypeFilter(e.target.value)}
                  className="h-9 px-3 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none focus:border-primary-400">
                  <option value="">All Event Types</option>
                  <option value="HANDOVER">Handover</option>
                  <option value="RETURN">Return</option>
                  <option value="RECEIVED_BY_IT">Received by IT</option>
                </select>
                {canExport && (
                  <RelatedExportButton
                    kind="custody"
                    label="Export Custody"
                    eventType={historyEventTypeFilter || undefined}
                  />
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Asset', 'Type', 'Recipient / Department', 'Handed Over By', 'Received By', 'Condition', 'Date'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {historyLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}><td colSpan={7} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                    ))
                  ) : !historyData?.records?.length ? (
                    <tr><td colSpan={7} className="py-12 text-center text-gray-400 text-sm">No custody events recorded yet</td></tr>
                  ) : historyData.records.map((ev: any) => (
                    <tr key={ev.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-2">
                        <p className="font-semibold text-gray-900">{ev.asset?.name || '—'}</p>
                        <p className="text-xs text-gray-400 font-mono">{ev.asset?.asset_tag || '—'}</p>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">{ev.event_type.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="py-3 px-2 text-gray-700 whitespace-nowrap">
                        {ev.recipient ? `${ev.recipient.first_name} ${ev.recipient.last_name || ''}`.trim() : (ev.department?.name || '—')}
                      </td>
                      <td className="py-3 px-2 text-gray-600 whitespace-nowrap">
                        {ev.handed_over_by_user ? `${ev.handed_over_by_user.first_name} ${ev.handed_over_by_user.last_name || ''}`.trim() : '—'}
                      </td>
                      <td className="py-3 px-2 text-gray-600 whitespace-nowrap">
                        {ev.received_by_user ? `${ev.received_by_user.first_name} ${ev.received_by_user.last_name || ''}`.trim() : '—'}
                      </td>
                      <td className="py-3 px-2 text-gray-600">{ev.condition || '—'}</td>
                      <td className="py-3 px-2 text-gray-500 whitespace-nowrap">{new Date(ev.occurred_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">Asset Replacements</h3>
              {canExport && <RelatedExportButton kind="replacements" label="Export Replacements" />}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Old Asset', 'New Asset', 'Employee', 'Reason', 'Old Asset Disposition', 'Date'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {replacementsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}><td colSpan={6} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                    ))
                  ) : !replacementsData?.records?.length ? (
                    <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">No replacements recorded yet</td></tr>
                  ) : replacementsData.records.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-2">
                        <p className="font-semibold text-gray-900">{r.old_asset?.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{r.old_asset?.asset_tag || '—'}</p>
                      </td>
                      <td className="py-3 px-2">
                        <p className="font-semibold text-gray-900">{r.new_asset?.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{r.new_asset?.asset_tag || '—'}</p>
                      </td>
                      <td className="py-3 px-2 text-gray-700 whitespace-nowrap">{r.user ? `${r.user.first_name} ${r.user.last_name || ''}`.trim() : '—'}</td>
                      <td className="py-3 px-2 text-gray-600">{r.reason}</td>
                      <td className="py-3 px-2 text-gray-600">{r.old_asset_disposition}</td>
                      <td className="py-3 px-2 text-gray-500 whitespace-nowrap">{new Date(r.replacement_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <>

          <AssetKpiRow warrantyCount={warrantyAlerts.length} categoriesCount={(categories as any[] || []).length} />

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
                    <StatusBadge key={s.status} status={s.status} label={`${s.status}: ${s.count}`} />
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
                        <StatusBadge status={a.status || '—'} />
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

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <TrendingDown size={15} className="text-gray-400" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Depreciation (straight-line, {depreciationData?.useful_life_months ?? 36}-month useful life)
                </p>
              </div>
              {canExport && <RelatedExportButton kind="depreciation" label="Export Depreciation" />}
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

          <AssetAggregateBreakdown />
          <AssetDetailReports />
        </>
      )}

      {showCreate && <CreateAssetModal onClose={() => setShowCreate(false)} />}
      {showExport && <ExportAssetsModal categories={(categories as any[]) || []} onClose={() => setShowExport(false)} />}
      {showImport && <ImportAssetsModal onClose={() => setShowImport(false)} />}
      {assignTarget && <AssignModal asset={assignTarget} onClose={() => setAssignTarget(null)} />}
      {returnTarget && <ReturnModal asset={returnTarget} onClose={() => setReturnTarget(null)} />}
      {disposeTarget && <DisposeModal asset={disposeTarget} onClose={() => setDisposeTarget(null)} />}
      {receiveTarget && <ReceiveModal asset={receiveTarget} onClose={() => setReceiveTarget(null)} />}
      {replaceTarget && <ReplaceModal asset={replaceTarget} onClose={() => setReplaceTarget(null)} />}
      {historyTarget && <CustodyHistoryModal asset={historyTarget} onClose={() => setHistoryTarget(null)} />}
      {showCreateRequest && <CreateRequestModal onClose={() => setShowCreateRequest(false)} />}
      {approveTarget && <ApproveRequestModal request={approveTarget} onClose={() => setApproveTarget(null)} />}
      {rejectTarget && <RejectRequestModal request={rejectTarget} onClose={() => setRejectTarget(null)} />}
    </div>
  );
}
