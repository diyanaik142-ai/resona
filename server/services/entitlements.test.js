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

test('a user override cannot restore a feature excluded from their plan', () => {
  const plans = normalizePlans({
    resona: { features: { huddle: false, fusion: false } },
    resona_silver: { features: { huddle: true, fusion: true } }
  });

  const resona = computeEntitlements(plans.resona, { huddle: true, fusion: true });
  const silver = computeEntitlements(plans.resona_silver, { huddle: false, fusion: false });

  assert.equal(resona.features.huddle, false);
  assert.equal(resona.features.fusion, false);
  assert.equal(silver.features.huddle, false);
  assert.equal(silver.features.fusion, false);
});

test('a user override does not disable a feature enabled by global policy when unset', () => {
  const plans = normalizePlans({ resona_silver: { features: { huddle: true } } });
  const result = computeEntitlements(plans.resona_silver, {}, { huddle: true });

  assert.equal(result.features.huddle, true);
});
