import {
  requireAdmin,
  logoutAdmin,
  formatDate,
  escapeHtml,
  showError,
  ENGAGEMENT_STATUSES,
  SECTORS
} from './admin-core.js';

function leadHref(submissionId) {
  return '/admin/leads/' + encodeURIComponent(submissionId);
}

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    q: (params.get('q') || '').trim(),
    sector: params.get('sector') || '',
    status: params.get('status') || '',
    sort: params.get('sort') || 'newest'
  };
}

function setParams(state) {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.sector) params.set('sector', state.sector);
  if (state.status) params.set('status', state.status);
  if (state.sort && state.sort !== 'newest') params.set('sort', state.sort);
  const qs = params.toString();
  const url = window.location.pathname + (qs ? '?' + qs : '');
  window.history.replaceState({}, '', url);
}

function sortRows(rows, sort) {
  const copy = rows.slice();
  if (sort === 'oldest') {
    copy.sort(function (a, b) { return new Date(a.completed_at) - new Date(b.completed_at); });
  } else if (sort === 'organisation') {
    copy.sort(function (a, b) {
      return String(a.organisation).localeCompare(String(b.organisation), 'en', { sensitivity: 'base' });
    });
  } else if (sort === 'status') {
    copy.sort(function (a, b) {
      return String(a.engagement_status).localeCompare(String(b.engagement_status), 'en');
    });
  } else if (sort === 'follow_up') {
    copy.sort(function (a, b) {
      if (!a.follow_up_date && !b.follow_up_date) return 0;
      if (!a.follow_up_date) return 1;
      if (!b.follow_up_date) return -1;
      return String(a.follow_up_date).localeCompare(String(b.follow_up_date));
    });
  } else {
    copy.sort(function (a, b) { return new Date(b.completed_at) - new Date(a.completed_at); });
  }
  return copy;
}

function filterRows(rows, state) {
  const q = state.q.toLowerCase();
  return rows.filter(function (r) {
    if (state.sector && r.sector !== state.sector) return false;
    if (state.status && r.engagement_status !== state.status) return false;
    if (!q) return true;
    return (
      (r.contact || '').toLowerCase().indexOf(q) !== -1 ||
      (r.email || '').toLowerCase().indexOf(q) !== -1 ||
      (r.organisation || '').toLowerCase().indexOf(q) !== -1
    );
  });
}

function render(rows) {
  const tbody = document.getElementById('leads-body');
  const cards = document.getElementById('leads-cards');
  const countEl = document.getElementById('leads-count');
  countEl.textContent = rows.length + (rows.length === 1 ? ' lead' : ' leads');

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="muted">No matching submissions.</td></tr>';
    cards.innerHTML = '<p class="empty">No matching submissions.</p>';
    return;
  }

  tbody.innerHTML = rows.map(function (r) {
    return (
      '<tr data-href="' + escapeHtml(leadHref(r.submission_id)) + '">' +
        '<td>' + escapeHtml(r.organisation) + '</td>' +
        '<td>' + escapeHtml(r.contact) + '<div class="muted">' + escapeHtml(r.email) + '</div></td>' +
        '<td class="muted">' + escapeHtml(r.role || '—') + '</td>' +
        '<td>' + escapeHtml(r.sector || '—') + '</td>' +
        '<td>' + escapeHtml(formatDate(r.completed_at)) + '</td>' +
        '<td><span class="status-pill">' + escapeHtml(r.engagement_status) + '</span></td>' +
        '<td class="muted">' + escapeHtml(r.next_action || '—') + '</td>' +
        '<td>' + escapeHtml(r.follow_up_date ? formatDate(r.follow_up_date) : '—') + '</td>' +
      '</tr>'
    );
  }).join('');

  cards.innerHTML = rows.map(function (r) {
    return (
      '<a class="stack-card" href="' + escapeHtml(leadHref(r.submission_id)) + '">' +
        '<div class="org">' + escapeHtml(r.organisation) + '</div>' +
        '<div class="meta">' + escapeHtml(r.contact) + ' · ' + escapeHtml(r.role || '—') + '</div>' +
        '<div class="meta">' + escapeHtml(r.sector || '—') + ' · ' + escapeHtml(formatDate(r.completed_at)) + '</div>' +
        '<div class="meta"><span class="status-pill">' + escapeHtml(r.engagement_status) + '</span></div>' +
        '<div class="meta">Next: ' + escapeHtml(r.next_action || '—') + '</div>' +
        '<div class="meta">Follow-up: ' + escapeHtml(r.follow_up_date ? formatDate(r.follow_up_date) : '—') + '</div>' +
      '</a>'
    );
  }).join('');

  tbody.querySelectorAll('tr[data-href]').forEach(function (tr) {
    tr.addEventListener('click', function () {
      window.location.href = tr.getAttribute('data-href');
    });
  });
}

