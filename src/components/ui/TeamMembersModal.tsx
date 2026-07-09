import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import Loader from '@/components/ui/Loader';
import { X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useGetTeamMembers, useAddTeamMember, useRemoveTeamMember } from '@/services/teamMembersService';
import { useToastContext } from '@/components/toast/ToastProvider';

interface Props { isOpen: boolean; onClose: () => void; team?: any; }

const TeamMembersModal: React.FC<Props> = ({ isOpen, onClose, team }) => {
  const toast = useToastContext();
  const [selectedUser, setSelectedUser] = useState('');
  const { data: members = [], isLoading } = useGetTeamMembers(team?.id);
  const addMember = useAddTeamMember(team?.id);
  const removeMember = useRemoveTeamMember(team?.id);

  const { data: users } = useQuery({
    queryKey: ['user-list-brief'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.USER.LIST}?limit=200&status=ACTIVE`),
    select: (r: any) => r?.payload?.records || r?.payload || [],
    staleTime: 300000,
  });

  const memberIds = new Set(members.map((m: any) => m.user_id || m.user?.id));
  const available = (users || []).filter((u: any) => !memberIds.has(u.id));

  const handleAdd = () => {
    if (!selectedUser) return;
    addMember.mutate({ user_id: selectedUser }, {
      onSuccess: () => { toast.success('Member added'); setSelectedUser(''); },
      onError: (e: any) => toast.error(e?.message || 'Failed to add member'),
    });
  };

  const handleRemove = (userId: string) => {
    removeMember.mutate(userId, {
      onSuccess: () => toast.success('Member removed'),
      onError: (e: any) => toast.error(e?.message || 'Failed to remove member'),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Members — ${team?.name || ''}`} size="md">
      <div className="flex flex-col gap-5">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Select
              label="Add Member"
              options={[{ label: 'Select employee', value: '' }, ...available.map((u: any) => ({ label: `${u.first_name} ${u.last_name}`, value: u.id }))]}
              value={selectedUser}
              onChange={(v) => setSelectedUser(String(v))}
            />
          </div>
          <Button variant="primary" className="h-11 rounded-xl font-bold" disabled={!selectedUser || addMember.isPending} onClick={handleAdd}>
            {addMember.isPending ? 'Adding…' : 'Add'}
          </Button>
        </div>

        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
          {isLoading && <div className="flex justify-center py-6"><Loader size={28} /></div>}
          {!isLoading && members.length === 0 && (
            <span className="text-xs text-gray-400 italic py-4 text-center">No members yet.</span>
          )}
          {members.map((m: any) => (
            <div key={m.user_id || m.user?.id} className="flex items-center justify-between p-3 bg-gray-50/60 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold overflow-hidden">
                  {m.user?.avatar ? <img src={m.user.avatar} className="w-full h-full object-cover" /> : `${m.user?.first_name?.[0] || ''}${m.user?.last_name?.[0] || ''}`}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-800">{m.user?.first_name} {m.user?.last_name}</span>
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">{m.role || 'MEMBER'}</span>
                </div>
              </div>
              <button
                onClick={() => handleRemove(m.user_id || m.user?.id)}
                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default TeamMembersModal;
