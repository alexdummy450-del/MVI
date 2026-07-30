"use client";

import { useState } from "react";
import { format } from "date-fns";

export function ExportMonthly() {
  // Default to current month
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  return (
    <div className="card p-4 space-y-4">
      <h2 className="text-lg font-semibold text-forest-800">Admin: Monthly Reports</h2>
      <p className="text-sm text-forest-500">
        Generate and download bulk reports for a specific month.
      </p>
      
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <label htmlFor="month" className="block text-xs font-medium text-forest-700">
            Select Month
          </label>
          <input
            type="month"
            id="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-1.5 rounded border border-forest-200 focus:outline-none focus:ring-2 focus:ring-forest-500/20 text-sm"
          />
        </div>
        
        <div className="flex gap-2">
          <a
            href={`/api/export-csv?month=${month}`}
            className="px-4 py-1.5 bg-forest-100 hover:bg-forest-200 text-forest-800 text-sm font-medium rounded shadow-sm transition-colors border border-forest-200"
          >
            Download CSV
          </a>
          
          <a
            href={`/api/export-zip?month=${month}`}
            className="px-4 py-1.5 bg-forest-800 hover:bg-forest-900 text-white text-sm font-medium rounded shadow-sm transition-colors"
          >
            Download ZIP (Word Docs)
          </a>
        </div>
      </div>
    </div>
  );
}
