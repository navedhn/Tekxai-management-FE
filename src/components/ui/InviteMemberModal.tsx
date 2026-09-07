import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { useGetTeamsQuery } from '@/services/adminService';
import { useGetDesignationsQuery } from '@/services/designationService';
import { useGetDepartmentsQuery } from '@/services/departmentService';
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
  const { data: departmentsData = [] } = useGetDepartmentsQuery();
  const { data: designationsData = [] } = useGetDesignationsQuery();

  const { mutate: createInvite, isPending: isCreating } = useCreateInviteMutation();
  const { mutate: updateInvite, isPending: isUpdating } = useUpdateInviteMutation();

  const isEdit = !!invite;
  const isPending = isCreating || isUpdating;

  React.useEffect(() => {
    if (invite && isOpen) {
      setEmail(invite.email || '');
      setDepartment(invite.department_id || '');
      setTeam(invite.team_id || invite.team?.id || '');
      setDesignation(invite.designation_id || '');
    } else if (!isOpen) {

      setEmail('');
      setDepartment('');
      setTeam('');
      setDesignation('');
      setInvitedUserId(null);
    }
  }, [invite, isOpen]);

  const teamsOptions = Array.isArray((teamsData as any)?.payload?.records)
    ? (teamsData as any).payload.records.map((t: any) => ({ value: t.id, label: t.name }))
    : Array.isArray(teamsData)
      ? (teamsData as any).map((t: any) => ({ value: t.id || t.name, label: t.name }))
      : [];

  const departmentOptions = departmentsData.map((d: any) => ({ value: d.id, label: d.name }));
  const designationOptions = designationsData.map((d) => ({ value: d.id, label: d.name }));

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
    setDepartment(selectedUser.department?.id || selectedUser.department_id || '');
    const userTeamId = selectedUser.team_memberships?.[0]?.team?.id || '';
    setTeam(userTeamId);
    setDesignation(selectedUser.designation_ref?.id || selectedUser.designation_id || '');
    setIsUserListOpen(false);
  };

  const handleSendInvite = () => {

    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = 'Email address is required';
    if (!department) newErrors.department = 'Department is required';
    if (!team) newErrors.team = 'Team is required';
    if (!designation) newErrors.designation = 'Designation is required';

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    if (isEdit) {
      const payload = {
        email: email,
        designation_id: designation,
        department_id: department,
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

      const payload: any = {
        email: email,
        designation_id: designation,
        department_id: department,
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

          <div className="grid grid-cols-1 gap-5">

            <SearchableSelect
              label="DEPARTMENT *"
              options={departmentOptions}
              value={department}
              onChange={(v) => handleDepartmentChange(v ?? '')}
              error={errors.department}
              placeholder="Select Department"
              className="h-12 !rounded-xl"
              containerClassName="w-full"
              clearable={false}
            />

            <SearchableSelect
              label="TEAM *"
              options={teamsOptions}
              value={team}
              onChange={(v) => handleTeamChange(v ?? '')}
              error={errors.team}
              placeholder={department ? "Select Team" : "Select Department First"}
              disabled={!department}
              className="h-12 !rounded-xl"
              containerClassName="w-full"
              clearable={false}
            />

            <SearchableSelect
              label="DESIGNATION *"
              options={designationOptions}
              value={designation}
              onChange={(val) => setDesignation((val ?? '') as string)}
              error={errors.designation}
              placeholder="Select Designation"
              className="h-12 !rounded-xl"
              containerClassName="w-full"
              clearable={false}
            />
          </div>

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
