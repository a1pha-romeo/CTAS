import test from 'node:test';
import assert from 'node:assert';
import app from '../server.js';

let serverInstance;
let baseUrl;

test.before(async () => {
  return new Promise((resolve) => {
    // Listen on an ephemeral port for testing
    serverInstance = app.listen(0, '127.0.0.1', () => {
      const address = serverInstance.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (serverInstance) {
    serverInstance.close();
  }
});

test('Phase 3: Authentication and Role-Based Access Control (RBAC)', async (t) => {
  let adminToken;
  let facultyToken;
  let studentToken;

  await t.test('1. Admin login succeeds with Admin@123', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'Admin@123',
        role: 'admin'
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.role, 'admin');
    assert.ok(data.token, 'Expected JWT token in response');
    adminToken = data.token;
  });

  await t.test('2. Faculty login succeeds with Faculty@123', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'faculty1',
        password: 'Faculty@123',
        role: 'faculty'
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.role, 'faculty');
    assert.ok(data.user.facultyId > 0, 'Expected valid facultyId');
    facultyToken = data.token;
  });

  await t.test('3. Student login succeeds with Student@123', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'student1',
        password: 'Student@123',
        role: 'student'
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.role, 'student');
    assert.ok(data.user.studentId > 0, 'Expected valid student section ID');
    studentToken = data.token;
  });

  await t.test('4. Login rejects invalid password with 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'WrongPassword!',
        role: 'admin'
      })
    });

    assert.strictEqual(res.status, 401);
  });

  await t.test('5. Role mismatch returns 403 (student trying to login as admin)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'student1',
        password: 'Student@123',
        role: 'admin' // Mismatch
      })
    });

    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.ok(data.error.includes('Role mismatch'));
  });

  await t.test('6. Unauthenticated requests to protected route return 401', async () => {
    const res = await fetch(`${baseUrl}/api/admin/overview`);
    assert.strictEqual(res.status, 401);
  });

  await t.test('7. Cross-role API calls return 403 (Faculty accessing Admin endpoint)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${facultyToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  await t.test('8. Cross-role API calls return 403 (Student accessing Admin endpoint)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  await t.test('9. Admin can access Admin overview endpoint', async () => {
    const res = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.stats.facultyCount >= 10);
    assert.ok(data.stats.subjectsCount >= 12);
  });

  await t.test('10. Faculty can access Faculty profile and schedule', async () => {
    const res = await fetch(`${baseUrl}/api/faculty/profile`, {
      headers: { Authorization: `Bearer ${facultyToken}` }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.faculty.name, 'Dr. Alan Turing');
    assert.ok(Array.isArray(data.weeklySchedule));
  });

  await t.test('11. Student can access Student section schedule', async () => {
    const res = await fetch(`${baseUrl}/api/student/schedule`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.section.name, 'CSE-4A');
    assert.ok(Array.isArray(data.schedule));
  });
});
