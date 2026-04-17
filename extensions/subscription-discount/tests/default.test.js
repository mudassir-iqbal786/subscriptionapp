import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, test } from 'vitest';
import { cartDeliveryOptionsDiscountsGenerateRun } from '../src/cart_delivery_options_discounts_generate_run.js';
import { cartLinesDiscountsGenerateRun } from '../src/cart_lines_discounts_generate_run.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const handlers = {
  'cart.lines.discounts.generate.run': cartLinesDiscountsGenerateRun,
  'cart.delivery-options.discounts.generate.run': cartDeliveryOptionsDiscountsGenerateRun,
};

describe('subscription discount function', () => {
  const fixturesDir = path.join(currentDir, 'fixtures');
  const fixtureFiles = fs
    .readdirSync(fixturesDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => path.join(fixturesDir, file));

  fixtureFiles.forEach((fixtureFile) => {
    test(`runs ${path.relative(fixturesDir, fixtureFile)}`, () => {
      const fixture = JSON.parse(fs.readFileSync(fixtureFile, 'utf8')).payload;
      const handler = handlers[fixture.target];

      expect(handler).toBeTypeOf('function');
      expect(handler(fixture.input)).toEqual(fixture.output);
    });
  });
});
