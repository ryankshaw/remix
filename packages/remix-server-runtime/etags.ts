import { hexdigest } from "./crypto";

/** Automatically sets the ETag header on all String bodies.
 *
 * The ETag header is skipped if ETag or Last-Modified headers are sent or if there is no body
 */
export async function addEtag(response: Response) {
  if (
    response.status === 200 &&
    response.body &&
    !skipCaching(response.headers)
  ) {
    let digest = await hexdigest(response.body);
    if (digest) {
      // Weak ETags have a leading W/ to differentiate them from strong ETags.
      response.headers.set("ETag", `W/"${digest.substring(0, 27)}`);
      if (!response.headers.get("Cache-Control")) {
        response.headers.set(
          "Cache-Control",
          "max-age=0, private, must-revalidate"
        );
      }
    }
  }
  return response;
}

function skipCaching(headers: Headers) {
  return headers.has("ETag") || headers.has("Last-Modified");
}

/** Middleware that enables conditional GET using If-None-Match and
 * If-Modified-Since. The application should set either or both of the
 * Last-Modified or Etag response headers according to RFC 2616. When
 * either of the conditions is met, the response body is set to be zero
 * length and the response status is set to 304 Not Modified.
 */
export function return304IfFresh(request: Request, response: Response) {
  if (
    (request.method === "GET" || request.method === "HEAD") &&
    response.status == 200 &&
    fresh(request.headers, response.headers)
  ) {
    response.headers.delete("Content-Type");
    return new Response(null, {
      headers: response.headers,
      status: 304,
      statusText: "Not Modified"
    });
  }
  return response;
}

/** whether the response has not been modified since the last request.
 */
function fresh(requestHeaders: Headers, responseHeaders: Headers) {
  // If-None-Match has priority over If-Modified-Since per RFC 7232
  let noneMatch = requestHeaders.get("If-None-Match");
  if (noneMatch) return etagMatches(noneMatch, responseHeaders);

  let ims = requestHeaders.get("If-Modified-Since");
  if (ims) return modifiedSince(ims, responseHeaders);

  return false;
}

/** Whether the ETag response header matches the If-None-Match request header.
 *  If so, the request has not been modified.
 */
function etagMatches(noneMatch: string, headers: Headers) {
  return noneMatch && noneMatch === headers.get("ETag");
}

/** Whether the `Last-Modified` response header is older or equal to the
 * `If-Modified-Since` request header.  If so, the request has not been modified.
 */
function modifiedSince(IfModifedSinceHeader: string, headers: Headers) {
  let modifiedSince = toMilliseconds(IfModifedSinceHeader);
  let lastModified;
  return (
    modifiedSince &&
    (lastModified = headers.get("Last-Modified")) &&
    (lastModified = toMilliseconds(lastModified)) &&
    modifiedSince >= lastModified
  );
}

function toMilliseconds(string: string) {
  return new Date(string).getTime();
}
