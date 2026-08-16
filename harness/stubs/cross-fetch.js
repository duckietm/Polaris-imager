const doFetch = (...args) => globalThis.fetch(...args);

export default doFetch;
export const fetch = doFetch;
export const Headers = globalThis.Headers;
export const Request = globalThis.Request;
export const Response = globalThis.Response;
