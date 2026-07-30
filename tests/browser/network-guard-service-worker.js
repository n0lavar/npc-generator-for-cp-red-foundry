const CROSS_ORIGIN_REQUEST = "cross-origin-request";

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin === self.location.origin) return;

  event.waitUntil(reportCrossOriginRequest(requestUrl.href));
  event.respondWith(
    Promise.resolve(
      new Response("Cross-origin requests are blocked by the offline test.", {
        status: 502,
        statusText: "Blocked by offline test"
      })
    )
  );
});

async function reportCrossOriginRequest(url) {
  const clients = await self.clients.matchAll({
    includeUncontrolled: true,
    type: "window"
  });
  for (const client of clients) {
    client.postMessage({ type: CROSS_ORIGIN_REQUEST, url });
  }
}
