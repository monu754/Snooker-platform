"use client";

import { useState, useEffect } from "react";
import { Trash2, Shield, User as UserIcon, ShieldAlert, AlertCircle, Search } from "lucide-react";

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "umpire" | "user";
  createdAt: string;
}

export default function UserManagerPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch users");
      }
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update role");
      }
      
      setUsers((prev) => 
        prev.map((user) => (user._id === userId ? { ...user, role: newRole as any } : user))
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this user?")) return;
    
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete user");
      }
      
      setUsers((prev) => prev.filter((user) => user._id !== userId));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8"><div className="animate-pulse h-10 w-48 bg-zinc-900 rounded mb-8"></div><div className="h-[400px] bg-zinc-900 rounded-xl"></div></div>;
  if (error) return <div className="p-8 text-red-500 flex items-center gap-2"><AlertCircle /> {error}</div>;

  return (
    <div className="p-8 font-sans">
      <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">User Manager</h1>
          <p className="text-zinc-400">Manage viewing accounts, assign umpires, and control access.</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            placeholder="Search users..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-[#18181b] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-500/50 w-full md:w-64 transition-colors"
          />
        </div>
      </header>

      <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#09090b] border-b border-zinc-800 text-zinc-400 text-sm uppercase tracking-wider">
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Joined</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500">No users found matching "{searchTerm}"</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${
                          user.role === 'admin' ? 'bg-purple-500/10 text-purple-400' : 
                          user.role === 'umpire' ? 'bg-orange-500/10 text-orange-400' : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {user.role === 'admin' ? <Shield size={18} /> : 
                           user.role === 'umpire' ? <ShieldAlert size={18} /> : <UserIcon size={18} />}
                        </div>
                        <span className="font-medium text-white">{user.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-zinc-400 text-sm">{user.email}</td>
                    <td className="p-4 text-zinc-500 text-sm">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="p-4">
                      <select 
                        value={user.role}
                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                        disabled={updatingId === user._id}
                        className={`text-sm px-3 py-1.5 rounded-lg border appearance-none outline-none cursor-pointer transition-colors ${
                          user.role === 'admin' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400 focus:border-purple-500/50' : 
                          user.role === 'umpire' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400 focus:border-orange-500/50' : 
                          'bg-zinc-900 border-zinc-800 text-zinc-300 focus:border-zinc-700'
                        }`}
                      >
                        <option value="user" className="bg-[#18181b] text-white">Viewer</option>
                        <option value="umpire" className="bg-[#18181b] text-white">Umpire</option>
                        <option value="admin" className="bg-[#18181b] text-white">Admin</option>
                      </select>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleDeleteUser(user._id)}
                        disabled={updatingId === user._id || user.role === 'admin'}
                        className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={user.role === 'admin' ? "Cannot delete an admin" : "Delete user"}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}