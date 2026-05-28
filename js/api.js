const API_BASE = (() => {
  const url = new URL(window.location.href);
  return url.origin + url.pathname;
})();

const _pendingRequests = {};
async function callBackend(action, params = {}) {
  const key = action + '|' + JSON.stringify(params);
  if (_pendingRequests[key]) return _pendingRequests[key];

  const url = new URL(API_BASE);
  url.searchParams.append('action', action);
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, params[key]);
    }
  });
  
  const promise = (async () => {
    const response = await fetch(url.toString());
    return await response.json();
  })();
  _pendingRequests[key] = promise;
  promise.then(() => {}, () => {}).finally(() => { delete _pendingRequests[key]; });
  return promise;
}

async function isCacheFresh(cacheKey = 'last_full_sync', maxAgeMs = 5 * 60 * 1000) {
  const ts = await crmDb.getKV(cacheKey);
  return ts && (Date.now() - ts < maxAgeMs);
}

async function getCachedExtraDetails(cifId, maxAgeMs = 15 * 60 * 1000) {
  const cached = await crmDb.getKV('contact_' + cifId);
  if (cached && cached._cachedAt && (Date.now() - cached._cachedAt < maxAgeMs)) {
    return cached;
  }
  if (!navigator.onLine) return cached || null;
  try {
    const data = await callBackend('extraDetails', { cifId });
    if (data) {
      data._cachedAt = Date.now();
      await crmDb.putKV('contact_' + cifId, data);
    }
    return data;
  } catch (e) {
    return cached || null;
  }
}

async function setCachedInsights(cifId, key, data) {
  if (data) {
    data._cachedAt = Date.now();
    await crmDb.putKV(key + '_' + cifId, data);
  }
}

async function getCachedInsights(cifId, apiAction, cacheKey) {
  const cached = await crmDb.getKV(cacheKey + '_' + cifId);
  if (cached && cached._cachedAt && (Date.now() - cached._cachedAt < 5 * 60 * 1000)) {
    return cached;
  }
  if (!navigator.onLine) return cached || null;
  try {
    const data = await callBackend(apiAction, { cifId });
    if (data) {
      data._cachedAt = Date.now();
      await crmDb.putKV(cacheKey + '_' + cifId, data);
    }
    return data;
  } catch (e) {
    return cached || null;
  }
}
