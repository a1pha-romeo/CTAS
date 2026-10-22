import { apiRequest } from '/js/api.js';
import { checkSession, logout } from '/js/auth.js';
import { showToast } from '/js/toast.js';
import { initSSE, onEvent } from '/js/sse.js';

let currentTab = 'overview';
let activeVersionId = null;
let currentVersionData = null;
let masterData = null;
let studioMode = 'section'; // 'section' | 'faculty' | 'room'
let studioEntityId = null;
let draggedEntryId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkSession('admin');
  if (!user) return;

  // Initialize SSE for real-time live sync
  initSSE('/api/events');
  onEvent('timetable.updated', (data) => {
    showToast(`Timetable event: ${data.type}`, 'info');
    if (currentTab === 'studio') loadStudioVersion(activeVersionId);
    if (currentTab === 'overview') loadOverview();
  });
  onEvent('absence:created', (data) => {
    showToast(`Faculty notice: ${data.facultyName} reported ${data.type} on ${data.date}`, 'warning');
    if (currentTab === 'absence') loadAbsenceMonitor();
    if (currentTab === 'overview') loadOverview();
  });
  onEvent('substitution:claimed', (data) => {
    showToast(`Substitution claimed: ${data.substituteFacultyName} for ${data.subjectName}`, 'success');
    if (currentTab === 'absence') loadAbsenceMonitor();
    if (currentTab === 'overview') loadOverview();
  });
  onEvent('substitution:assigned', (data) => {
    showToast(`Substitution assigned: ${data.substituteFacultyName} for ${data.subjectName}`, 'info');
    if (currentTab === 'absence') loadAbsenceMonitor();
    if (currentTab === 'overview') loadOverview();
  });

  setupNavigation();
  setupModals();
  await loadOverview();
  await loadMasterData();
});

// Navigation tab switching
function setupNavigation() {
  document.querySelectorAll('[data-admin-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = btn.getAttribute('data-admin-tab');
      switchTab(tab);
    });
  });

  document.getElementById('logout-btn')?.addEventListener('click', logout);
}

export function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('[data-admin-tab]').forEach(b => {
    if (b.getAttribute('data-admin-tab') === tab) {
      b.classList.add('btn-primary');
      b.classList.remove('btn-secondary');
    } else {
      b.classList.remove('btn-primary');
      b.classList.add('btn-secondary');
    }
  });

  document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
  const targetPanel = document.getElementById(`panel-${tab}`);
  if (targetPanel) targetPanel.style.display = 'block';

  if (tab === 'overview') loadOverview();
  if (tab === 'studio') loadStudio();
  if (tab === 'master-data') renderMasterDataTables();
  if (tab === 'availability') loadAvailabilityEditor();
  if (tab === 'assignments') loadAssignments();
  if (tab === 'absence') loadAbsenceMonitor();
}

