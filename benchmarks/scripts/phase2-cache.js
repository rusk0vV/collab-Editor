import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const cacheHits = new Counter('cache_hits');
const cacheMisses = new Counter('cache_misses');

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '60s', target: 500 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(99)<200'],  // Phase 2 target: sub-200ms p99
    http_req_failed: ['rate<0.01'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:4000';
const TEST_DOC_ID = __ENV.TEST_DOC_ID;
const TOKEN = __ENV.CLERK_TOKEN;

export default function () {
  // Load document — this is the cache test
  const docRes = http.get(`${BASE}/docs/${TEST_DOC_ID}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });

  check(docRes, { 'doc load 200': (r) => r.status === 200 });

  // Track cache behaviour from response
  if (docRes.json('fromCache') === true) {
    cacheHits.add(1);
  } else {
    cacheMisses.add(1);
  }

  sleep(0.5);
}

