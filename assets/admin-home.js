import {
  requireAdmin,
  logoutAdmin,
  formatDate,
  escapeHtml,
  showError
} from './admin-core.js';

function leadHref(submissionId) {
  return '/admin/leads/' + encodeURIComponent(submissionId);
}

function renderRows(tbody, cards, rows) {
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="muted">No System Check submissions yet.</td></tr>';
    cards.innerHTML = '<p class="empty">No System Check submissions yet.</p>';
    return;
  }
  tbody.innerHTML = rows.map(function (r) {
    return (
      '<tr data-href="' + escapeHtml(leadHref(r.submission_id)) + '">' +
        '<td>' + escapeHtml(r.organisation) + '</td>' +
        '<td>' + escapeHtml(r.contact) + '<div class="muted">' + escapeHtml(r.email) + '</div></td>' +
        '<td>' + escapeHtml(r.sector || '—') + '</td>' +
        '<td>' + escapeHtml(formatDate(r.completed_at)) + '</td>' +
        '<td><span class="status-pill">' + escapeHtml(r.engagement_status) + '</span></td>' +
        '<td class="muted">' + escapeHtml(r.next_action || '—') + '</td>' +
      '</tr>'
    );
  }).join('');

  cards.innerHTML = rows.map(function (r) {
    return (
      '<a class="stack-card" href="' + escapeHtml(leadHref(r.submission_id)) + '">' +
        '<div class="org">' + escapeHtml(r.organisation) + '</div>' +
        '<div class="meta">' + escapeHtml(r.contact) + ' · ' + escapeHtml(r.sector || '—') + '</div>' +
        '<div class="meta">Completed ' + escapeHtml(formatDate(r.completed_at)) + '</div>' +
        '<div class="meta"><span class="status-pill">' + escapeHtml(r.engagement_status) + '</span></div>' +
        '<div class="meta">Next: ' + escapeHtml(r.next_action || '—') + '</div>' +
      '</a>'
    );
  }).join('');

  tbody.querySelectorAll('tr[data-href]').forEach(function (tr) {
    tr.addEventListener('click', function () {
      window.location.href = tr.getAttribute('data-href');
    });
  });
}

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

async function loadHome(ctx) {
  const root = document.getElementById('admin-content');
  const metricNew = document.getElementById('metric-new');
  const metricTotal = document.getElementById('metric-total');
  const metricFollowups = document.getElementById('metric-followups');
  const metricActive = document.getElementById('metric-active');
  const tbody = document.getElementById('recent-body');
  const cards = document.getElementById('recent-cards');

  try {
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

    const rows = (data || []).map(function (s) {
      const c = s.contacts || {};
      const cases = Array.isArray(s.consultancy_cases) ? s.consultancy_cases[0] : s.consultancy_cases;
      return {
        submission_id: s.id,
        organisation: c.organisation || '—',
        contact: ((c.first_name || '') + ' ' + (c.last_name || '')).trim() || '—',
        email: c.work_email || '',
        sector: c.sector || '',
        completed_at: s.created_at,
        engagement_status: (cases && cases.engagement_status) || 'New',
        next_action: (cases && cases.next_action) || '',
        follow_up_date: (cases && cases.follow_up_date) || null
      };
    });

    const today = todayIso();
    metricTotal.textContent = String(rows.length);
    metricNew.textContent = String(rows.filter(function (r) { return r.engagement_status === 'New'; }).length);
    metricActive.textContent = String(rows.filter(function (r) { return r.engagement_status === 'Active'; }).length);
    metricFollowups.textContent = String(rows.filter(function (r) {
      return r.follow_up_date && r.follow_up_date <= today && r.engagement_status !== 'Closed';
    }).length);

    renderRows(tbody, cards, rows.slice(0, 12));
    document.getElementById('admin-error').hidden = true;
    root.hidden = false;
  } catch (e) {
    showError(document.getElementById('admin-error'), 'Unable to load submissions. Please try again.');
  }
}

document.getElementById('logout-btn').addEventListener('click', function () {
  logoutAdmin();
});

requireAdmin().then(function (ctx) {
  if (!ctx) return;
  return loadHome(ctx);
}).catch(function () {
  showError(document.getElementById('admin-error'), 'Unable to load submissions. Please try again.');
});
