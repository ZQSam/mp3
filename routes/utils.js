// routes/utils.js
/**
 * Parse JSON-ish query params per MP spec.
 * Supports: where, sort, select (JSON); skip, limit (numbers); count (bool).
 * Throws SyntaxError with status=400 on malformed JSON so server.js can send 400.
 */
function parseQuery(q) {
  const out = {
    where: {},
    sort: null,
    select: null,
    skip: 0,
    limit: undefined,
    count: false,
  };

  const parseJSON = (key) => {
    if (q[key] == null) return null;
    try {
      return JSON.parse(q[key]);
    } catch (e) {
      const err = new SyntaxError(`Malformed JSON in "${key}"`);
      err.status = 400;
      throw err;
    }
  };

  out.where = parseJSON('where') || {};
  out.sort = parseJSON('sort') || null;
  out.select = parseJSON('select') || null;
  if (q.skip != null) out.skip = Math.max(0, Number(q.skip) || 0);
  if (q.limit != null) out.limit = Math.max(0, Number(q.limit) || 0);
  if (q.count != null) out.count = String(q.count).toLowerCase() === 'true';

  return out;
}

// Unified success helper
function ok(res, data, message = 'OK', status = 200) {
  res.status(status).json({ message, data });
}

// Unified error sender
function sendError(res, status, message, data = null) {
  res.status(status).json({ message, data });
}

module.exports = { parseQuery, ok, sendError };
