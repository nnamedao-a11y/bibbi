# Auth Testing Playbook (from Emergent OAuth integration)

(Saved 2026-04-23 — referenced from CustomerAuth redesign iteration.)

## Test User & Session setup
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.customers.insertOne({
  user_id: userId,
  customerId: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  role: 'customer',
  created_at: new Date()
});
db.customer_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"

## Endpoints to verify
- GET  /api/customer-auth/google/me  (Bearer <session_token>)
- POST /api/customer-auth/google/session  { sessionId }
- POST /api/customer-auth/google/logout

## Expected response shape (top-level, NOT nested under "user")
{
  "customerId": "user_xxx",
  "sessionToken": "...",
  "email": "...",
  "name": "...",
  "picture": "...",
  "role": "customer"
}
