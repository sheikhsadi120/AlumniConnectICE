// ─── Centralised API helper ───────────────────────────
const RENDER_DEFAULT_API_BASE = 'https://alumniconnect-api.onrender.com/api';

const normalizeBaseUrl = (value) => {
  if (!value) return null;
  return String(value).trim().replace(/\/+$/, '');
};

function inferRenderApiBaseCandidates() {
  if (typeof window === 'undefined') return [];

  const host = window.location.hostname || '';
  const origin = window.location.origin || '';
  const candidates = [];

  // If frontend and backend are served from the same origin through a reverse proxy.
  if (origin) {
    candidates.push(`${origin}/api`);
  }

  if (!/\.onrender\.com$/i.test(host)) {
    return candidates;
  }

  const namedMatch = host.match(/^(.+?)-(web|frontend|front|fe|client|ui)(?:-([a-z0-9]+))?\.onrender\.com$/i);
  if (namedMatch) {
    const baseName = namedMatch[1];
    const suffix = namedMatch[3];
    if (suffix) {
      candidates.push(`https://${baseName}-api-${suffix}.onrender.com/api`);
    }
    candidates.push(`https://${baseName}-api.onrender.com/api`);
  }

  const replaceSuffix = (suffixes) => {
    for (const suffix of suffixes) {
      if (host.endsWith(`${suffix}.onrender.com`)) {
        const apiHost = host.replace(new RegExp(`${suffix}\\.onrender\\.com$`, 'i'), '-api.onrender.com');
        candidates.push(`https://${apiHost}/api`);
        return;
      }
    }
  };

  replaceSuffix(['-web', '-frontend', '-front', '-fe', '-client', '-ui']);

  const parts = host.replace(/\.onrender\.com$/i, '').split('-').filter(Boolean);
  if (parts.length > 1) {
    const guessed = `${parts.slice(0, -1).join('-')}-api.onrender.com`;
    candidates.push(`https://${guessed}/api`);
  }

  return candidates;
}

const envBase = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
const inferredBases = inferRenderApiBaseCandidates().map(normalizeBaseUrl).filter(Boolean);

const API_BASE_CANDIDATES = Array.from(
  new Set([
    envBase,
    ...inferredBases,
    normalizeBaseUrl(RENDER_DEFAULT_API_BASE),
    normalizeBaseUrl('http://localhost:5000/api'),
  ].filter(Boolean))
);

let activeBaseUrl = API_BASE_CANDIDATES[0];

const getActiveUploadBaseUrl = () => {
  const configured = normalizeBaseUrl(import.meta.env.VITE_UPLOAD_BASE_URL);
  if (configured) return configured;
  const apiBase = activeBaseUrl || API_BASE_CANDIDATES[0] || '';
  return `${apiBase.replace(/\/api$/, '')}/uploads`.replace(/\/+$/, '');
};