// 1. Overview Loader
async function loadOverview() {
  try {
    const data = await apiRequest('/api/admin/overview');
    document.getElementById('stat-faculty').textContent = data.stats.facultyCount;
    document.getElementById('stat-subjects').textContent = data.stats.subjectsCount;
    document.getElementById('stat-sections').textContent = data.stats.sectionsCount;
    document.getElementById('stat-rooms').textContent = data.stats.roomsCount;
    document.getElementById('stat-absences').textContent = data.stats.todayAbsencesCount;

    if (data.stats.activeVersion) {
      activeVersionId = data.stats.activeVersion.id;
      document.getElementById('active-version-title').textContent = data.stats.activeVersion.name;
      document.getElementById('active-version-notes').textContent = data.stats.activeVersion.notes || 'Verified active schedule';
    } else {
      document.getElementById('active-version-title').textContent = 'No Active Version (Drafts available)';
    }

    const logContainer = document.getElementById('audit-log-list');
    if (logContainer && data.recentLogs?.length) {
      logContainer.innerHTML = data.recentLogs.map(l => `
        <div style="padding: 0.5rem 0.75rem; background: var(--bg-surface-subtle); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-weight: 700; color: var(--color-brand-primary);">${l.action}</span>
            <span style="color: var(--text-secondary); margin-left: 0.5rem;">by ${l.username || 'Admin'}</span>
          </div>
          <span style="color: var(--text-muted); font-size: 0.75rem;">${new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading overview:', err);
  }
}

// 2. Load Master Data
async function loadMasterData() {
  try {
    masterData = await apiRequest('/api/admin/master-data');
  } catch (err) {
    console.error('Error loading master data:', err);
  }
}

function renderMasterDataTables() {
  if (!masterData) return;
  const facTable = document.getElementById('table-faculty-body');
  if (facTable) {
    facTable.innerHTML = masterData.faculty.map(f => `
      <tr style="border-bottom: 1px solid var(--border-subtle);">
        <td style="padding: 0.6rem 0.75rem; font-weight: 600;">${f.name}</td>
        <td style="padding: 0.6rem 0.75rem;">${f.department_name}</td>
        <td style="padding: 0.6rem 0.75rem;">${f.email}</td>
        <td style="padding: 0.6rem 0.75rem;" class="tabular-nums">${f.max_periods_per_day} / day · ${f.max_periods_per_week} / wk</td>
        <td style="padding: 0.6rem 0.75rem; text-align: right;">
          <button class="btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;" onclick="window.editFaculty(${f.id})">Edit</button>
          <button class="btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; color: var(--color-error);" onclick="window.deleteFaculty(${f.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  const subTable = document.getElementById('table-subjects-body');
  if (subTable) {
    subTable.innerHTML = masterData.subjects.map(s => `
      <tr style="border-bottom: 1px solid var(--border-subtle);">
        <td style="padding: 0.6rem 0.75rem; font-weight: 700; color: var(--color-brand-primary);">${s.code}</td>
        <td style="padding: 0.6rem 0.75rem;">${s.name}</td>
        <td style="padding: 0.6rem 0.75rem;"><span style="text-transform: capitalize;">${s.type}</span> ${s.type === 'lab' ? `(${s.lab_block_length}p block)` : ''}</td>
        <td style="padding: 0.6rem 0.75rem;" class="tabular-nums">${s.weekly_periods} periods</td>
        <td style="padding: 0.6rem 0.75rem; text-align: right;">
          <button class="btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; color: var(--color-error);" onclick="window.deleteSubject(${s.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  const roomTable = document.getElementById('table-rooms-body');
  if (roomTable) {
    roomTable.innerHTML = masterData.rooms.map(r => `
      <tr style="border-bottom: 1px solid var(--border-subtle);">
        <td style="padding: 0.6rem 0.75rem; font-weight: 600;">${r.name}</td>
        <td style="padding: 0.6rem 0.75rem;"><span style="text-transform: capitalize;">${r.type}</span></td>
        <td style="padding: 0.6rem 0.75rem;" class="tabular-nums">${r.capacity} seats</td>
        <td style="padding: 0.6rem 0.75rem; text-align: right;">
          <button class="btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; color: var(--color-error);" onclick="window.deleteRoom(${r.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  }
}

// 3. Timetable Studio
async function loadStudio() {
  await loadMasterData();
  const versionsData = await apiRequest('/api/timetable/versions');
  const selector = document.getElementById('studio-version-selector');
  if (selector && versionsData.versions?.length) {
    selector.innerHTML = versionsData.versions.map(v => `
      <option value="${v.id}" ${v.status === 'active' ? 'selected' : ''}>
        ${v.name} [${v.status.toUpperCase()}] (${v.entries_count} classes)
      </option>
    `).join('');

    activeVersionId = parseInt(selector.value, 10);
  }

  setupStudioControls();
  if (activeVersionId) {
    await loadStudioVersion(activeVersionId);
  }
}

function setupStudioControls() {
  const versionSelector = document.getElementById('studio-version-selector');
  versionSelector?.addEventListener('change', () => {
    activeVersionId = parseInt(versionSelector.value, 10);
    loadStudioVersion(activeVersionId);
  });

  const modeButtons = document.querySelectorAll('[data-studio-mode]');
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modeButtons.forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-secondary');
      });
      btn.classList.add('btn-primary');
      btn.classList.remove('btn-secondary');

      studioMode = btn.getAttribute('data-studio-mode');
      populateStudioEntitySelector();
      renderStudioGrid();
    });
  });

  const entitySelector = document.getElementById('studio-entity-selector');
  entitySelector?.addEventListener('change', () => {
    studioEntityId = parseInt(entitySelector.value, 10);
    renderStudioGrid();
  });

  populateStudioEntitySelector();

  // Studio actions
  document.getElementById('btn-studio-generate')?.addEventListener('click', () => {
    document.getElementById('modal-generate').style.display = 'flex';
  });

  document.getElementById('btn-studio-activate')?.addEventListener('click', async () => {
    if (!activeVersionId) return;
    try {
      const res = await apiRequest(`/api/timetable/versions/${activeVersionId}/activate`, { method: 'POST' });
      showToast(res.message, 'success');
      loadStudio();
    } catch (err) {}
  });

  document.getElementById('btn-studio-duplicate')?.addEventListener('click', async () => {
    if (!activeVersionId) return;
    try {
      const res = await apiRequest(`/api/timetable/versions/${activeVersionId}/duplicate`, { method: 'POST' });
      showToast(res.message, 'success');
      loadStudio();
    } catch (err) {}
  });

  document.getElementById('btn-studio-export')?.addEventListener('click', () => {
    if (!activeVersionId) return;
    window.location.href = `/api/timetable/versions/${activeVersionId}/export.csv`;
  });
}

