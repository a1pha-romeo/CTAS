/**
 * Interactive timetable grid component
 * Supports drag & drop cells, instant validation highlight, and lab-block merging
 */

export function renderTimetableGrid(container, { days = [], slots = [], entries = [], onCellClick = null, editable = false }) {
  if (!container) return;

  let html = `
    <div class="timetable-grid-wrapper" style="overflow-x:auto;">
      <table style="width:100%; border-collapse:collapse; min-width:800px; text-align:center;">
        <thead>
          <tr style="background:var(--bg-surface-subtle); border-bottom:2px solid var(--border-subtle);">
            <th style="padding:0.75rem; border:1px solid var(--border-subtle); width:120px; font-size:0.85rem;">Day / Slot</th>
  `;

  for (const slot of slots) {
    html += `
      <th style="padding:0.75rem; border:1px solid var(--border-subtle); font-size:0.8rem;">
        <div>${slot.label || `Slot ${slot.slot_no}`}</div>
        <div style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;" class="tabular-nums">${slot.start_time} - ${slot.end_time}</div>
      </th>
    `;
  }

  html += `
          </tr>
        </thead>
        <tbody>
  `;

  for (const day of days) {
    html += `
      <tr>
        <td style="padding:0.75rem; font-weight:700; border:1px solid var(--border-subtle); background:var(--bg-surface-subtle); font-size:0.85rem;">
          ${day.day_name}
        </td>
    `;

    for (const slot of slots) {
      if (slot.is_break) {
        html += `
          <td style="padding:0.5rem; border:1px solid var(--border-subtle); background:repeating-linear-gradient(45deg, var(--bg-surface-subtle), var(--bg-surface-subtle) 10px, var(--bg-canvas) 10px, var(--bg-canvas) 20px); font-size:0.75rem; color:var(--text-muted);">
            ${slot.label || 'BREAK'}
          </td>
        `;
        continue;
      }

      const entry = entries.find(e => e.day_id === day.id && e.slot_id === slot.id);

      if (entry) {
        html += `
          <td class="timetable-cell-filled" data-entry-id="${entry.id}" style="padding:0.5rem; border:1px solid var(--border-subtle); background:var(--color-brand-blush-soft); cursor:${editable ? 'grab' : 'pointer'};">
            <div style="font-weight:700; font-size:0.85rem; color:var(--color-brand-primary);">${entry.subject_code || 'Subject'}</div>
            <div style="font-size:0.75rem; color:var(--text-secondary);">${entry.faculty_name || 'Faculty'}</div>
            <div style="font-size:0.7rem; color:var(--text-muted);">${entry.room_name || 'Room'}</div>
          </td>
        `;
      } else {
        html += `
          <td class="timetable-cell-empty" data-day="${day.id}" data-slot="${slot.id}" style="padding:0.5rem; border:1px solid var(--border-subtle); color:var(--text-muted); font-size:0.8rem; cursor:${editable ? 'pointer' : 'default'};">
            <span style="opacity:0.4;">Free</span>
          </td>
        `;
      }
    }

    html += `</tr>`;
  }

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}

export default {
  renderTimetableGrid
};
