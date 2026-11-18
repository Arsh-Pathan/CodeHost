import test from 'node:test';
import assert from 'node:assert/strict';
import { RESOURCE_TIERS } from '@codehost/config';
import {
  REFERRER_REWARD_CREDITS,
  REFEREE_REWARD_CREDITS,
} from '../src/services/referral.js';

test('Referral rewards prevent infinite free-tier Basic hosting loops', () => {
  assert.equal(REFERRER_REWARD_CREDITS, 50);
  assert.equal(REFEREE_REWARD_CREDITS, 25);
  assert.ok(
    REFEREE_REWARD_CREDITS < RESOURCE_TIERS.basic.creditsPerMonth,
    'Referee signup bonus alone must be strictly less than 1 month of Basic tier'
  );
});