function populateStudioEntitySelector() {
  const entitySelector = document.getElementById('studio-entity-selector');
  if (!entitySelector || !masterData) return;

  if (studioMode === 'section') {
    entitySelector.innerHTML = masterData.sections.map(s => `
      <option value="${s.id}">Section: ${s.name} (Sem ${s.semester})</option>
    `).join('');
  } else if (studioMode === 'faculty') {
    entitySelector.innerHTML = masterData.faculty.map(f => `
      <option value="${f.id}">Faculty: ${f.name} (${f.department_code})</option>
    `).join('');
  } else if (studioMode === 'room') {
    entitySelector.innerHTML = masterData.rooms.map(r => `
      <option value="${r.id}">Room: ${r.name} (${r.type})</option>
    `).join('');
  }

  studioEntityId = parseInt(entitySelector.value, 10);
}

async function loadStudioVersion(versionId) {
  try {
    currentVersionData = await apiRequest(`/api/timetable/versions/${versionId}`);
    renderStudioGrid();
    renderValidationStatus(currentVersionData.validation);
  } catch (err) {
    console.error('Failed to load version:', err);
  }
}

function renderValidationStatus(validation) {
  const statusBadge = document.getElementById('studio-validation-badge');
  if (!statusBadge || !validation) return;

  if (validation.isValid) {
    statusBadge.innerHTML = `<span style="color: var(--color-success); font-weight: 700;">✓ 0 Conflicts · Fully Verified</span>`;
  } else {
    statusBadge.innerHTML = `<span style="color: var(--color-error); font-weight: 700;">⚠ ${validation.errorCount} Conflicts Detected</span>`;
  }
}

