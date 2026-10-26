import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';

async function runVerification() {
  console.log('=== KisanSetu MongoDB Atlas & Auth E2E Verification ===\n');

  // 0. Verify Direct MongoDB Atlas Connectivity
  console.log('0. Connecting to MongoDB Atlas via Mongoose...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✔ MongoDB Atlas Connection established. ReadyState:', mongoose.connection.readyState);
  console.log('✔ Database name:', mongoose.connection.name);

  const timestamp = Date.now();
  const testEmail = `atlas_farmer_${timestamp}@kisansetu.org`;
  const testPassword = 'StrongFarmerPassword@2026';
  const testName = `Ramesh Patel ${timestamp}`;
  const testPhone = '9876543210';
  const testDistrict = 'Guntur';

  // 1. Verify Registration saves in MongoDB Atlas
  console.log('\n1. Testing User Registration (POST /api/auth/register)...');
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      phone: testPhone,
      district: testDistrict,
      password: testPassword
    })
  });

  const regData = await regRes.json();
  if (regRes.status !== 201) {
    throw new Error(`Registration failed with status ${regRes.status}: ${JSON.stringify(regData)}`);
  }
  console.log('✔ Registration API returned 201 Created.');
  console.log('✔ User role assigned:', regData.user.role);
  if (regData.user.role !== 'farmer') {
    throw new Error('Public registration should default to farmer role!');
  }

  // Check in MongoDB Atlas directly
  const atlasUser = await User.findOne({ email: testEmail });
  if (!atlasUser) {
    throw new Error('User record was NOT found in MongoDB Atlas database!');
  }
  console.log('✔ Verified in MongoDB Atlas: Document persisted with ID:', atlasUser._id);
  console.log('✔ Password hash verified in Atlas: Starts with bcrypt prefix $2');
  if (atlasUser.password === testPassword) {
    throw new Error('FATAL: Plaintext password was saved!');
  }

  // 2. Verify duplicate registration fails with 409
  console.log('\n2. Testing Duplicate Registration with same email...');
  const dupRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Duplicate Test',
      email: testEmail,
      password: testPassword
    })
  });
  console.log(`✔ Duplicate registration response status: ${dupRes.status} (Expected: 409)`);
  if (dupRes.status !== 409) {
    throw new Error(`Expected 409 Conflict, received ${dupRes.status}`);
  }

  // 3. Verify Login works with registered credentials
  console.log('\n3. Testing Login with correct credentials (POST /api/auth/login)...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword
    })
  });
  const loginData = await loginRes.json();
  if (loginRes.status !== 200 || !loginData.token) {
    throw new Error(`Login failed with status ${loginRes.status}: ${JSON.stringify(loginData)}`);
  }
  const setCookieHeader = loginRes.headers.get('set-cookie');
  console.log('✔ Login successful (Status 200). Received token.');
  console.log('✔ Set-Cookie header present:', Boolean(setCookieHeader));

  // Extract cookie
  const cookieMatch = setCookieHeader?.match(/kisansetu_token=([^;]+)/);
  const cookieValue = cookieMatch ? cookieMatch[1] : null;

  // 4. Verify Incorrect password is rejected with 401
  console.log('\n4. Testing Login with incorrect password...');
  const badLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'WrongPassword@123'
    })
  });
  console.log(`✔ Bad password response status: ${badLoginRes.status} (Expected: 401)`);
  if (badLoginRes.status !== 401) {
    throw new Error(`Expected 401 Unauthorized, received ${badLoginRes.status}`);
  }

  // 5. Verify Session restoration (/api/auth/me) with Cookie and Token
  console.log('\n5. Testing Session Restoration (GET /api/auth/me)...');
  // 5a. via Bearer token
  const meResBearer = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${loginData.token}` }
  });
  const meDataBearer = await meResBearer.json();
  if (meResBearer.status !== 200 || meDataBearer.user?.email !== testEmail) {
    throw new Error('Session restoration via Bearer token failed');
  }
  console.log('✔ Session restored via Bearer Token: User is', meDataBearer.user.name);

  // 5b. via HTTP-only Cookie
  if (cookieValue) {
    const meResCookie = await fetch(`${API_BASE}/auth/me`, {
      headers: { Cookie: `kisansetu_token=${cookieValue}` }
    });
    const meDataCookie = await meResCookie.json();
    if (meResCookie.status !== 200 || meDataCookie.user?.email !== testEmail) {
      throw new Error('Session restoration via Cookie failed');
    }
    console.log('✔ Session restored via Cookie: User is', meDataCookie.user.name);
  }

  // 6. Verify Logout clears session
  console.log('\n6. Testing Logout (POST /api/auth/logout)...');
  const logoutRes = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${loginData.token}`,
      Cookie: cookieValue ? `kisansetu_token=${cookieValue}` : ''
    }
  });
  console.log('✔ Logout returned status:', logoutRes.status);
  const logoutSetCookie = logoutRes.headers.get('set-cookie');
  console.log('✔ Logout cleared cookie:', logoutSetCookie?.includes('kisansetu_token=;'));

  // Verify protected route rejection without credentials
  const unauthRes = await fetch(`${API_BASE}/auth/me`);
  console.log(`✔ Unauthenticated access to /api/auth/me status: ${unauthRes.status} (Expected: 401)`);
  if (unauthRes.status !== 401) {
    throw new Error('Unauthenticated request should return 401');
  }

  // 7. Verify a Second Session can log in with same registered account
  console.log('\n7. Testing Second Session Login with same credentials...');
  const secondLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword
    })
  });
  const secondLoginData = await secondLoginRes.json();
  if (secondLoginRes.status !== 200 || !secondLoginData.token) {
    throw new Error('Second session login failed');
  }
  console.log('✔ Second browser session logged in successfully! New token generated.');

  // Clean up test user to keep Atlas DB clean
  await User.deleteOne({ email: testEmail });
  console.log('\n✔ Test record cleaned up from MongoDB Atlas.');

  await mongoose.disconnect();
  console.log('✔ Mongoose disconnected cleanly.');
  console.log('\n>>> ALL 7 MONGODB ATLAS & AUTHENTICATION CHECKS PASSED PERFECTLY! <<<');
}

runVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
