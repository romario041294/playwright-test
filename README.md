# FuelFWD - Test

This directory contains automated tests written using [Playwright](https://playwright.dev/), a powerful end-to-end testing framework. These tests are designed to ensure the functionality, reliability, and performance of the application.

## Getting Started

To set up and run the tests locally, follow the steps below.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Playwright](https://playwright.dev/) installed in the project
- A package manager like `npm`

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Install Playwright browsers:

   ```bash
   npx playwright install
   ```

## Directory Structure

The test directory is organized as follows:

```
test/ 
├── files/                  # Test assets like images and files
├── report/                 # Generated test reports
├── tests/                  
│    ├── api/               # API tests
│    ├── configuration/     # Environment setup (seed) scripts
│    ├── functional/        # Feature and workflow tests
│    └── smoke/             # Quick stability tests
├── utils/                  # Reusable utility functions
├── .env                    # Environment variables
├── package.json            # Dependencies and scripts
├── playwright.config.js    # Playwright test configuration
└── seedData.js             # Script to seed data
```

### Example Commands

#### Running Test Scripts

```bash
url=BASE_URL_DEV npx playwright test tests/configuration --project=Headed --workers=1
```

- **Key Options:**
  - **Headed Mode:** Launches tests in a visible browser.
  - **Headless Mode:** Use `--project=Headless` for tests without a UI.
  - **Parallel Execution:** Use `--workers` to define worker threads.

#### Running API Tests

```bash
url=BASE_URL_DEMO npx playwright test tests/api --project=Headed
```

## Writing Tests

Tests are written using the Playwright testing library and follow this general structure:

```javascript
const { test, expect } = require('@playwright/test');

test('Example test', async ({ page }) => {
  await page.goto('https://example.com');
  const title = await page.title();
  expect(title).toBe('Example Domain');
});
```

For detailed documentation, refer to the [Playwright documentation](https://playwright.dev/docs/intro).

## Useful Tips

1. **Testing Playground:** Use [Testing Playground](https://testing-playground.com/) to fetch DOM elements efficiently.

   Example for fetching a button named 'Add User':

   ```javascript
   page.getByRole('button', { name: 'Add User' }).click();
   ```

2. **Report Generation:** Playwright can generate detailed Ortoni reports, including screenshots, videos, and traces for debugging. Check the terminal output for the report link, and once the tests are completed, the report will open in a new tab automatically. For more information, visit [Ortoni Report](https://www.npmjs.com/package/ortoni-report).

3. **Retry Failed Tests:** Use the `--retries` flag to retry failed tests automatically:

   ```bash
   npx playwright test --retries=2
   ```

4. **Playwright Runner Extension:** Install the [Playwright Runner extension](https://marketplace.visualstudio.com/items?itemName=ortoni.ortoni) to debug and run tests directly from the editor, with features like code completion and trace viewer integration.

## Troubleshooting

- **Browsers Not Launching:** Ensure Playwright browsers are installed using `npx playwright install`.
- **Environment Issues:** Check the `playwright.config.js` for environment-specific configurations.
- **Dependency Issues:** Ensure all dependencies are installed with `npm install`.
- **Debugging Tests:** Use the `--debug` flag to launch tests in debugging mode:

  ```bash
  npx playwright test --debug
  ```

Happy Testing! 🚀