function renderStudioGrid() {
  const container = document.getElementById('studio-grid-container');
  if (!container || !currentVersionData || !masterData) return;

  const { workingDays, timeSlots } = masterData;
  const entries = currentVersionData.entries || [];

  // Filter entries based on studioMode
  let filteredEntries = [];
  if (studioMode === 'section') {
    filteredEntries = entries.filter(e => e.section_id === studioEntityId);
  } else if (studioMode === 'faculty') {
    filteredEntries = entries.filter(e => e.faculty_id === studioEntityId);
  } else if (studioMode === 'room') {
    filteredEntries = entries.filter(e => e.room_id === studioEntityId);
  }

  let html = `
    <table style="width: 100%; border-collapse: collapse; min-width: 820px; text-align: center; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden;">
      <thead>
        <tr style="background: var(--bg-surface-subtle); border-bottom: 2px solid var(--border-subtle);">
          <th style="padding: 0.75rem; border: 1px solid var(--border-subtle); width: 110px; font-size: 0.85rem;">Day</th>
  `;

  for (const s of timeSlots) {
    html += `
      <th style="padding: 0.65rem 0.5rem; border: 1px solid var(--border-subtle); font-size: 0.8rem;">
        <div style="font-weight: 700;">${s.label}</div>
        <div style="font-size: 0.7rem; color: var(--text-muted);" class="tabular-nums">${s.start_time} - ${s.end_time}</div>
      </th>
    `;
  }

  html += `
        </tr>
      </thead>
      <tbody>
  `;

  for (const day of workingDays) {
    html += `
      <tr>
        <td style="padding: 0.75rem; font-weight: 700; border: 1px solid var(--border-subtle); background: var(--bg-surface-subtle); font-size: 0.85rem;">
          ${day.day_name}
        </td>
    `;

    for (const slot of timeSlots) {
      if (slot.is_break === 1) {
        html += `
          <td style="border: 1px solid var(--border-subtle); background: repeating-linear-gradient(45deg, var(--bg-surface-subtle), var(--bg-surface-subtle) 10px, var(--bg-canvas) 10px, var(--bg-canvas) 20px); font-size: 0.75rem; color: var(--text-muted);">
            ${slot.label}
          </td>
        `;
        continue;
      }

      const entry = filteredEntries.find(e => e.day_id === day.id && e.slot_id === slot.id);

      if (entry) {
        html += `
          <td class="timetable-cell-drop-target" data-day-id="${day.id}" data-slot-id="${slot.id}" style="padding: 0.4rem; border: 1px solid var(--border-subtle); vertical-align: top; height: 75px;">
            <div class="studio-entry-chip" draggable="true" data-entry-id="${entry.id}" style="padding: 0.45rem 0.5rem; background: var(--color-brand-blush-soft); border: 1px solid var(--border-strong); border-radius: var(--radius-sm); cursor: grab; text-align: left; height: 100%; display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.15s, box-shadow 0.15s;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <span style="font-weight: 700; font-size: 0.85rem; color: var(--color-brand-primary);">${entry.subject_code}</span>
                ${entry.locked ? '<span style="font-size: 0.75rem;" title="Locked">🔒</span>' : ''}
              </div>
              <div style="font-size: 0.75rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${studioMode === 'faculty' ? entry.section_name : entry.faculty_name}
              </div>
              <div style="font-size: 0.7rem; color: var(--text-muted);">
                ${studioMode === 'room' ? entry.section_name : entry.room_name} ${entry.is_lab_block ? '· Lab' : ''}
              </div>
            </div>
          </td>
        `;
      } else {
        html += `
          <td class="timetable-cell-drop-target" data-day-id="${day.id}" data-slot-id="${slot.id}" style="padding: 0.4rem; border: 1px solid var(--border-subtle); vertical-align: middle; height: 75px; color: var(--text-muted); font-size: 0.8rem; cursor: pointer;">
            <span style="opacity: 0.35;">+ Free</span>
          </td>
        `;
      }
    }

    html += `</tr>`;
  }

  html += `
      </tbody>
    </table>
  `;

  container.innerHTML = html;
  attachDragAndDropHandlers();
}

