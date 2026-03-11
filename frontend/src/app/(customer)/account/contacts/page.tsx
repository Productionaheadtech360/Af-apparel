"use client";

import { useEffect, useState } from "react";
import { accountService } from "@/services/account.service";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  title?: string;
  is_primary: boolean;
  notify_order_confirmation: boolean;
  notify_order_shipped: boolean;
  notify_invoices: boolean;
}

export default function AccountContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});

  useEffect(() => { accountService.getContacts().then((d) => setContacts(d as Contact[])); }, []);

  async function toggleNotification(contact: Contact, field: keyof Contact) {
    setIsSaving((prev) => ({ ...prev, [contact.id]: true }));
    const updated = { ...contact, [field]: !contact[field] };
    try {
      const result = await accountService.updateContact(contact.id, updated) as Contact;
      setContacts((prev) => prev.map((c) => (c.id === result.id ? result : c)));
    } finally { setIsSaving((prev) => ({ ...prev, [contact.id]: false })); }
  }

  async function handleDelete(id: string) {
    await accountService.deleteContact(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Contacts</h1>
      <div className="space-y-3">
        {contacts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No contacts added</p>
        ) : contacts.map((c) => (
          <div key={c.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{c.first_name} {c.last_name} {c.is_primary && <span className="text-xs text-brand-600">(Primary)</span>}</p>
                <p className="text-xs text-gray-500">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
                {c.title && <p className="text-xs text-gray-400">{c.title}</p>}
              </div>
              <button onClick={() => handleDelete(c.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
            </div>
            <div className="flex gap-4 text-xs text-gray-600">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={c.notify_order_confirmation} onChange={() => toggleNotification(c, "notify_order_confirmation")} disabled={isSaving[c.id]} />
                Order confirmations
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={c.notify_order_shipped} onChange={() => toggleNotification(c, "notify_order_shipped")} disabled={isSaving[c.id]} />
                Shipping updates
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={c.notify_invoices} onChange={() => toggleNotification(c, "notify_invoices")} disabled={isSaving[c.id]} />
                Invoices
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
