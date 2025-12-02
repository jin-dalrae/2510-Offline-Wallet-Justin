import { useState, useEffect } from 'react';
import { firebase } from '../../lib/firebase';
import { adminActions } from '../../lib/adminActions';
import { useWallet } from '../../hooks/useWallet';

export function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'suspended'>('all');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const wallet = useWallet();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await firebase.getAllUsers(100);
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.accountName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'active' && user.status !== 'suspended') ||
      (selectedStatus === 'suspended' && user.status === 'suspended');

    return matchesSearch && matchesStatus;
  });

  const handleSuspend = async () => {
    if (!selectedUser || !suspendReason.trim()) return;

    await adminActions.suspendUser(
      selectedUser.id,
      suspendReason,
      wallet.accountName || 'admin'
    );

    setSuspendReason('');
    setSelectedUser(null);
    await loadUsers();
  };

  const handleUnsuspend = async (userId: string) => {
    await adminActions.unsuspendUser(userId, wallet.accountName || 'admin');
    await loadUsers();
  };

  const handleExport = () => {
    const exportData = filteredUsers.map((user) => ({
      id: user.id,
      username: user.username,
      accountName: user.accountName,
      status: user.status || 'active',
      createdAt: new Date(user.createdAt).toISOString(),
      role: user.role || 'user',
    }));
    adminActions.exportToCSV(exportData, 'users');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-600">Manage user accounts and permissions</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2d4a6f] transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:ring-0 outline-none"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="px-4 py-3 border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:ring-0 outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-[#1e3a5f] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Username</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Account Name</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Created</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-sm">{user.username || user.id}</td>
                    <td className="py-3 px-4">{user.accountName || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {user.role || 'user'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.status === 'suspended'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {user.status === 'suspended' ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {user.status === 'suspended' ? (
                        <button
                          onClick={() => handleUnsuspend(user.id)}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                        >
                          Unsuspend
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              Suspend User: {selectedUser.username}
            </h3>
            <textarea
              placeholder="Reason for suspension..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-xl focus:border-[#1e3a5f] focus:ring-0 outline-none mb-4"
              rows={4}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setSelectedUser(null); setSuspendReason(''); }}
                className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                disabled={!suspendReason.trim()}
                className="flex-1 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition disabled:opacity-50"
              >
                Suspend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
