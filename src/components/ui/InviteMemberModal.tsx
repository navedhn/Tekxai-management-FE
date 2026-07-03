import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { useGetTeamsQuery } from '@/services/adminService';
import { useCreateInviteMutation, useUpdateInviteMutation } from '@/services/inviteService';
import { useAuthStore } from '@/stores/authStore';
import { useToastContext } from '@/components/toast/ToastProvider';
import UserListModal from './UserListModal';
import { Users } from 'lucide-react';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  invite?: any;
}

// --- Data Mappings ---

const departments = [
  { value: 'TekXAI', label: 'TekXAI' },
  { value: 'CE', label: 'CE' }
];

const designationsMap: Record<string, { value: string; label: string }[]> = {
  'CE': [
    { value: 'CE', label: 'CE' }
  ],
  'TekXAI': [
    { value: 'UI UX', label: 'UI UX' },
    { value: 'front-end-developer', label: 'Front End Developer' },
    { value: 'back-end-developer', label: 'Back End Developer' },
    { value: 'devops-developer', label: 'DevOps Developer' },
    { value: 'cms-developer', label: 'CMS Developer' },
    { value: 'ai-developer', label: 'AI Developer' },
    { value: 'hr', label: 'Human Resource' },
    { value: 'team-lead', label: 'Team Lead' }
  ]
};

const teamsMap: Record<string, { value: string; label: string }[]> = {
  'CE': [
    { value: 'CE', label: 'CE' }
  ],
  'UI UX': [
    { value: 'UI UX', label: 'UI UX' }
  ],
  'Developer': [
    { value: 'Front End Developer', label: 'Front End Developer' },
    { value: 'Backend Developer', label: 'Backend Developer' },
    { value: 'DevOps Developer', label: 'DevOps Developer' },
    { value: 'CMS Developer', label: 'CMS Developer' },
    { value: 'AI Developer', label: 'AI Developer' }
  ],
  'Office Boy': [
    { value: 'Office Boy', label: 'Office Boy' }
  ],
  'Team Lead': [
    { value: 'Team Lead', label: 'Team Lead' }
  ]
};

const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ isOpen, onClose, invite }) => {
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [team, setTeam] = useState('');
  const [invitedUserId, setInvitedUserId] = useState<string | null>(null);
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { user } = useAuthStore();
  const toast = useToastContext();
  const { data: teamsData } = useGetTeamsQuery(undefined, isOpen);

  const { mutate: createInvite, isPending: isCreating } = useCreateInviteMutation();
  const { mutate: updateInvite, isPending: isUpdating } = useUpdateInviteMutation();

  const isEdit = !!invite;
  const isPending = isCreating || isUpdating;

  // Sync state with invite prop
  React.useEffect(() => {
    if (invite && isOpen) {
      setEmail(invite.email || '');
      setDepartment(invite.department || '');
      setTeam(invite.team_id || invite.team?.id || '');
      setDesignation(invite.designation || '');
    } else if (!isOpen) {
      // Clear state when modal closes
      setEmail('');
      setDepartment('');
      setTeam('');
      setDesignation('');
      setInvitedUserId(null);
    }
  }, [invite, isOpen]);

  // Map teams from API to Select options
  const teamsOptions = Array.isArray((teamsData as any)?.payload?.records)
    ? (teamsData as any).payload.records.map((t: any) => ({ value: t.id, label: t.name }))
    : Array.isArray(teamsData)
      ? (teamsData as any).map((t: any) => ({ value: t.id || t.name, label: t.name }))
      : teamsMap[designation] || [];

  const handleDepartmentChange = (val: string | number) => {
    const dept = val as string;
    setDepartment(dept);
    setTeam('');
    setDesignation('');
  };

  const handleTeamChange = (val: string | number) => {
    setTeam(val as string);
    setDesignation('');
  };

  const handleUserSelect = (selectedUser: any) => {
    setEmail(selectedUser.email || '');
    setInvitedUserId(selectedUser.id || null);
    setDepartment(selectedUser.department || '');
    const userTeamId = selectedUser.team_memberships?.[0]?.team?.id || '';
    setTeam(userTeamId);
    setDesignation(selectedUser.designation || '');
    setIsUserListOpen(false);
  };

  const handleSendInvite = () => {
    // Inline validation
    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = 'Email address is required';
    if (!department) newErrors.department = 'Department is required';
    if (!team) newErrors.team = 'Team is required';
    if (!designation) newErrors.designation = 'Designation is required';

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    // Option 2: Update without user reference
    if (isEdit) {
      const payload = {
        email: email,
        designation: designation,
        department: department,
        team_id: team,
        expires_in_days: 30
      };

      updateInvite({ id: invite.id, data: payload }, {
        onSuccess: () => {
          toast.success('Invite updated successfully!');
          onClose();
        },
        onError: (err: any) => {
          toast.error(err.message || 'Failed to update invite');
        }
      });
    } else {
      // Option 1: Create with invited_user_id if available
      const payload: any = {
        email: email,
        designation: designation,
        department: department,
        team_id: team,
        expires_in_days: 30
      };

      if (invitedUserId) {
        payload.invited_user_id = invitedUserId;
      }

      createInvite(payload, {
        onSuccess: () => {
          toast.success('Invite sent successfully!');
          onClose();
        },
        onError: (err: any) => {
          toast.error(err.message || 'Failed to send invite');
        }
      });
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEdit ? "Edit Member Invite" : "Invites via Email"}
        size="md"
      >
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              className="rounded-lg h-9 text-[12px] font-bold border-gray-200 
               hover:bg-gray-50 flex items-center gap-2"
              onClick={() => setIsUserListOpen(true)}
            >
              <Users size={14} />
              Select from Members
            </Button>
          </div>

          {/* Email Row */}
          <div className="flex flex-col gap-1.5">

            <Input
              label='Email Address *'
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              className="h-12 rounded-xl"
            />
          </div>

          {/* Dropdowns Section */}
          <div className="grid grid-cols-1 gap-5">
            {/* Department */}
            <Select
              label="DEPARTMENT *"
              options={departments}
              value={department}
              onChange={handleDepartmentChange}
              error={errors.department}
              placeholder="Select Department"
              className="h-12 !rounded-xl"
              containerClassName="w-full"
            />

            {/* Team */}
            <Select
              label="TEAM *"
              options={teamsOptions}
              value={team}
              onChange={handleTeamChange}
              error={errors.team}
              placeholder={department ? "Select Team" : "Select Department First"}
              disabled={!department}
              className="h-12 !rounded-xl"
              containerClassName="w-full"
            />

            {/* Designation */}
            <Select
              label="DESIGNATION *"
              options={designationsMap[department] || []}
              value={designation}
              onChange={(val) => setDesignation(val as string)}
              error={errors.designation}
              placeholder={team ? "Select Designation" : "Select Team First"}
              disabled={!team}
              className="h-12 !rounded-xl"
              containerClassName="w-full"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 mt-4">
            <Button
              variant="primary"
              fullWidth
              loading={isPending}
              className="h-12 rounded-xl font-black text-base shadow-xl shadow-primary-100"
              onClick={handleSendInvite}
            >
              {isEdit ? "Update Invite" : "Send Invites"}
            </Button>
            <Button
              variant="outline"
              fullWidth
              className="h-12 rounded-xl "
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <UserListModal
        isOpen={isUserListOpen}
        onClose={() => setIsUserListOpen(false)}
        onApply={handleUserSelect}
      />
    </>
  );
};

export default InviteMemberModal;

