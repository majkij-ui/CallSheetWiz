/**
 * Print the call sheet via a detached document.
 *
 * Calling window.print() on the live app (especially inside Cursor / Electron
 * previews) applies @media print to the React tree — timeline, ResizeObserver,
 * DnD — and can hang or OOM the host. A static iframe document avoids that.
 */

import type { Category, PlannerEvent } from "@/lib/schedule-types"
import { getCategoryStyle } from "@/lib/schedule-types"
import { getDurationMinutes, minutesToHHMM } from "@/lib/time"

export interface PrintCallSheetInput {
  title: string
  shootDate: Date
  events: PlannerEvent[]
  categories: Category[]
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function formatDuration(startMinutes: number, endMinutes: number): string {
  const duration = getDurationMinutes(startMinutes, endMinutes)
  if (duration >= 60) {
    const hours = Math.floor(duration / 60)
    const minutes = duration % 60
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
  return `${duration}m`
}

const PRINT_STYLES = `
  @page { size: A4; margin: 1.2cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Inter, Arial, Helvetica, sans-serif;
    color: #111827;
    background: #fff;
    line-height: 1.35;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 1.5pt solid #111827;
    margin: 0 0 1rem;
    padding: 0 0 0.55rem;
  }
  .header h1 {
    font-size: 1.55rem;
    line-height: 1.2;
    font-weight: 700;
    letter-spacing: 0.01em;
  }
  .header p {
    font-size: 0.95rem;
    font-weight: 500;
    color: #4b5563;
  }
  .table {
    border: 0.75pt solid #d1d5db;
    width: 100%;
  }
  .cols, .row-main {
    display: grid;
    grid-template-columns: 3.6cm 2cm 1fr 1.5cm;
    align-items: start;
  }
  .cols {
    background: #f3f4f6;
    border-bottom: 0.75pt solid #d1d5db;
    color: #374151;
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .cols > * { padding: 7px 10px 6px; }
  .cols > :nth-child(3),
  .cols > :nth-child(4) { border-left: 0.5pt solid #d1d5db; }
  .cols > :nth-child(4) { text-align: center; }
  .row {
    position: relative;
    break-inside: avoid;
    page-break-inside: avoid;
    border-bottom: 0.5pt solid #d1d5db;
    background: #fff;
  }
  .row:nth-child(odd) { background: #f7f8fa; }
  .row:last-child { border-bottom: none; }
  .row::before, .row::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    border-left: 0.5pt solid #d1d5db;
    pointer-events: none;
  }
  .row::before { left: calc(3.6cm + 2cm); }
  .row::after { right: 1.5cm; }
  .cell { padding: 8px 10px 7px; }
  .time {
    font-size: 11pt;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .dur {
    font-size: 10.5pt;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .title {
    font-size: 10.5pt;
    font-weight: 650;
    line-height: 1.3;
  }
  .notes {
    display: block;
    margin-top: 2px;
    color: #4b5563;
    font-size: 9.5pt;
    line-height: 1.35;
  }
  .tag {
    display: inline-block;
    margin: 0 0 7px 10px;
    border: 0.5pt solid #d1d5db;
    border-radius: 2px;
    background: #fff;
    color: #4b5563;
    font-size: 7.75pt;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    padding: 0.08rem 0.4rem;
  }
  .done {
    grid-column: 4;
    grid-row: 1 / span 2;
    place-self: center;
    width: 14px;
    height: 14px;
    border: 1pt solid #374151;
    border-radius: 2px;
    background: #fff;
  }
  .subs {
    padding: 0 10px 8px calc(3.6cm + 2cm + 10px);
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .sub {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    margin: 0 0 3px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .sub-box {
    width: 9px;
    height: 9px;
    border: 0.75pt solid #6b7280;
    border-radius: 1px;
    margin-top: 3px;
    flex: 0 0 9px;
  }
  .sub span {
    font-size: 9pt;
    color: #374151;
    line-height: 1.35;
  }
  .end {
    text-align: center;
    color: #9ca3af;
    font-size: 8.5pt;
    letter-spacing: 0.1em;
    font-weight: 500;
    padding: 10px 0 8px;
  }
`

function buildPrintHtml(input: PrintCallSheetInput): string {
  const categoryMap = new Map(input.categories.map((c) => [c.id, c]))
  const sorted = [...input.events].sort((a, b) => a.startMinutes - b.startMinutes)
  const dateLabel = input.shootDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const rows = sorted
    .map((event) => {
      const category = categoryMap.get(event.categoryId)
      const label = category ? getCategoryStyle(category).label : "Uncategorized"
      const notes = event.notes
        ? `<span class="notes">${escapeHtml(event.notes)}</span>`
        : ""
      const subItems = event.subItems ?? []
      const subs =
        subItems.length > 0
          ? `<div class="subs">${subItems
              .map(
                (sub) =>
                  `<div class="sub"><i class="sub-box"></i><span>${escapeHtml(sub.text)}</span></div>`
              )
              .join("")}</div>`
          : ""

      return `<div class="row">
        <div class="row-main">
          <div class="cell time">${escapeHtml(minutesToHHMM(event.startMinutes))} – ${escapeHtml(minutesToHHMM(event.endMinutes))}</div>
          <div class="cell dur">${escapeHtml(formatDuration(event.startMinutes, event.endMinutes))}</div>
          <div class="cell">
            <div class="title">${escapeHtml(event.title)}</div>
            ${notes}
          </div>
          <div class="done"></div>
        </div>
        <span class="tag">${escapeHtml(label)}</span>
        ${subs}
      </div>`
    })
    .join("")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.title || "Call Sheet")}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(input.title || "Untitled Shoot")}</h1>
    <p>${escapeHtml(dateLabel)}</p>
  </div>
  <div class="table">
    <div class="cols">
      <span>Time</span>
      <span>Dur</span>
      <span>Activity</span>
      <span>Done</span>
    </div>
    ${rows || `<div class="row"><div class="cell" style="grid-column:1/-1;padding:12px 10px;color:#6b7280;">No events scheduled.</div></div>`}
    <div class="end">— END OF SCHEDULE —</div>
  </div>
