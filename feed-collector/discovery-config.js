/* Feed Collector API location.
   Default: a same-origin reverse-proxy route.
   When the Python service is hosted separately, replace the value below with
   its HTTPS origin + /api/feed-collector (for example, https://api.example.org/api/feed-collector).
*/
window.LIVE_EARTH_FEED_COLLECTOR_API_BASE = window.LIVE_EARTH_FEED_COLLECTOR_API_BASE || "/api/feed-collector";