// Drag & Drop Implementation with Live Validation
function attachDragAndDropHandlers() {
  const chips = document.querySelectorAll('.studio-entry-chip');
  const cells = document.querySelectorAll('.timetable-cell-drop-target');

  chips.forEach(chip => {
    chip.addEventListener('dragstart', (e) => {
      draggedEntryId = parseInt(chip.getAttribute('data-entry-id'), 10);
      chip.style.opacity = '0.5';
      e.dataTransfer.setData('text/plain', draggedEntryId);
    });

    chip.addEventListener('dragend', () => {
      chip.style.opacity = '1';
      cells.forEach(c => c.classList.remove('valid-drop-target', 'invalid-drop-target'));
    });

    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const entryId = parseInt(chip.getAttribute('data-entry-id'), 10);
      openEditEntryModal(entryId);
    });
  });

  cells.forEach(cell => {
    cell.addEventListener('dragover', async (e) => {
      e.preventDefault();
      if (!draggedEntryId) return;

      const targetDayId = parseInt(cell.getAttribute('data-day-id'), 10);
      const targetSlotId = parseInt(cell.getAttribute('data-slot-id'), 10);

      // Instant live validation call
      try {
        const valRes = await apiRequest('/api/timetable/validate-move', {
          method: 'POST',
          body: {
            versionId: activeVersionId,
            entryId: draggedEntryId,
            targetDayId,
            targetSlotId
          },
          showErrorToast: false
        });

        if (valRes.isValid) {
          cell.style.backgroundColor = 'var(--color-success-bg)';
          cell.style.outline = '2px dashed var(--color-success)';
        } else {
          cell.style.backgroundColor = 'var(--color-error-bg)';
          cell.style.outline = '2px dashed var(--color-error)';
        }
      } catch (err) {}
    });

    cell.addEventListener('dragleave', () => {
      cell.style.backgroundColor = '';
      cell.style.outline = '';
    });

    cell.addEventListener('drop', async (e) => {
      e.preventDefault();
      cell.style.backgroundColor = '';
      cell.style.outline = '';

      if (!draggedEntryId) return;

      const targetDayId = parseInt(cell.getAttribute('data-day-id'), 10);
      const targetSlotId = parseInt(cell.getAttribute('data-slot-id'), 10);

      try {
        const res = await apiRequest(`/api/timetable/entries/${draggedEntryId}/move`, {
          method: 'POST',
          body: {
            targetDayId,
            targetSlotId
          }
        });

        showToast('Timetable entry moved and validated successfully!', 'success');
        await loadStudioVersion(activeVersionId);
      } catch (err) {
        if (err.status === 409) {
          // Warning override confirm
          if (confirm('This move introduces a soft constraint warning. Do you wish to override?')) {
            await apiRequest(`/api/timetable/entries/${draggedEntryId}/move`, {
              method: 'POST',
              body: { targetDayId, targetSlotId, overrideWarnings: true }
            });
            showToast('Entry moved with confirmed override', 'info');
            await loadStudioVersion(activeVersionId);
          }
        }
      } finally {
        draggedEntryId = null;
      }
    });
  });
}

// 4. Modal Setup
function setupModals() {
  document.getElementById('modal-generate-close')?.addEventListener('click', () => {
    document.getElementById('modal-generate').style.display = 'none';
  });

  document.getElementById('form-generate')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('gen-name').value;
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Solving Constraints...';

    try {
      const res = await apiRequest('/api/timetable/generate', {
        method: 'POST',
        body: { name }
      });
      showToast(res.message, 'success');
      document.getElementById('modal-generate').style.display = 'none';
      switchTab('studio');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Start CSP Generator';
    }
  });
}

function openEditEntryModal(entryId) {
  const entry = currentVersionData.entries.find(e => e.id === entryId);
  if (!entry) return;

  const newFaculty = prompt(`Reassign Faculty (Current: ${entry.faculty_name}):\nEnter Faculty ID or Cancel:`, entry.faculty_id);
  if (newFaculty !== null && newFaculty !== '') {
    apiRequest(`/api/timetable/entries/${entryId}`, {
      method: 'PUT',
      body: { facultyId: parseInt(newFaculty, 10) }
    }).then(() => {
      showToast('Entry updated', 'success');
      loadStudioVersion(activeVersionId);
    });
  }
}

// 5. Faculty Availability Editor
async function loadAvailabilityEditor() {
  await loadMasterData();
  const select = document.getElementById('avail-faculty-selector');
  if (!select || !masterData) return;

  select.innerHTML = masterData.faculty.map(f => `
    <option value="${f.id}">${f.name} (${f.department_code})</option>
  `).join('');

  select.onchange = () => renderFacultyAvailabilityGrid(parseInt(select.value, 10));
  renderFacultyAvailabilityGrid(parseInt(select.value, 10));
}

