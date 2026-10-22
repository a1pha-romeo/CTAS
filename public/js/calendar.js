/**
 * Month grid calendar with Green-Present convention (Phase 7 & 9)
 * Green = faculty is present & has scheduled classes / working
 * Soft Red = marked absent
 * Amber = late
 * Grey = holiday or non-working day
 */

export function renderCalendar(containerElement, year, month, options = {}) {
  if (!containerElement) return;

  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  let html = `
    <div class="calendar-wrapper">
      <div class="calendar-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <h3 style="font-size:1.4rem; color:var(--color-brand-primary);">${monthNames[month]} ${year}</h3>
        <div style="display:flex; gap:0.5rem;">
          <button class="btn-secondary" id="cal-prev" style="padding:0.35rem 0.75rem;">&larr;</button>
          <button class="btn-secondary" id="cal-today" style="padding:0.35rem 0.75rem;">Today</button>
          <button class="btn-secondary" id="cal-next" style="padding:0.35rem 0.75rem;">&rarr;</button>
        </div>
      </div>

      <div class="calendar-legend" style="display:flex; gap:1.25rem; font-size:0.8rem; margin-bottom:1rem; flex-wrap:wrap;">
        <span style="display:flex; align-items:center; gap:0.4rem;">
          <span style="width:12px; height:12px; border-radius:3px; background:var(--color-success);"></span> Present & Teaching
        </span>
        <span style="display:flex; align-items:center; gap:0.4rem;">
          <span style="width:12px; height:12px; border-radius:3px; background:var(--color-error);"></span> Absent
        </span>
        <span style="display:flex; align-items:center; gap:0.4rem;">
          <span style="width:12px; height:12px; border-radius:3px; background:var(--color-warning);"></span> Late
        </span>
        <span style="display:flex; align-items:center; gap:0.4rem;">
          <span style="width:12px; height:12px; border-radius:3px; background:var(--border-subtle);"></span> Holiday / Weekend
        </span>
      </div>

      <div class="calendar-grid" style="display:grid; grid-template-columns:repeat(7, 1fr); gap:6px; text-align:center;">
        <div style="font-weight:600; font-size:0.8rem; padding:0.4rem; color:var(--text-muted);">Sun</div>
        <div style="font-weight:600; font-size:0.8rem; padding:0.4rem; color:var(--text-muted);">Mon</div>
        <div style="font-weight:600; font-size:0.8rem; padding:0.4rem; color:var(--text-muted);">Tue</div>
        <div style="font-weight:600; font-size:0.8rem; padding:0.4rem; color:var(--text-muted);">Wed</div>
        <div style="font-weight:600; font-size:0.8rem; padding:0.4rem; color:var(--text-muted);">Thu</div>
        <div style="font-weight:600; font-size:0.8rem; padding:0.4rem; color:var(--text-muted);">Fri</div>
        <div style="font-weight:600; font-size:0.8rem; padding:0.4rem; color:var(--text-muted);">Sat</div>
  `;

  // Empty leading days
  for (let i = 0; i < firstDay; i++) {
    html += `<div style="height:70px; border-radius:var(--radius-sm); background:var(--bg-surface-subtle); opacity:0.3;"></div>`;
  }

  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = isCurrentMonth && today.getDate() === day;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayOfWeek = (firstDay + day - 1) % 7;
    const isWeekend = dayOfWeek === 0;

    const bg = isWeekend ? 'var(--bg-surface-subtle)' : 'var(--color-success-bg)';
    const textCol = isWeekend ? 'var(--text-muted)' : 'var(--color-success)';
    const border = isToday ? '2px solid var(--color-brand-primary)' : '1px solid var(--border-subtle)';

    html += `
      <div class="cal-day-cell" data-date="${dateStr}" style="height:70px; border-radius:var(--radius-sm); background:${bg}; border:${border}; padding:0.4rem; cursor:pointer; text-align:left; display:flex; flex-direction:column; justify-content:space-between; transition:transform 0.15s ease;">
        <span style="font-weight:700; font-size:0.85rem; color:${textCol};">${day}</span>
        ${!isWeekend ? `<span style="font-size:0.65rem; color:${textCol}; font-weight:600;">Working</span>` : `<span style="font-size:0.65rem; color:var(--text-muted);">Holiday</span>`}
      </div>
    `;
  }

  html += `
      </div>
    </div>
  `;

  containerElement.innerHTML = html;

  // Add click listener
  containerElement.querySelectorAll('.cal-day-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      const date = cell.getAttribute('data-date');
      if (options.onDateClick) {
        options.onDateClick(date);
      }
    });
  });
}

export default {
  renderCalendar
};
