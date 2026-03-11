"use client";

import { useEffect, useState } from "react";
import { accountService } from "@/services/account.service";

export default function AccountProfilePage() {
  const [profile, setProfile] = useState<{ first_name: string; last_name: string; email: string; phone?: string } | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [isSavingPw, setIsSavingPw] = useState(false);

  useEffect(() => {
    accountService.getProfile().then((p: unknown) => {
      const prof = p as { first_name: string; last_name: string; email: string; phone?: string };
      setProfile(prof);
      setFirstName(prof.first_name);
      setLastName(prof.last_name);
      setPhone(prof.phone ?? "");
    });
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true); setMsg(null);
    try {
      await accountService.updateProfile({ first_name: firstName, last_name: lastName, phone: phone || undefined });
      setMsg("Profile updated");
    } catch { setMsg("Failed to save"); } finally { setIsSaving(false); }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingPw(true); setPwMsg(null);
    try {
      await accountService.changePassword(currentPw, newPw);
      setPwMsg("Password changed"); setCurrentPw(""); setNewPw("");
    } catch { setPwMsg("Failed to change password"); } finally { setIsSavingPw(false); }
  }

  if (!profile) return <div className="text-gray-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Profile</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Personal Information</h2>
        <form onSubmit={handleSaveProfile} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">First Name</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Last Name</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email</label>
            <input type="email" value={profile.email} disabled className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-gray-50 text-gray-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          {msg && <p className="text-sm text-green-600">{msg}</p>}
          <button type="submit" disabled={isSaving} className="bg-brand-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {isSaving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Current Password</label>
            <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">New Password</label>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} minLength={8} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          {pwMsg && <p className="text-sm text-green-600">{pwMsg}</p>}
          <button type="submit" disabled={isSavingPw || !currentPw || !newPw} className="bg-brand-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {isSavingPw ? "Saving…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