async function renderFacultyAvailabilityGrid(facId) {
  const res = await apiRequest(`/api/admin/faculty/${facId}/availability`);
  const container = document.getElementById('availability-grid-container');
  if (!container || !masterData) return;

  const { workingDays, timeSlots } = masterData;
  const teachingSlots = timeSlots.filter(s => s.is_break === 0);
  const availMap = new Map();
  for (const a of res.availability) {
    availMap.set(`${a.day_id}_${a.slot_id}`, a.is_available === 1);
  }

  let html = `
    <table style="width: 100%; border-collapse: collapse; min-width: 700px; text-align: center; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden;">
      <thead>
        <tr style="background: var(--bg-surface-subtle); border-bottom: 2px solid var(--border-subtle);">
          <th style="padding: 0.65rem; border: 1px solid var(--border-subtle);">Day</th>
  `;

  for (const s of teachingSlots) {
    html += `<th style="padding: 0.65rem; border: 1px solid var(--border-subtle); font-size: 0.8rem;">${s.label}</th>`;
  }

  html += `</tr></thead><tbody>`;

  for (const d of workingDays) {
    html += `<tr><td style="padding: 0.65rem; font-weight: 700; border: 1px solid var(--border-subtle); background: var(--bg-surface-subtle);">${d.day_name}</td>`;
    for (const s of teachingSlots) {
      const isAvailable = availMap.get(`${d.id}_${s.id}`) ?? true;
      const bg = isAvailable ? 'var(--color-success-bg)' : 'var(--color-error-bg)';
      const text = isAvailable ? '✓ Available' : '✗ Unavailable';
      const color = isAvailable ? 'var(--color-success)' : 'var(--color-error)';
      html += `
        <td class="avail-cell" data-day="${d.id}" data-slot="${s.id}" data-avail="${isAvailable ? '1' : '0'}" style="padding: 0.6rem; border: 1px solid var(--border-subtle); background: ${bg}; color: ${color}; font-weight: 600; font-size: 0.8rem; cursor: pointer; user-select: none;">
          ${text}
        </td>
      `;
    }
    html += `</tr>`;
  }

  html += `</tbody></table>`;
  container.innerHTML = html;

  // Toggle availability cell click
  container.querySelectorAll('.avail-cell').forEach(c => {
    c.addEventListener('click', () => {
      const cur = c.getAttribute('data-avail') === '1';
      const next = !cur;
      c.setAttribute('data-avail', next ? '1' : '0');
      c.style.background = next ? 'var(--color-success-bg)' : 'var(--color-error-bg)';
      c.style.color = next ? 'var(--color-success)' : 'var(--color-error)';
      c.textContent = next ? '✓ Available' : '✗ Unavailable';
    });
  });

  document.getElementById('btn-save-availability').onclick = async () => {
    const payload = [];
    container.querySelectorAll('.avail-cell').forEach(c => {
      payload.push({
        dayId: parseInt(c.getAttribute('data-day'), 10),
        slotId: parseInt(c.getAttribute('data-slot'), 10),
        isAvailable: c.getAttribute('data-avail') === '1'
      });
    });

    await apiRequest(`/api/admin/faculty/${facId}/availability`, {
      method: 'PUT',
      body: { availability: payload }
    });
    showToast('Faculty availability updated successfully', 'success');
  };
}

