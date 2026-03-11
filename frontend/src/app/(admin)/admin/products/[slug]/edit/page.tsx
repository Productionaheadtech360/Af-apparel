"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminService } from "@/services/admin.service";
import { ImageManager } from "@/components/admin/ImageManager";
import { VariantGenerator } from "@/components/admin/VariantGenerator";
import type { ProductDetail } from "@/types/product.types";

export default function AdminProductEditPage() {
  const { slug: id } = useParams<{ slug: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "draft",
    moq: 1,
    meta_title: "",
    meta_description: "",
  });

  useEffect(() => {
    if (id === "new") return;
    adminService.listProducts().then((products) => {
      const p = products.find((pr) => pr.id === id);
      if (p) {
        setProduct(p);
        setForm({
          name: p.name,
          description: p.description ?? "",
          status: p.status,
          moq: p.moq,
          meta_title: p.meta_title ?? "",
          meta_description: p.meta_description ?? "",
        });
      }
    });
  }, [id]);

  async function handleSave() {
    setIsSaving(true);
    try {
      if (id === "new") {
        await adminService.createProduct({ ...form, slug: form.name.toLowerCase().replace(/\s+/g, "-") });
        router.push("/admin/products");
      } else {
        await adminService.updateProduct(id, form);
        router.push("/admin/products");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          {id === "new" ? "New Product" : "Edit Product"}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/admin/products")}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic info */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Basic Information</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MOQ</label>
              <input
                type="number"
                min={1}
                value={form.moq}
                onChange={(e) => setForm((p) => ({ ...p, moq: Number(e.target.value) }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* SEO */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">SEO</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
            <input
              type="text"
              value={form.meta_title}
              onChange={(e) => setForm((p) => ({ ...p, meta_title: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
            <textarea
              rows={2}
              value={form.meta_description}
              onChange={(e) => setForm((p) => ({ ...p, meta_description: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Images — only for existing products */}
        {product && id !== "new" && (
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Images</h2>
            <ImageManager
              productId={id}
              initialImages={product.images ?? []}
              onUpdate={() => {/* reload product */}}
            />
          </div>
        )}

        {/* Variants — only for existing products */}
        {product && id !== "new" && (
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Variants</h2>
            <VariantGenerator
              productId={id}
              onGenerated={() => {/* reload */}}
            />
          </div>
        )}
      </div>
    </div>
  );
}
