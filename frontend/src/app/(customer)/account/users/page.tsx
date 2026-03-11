"use client";

import { useEffect, useState } from "react";
import { accountService } from "@/services/account.service";

interface CompanyUser {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
}

export default function AccountUsersPage() {
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirst, setInviteFirst] = useState("");
  const [inviteLast, setInviteLast] = useState("");
  const [inviteRole, setInviteRole] = useState("buyer");
  const [showForm, setShowForm] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { accountService.getUsers().then((d) => setUsers(d as CompanyUser[])); }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setIsInviting(true); setMsg(null);
    try {
      await accountService.inviteUser({ email: inviteEmail, first_name: inviteFirst, last_name: inviteLast, role: inviteRole });
      setMsg("Invitation sent");
      setInviteEmail(""); setInviteFirst(""); setInviteLast(""); setShowForm(false);
      accountService.getUsers().then((d) => setUsers(d as CompanyUser[]));
    } catch { setMsg("Failed to invite user"); } finally { setIsInviting(false); }
  }

  async function handleRoleChange(userId: string, role: string) {
    await accountService.updateUserRole(userId, role);
    setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, role } : u)));
  }

  async function handleRemove(userId: string) {
    await accountService.removeUser(userId);
    setUsers((prev) => prev.filter((u) => u.user_id !== userId));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Team Members</h1>
        <button onClick={() => setShowForm(true)} className="bg-brand-600 text-white rounded-md px-3 py-1.5 text-sm hover:bg-brand-700">Invite User</button>
      </div>

      {msg && <p className="mb-3 text-sm text-green-600">{msg}</p>}

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={inviteFirst} onChange={(e) => setInviteFirst(e.target.value)} placeholder="First name" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input type="text" value={inviteLast} onChange={(e) => setInviteLast(e.target.value)} placeholder="Last name" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Email address" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="buyer">Buyer</option>
              <option value="viewer">Viewer</option>
              <option value="finance">Finance</option>
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={isInviting} className="bg-brand-600 text-white rounded-md px-4 py-1.5 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                {isInviting ? "Inviting…" : "Send Invite"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Name</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Email</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Role</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-gray-400">No team members</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-medium text-gray-900">{u.first_name} {u.last_name}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  {u.role !== "owner" ? (
                    <select value={u.role} onChange={(e) => handleRoleChange(u.user_id, e.target.value)} className="rounded border border-gray-300 px-2 py-1 text-xs">
                      <option value="buyer">Buyer</option>
                      <option value="viewer">Viewer</option>
                      <option value="finance">Finance</option>
                    </select>
                  ) : (
                    <span className="text-xs font-medium text-gray-600">Owner</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.role !== "owner" && (
                    <button onClick={() => handleRemove(u.user_id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
