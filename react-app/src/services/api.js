// ─── Centralised API helper ───────────────────────────

const normalizeBaseUrl = (value) => {
  if (!value) return null;
  return String(value).trim().replace(/\/+$/, '');
};

function inferApiBaseCandidates() {
  if (typeof window === 'undefined') return [];

  const origin = window.location.origin || '';
  const candidates = [];

  // If frontend and backend are served from the same origin through a reverse proxy.
  if (origin) {
    candidates.push(`${origin}/api`);
  }

  return candidates;
}

const envBase = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
const inferredBases = inferApiBaseCandidates().map(normalizeBaseUrl).filter(Boolean);
const isLocalDevHost = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname || '');
const localDefaultBase = normalizeBaseUrl('http://localhost:5000/api');

const prioritizedCandidates = isLocalDevHost
  ? [envBase, localDefaultBase, ...inferredBases]
  : [envBase, ...inferredBases, localDefaultBase];

const API_BASE_CANDIDATES = Array.from(
  new Set([
    ...prioritizedCandidates,
  ].filter(Boolean))
);

let activeBaseUrl = API_BASE_CANDIDATES[0];

const getActiveUploadBaseUrl = () => {
  // Priority order for upload URL:
  // 1. Explicit environment variable
  // 2. Inferred from active API base URL (same origin)
  // 3. Same origin /uploads
  
  const configured = normalizeBaseUrl(import.meta.env.VITE_UPLOAD_BASE_URL);
  if (configured) return configured;
  
  // If we have an active API base, derive uploads URL from it
  if (activeBaseUrl) {
    const apiBaseNormalized = activeBaseUrl.replace(/\/api$/, '');
    return `${apiBaseNormalized}/uploads`;
  }
  
  // Try same-origin uploads endpoint
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/uploads`;
  }
  
  // Final fallback (should rarely be used)
  return 'http://localhost:5000/uploads';
};

const PLACEHOLDER_IMAGES = {
  avatar: 'https://ui-avatars.com/api/?name=User&background=5f2c82&color=fff&size=200&rounded=true',
  profile: 'https://via.placeholder.com/400x400?text=Profile+Photo&bg=f4f0f8&tc=5f2c82',
  idcard: 'https://via.placeholder.com/300x400?text=ID+Card&bg=f4f0f8&tc=5f2c82',
  logo: 'https://via.placeholder.com/200x200?text=Logo&bg=f4f0f8&tc=5f2c82',
};

export const getUploadUrl = (pathOrUrl) => {
  if (!pathOrUrl) return PLACEHOLDER_IMAGES.profile;
  
  const pathStr = String(pathOrUrl).trim();
  
  // If already a full HTTP(S) URL, return as-is
  if (/^https?:\/\//i.test(pathStr)) return pathStr;
  
  if (!pathStr) return PLACEHOLDER_IMAGES.profile;

  // Normalize path - remove common prefixes
  let normalized = pathStr.replace(/^\/+/, '');
  normalized = normalized.replace(/^api\/uploads\//i, '');
  normalized = normalized.replace(/^uploads\//i, '');

  if (!normalized) return PLACEHOLDER_IMAGES.profile;
  
  // Get the active upload base URL and append the normalized path
  const uploadBase = getActiveUploadBaseUrl();
  const url = `${uploadBase}/${normalized}`;
  
  console.debug('[getUploadUrl]', { input: pathOrUrl, normalized, uploadBase, output: url });
  return url;
}

export const resolveAvatarUrl = (userLike) => {
  if (!userLike || typeof userLike !== 'object') return null;
  const photoUrl = userLike.photo_url || userLike.photo || userLike.avatar || null;
  return getUploadUrl(photoUrl);
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
  let lastHttpResult = null;

  console.debug('[REQUEST]', { path, baseAttempts, activeBaseUrl });

  for (const baseUrl of baseAttempts) {
    const headers = { ...(options.headers || {}) };
    if (hasBody && !bodyIsFormData && !Object.keys(headers).some((k) => k.toLowerCase() === 'content-type')) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const fullUrl = `${baseUrl}${path}`;
      console.debug(`[FETCH] Attempting: ${fullUrl}`);
      const res = await fetch(fullUrl, {
        ...options,
        headers,
      });
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      const isJsonResponse = contentType.includes('application/json');

      let data = {};
      try {
        data = await res.json();
      } catch (_) {
        const fallbackMessage = res.status === 413
          ? 'Uploaded files are too large. Please choose smaller images and try again.'
          : `Server error (HTTP ${res.status})`;
        data = { success: false, message: fallbackMessage };
      }

      console.debug(`[RESPONSE] ${fullUrl}:`, { status: res.status, ok: res.ok });

      // A wrong base (for example frontend origin `/api`) often returns non-JSON
      // framework errors like 404/405/500. Try the next candidate in that case.
      if (!res.ok && !isJsonResponse) {
        console.warn(`[SKIP] Non-JSON response from ${baseUrl}${path} (status ${res.status})`);
        lastHttpResult = { status: res.status, data };
        continue;
      }

      // Some platforms return JSON for unsupported methods/routes (for example 405).
      // If that happens on a same-origin inferred base, try the next API candidate.
      const isSameOriginInferredBase = typeof window !== 'undefined' && baseUrl === `${window.location.origin}/api`;
      if (!res.ok && isSameOriginInferredBase && (res.status === 404 || res.status === 405)) {
        console.warn(`[SKIP] Same-origin inferred base returned ${res.status}, trying next candidate`);
        lastHttpResult = { status: res.status, data };
        continue;
      }

      activeBaseUrl = baseUrl;
      console.debug(`[SUCCESS] Using base URL: ${baseUrl}`);
      return { ok: res.ok, status: res.status, data };
    } catch (error) {
      lastNetworkError = error;
      console.warn(`Request failed via ${baseUrl}${path}:`, error);
    }
  }

  if (lastHttpResult) {
    return { ok: false, status: lastHttpResult.status, data: lastHttpResult.data };
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
export const getProfile      = (id)      => request(`/profile/${encodeURIComponent(id)}`);
export const getMyProfile    = (id, userType) => {
  const params = new URLSearchParams();
  if (id !== undefined && id !== null) params.set('id', id);
  if (userType) params.set('user_type', userType);
  const query = params.toString();
  return request(`/my-profile${query ? `?${query}` : ''}`);
};
export const editProfile     = (payload) => {
  if (payload instanceof FormData) {
    return request('/edit-profile', { method: 'PUT', body: payload });
  }
  return request('/edit-profile', { method: 'PUT', body: JSON.stringify(payload || {}) });
};
export const updateAlumni    = (id, d)   => request(`/alumni/${id}`,   { method:'PUT',    body: JSON.stringify(d) });
export const updateAlumniPhoto = (id, file) => {
  const formData = new FormData();
  formData.append('photo', file);
  return request(`/alumni/${id}/photo`, { method:'POST', body: formData });
};
export const deleteAlumni    = (id)      => request(`/alumni/${id}`,   { method:'DELETE' });
export const approveAlumni   = (id)      => request(`/approve/${id}`,  { method:'POST' });
export const rejectAlumni    = (id)      => request(`/reject/${id}`,   { method:'POST' });
export const getPending      = ()        => request('/pending');

// ── Alumni Referrals ─────────────────────────────────
export const createReferral = (payload) => request('/referrals', { method:'POST', body: JSON.stringify(payload) });
export const getReferralsByAlumni = (alumniId) => request(`/referrals?alumni_id=${encodeURIComponent(alumniId)}`);
export const getPendingReferrals = () => request('/referrals/pending');
export const approveReferral = (id) => request(`/referrals/${id}/approve`, { method:'POST' });
export const rejectReferral = (id, admin_note='') => request(`/referrals/${id}/reject`, { method:'POST', body: JSON.stringify({ admin_note }) });

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
export const addEvent      = (payload) => {
  if (payload instanceof FormData) {
    return request('/events', { method: 'POST', body: payload });
  }
  return request('/events', { method: 'POST', body: JSON.stringify(payload || {}) });
};
export const updateEvent   = (id, d)   => request(`/events/${id}`,  { method:'PUT',    body: JSON.stringify(d) });
export const deleteEvent   = (id)      => request(`/events/${id}`,  { method:'DELETE' });
export const uploadEventImage = (eid, file) => {
  const formData = new FormData();
  formData.append('file', file);
  // First try the normal API-backed request which will attempt configured bases.
  return request(`/events/${eid}/upload-image`, { method: 'POST', body: formData }).then(async (res) => {
    // If the API candidate returned 404 (route not found on that base), try a same-origin fallback
    // that omits the `/api` prefix — some dev setups hit that route directly.
    if (res && res.status === 404 && typeof window !== 'undefined') {
      try {
        const fallbackUrl = `${window.location.origin}/events/${eid}/upload-image`;
        const resp = await fetch(fallbackUrl, { method: 'POST', body: formData });
        const data = await resp.json().catch(() => ({ success: false, message: `Upload failed (HTTP ${resp.status})` }));
        return { ok: resp.ok, status: resp.status, data };
      } catch (err) {
        return res;
      }
    }

    return res;
  });
};
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
export const updateFundRequest  = (id, d) => request(`/fund-requests/${id}`, { method:'PUT', body: JSON.stringify(d) });
export const deleteFundRequest  = (id)    => request(`/fund-requests/${id}`, { method:'DELETE' });

// ── Success Stories ───────────────────────────────────
export const getSuccessStories = (page = 1, limit = 10) => {
  const query = new URLSearchParams();
  query.set('page', String(page));
  query.set('limit', String(limit));
  const qs = query.toString();
  return request(`/success-stories${qs ? `?${qs}` : ''}`);
};

export const submitSuccessStory = async (data) => {
  const formData = new FormData();
  
  if (data.title) formData.append('title', data.title);
  if (data.story) formData.append('story', data.story);
  if (data.current_position) formData.append('current_position', data.current_position);
  if (data.batch) formData.append('batch', data.batch);
  if (data.department) formData.append('department', data.department);
  if (data.image_file) formData.append('image', data.image_file);

  return request('/success-stories', { 
    method: 'POST', 
    body: formData 
  });
};

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
