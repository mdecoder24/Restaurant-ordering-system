// k6 load test for the MVP scale target (PRD §6): 50 concurrent orders per outlet at peak.
// Run:  k6 run -e BASE_URL=https://staging.example -e QR=<table token> -e ITEM=<menu item id> tests/load/order-placement.js
// Never point this at production.
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    peak: { executor: "ramping-vus", startVUs: 0, stages: [{ duration: "30s", target: 50 }, { duration: "2m", target: 50 }, { duration: "15s", target: 0 }] },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{name:menu}": ["p(95)<800"],
    "http_req_duration{name:order}": ["p(95)<1500"],
  },
};

const base = __ENV.BASE_URL;
const qr = __ENV.QR;
const item = __ENV.ITEM;

export default function orderPlacementScenario() {
  const menu = http.get(`${base}/t/${qr}`, { tags: { name: "menu" } });
  check(menu, { "menu 200": (r) => r.status === 200 });
  sleep(2 + Math.random() * 3);
  // Each VU is its own guest; rate limits are per IP, so run from several load generators
  // or raise limits on staging.
  const key = `k6-${__VU}-${__ITER}-${Date.now()}`;
  const res = http.post(
    `${base}/api/guest/orders`,
    JSON.stringify({ qr, lines: [{ item_id: item, variant_id: null, addon_ids: [], qty: 1 }] }),
    { headers: { "Content-Type": "application/json", "Idempotency-Key": key }, tags: { name: "order" } },
  );
  check(res, { "order created or rate limited": (r) => r.status === 201 || r.status === 429 });
  sleep(5);
}
