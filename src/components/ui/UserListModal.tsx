import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useFetchUsersQuery } from '@/services/userService';
import { Search, UserPlus, Check } from 'lucide-react';

interface UserListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (selectedUser: any) => void;
}

const UserListModal: React.FC<UserListModalProps> = ({ isOpen, onClose, onApply }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | number | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const { data: usersData, isLoading } = useFetchUsersQuery(undefined, isOpen);

  const users = (usersData as any)?.payload?.records || (usersData as any)?.payload || [];

  const filteredUsers = users.filter((user: any) =>
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectUser = (user: any) => {
    setSelectedUserId(user.id);
    setSelectedUser(user);
  };

  const handleApply = () => {
    if (selectedUser) {
      onApply(selectedUser);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Team Member"
      size="md"
    >
      <div className="flex flex-col gap-6 max-h-[70vh]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-xl"
          />
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-primary-100 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-gray-500 font-medium">
              No users found.
            </div>
          ) : (
            filteredUsers.map((user: any) => (
              <div
                key={user.id}
                onClick={() => handleSelectUser(user)}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${selectedUserId === user.id
                  ? 'border-primary-500 bg-primary-50/50 shadow-sm'
                  : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold uppercase">
                    {user.first_name?.[0]}{user.last_name?.[0]}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900 leading-tight">
                      {user.first_name} {user.last_name}
                    </span>
                    <span className="text-sm text-gray-500 font-medium">
                      {user.email}
                    </span>
                  </div>
                </div>

                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${selectedUserId === user.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-400'
                  }`}>
                  {selectedUserId === user.id ? <Check size={14} strokeWidth={3} /> : <UserPlus size={14} />}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            fullWidth
            className="h-12 rounded-xl font-bold"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            fullWidth
            disabled={!selectedUserId}
            className="h-12 rounded-xl font-black shadow-lg shadow-primary-100"
            onClick={handleApply}
          >
            Apply Selection
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UserListModal;
