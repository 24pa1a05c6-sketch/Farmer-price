import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from '../src/app.js';
import User from '../src/models/User.js';

dotenv.config();

describe('KisanSetu Authentication & MongoDB Atlas E2E Test Suite', () => {
  const testEmail = `farmer_atlas_${Date.now()}@kisansetu.org`;
  const testPassword = 'SecureFarmerPass@2026';
  let authToken = '';
  let authCookie = '';

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
  });

  after(async () => {
    // Clean up test account created during test
    await User.deleteMany({ email: testEmail });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it('POST /api/auth/register creates new farmer in MongoDB Atlas and returns token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Ramesh Reddy',
        email: testEmail,
        password: testPassword,
        phone: '9848022338',
        role: 'admin', // Attack attempt: should be ignored and set to 'farmer'
        state: 'Andhra Pradesh',
        district: 'Guntur'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token, 'Token must be returned');
    assert.equal(res.body.user.name, 'Ramesh Reddy');
    assert.equal(res.body.user.email, testEmail);
    assert.equal(res.body.user.phone, '9848022338');
    assert.equal(res.body.user.role, 'farmer', 'Public registration must never assign admin role');
    assert.equal(res.body.user.passwordHash, undefined, 'Must never return passwordHash');

    // Verify cookie was set
    const cookies = res.headers['set-cookie'];
    assert.ok(cookies, 'set-cookie header must be present');
    assert.ok(cookies.some((c) => c.includes('kisansetu_token=')), 'kisansetu_token cookie must be set');

    // Verify record in MongoDB Atlas
    const savedUser = await User.findOne({ email: testEmail }).select('+passwordHash');
    assert.ok(savedUser, 'User must exist in MongoDB Atlas');
    assert.equal(savedUser.role, 'farmer');
    assert.notEqual(savedUser.passwordHash, testPassword, 'Password must be hashed with bcrypt');
  });

  it('POST /api/auth/register rejects duplicate registration with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate Ramesh',
        email: testEmail,
        password: testPassword
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /already exists/i);
  });

  it('POST /api/auth/register rejects short passwords and invalid emails', async () => {
    const resShort = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Short Pass',
        email: `valid_${Date.now()}@kisansetu.org`,
        password: 'short'
      });
    assert.equal(resShort.status, 400);

    const resEmail = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Invalid Email',
        email: 'notanemail',
        password: 'ValidPassword123'
      });
    assert.equal(resEmail.status, 400);
  });

  it('POST /api/auth/login validates credentials and sets session cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, testEmail);

    authToken = res.body.token;
    const cookies = res.headers['set-cookie'];
    assert.ok(cookies && cookies.length > 0);
    authCookie = cookies.find((c) => c.startsWith('kisansetu_token='));
  });

  it('POST /api/auth/login rejects incorrect passwords with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'WrongPassword!123'
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Invalid email or password/i);
  });

  it('GET /api/auth/me restores session using Bearer token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.email, testEmail);
    assert.equal(res.body.user.name, 'Ramesh Reddy');
  });

  it('GET /api/auth/me restores session using cookie', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [authCookie]);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.email, testEmail);
  });

  it('GET /api/auth/me rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('POST /api/auth/logout clears kisansetu_token cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const cookies = res.headers['set-cookie'];
    assert.ok(cookies);
    // When clearing, the cookie value is empty or expires in the past
    assert.ok(cookies.some((c) => c.includes('kisansetu_token=;')));
  });
});
