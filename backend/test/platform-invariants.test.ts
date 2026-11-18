import test from 'node:test';
import assert from 'node:assert/strict';
import { RESOURCE_TIERS } from '@codehost/config';
import {
  REFERRER_REWARD_CREDITS,
  REFEREE_REWARD_CREDITS,
} from '../src/services/referral.js';
import { resolvePackageAmountInr } from '../src/routes/billing.js';

test('Referral rewards prevent infinite free-tier Basic hosting loops', () => {
  assert.equal(REFERRER_REWARD_CREDITS, 50);
  assert.equal(REFEREE_REWARD_CREDITS, 25);
  assert.ok(
    REFEREE_REWARD_CREDITS < RESOURCE_TIERS.basic.creditsPerMonth,
    'Referee signup bonus alone must be strictly less than 1 month of Basic tier'
  );
});

test('resolvePackageAmountInr respects volume discounts and explicit Razorpay order amounts', () => {
  assert.equal(resolvePackageAmountInr(50), 80);
  assert.equal(resolvePackageAmountInr(100), 160);
  assert.equal(resolvePackageAmountInr(300), 400);
  assert.equal(resolvePackageAmountInr(600), 720);
  assert.equal(resolvePackageAmountInr(25), 40);
  assert.equal(resolvePackageAmountInr(50, 4900), 49);
});
