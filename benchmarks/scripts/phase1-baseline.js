import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '15s', target: 30 },   // ramp up to 30 users
    { duration: '30s', target: 150 },  // hold at 150 users
    { duration: '15s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<2000'], // expected to be slow under direct Postgres writes
  },
};

const BASE = 'http://localhost:4000';
// This ID must match a document that exists in the database
const TEST_DOC_ID = __ENV.TEST_DOC_ID || '00000000-0000-0000-0000-000000000000';

export default function () {
  // 1. Login
  const loginRes = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({
      email: 'test@example.com',
      password: 'testpass123',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(loginRes, {
    'login success (200)': (r) => r.status === 200,
  });

  const body = loginRes.json();
  // Ensure token was returned
  if (body && typeof body === 'object' && 'token' in body) {
    const token = body.token;

    // 2. Load the shared test document
    const docRes = http.get(`${BASE}/docs/${TEST_DOC_ID}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    check(docRes, {
      'document load success (200)': (r) => r.status === 200,
    });
  }

  sleep(1);
}
