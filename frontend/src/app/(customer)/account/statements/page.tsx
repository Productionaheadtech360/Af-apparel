"use client";

import { useEffect, useState } from "react";

export default function AccountStatementsPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Statements</h1>
      <p className="text-sm text-gray-500 mb-6">Monthly account statements are generated at end of each billing cycle.</p>
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-400">No statements available yet</p>
        <p className="text-xs text-gray-300 mt-1">Statements will appear here once your first billing cycle completes</p>
      </div>
    </div>
  );
}
