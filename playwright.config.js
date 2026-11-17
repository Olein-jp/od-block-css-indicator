const { defineConfig } = require( '@playwright/test' );

module.exports = defineConfig( {
	testDir: './tests/e2e',
	workers: 1,
	timeout: 90000,
	use: {
		baseURL: process.env.WP_BASE_URL || 'http://localhost:8892',
		browserName: 'chromium',
		viewport: { width: 1440, height: 1000 },
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
} );