export const getUploadUrl = (pathOrUrl) => {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${getActiveUploadBaseUrl()}/${String(pathOrUrl).replace(/^\/+/, '')}`;
};

async function request(path, options = {}) {
  const hasBody = options.body !== undefined && options.body !== null;
  const bodyIsFormData = typeof FormData !== 'undefined' && hasBody && options.body instanceof FormData;

  const getAttemptOrder = () => {
    const ordered = [];
    if (activeBaseUrl) ordered.push(activeBaseUrl);
    for (const candidate of API_BASE_CANDIDATES) {
      if (!ordered.includes(candidate)) ordered.push(candidate);
    }
    return ordered;
  };

  const baseAttempts = getAttemptOrder();
  let lastNetworkError = null;

  for (const baseUrl of baseAttempts) {
    const headers = { ...(options.headers || {}) };
    if (hasBody && !bodyIsFormData && !Object.keys(headers).some((k) => k.toLowerCase() === 'content-type')) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const res = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers,
      });
      activeBaseUrl = baseUrl;

      let data = {};
      try {
        data = await res.json();
      } catch (_) {
        data = { success: false, message: `Server error (HTTP ${res.status})` };
      }
      return { ok: res.ok, status: res.status, data };
    } catch (error) {
      lastNetworkError = error;
      console.warn(`Request failed via ${baseUrl}${path}:`, error);
    }
  }

  const attempted = baseAttempts.join(', ');
  throw new Error(`Failed to fetch ${path}. Attempted API bases: ${attempted}. Last error: ${lastNetworkError?.message || 'Unknown network error'}`);
}

// ── Auth ──────────────────────────────────────────────
export const adminLogin   = (username, password)  => request('/admin-login',  { method:'POST', body: JSON.stringify({ username, password }) });
export const alumniLogin  = (email, password)     => request('/alumni-login', { method:'POST', body: JSON.stringify({ email, password }) });
export const studentLogin = (email, password)     => request('/student-login', { method:'POST', body: JSON.stringify({ email, password }) });
export const requestPasswordResetOtp = (email, user_type) =>
  request('/forgot-password/request-otp', { method:'POST', body: JSON.stringify({ email, user_type }) });
export const resetPasswordWithOtp = (email, user_type, otp, new_password) =>
  request('/forgot-password/reset', { method:'POST', body: JSON.stringify({ email, user_type, otp, new_password }) });
export const register    = (formData) => {
  // formData is a FormData object (contains file)
  return request('/register', { method: 'POST', body: formData });
};

// ── Alumni ────────────────────────────────────────────
export const getAlumni       = ()        => request('/alumni');
export const getStudents     = ()        => request('/students');
export const updateAlumni    = (id, d)   => request(`/alumni/${id}`,   { method:'PUT',    body: JSON.stringify(d) });
export const deleteAlumni    = (id)      => request(`/alumni/${id}`,   { method:'DELETE' });
export const approveAlumni   = (id)      => request(`/approve/${id}`,  { method:'POST' });
export const rejectAlumni    = (id)      => request(`/reject/${id}`,   { method:'POST' });
export const getPending      = ()        => request('/pending');

// ── Alumni Membership Upgrade ─────────────────────────
export const requestUpgrade = (id, payload) => {
  // payload can be JSON-friendly object or FormData when document upload is included.
  if (payload instanceof FormData) {
    return request(`/request-upgrade/${id}`, { method: 'POST', body: payload });
  }
  return request(`/request-upgrade/${id}`, { method:'POST', body: JSON.stringify(payload || {}) });
};
export const getUpgradeRequests = ()     => request('/upgrade-requests');
export const approveUpgrade   = (id)     => request(`/approve-upgrade/${id}`,  { method:'POST' });
export const rejectUpgrade    = (id)     => request(`/reject-upgrade/${id}`,   { method:'POST' });

// ── Events ────────────────────────────────────────────
export const getEvents     = ()        => request('/events');
export const addEvent      = (d)       => request('/events',        { method:'POST',   body: JSON.stringify(d) });
export const updateEvent   = (id, d)   => request(`/events/${id}`,  { method:'PUT',    body: JSON.stringify(d) });
export const deleteEvent   = (id)      => request(`/events/${id}`,  { method:'DELETE' });
export const joinEvent          = (eid, aid) => request(`/events/${eid}/join`,  { method:'POST', body: JSON.stringify({ alumni_id: aid }) });
export const leaveEvent         = (eid, aid) => request(`/events/${eid}/leave`, { method:'POST', body: JSON.stringify({ alumni_id: aid }) });
export const getAlumniEvents    = (aid)      => request(`/alumni/${aid}/events`);
export const registerForEvent   = (eid, d)   => request(`/events/${eid}/register`, { method:'POST', body: JSON.stringify(d) });
export const getEventAttendees  = (eid)      => request(`/events/${eid}/attendees`);

// ── Transactions ──────────────────────────────────────
export const getTransactions    = (params = {}) => {
  const query = new URLSearchParams();
  if (params.alumni_id) query.set('alumni_id', String(params.alumni_id));
  const qs = query.toString();
  return request(`/transactions${qs ? `?${qs}` : ''}`);
};
export const addTransaction     = (d)     => request('/transactions',     { method:'POST',   body: JSON.stringify(d) });
export const deleteTransaction  = (id)    => request(`/transactions/${id}`,{ method:'DELETE' });
export const getFundRequests    = (params = {}) => {
  const query = new URLSearchParams();
  if (params.status) query.set('status', String(params.status));
  const qs = query.toString();
  return request(`/fund-requests${qs ? `?${qs}` : ''}`);
};
export const addFundRequest     = (d)     => request('/fund-requests', { method:'POST', body: JSON.stringify(d) });

// ── Trainings ─────────────────────────────────────────
export const getTrainings      = ()        => request('/trainings');
export const addTraining       = (d)       => request('/trainings',        { method:'POST',   body: JSON.stringify(d) });
export const updateTraining    = (id, d)   => request(`/trainings/${id}`,  { method:'PUT',    body: JSON.stringify(d) });
export const deleteTraining    = (id)      => request(`/trainings/${id}`,  { method:'DELETE' });
export const enrollTraining    = (tid, aid) => request(`/trainings/${tid}/enroll`,   { method:'POST', body: JSON.stringify({ alumni_id: aid }) });
export const unenrollTraining  = (tid, aid) => request(`/trainings/${tid}/unenroll`, { method:'POST', body: JSON.stringify({ alumni_id: aid }) });
export const getAlumniTrainings       = (aid)    => request(`/alumni/${aid}/trainings`);
export const registerForTraining    = (tid, d) => request(`/trainings/${tid}/register`,  { method:'POST', body: JSON.stringify(d) });
export const getTrainingAttendees   = (tid)    => request(`/trainings/${tid}/attendees`);
export const getEnrolledTrainingIds   = (aid)    => request(`/alumni/${aid}/enrolled-training-ids`);
export const getRegisteredEventIds  = (aid)    => request(`/alumni/${aid}/registered-event-ids`);

// ── Jobs ─────────────────────────────────────────────
export const getJobs           = ()    => request('/jobs');
export const addJob            = (d)   => request('/jobs',                    { method:'POST',   body: JSON.stringify(d) });
export const submitJob         = (d)   => request('/jobs/submit',             { method:'POST',   body: JSON.stringify(d) });
export const getPendingJobs    = ()    => request('/jobs/pending-submissions');
export const approveJob        = (id)  => request(`/jobs/${id}/approve`,      { method:'POST' });
export const deleteJob         = (id)  => request(`/jobs/${id}`,              { method:'DELETE' });

// ── Existing Lists (Admin Excel Repository) ──────────
export const getExistingLists = () => request('/existing-lists');
export const uploadExistingList = (formData) => {
  return request('/existing-lists', { method: 'POST', body: formData });
};
export const deleteExistingList = (id) => request(`/existing-lists/${id}`, { method: 'DELETE' });
export const getExistingListData = (id) => request(`/existing-lists/${id}/data`);

// ── Existing Alumni (Admin-Added Alumni List) ────────
export const getExistAlumni = () => request('/exist-alumni');
export const addExistAlumni = (alumniData) => request('/exist-alumni', { method: 'POST', body: JSON.stringify(alumniData) });
export const bulkAddExistAlumni = (alumniRecords) => request('/exist-alumni/bulk', { method: 'POST', body: JSON.stringify({ alumni_records: alumniRecords }) });
export const deleteExistAlumni = (id) => request(`/exist-alumni/${id}`, { method: 'DELETE' });

// ── Email Center ─────────────────────────────────────
export const sendAdminEmail = (payload) => request('/email/send', { method:'POST', body: JSON.stringify(payload) });
export const getEmailLogs = () => request('/email/logs');

// ── Stats ─────────────────────────────────────────────
export const getStats = () => request('/stats');