// 6. Absence Monitor & Substitute Assignment (Mode B: Admin Assignment)
async function loadAbsenceMonitor() {
  const container = document.getElementById('absence-list-container');
  if (!container) return;

  try {
    const data = await apiRequest('/api/absence/board');
    const absences = data.absences || [];

    if (!absences.length) {
      container.innerHTML = `
        <div style="padding: 2.5rem; text-align: center; color: var(--text-muted); background: var(--bg-surface-subtle); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎉</div>
          <div style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">No Absences Reported</div>
          <p style="font-size: 0.85rem;">All faculty members are scheduled normally with zero disruptions.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = absences.map(a => {
      const isAbsent = a.type === 'absent';
      const isOverdue = a.isOverdue;
      const isCovered = a.status === 'covered';

      let statusBadge = `<span style="font-size: 0.75rem; background: var(--color-warning-bg); color: var(--color-warning); padding: 0.2rem 0.55rem; border-radius: 4px; font-weight: 700;">Open</span>`;
      if (isCovered) {
        statusBadge = `<span style="font-size: 0.75rem; background: var(--color-success-bg); color: var(--color-success); padding: 0.2rem 0.55rem; border-radius: 4px; font-weight: 700;">Covered</span>`;
      } else if (a.status === 'cancelled') {
        statusBadge = `<span style="font-size: 0.75rem; background: var(--bg-surface-subtle); color: var(--text-muted); padding: 0.2rem 0.55rem; border-radius: 4px;">Cancelled</span>`;
      }

      return `
        <div class="card animate-fade-in" style="margin-bottom: 1.25rem; border-left: 4px solid ${isOverdue ? 'var(--color-error)' : isAbsent ? 'var(--color-error)' : 'var(--color-warning)'}; background: var(--bg-surface);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
                <span style="font-size: 1.25rem; font-weight: 700; color: var(--color-brand-primary);">${a.faculty_name}</span>
                <span style="font-size: 0.8rem; color: var(--text-muted);">${a.department_name}</span>
                <span style="font-size: 0.75rem; background: ${isAbsent ? 'var(--color-error-bg)' : 'var(--color-warning-bg)'}; color: ${isAbsent ? 'var(--color-error)' : 'var(--color-warning)'}; padding: 0.2rem 0.55rem; border-radius: 4px; font-weight: 600;">
                  ${isAbsent ? 'Full-day Absence' : `Running Late (Arrival: ${a.expected_arrival})`}
                </span>
                ${statusBadge}
              </div>
              <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.35rem;">
                <strong>Date:</strong> ${a.date} · <strong>Reason:</strong> ${a.reason}
              </div>
            </div>

            ${isOverdue ? `
              <div style="background: var(--color-error-bg); border: 1px solid var(--color-error); color: var(--color-error); padding: 0.4rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 700; display: flex; align-items: center; gap: 0.4rem;">
                <span>⚠️</span>
                <span>ARRIVAL OVERDUE (${a.expected_arrival})</span>
              </div>
            ` : ''}
          </div>

          <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.5rem; text-transform: uppercase;">
            Affected Classes &amp; Substitution Coverage:
          </h4>

          ${!a.affectedClasses?.length ? `
            <div style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">
              No classes required substitution during the affected window.
            </div>
          ` : `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0.75rem;">
              ${a.affectedClasses.map(ac => {
                const isClaimedOrAssigned = ac.sub_status === 'accepted' || ac.sub_status === 'assigned';
                return `
                  <div style="padding: 0.75rem 1rem; background: var(--bg-surface-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem;">
                      <span style="font-weight: 700; font-size: 0.95rem; color: var(--color-brand-primary);">${ac.subject_name}</span>
                      <span style="font-size: 0.75rem; color: var(--text-muted);">${ac.slot_label} (${ac.start_time})</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.6rem;">
                      Sec ${ac.section_name} · Room: ${ac.room_name}
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 0.5rem;">
                      ${isClaimedOrAssigned ? `
                        <div style="font-size: 0.8rem; color: var(--color-success); font-weight: 600;">
                          ✓ Covered by: <strong>${ac.substitute_faculty_name}</strong>
                          <span style="font-size: 0.7rem; color: var(--text-muted);">(${ac.sub_status})</span>
                        </div>
                      ` : `
                        <span style="font-size: 0.8rem; color: var(--color-warning); font-weight: 600;">Pending Substitute</span>
                        <button class="btn-primary" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;" onclick="openAssignModal(${ac.timetable_entry_id}, '${a.date}', '${ac.subject_name.replace(/'/g, "\\'")}', '${ac.slot_label}')">
                          Assign Substitute
                        </button>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load absence monitor:', err);
  }
}

// Open Assign Substitute Modal with Ranked Candidates
window.openAssignModal = async (timetableEntryId, date, subjectName, slotLabel) => {
  const modal = document.getElementById('modal-assign-sub');
  const subtitle = document.getElementById('assign-sub-subtitle');
  const list = document.getElementById('assign-candidates-list');
  if (!modal || !list) return;

  subtitle.textContent = `Ranking eligible substitutes for ${subjectName} (${slotLabel}) on ${date}:`;
  list.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">Evaluating hard constraints and scoring qualified colleagues...</div>`;
  modal.style.display = 'flex';

  // Modal close handlers
  document.getElementById('modal-assign-close').onclick = () => modal.style.display = 'none';
  document.getElementById('modal-assign-close-btn').onclick = () => modal.style.display = 'none';

  try {
    const res = await apiRequest(`/api/absence/candidates/${timetableEntryId}?date=${date}`);
    const candidates = res.candidates || [];

    if (!candidates.length) {
      list.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--color-error); background: var(--color-error-bg); border-radius: var(--radius-sm); font-size: 0.85rem;">
          No available faculty meet all hard constraints (all colleagues are either double-booked, on leave, or have reached max daily periods).
        </div>
      `;
      return;
    }

    list.innerHTML = candidates.map(c => `
      <div style="padding: 0.85rem 1rem; background: var(--bg-surface-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.25rem;">
            <span style="font-weight: 700; font-size: 1rem; color: var(--color-brand-primary);">${c.name}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${c.departmentName}</span>
            <span style="font-size: 0.75rem; font-weight: 700; background: var(--color-brand-blush-soft); color: var(--color-brand-primary); padding: 0.15rem 0.45rem; border-radius: 4px;">
              Score: ${c.score}
            </span>
            ${c.isQualified ? `<span style="font-size: 0.7rem; background: var(--color-success-bg); color: var(--color-success); padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 700;">Qualified</span>` : ''}
            ${c.isSameDept ? `<span style="font-size: 0.7rem; background: var(--bg-surface); border: 1px solid var(--border-subtle); padding: 0.15rem 0.45rem; border-radius: 4px;">Same Dept</span>` : ''}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">
            Today: ${c.currentDailyPeriods} / ${c.maxPeriodsPerDay} periods · Weekly: ${c.weeklyPeriods} periods
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">
            Reasons: ${c.reasons.join(' · ')}
          </div>
        </div>

        <div>
          <button class="btn-primary" style="font-size: 0.85rem;" onclick="assignSubstitute(${timetableEntryId}, '${date}', ${c.facultyId}, '${c.name.replace(/'/g, "\\'")}')">
            Assign Duty
          </button>
        </div>
      </div>
    `).join('');

  } catch (err) {
    list.innerHTML = `<div style="color: var(--color-error); font-size: 0.85rem;">Failed to load candidates: ${err.message}</div>`;
  }
};

window.assignSubstitute = async (timetableEntryId, date, substituteFacultyId, facultyName) => {
  if (!confirm(`Confirm assignment of ${facultyName} as substitute for this class?`)) return;
  try {
    const res = await apiRequest('/api/absence/substitute/assign', {
      method: 'POST',
      body: { timetableEntryId, date, substituteFacultyId }
    });
    showToast(res.message || 'Substitute assigned successfully!', 'success');
    document.getElementById('modal-assign-sub').style.display = 'none';
    await loadAbsenceMonitor();
    await loadOverview();
  } catch (err) {
    // Handled by apiRequest toast
  }
};

// Global functions for inline actions
window.deleteFaculty = async (id) => {
  if (!confirm('Are you sure you want to delete this faculty member?')) return;
  try {
    await apiRequest(`/api/admin/faculty/${id}`, { method: 'DELETE' });
    showToast('Faculty deleted', 'info');
    await loadMasterData();
    renderMasterDataTables();
  } catch (err) {}
};

window.deleteSubject = async (id) => {
  if (!confirm('Are you sure you want to delete this subject?')) return;
  try {
    await apiRequest(`/api/admin/subjects/${id}`, { method: 'DELETE' });
    showToast('Subject deleted', 'info');
    await loadMasterData();
    renderMasterDataTables();
  } catch (err) {}
};

window.deleteRoom = async (id) => {
  if (!confirm('Are you sure you want to delete this room?')) return;
  try {
    await apiRequest(`/api/admin/rooms/${id}`, { method: 'DELETE' });
    showToast('Room deleted', 'info');
    await loadMasterData();
    renderMasterDataTables();
  } catch (err) {}
};

export default { switchTab };
