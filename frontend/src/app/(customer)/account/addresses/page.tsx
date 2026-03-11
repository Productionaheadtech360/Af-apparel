"use client";

import { useEffect, useState } from "react";
import { accountService } from "@/services/account.service";

interface Address {
  id: string;
  label: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

const EMPTY = { label: "", address_line1: "", address_line2: "", city: "", state: "", postal_code: "", country: "US", is_default: false };

export default function AccountAddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { accountService.getAddresses().then((d) => setAddresses(d as Address[])); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editId) {
        const updated = await accountService.updateAddress(editId, form) as Address;
        setAddresses((prev) => prev.map((a) => (a.id === editId ? updated : a)));
      } else {
        const created = await accountService.createAddress(form) as Address;
        setAddresses((prev) => [...prev, created]);
      }
      setShowForm(false); setEditId(null); setForm(EMPTY);
    } finally { setIsSaving(false); }
  }

  async function handleDelete(id: string) {
    await accountService.deleteAddress(id);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  function startEdit(a: Address) {
    setForm({ label: a.label, address_line1: a.address_line1, address_line2: a.address_line2 ?? "", city: a.city, state: a.state, postal_code: a.postal_code, country: a.country, is_default: a.is_default });
    setEditId(a.id); setShowForm(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Address Book</h1>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY); }} className="bg-brand-600 text-white rounded-md px-3 py-1.5 text-sm hover:bg-brand-700">Add Address</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <form onSubmit={handleSave} className="space-y-3">
            <input type="text" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Label (e.g. Warehouse)" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input type="text" value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} placeholder="Address Line 1" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input type="text" value={form.address_line2} onChange={(e) => setForm({ ...form, address_line2: e.target.value })} placeholder="Address Line 2" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <div className="grid grid-cols-3 gap-2">
              <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input type="text" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input type="text" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} placeholder="ZIP" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
              Default address
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={isSaving} className="bg-brand-600 text-white rounded-md px-4 py-1.5 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                {isSaving ? "Saving…" : editId ? "Update" : "Add"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-2">
        {addresses.map((a) => (
          <div key={a.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{a.label} {a.is_default && <span className="text-xs text-brand-600">(Default)</span>}</p>
              <p className="text-sm text-gray-600">{a.address_line1}{a.address_line2 ? `, ${a.address_line2}` : ""}</p>
              <p className="text-sm text-gray-600">{a.city}, {a.state} {a.postal_code}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(a)} className="text-xs text-brand-600 hover:text-brand-800">Edit</button>
              <button onClick={() => handleDelete(a.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
            </div>
          </div>
        ))}
        {addresses.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No addresses saved</p>}
      </div>
    </div>
  );
}
