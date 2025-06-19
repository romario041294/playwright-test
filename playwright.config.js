// @ts-check
const { defineConfig } = require("@playwright/test");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from the .env file located at the dir
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Determine the base URL to use for the tests
const url = process.env[process.env.url ?? ""] ?? process.env.BASE_URL_DEV;

// Define the report configuration
const report = {
  filename: "report.html",
  folderPath: "report",
  logo: "logo.png",
  title: "Test Report",
  showProject: true,
  projectName: "FuelFWD",
  testType: "Functional",
  authorName: "Romario",
  preferredTheme: "light",
  base64Image: true,
};

// Export the Playwright configuration
module.exports = defineConfig({
  testDir: "./tests",
  timeout: 600 * 1000, // Test timeout set to 600 seconds
  expect: {
    timeout: 300000, // Expectation timeout set to 300 seconds
  },
  reporter: [["ortoni-report", report], ["dot"]],
  use: {
    baseURL: url,
    screenshot: "on",
    trace: "on",
    video: {
      mode: "on",
      size: { width: 1280, height: 720 },
    },
  },
  projects: [
    {
      name: "Headed",
      use: {
        launchOptions: {
          args: ["--start-maximized"],
        },
        browserName: "chromium",
        viewport: null,
        headless: false,
      },
    },
    {
      name: "Headless",
      use: {
        browserName: "chromium",
        viewport: { width: 1470, height: 832 },
        headless: true,
      },
    },
  ],
});
