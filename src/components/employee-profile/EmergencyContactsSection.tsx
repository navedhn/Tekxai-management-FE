import React, { useState } from 'react';
import { Plus, Trash2, Phone, Star } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import {
  useGetEmergencyContacts,
  useCreateEmergencyContact,
  useUpdateEmergencyContact,
  useDeleteEmergencyContact,
  type EmergencyContact,
  type EmergencyContactInput,
} from '@/services/emergencyContactsService';

const EMPTY_FORM: EmergencyContactInput = { name: '', relation: '', phone: '', is_primary: false };

interface EmergencyContactsSectionProps {
  userId: string;
}

/**
 * Self-contained emergency contacts manager for the Employee Profile page.
 * Fetches, lists, adds, edits, and deletes emergency contacts for `userId`.
 * Sprint 1 Phase 2 Milestone 4 — replaces the old single flat-field contact
 * (display-only) with a proper one-to-many list supporting multiple contacts.
 */
const EmergencyContactsSection: React.FC<EmergencyContactsSectionProps> = ({ userId }) => {
  const toast = useToastContext();
  const { data: contacts, isLoading } = useGetEmergencyContacts(userId);
  const createContact = useCreateEmergencyContact(userId);
  const updateContact = useUpdateEmergencyContact(userId);
  const deleteContact = useDeleteEmergencyContact(userId);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<EmergencyContactInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EmergencyContactInput>(EMPTY_FORM);

  const resetAddForm = () => { setForm(EMPTY_FORM); setShowAdd(false); };

  const handleAdd = () => {
    if (!form.name.trim() || !form.relation.trim() || !form.phone.trim()) {
      toast.error('Name, relation, and phone are required');
      return;
    }
    createContact.mutate(form, {
      onSuccess: () => { toast.success('Emergency contact added'); resetAddForm(); },
      onError: (e: any) => toast.error(e?.message || 'Failed to add contact'),
    });
  };

  const startEdit = (contact: EmergencyContact) => {
    setEditingId(contact.id);
    setEditForm({ name: contact.name, relation: contact.relation, phone: contact.phone, is_primary: contact.is_primary });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm(EMPTY_FORM); };

  const handleUpdate = (id: string) => {
    if (!editForm.name.trim() || !editForm.relation.trim() || !editForm.phone.trim()) {
      toast.error('Name, relation, and phone are required');
      return;
    }
    updateContact.mutate({ id, ...editForm }, {
      onSuccess: () => { toast.success('Emergency contact updated'); cancelEdit(); },
      onError: (e: any) => toast.error(e?.message || 'Failed to update contact'),
    });
  };

  const handleDelete = (id: string) => {
    deleteContact.mutate(id, {
      onSuccess: () => toast.success('Emergency contact removed'),
      onError: (e: any) => toast.error(e?.message || 'Failed to remove contact'),
    });
  };

  if (isLoading) {
    return <Card isLoading />;
  }

  const list = contacts || [];

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
          <Phone size={16} />Emergency Contacts
        </h3>
        {!showAdd && (
          <Button
            variant="primary" size="sm" animation="none" rounded={false} className="rounded-xl"
            onClick={() => setShowAdd(true)}
          >
            <Plus size={14} className="mr-1.5" />Add Contact
          </Button>
        )}
      </div>

      {showAdd && (
        <Card className="mb-4 !shadow-none border-dashed">
          <h4 className="text-sm font-black text-gray-900 mb-3">Add Emergency Contact</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Name *" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="h-10 rounded-xl" placeholder="e.g. Jane Doe"
            />
            <Input
              label="Relation *" value={form.relation}
              onChange={e => setForm(p => ({ ...p, relation: e.target.value }))}
              className="h-10 rounded-xl" placeholder="e.g. Spouse"
            />
            <Input
              label="Phone *" value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              className="h-10 rounded-xl" placeholder="e.g. +92 300 1234567"
            />
          </div>
          <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!form.is_primary}
              onChange={e => setForm(p => ({ ...p, is_primary: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-[#005CDA] focus:ring-[#005CDA]"
            />
            <span className="text-xs font-semibold text-gray-600">Mark as primary contact</span>
          </label>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" animation="none" rounded={false} className="rounded-xl" onClick={resetAddForm}>
              Cancel
            </Button>
            <Button
              variant="primary" size="sm" animation="none" rounded={false} className="rounded-xl"
              loading={createContact.isPending} onClick={handleAdd}
            >
              Add
            </Button>
          </div>
        </Card>
      )}

      {list.length > 0 ? (
        <div className="space-y-3">
          {list.map((contact) => (
            <div key={contact.id} className="border border-gray-100 rounded-xl p-4">
              {editingId === contact.id ? (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      label="Name *" value={editForm.name}
                      onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                      className="h-10 rounded-xl"
                    />
                    <Input
                      label="Relation *" value={editForm.relation}
                      onChange={e => setEditForm(p => ({ ...p, relation: e.target.value }))}
                      className="h-10 rounded-xl"
                    />
                    <Input
                      label="Phone *" value={editForm.phone}
                      onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!editForm.is_primary}
                      onChange={e => setEditForm(p => ({ ...p, is_primary: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-[#005CDA] focus:ring-[#005CDA]"
                    />
                    <span className="text-xs font-semibold text-gray-600">Mark as primary contact</span>
                  </label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" animation="none" rounded={false} className="rounded-xl" onClick={cancelEdit}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary" size="sm" animation="none" rounded={false} className="rounded-xl"
                      loading={updateContact.isPending} onClick={() => handleUpdate(contact.id)}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-gray-900">{contact.name}</p>
                      {contact.is_primary && (
                        <span className={cn(
                          'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase',
                          'bg-amber-50 text-amber-700 border border-amber-100'
                        )}>
                          <Star size={10} className="fill-current" />Primary
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{contact.relation}</p>
                    <p className="text-sm text-gray-600 font-medium">{contact.phone}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(contact)}
                      className="px-2 py-1 text-xs font-bold text-gray-400 hover:text-[#005CDA] transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : !showAdd && (
        <div className="py-8 flex flex-col items-center gap-3">
          <Phone size={28} className="text-gray-200" />
          <p className="text-gray-400 font-medium text-sm">No emergency contacts added yet</p>
          <Button variant="outline" size="sm" animation="none" rounded={false} className="rounded-xl" onClick={() => setShowAdd(true)}>
            Add First Contact
          </Button>
        </div>
      )}
    </Card>
  );
};

export default EmergencyContactsSection;
