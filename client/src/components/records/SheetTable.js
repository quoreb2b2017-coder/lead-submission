"use client";

import { FileSpreadsheet } from "lucide-react";

const colLetter = (i) => {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

const STATUS_STYLE = {
  sent: { dot: "bg-emerald-500", text: "text-emerald-700" },
  dry_run: { dot: "bg-amber-500", text: "text-amber-700" },
  failed: { dot: "bg-red-500", text: "text-red-700" },
  not_sent: { dot: "bg-slate-400", text: "text-slate-600" },
};

/**
 * Spreadsheet-style table: column letters, row numbers, gridlines, sticky header,
 * sticky row-number + first data column, and a sheet tab footer.
 *
 * columns: [{ key, label, meta?, hidden?, width? }]  rows: objects keyed by column key
 */
export default function SheetTable({
  columns,
  rows,
  sheetName,
  onRowClick,
  maxHeight = 520,
  emptyText = "No leads in this sheet yet.",
  footerRight,
  selectable = false,
  selected,
  onToggle,
  onToggleAll,
}) {
  const allSelected = selectable && rows.length > 0 && rows.every((r) => selected?.has(r._id));
  const someSelected = selectable && !allSelected && rows.some((r) => selected?.has(r._id));
  const checkbox = "h-3.5 w-3.5 cursor-pointer rounded border-slate-300 accent-indigo-600";
  const dataCols = columns.filter((c) => c.key !== "_n");

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-max min-w-full border-separate border-spacing-0 text-[12.5px] text-slate-800">
          <thead className="sticky top-0 z-20">
            {/* Column letters */}
            <tr>
              <th className="sticky left-0 z-30 h-6 w-11 min-w-11 border-b border-r border-slate-300 bg-slate-100" />
              {dataCols.map((c, i) => (
                <th
                  key={`l-${c.key}`}
                  className={`h-6 border-b border-r border-slate-300 bg-slate-100 px-2 text-center text-[11px] font-medium text-slate-500 ${
                    i === 0 ? "sticky left-11 z-30" : ""
                  }`}
                >
                  {colLetter(i)}
                </th>
              ))}
            </tr>
            {/* Field names */}
            <tr>
              <th className="sticky left-0 z-30 h-8 border-b border-r border-slate-300 bg-slate-100 text-center text-[11px] font-medium text-slate-500">
                {selectable ? (
                  <input
                    type="checkbox"
                    className={checkbox}
                    checked={allSelected}
                    ref={(el) => el && (el.indeterminate = someSelected)}
                    onChange={onToggleAll}
                    aria-label="Select all rows"
                  />
                ) : (
                  1
                )}
              </th>
              {dataCols.map((c, i) => (
                <th
                  key={`h-${c.key}`}
                  title={c.label !== c.key ? c.label : undefined}
                  className={`h-8 whitespace-nowrap border-b border-r border-slate-300 px-3 text-left font-semibold ${
                    c.meta ? "bg-slate-50 text-slate-700" : c.hidden ? "bg-slate-50 text-slate-500" : "bg-indigo-50/60 text-indigo-900"
                  } ${i === 0 ? "sticky left-11 z-30" : ""}`}
                  style={{ minWidth: c.width || (c.meta ? 120 : 140) }}
                >
                  <span className={c.meta ? "" : "font-mono text-[11.5px]"}>{c.meta ? c.label : c.key}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
                <tr
                  key={r._id || ri}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                  className={`group ${onRowClick ? "cursor-pointer" : ""} ${selectable && selected?.has(r._id) ? "[&>td]:!bg-indigo-50" : ""}`}
                >
                  <td className="sticky left-0 z-10 h-8 border-b border-r border-slate-200 bg-slate-50 text-center text-[11px] text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-700">
                    {selectable ? (
                      <input
                        type="checkbox"
                        className={checkbox}
                        checked={Boolean(selected?.has(r._id))}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => onToggle?.(r._id)}
                        aria-label={`Select row ${ri + 2}`}
                      />
                    ) : (
                      ri + 2
                    )}
                  </td>
                  {dataCols.map((c, i) => {
                    const v = r[c.key];
                    const style = c.key === "_status" ? STATUS_STYLE[r._statusKey] || STATUS_STYLE.not_sent : null;
                    return (
                      <td
                        key={c.key}
                        className={`h-8 max-w-[320px] truncate whitespace-nowrap border-b border-r border-slate-200 px-3 group-hover:bg-indigo-50/50 ${
                          i === 0 ? "sticky left-11 z-10 bg-white font-medium group-hover:bg-indigo-50" : ""
                        } ${c.key === "_submittedAt" ? "tabular-nums text-slate-600" : ""}`}
                        title={v ? String(v) : undefined}
                      >
                        {style ? (
                          <span className={`inline-flex items-center gap-1.5 font-semibold ${style.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                            {v}
                          </span>
                        ) : v === "" || v == null ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          String(v)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <div className="flex flex-col items-center border-t border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
          <FileSpreadsheet className="mb-2 h-6 w-6 text-slate-300" />
          {emptyText}
        </div>
      )}

      {/* Sheet tab bar */}
      <div className="flex items-center justify-between gap-3 border-t border-slate-300 bg-slate-100 px-2">
        <div className="flex items-end">
          <span className="-mt-px inline-flex items-center gap-1.5 border-x border-b-2 border-slate-300 border-b-emerald-600 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <FileSpreadsheet className="h-3.5 w-3.5" /> {sheetName}
          </span>
        </div>
        <div className="py-1.5 text-[11px] text-slate-500">
          {footerRight ?? `${rows.length} row${rows.length === 1 ? "" : "s"}`}
        </div>
      </div>
    </div>
  );
}
