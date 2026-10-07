import assert from 'node:assert/strict';
import test from 'node:test';
import { computeEntitlements, normalizeOverrides, normalizePlans } from './entitlements.js';

test('missing plan and override data produces safe disabled entitlements', () => {
  const plans = normalizePlans(undefined);
  const overrides = normalizeOverrides(undefined);
  const result = computeEntitlements(plans.resona, overrides.userId, undefined);

  assert.ok(Object.values(result.features).every((enabled) => enabled === false));
});

test('legacy plan data without optional feature fields is normalized safely', () => {
  const plans = normalizePlans({ resona: {} });
  const result = computeEntitlements(plans.resona, null, {});

  assert.equal(result.features.creator_hub, true);
  assert.equal(result.features.creator_upload, true);
  assert.equal(result.features.pulse, true);
});

test('null optional Firestore values do not break entitlement calculation', () => {
  const plans = normalizePlans(null);
  const overrides = normalizeOverrides(null);
  const result = computeEntitlements(plans.resona, overrides.userId, null);

  assert.ok(Object.values(result.features).every((enabled) => enabled === false));
});