async function loadLeads(ctx) {
  const { data, error } = await ctx.supabase
    .from('system_check_submissions')
    .select(`
      id,
      created_at,
      contacts (
        first_name,
        last_name,
        work_email,
        organisation,
        role,
        sector
      ),
      consultancy_cases (
        engagement_status,
        next_action,
        follow_up_date
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(function (s) {
    const c = s.contacts || {};
    const cases = Array.isArray(s.consultancy_cases) ? s.consultancy_cases[0] : s.consultancy_cases;
    return {
      submission_id: s.id,
      organisation: c.organisation || '—',
      contact: ((c.first_name || '') + ' ' + (c.last_name || '')).trim() || '—',
      email: c.work_email || '',
      role: c.role || '',
      sector: c.sector || '',
      completed_at: s.created_at,
      engagement_status: (cases && cases.engagement_status) || 'New',
      next_action: (cases && cases.next_action) || '',
      follow_up_date: (cases && cases.follow_up_date) || null
    };
  });
}

function populateFilters(state) {
  const sectorSel = document.getElementById('filter-sector');
  const statusSel = document.getElementById('filter-status');
  const sortSel = document.getElementById('filter-sort');
  const search = document.getElementById('filter-q');

  SECTORS.forEach(function (s) {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    sectorSel.appendChild(opt);
  });
  ENGAGEMENT_STATUSES.forEach(function (s) {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    statusSel.appendChild(opt);
  });

  sectorSel.value = state.sector;
  statusSel.value = state.status;
  sortSel.value = state.sort;
  search.value = state.q;
}

document.getElementById('logout-btn').addEventListener('click', function () {
  logoutAdmin();
});

requireAdmin().then(async function (ctx) {
  if (!ctx) return;
  const state = getParams();
  populateFilters(state);

  let allRows = [];
  try {
    allRows = await loadLeads(ctx);
    document.getElementById('admin-error').hidden = true;
    document.getElementById('admin-content').hidden = false;
  } catch (e) {
    showError(document.getElementById('admin-error'), 'Unable to load submissions. Please try again.');
    return;
  }

  function apply() {
    const next = {
      q: document.getElementById('filter-q').value.trim(),
      sector: document.getElementById('filter-sector').value,
      status: document.getElementById('filter-status').value,
      sort: document.getElementById('filter-sort').value || 'newest'
    };
    setParams(next);
    render(sortRows(filterRows(allRows, next), next.sort));
  }

  ['filter-q', 'filter-sector', 'filter-status', 'filter-sort'].forEach(function (id) {
    document.getElementById(id).addEventListener('change', apply);
  });
  document.getElementById('filter-q').addEventListener('input', function () {
    clearTimeout(window.__nordrSearchTimer);
    window.__nordrSearchTimer = setTimeout(apply, 200);
  });

  apply();
}).catch(function () {
  showError(document.getElementById('admin-error'), 'Unable to load submissions. Please try again.');
});
