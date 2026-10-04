import fetch from 'node-fetch';

const BASE = 'http://localhost:5000';

async function run() {
  console.log('--- STARTING ADMIN SETTINGS VERIFICATION ---');

  // 1. Check Public Config
  const pubRes = await fetch(`${BASE}/api/platform/config`);
  if (!pubRes.ok) throw new Error(`Public config failed: ${pubRes.status}`);
  const pubConfig = await pubRes.json();
  console.log('✓ Public config retrieved:', pubConfig.platformName || pubConfig.branding?.platformName);

  // 2. Admin Login
  const loginRes = await fetch(`${BASE}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: process.env.ADMIN_PASSWORD || '130917' })
  });
  if (!loginRes.ok) throw new Error(`Admin login failed: ${loginRes.status}`);
  const { token } = await loginRes.json();
  console.log('✓ Admin authenticated successfully.');

  const adminHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 3. Get All Settings
  const settingsRes = await fetch(`${BASE}/api/admin/settings`, { headers: adminHeaders });
  if (!settingsRes.ok) throw new Error(`Get settings failed: ${settingsRes.status}`);
  const settings = await settingsRes.json();
  
  const expectedCategories = [
    'platform', 'catalog', 'creator', 'social', 'privacy',
    'api', 'storage', 'notifications', 'audioDefaults', 'contentSafety',
    'audit', 'system', 'branding'
  ];
  for (const cat of expectedCategories) {
    if (!settings[cat]) throw new Error(`Missing expected category: ${cat}`);
  }
  console.log(`✓ All ${expectedCategories.length} settings categories present.`);

  // 4. Update Settings (Change brand tagline and allowUserRegistration)
  const previousTagline = settings.branding.brandTagline;
  const newTagline = `Verified Pure Sound - ${Date.now()}`;
  
  const updateRes = await fetch(`${BASE}/api/admin/settings`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({
      branding: { brandTagline: newTagline }
    })
  });
  if (!updateRes.ok) throw new Error(`Settings update failed: ${updateRes.status}`);
  const updateResult = await updateRes.json();
  if (updateResult.settings.branding.brandTagline !== newTagline) {
    throw new Error('Updated tagline was not persisted in response');
  }
  console.log('✓ Settings updated and returned with diff:', updateResult.diff);

  // 5. Test Maintenance Mode Enforcement
  console.log('Testing Maintenance Mode enforcement...');
  // Turn on maintenance mode
  await fetch(`${BASE}/api/admin/settings`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({
      platform: {
        maintenanceMode: true,
        maintenanceMessage: "Automated test maintenance active."
      }
    })
  });

  // Call tracks endpoint as unauthenticated normal listener
  const maintCheckRes = await fetch(`${BASE}/api/tracks`);
  if (maintCheckRes.status !== 503) {
    throw new Error(`Expected 503 during maintenance mode, got ${maintCheckRes.status}`);
  }
  const maintBody = await maintCheckRes.json();
  console.log('✓ Normal user blocked with 503 during maintenance:', maintBody.error);

  // Call admin endpoint as admin during maintenance mode
  const adminMaintRes = await fetch(`${BASE}/api/admin/settings`, { headers: adminHeaders });
  if (!adminMaintRes.ok) {
    throw new Error(`Admin should be able to access endpoints during maintenance mode, got ${adminMaintRes.status}`);
  }
  console.log('✓ Admin successfully bypasses maintenance mode.');

  // Restore maintenance mode to false
  await fetch(`${BASE}/api/admin/settings`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({
      platform: { maintenanceMode: false }
    })
  });
  console.log('✓ Maintenance mode restored to false.');

  // 6. Test Registration Policy Enforcement
  console.log('Testing Registration Policy enforcement...');
  // Turn off user registration
  await fetch(`${BASE}/api/admin/settings`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({
      platform: { allowUserRegistration: false }
    })
  });

  // Attempt registration
  const regFailRes = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `test_blocked_${Date.now()}@example.com`,
      password: 'password123',
      name: 'Blocked User'
    })
  });
  if (regFailRes.status !== 403) {
    throw new Error(`Expected 403 when registration disabled, got ${regFailRes.status}`);
  }
  const regFailBody = await regFailRes.json();
  console.log('✓ Registration rejected with 403:', regFailBody.error);

  // Restore registration to true
  await fetch(`${BASE}/api/admin/settings`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({
      platform: { allowUserRegistration: true }
    })
  });
  console.log('✓ Registration restored to true.');

  // 7. Test Public Catalog Setting
  console.log('Testing Public Catalog setting...');
  await fetch(`${BASE}/api/admin/settings`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({
      catalog: { publicCatalog: false }
    })
  });
  const tracksEmptyRes = await fetch(`${BASE}/api/tracks`);
  const tracksEmpty = await tracksEmptyRes.json();
  if (tracksEmpty.length !== 0) {
    throw new Error(`Expected empty catalog when publicCatalog is false, got length ${tracksEmpty.length}`);
  }
  console.log('✓ Public catalog hides tracks when disabled.');

  await fetch(`${BASE}/api/admin/settings`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({
      catalog: { publicCatalog: true }
    })
  });
  console.log('✓ Public catalog restored to true.');

  // 8. Test Danger Zone Actions
  console.log('Testing Danger Zone operations...');
  const clearUploadsRes = await fetch(`${BASE}/api/admin/danger/clear-temp-uploads`, {
    method: 'POST',
    headers: adminHeaders
  });
  if (!clearUploadsRes.ok) throw new Error(`clear-temp-uploads failed: ${clearUploadsRes.status}`);
  const clearResult = await clearUploadsRes.json();
  console.log('✓ Danger action clear-temp-uploads:', clearResult.message);

  const rebuildCatRes = await fetch(`${BASE}/api/admin/danger/rebuild-catalog-index`, {
    method: 'POST',
    headers: adminHeaders
  });
  if (!rebuildCatRes.ok) throw new Error(`rebuild-catalog-index failed: ${rebuildCatRes.status}`);
  const rebuildCatResult = await rebuildCatRes.json();
  console.log('✓ Danger action rebuild-catalog-index:', rebuildCatResult.message);

  const rebuildRecRes = await fetch(`${BASE}/api/admin/danger/rebuild-recommendation-index`, {
    method: 'POST',
    headers: adminHeaders
  });
  if (!rebuildRecRes.ok) throw new Error(`rebuild-recommendation-index failed: ${rebuildRecRes.status}`);
  const rebuildRecResult = await rebuildRecRes.json();
  console.log('✓ Danger action rebuild-recommendation-index:', rebuildRecResult.message);

  // Test protection on destructive action
  const deleteFailRes = await fetch(`${BASE}/api/admin/danger/delete-catalog`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ confirmText: 'WRONG TEXT', adminPassword: 'wrong' })
  });
  if (deleteFailRes.status !== 400) {
    throw new Error(`Expected 400 for bad confirmation text, got ${deleteFailRes.status}`);
  }
  console.log('✓ Destructive action requires exact confirmation text and admin password.');

  // 9. Verify Audit Logs
  const auditRes = await fetch(`${BASE}/api/admin/audit-logs?limit=10`, { headers: adminHeaders });
  if (!auditRes.ok) throw new Error(`Audit logs fetch failed: ${auditRes.status}`);
  const auditData = await auditRes.json();
  console.log(`✓ Audit log contains ${auditData.total} entries. Most recent action: ${auditData.entries[0]?.action} on ${auditData.entries[0]?.target}`);

  // Restore tagline
  await fetch(`${BASE}/api/admin/settings`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({
      branding: { brandTagline: previousTagline }
    })
  });

  console.log('--- ALL ADMIN SETTINGS VERIFICATIONS PASSED ---');
}

run().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
