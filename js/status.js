// ==================================================================
// status.js
// Looks up a single submission by ticket ID via the get_submission_status
// RPC (see 01_supabase_submissions_setup.sql). RLS blocks any direct
// table access, so this is the only read path available to players.
// ==================================================================

const STATUS_LABELS = {
  received: 'Received',
  planned: 'Planned',
  in_progress: 'In progress',
  testing: 'Testing',
  done: 'Done',
  wontfix: "Won't fix",
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (e) {
    return '';
  }
}

function renderResult(html) {
  document.getElementById('status-result').innerHTML = html;
}

async function checkTicket(rawTicketId) {
  const ticketId = rawTicketId.trim().toUpperCase();
  if (!ticketId) return;

  renderResult('<p class="status-empty">Checking&hellip;</p>');

  const { data, error } = await db.rpc('get_submission_status', {
    p_ticket_id: ticketId,
  });

  if (error) {
    console.error('Status lookup failed:', error);
    renderResult('<p class="status-error">Something went wrong checking that ticket. Please try again.</p>');
    return;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    renderResult(`<p class="status-error">No report found for <span class="status-mono">${escapeHtml(ticketId)}</span>. Double check the ID from your confirmation email.</p>`);
    return;
  }

  const statusKey = row.status || 'received';
  const statusLabel = STATUS_LABELS[statusKey] || statusKey;

  const responseBlock = row.response
    ? `<span class="status-response-label">Note from the dev</span>
       <p class="status-response">${escapeHtml(row.response)}</p>`
    : `<p class="status-response">No update yet — check back soon.</p>`;

  renderResult(`
    <div class="status-result-card">
      <p class="status-result-title">${escapeHtml(row.title || 'Your report')}</p>
      <span class="status-pill status-pill--${escapeHtml(statusKey)}">${escapeHtml(statusLabel)}</span>
      ${responseBlock}
      <p class="status-updated">Last updated ${formatDate(row.updated_at)}</p>
    </div>`);
}

function initStatusPage() {
  const form = document.getElementById('status-form');
  const input = document.getElementById('ticket-input');
  if (!form || !input) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    checkTicket(input.value);
  });

  // Support links from the confirmation email: status.html?ticket=NJD-XXXXXX
  const params = new URLSearchParams(window.location.search);
  const prefilled = params.get('ticket');
  if (prefilled) {
    input.value = prefilled;
    checkTicket(prefilled);
  }
}

initStatusPage();