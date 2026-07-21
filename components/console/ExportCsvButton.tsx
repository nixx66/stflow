"use client";

import { Download } from "lucide-react";
import { buildV2Csv } from "@/lib/v2MockData";

export function ExportCsvButton() {
  function handleExport() {
    const blob = new Blob([buildV2Csv()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "stflow-v2-invoices.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-bold text-white transition hover:bg-slate-800 active:translate-y-px"
      onClick={handleExport}
      type="button"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </button>
  );
}
