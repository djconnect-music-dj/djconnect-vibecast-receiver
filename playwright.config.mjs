import {defineConfig} from '@playwright/test';
import {browserLaunchOptions} from './qualification/browser-options.mjs';
export default defineConfig({
 testDir: 'tests/browser', timeout: 30000, fullyParallel: true, workers: 2,
 use: { baseURL: 'http://127.0.0.1:4186', trace: 'retain-on-failure' },
 projects: [
  { name: 'chromium', use: { browserName: 'chromium', ...browserLaunchOptions('chromium') } },
  { name: 'webkit', use: { browserName: 'webkit' } },
 ],
 webServer: { command: 'node scripts/serve_bootstrap.mjs', url: 'http://127.0.0.1:4186', reuseExistingServer: false },
});
