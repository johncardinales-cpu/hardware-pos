// Add this helper to Code.gs
function parsePayloadParam(params) {
  if (!params || !params.payload) return {};
  try { return JSON.parse(params.payload); }
  catch (error) { throw new Error('Invalid JSON payload parameter.'); }
}

// In handleRequest, replace these lines:
// const body = parseBody(e);
// const action = body.action || params.action;
// with these lines:
// const payload = parsePayloadParam(params);
// const body = Object.assign({}, payload, parseBody(e));
// const action = body.action || params.action;
