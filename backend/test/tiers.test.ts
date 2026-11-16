import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RESOURCE_TIERS,
  CREDIT_PACKAGES,
  CREDIT_PRICE_INR,
  CREDIT_PRICE_USD,
} from '@codehost/config';

test('RESOURCE_TIERS enforces free < basic < pro < business limits', () => {
  const { free, basic, pro, business } = RESOURCE_TIERS;
  assert.ok(free && basic && pro && business, 'All four tiers must be defined');

  assert.equal(free.creditsPerMonth, 0);
  assert.equal(free.maxProjects, 1);
  assert.ok(free.memory < basic.memory);
  assert.ok(basic.memory < pro.memory);
  assert.ok(pro.memory < business.memory);

  assert.ok(free.cpus < basic.cpus);
  assert.ok(basic.cpus < pro.cpus);
  assert.ok(pro.cpus < business.cpus);

  assert.ok(free.storage < basic.storage);
  assert.ok(basic.storage < pro.storage);
  assert.ok(pro.storage < business.storage);
});

test('CREDIT_PACKAGES includes starter 50-credit pack and scales with volume discounts', () => {
  assert.ok(CREDIT_PACKAGES.length >= 4, 'Expected at least 4 credit packages');

  const starter = CREDIT_PACKAGES.find((p) => p.credits === 50);
  assert.ok(starter, '50-credit starter package must exist');
  assert.equal(starter.priceInr, Math.round(50 * CREDIT_PRICE_INR));
  assert.equal(starter.priceUsd, Number((50 * CREDIT_PRICE_USD).toFixed(2)));

  // Volume packages should have lower or equal per-credit INR cost than base rate
  for (const pkg of CREDIT_PACKAGES) {
    const perCreditInr = pkg.priceInr / pkg.credits;
    assert.ok(
      perCreditInr <= CREDIT_PRICE_INR + 0.001,
      `Package ${pkg.credits} should not exceed base INR/credit rate`
    );
  }
});