</body>
</html>`
}

function printViaIframe(html: string): void {
  const iframe = document.createElement("iframe")
  iframe.setAttribute("title", "Call sheet print")
  iframe.setAttribute("aria-hidden", "true")
  // Real A4 box off-screen — zero-size frames can hang Chromium/Electron print.
  Object.assign(iframe.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "210mm",
    height: "297mm",
    border: "0",
    opacity: "0",
    pointerEvents: "none",
  })
  document.body.appendChild(iframe)

  const win = iframe.contentWindow
  const doc = iframe.contentDocument
  if (!win || !doc) {
    iframe.remove()
    throw new Error("Unable to create print frame")
  }

  let cleaned = false
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    iframe.remove()
  }

  win.addEventListener("afterprint", cleanup)
  // Some embeds never fire afterprint; don't leave orphan frames around.
  window.setTimeout(cleanup, 60_000)

  doc.open()
  doc.write(html)
  doc.close()

  // Let the detached document finish layout before invoking print.
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      try {
        win.focus()
        win.print()
      } catch {
        cleanup()
      }
    })
  })
}

function isElectronHost(): boolean {
  if (typeof navigator === "undefined") return false
  if (/Electron/i.test(navigator.userAgent)) return true
  const proc = (window as Window & { process?: { versions?: { electron?: string } } }).process
  return Boolean(proc?.versions?.electron)
}

function downloadHtml(html: string, filename: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.rel = "noopener"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

function slugFilename(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return `${slug || "call-sheet"}.html`
}

export type PrintCallSheetResult = "printed" | "downloaded"

/**
 * Export / print the call sheet without applying print media to the live app.
 * In Electron hosts (Cursor Simple Browser, etc.) print() is unsafe — download
 * a self-contained HTML file instead so the user can open it in a real browser.
 */
export function printCallSheet(input: PrintCallSheetInput): PrintCallSheetResult {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return "printed"
  }
  const html = buildPrintHtml(input)
  if (isElectronHost()) {
    downloadHtml(html, slugFilename(input.title))
    return "downloaded"
  }
  printViaIframe(html)
  return "printed"
}
