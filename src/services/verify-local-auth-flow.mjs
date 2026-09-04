/**
 * Verification script for the Express backend auth and API flows.
 * Tests local auth, seeded admin (coolman), demo user, wallet operations,
 * admin approvals, investment catalog, and security middleware.
 */

const BASE = 'http://localhost:3000';

async function run() {
  console.log('Testing SolNova Capital local Express backend API at', BASE);
  let passCount = 0;
  let totalCount = 0;

  function assert(condition, name, details = '') {
    totalCount++;
    if (condition) {
      passCount++;
      console.log(`✓ PASS: ${name}`);
    } else {
      console.error(`✗ FAIL: ${name} ${details}`);
    }
  }

  try {
    // 1. Health check
    const healthRes = await fetch(`${BASE}/api/health`);
    assert(healthRes.ok, '1. Health check /api/health returns 200');

    // 2. Catalog fetch (unauthenticated)
    const catalogRes = await fetch(`${BASE}/api/catalog/machines`);
    const catalogData = await catalogRes.json();
    assert(catalogRes.ok && catalogData.machines && catalogData.machines.length > 0, '2. Fetch catalog machines returns items', `count=${catalogData.machines?.length}`);

    // 3. Login as seeded admin coolman
    const adminLoginRes = await fetch(`${BASE}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'coolman', password: 'TestPass123!' }),
    });
    const adminLogin = await adminLoginRes.json();
    assert(adminLoginRes.ok && adminLogin.isAdmin === true && adminLogin.token, '3. Login as seeded admin (coolman) succeeds with isAdmin=true');
    const adminToken = adminLogin.token;

    // 4. Login as seeded demo user
    const userLoginRes = await fetch(`${BASE}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'demouser', password: 'TestPass123!' }),
    });
    const userLogin = await userLoginRes.json();
    assert(userLoginRes.ok && userLogin.isAdmin === false && userLogin.token, '4. Login as demo user succeeds with token');
    const userToken = userLogin.token;

    // 5. Test requireAuth on /api/user/data
    const authFailRes = await fetch(`${BASE}/api/user/data`);
    assert(authFailRes.status === 401, '5. Unauthenticated request to /api/user/data returns 401');

    // 6. Test authenticated /api/user/data with userToken
    const userDataRes = await fetch(`${BASE}/api/user/data`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const userData = await userDataRes.json();
    assert(userDataRes.ok && userData.wallet && userData.wallet.totalBalanceUGX !== undefined, '6. Authenticated /api/user/data returns wallet');

    // 7. Non-admin accessing admin endpoint returns 403
    const nonAdminRes = await fetch(`${BASE}/api/admin/transactions`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(nonAdminRes.status === 403, '7. Non-admin accessing /api/admin/transactions returns 403 Forbidden');

    // 8. Admin accessing admin transactions returns list
    const adminTxRes = await fetch(`${BASE}/api/admin/transactions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminTxs = await adminTxRes.json();
    assert(adminTxRes.ok && Array.isArray(adminTxs.transactions), '8. Admin accessing /api/admin/transactions returns list');

    // 9. User submits deposit
    const depositRes = await fetch(`${BASE}/api/wallet/deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        amountUGX: 25000,
        paymentMethod: 'MTN Mobile Money',
        recipientInfo: '+256701234567',
        description: 'Test Verification Deposit',
      }),
    });
    const depositData = await depositRes.json();
    assert(depositRes.ok && depositData.success && depositData.transaction?.id, '9. User submits deposit request');
    const newTxId = depositData.transaction?.id;

    // 10. Admin sees pending deposit in pending transactions
    const pendingRes = await fetch(`${BASE}/api/admin/pending-transactions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pendingData = await pendingRes.json();
    const foundPending = pendingData.transactions?.some(t => t.id === newTxId);
    assert(foundPending, '10. Admin pending-transactions includes newly submitted deposit');

    // 11. Admin approves the deposit
    if (newTxId) {
      const approveRes = await fetch(`${BASE}/api/admin/transactions/${newTxId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const approveData = await approveRes.json();
      assert(approveRes.ok && approveData.success, '11. Admin approves transaction successfully');
    }

    // 12. Signup a brand new user
    const newUname = `auto_${Date.now().toString(36)}`;
    const signupRes = await fetch(`${BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: newUname,
        password: 'TestPass123!',
        fullName: 'Automated Test User',
      }),
    });
    const signupData = await signupRes.json();
    assert(signupRes.ok && signupData.user?.username === newUname && signupData.data?.wallet?.totalBalanceUGX === 4000, '12. Brand new user signs up with welcome bonus of UGX 4,000');

    console.log(`\n============================`);
    console.log(`Result: ${passCount}/${totalCount} tests passed!`);
    console.log(`============================`);
  } catch (err) {
    console.error('Test execution error:', err);
  }
}

run();
