import { test } from "@playwright/test";
const {
  login,
  loginWithAPI,
  smokeProduct,
  smokeDocType,
  smokeAttribute,
  smokeIdentifier,
  smokeEvent,
  smokeCertificationScope,
  logout,
} = require("../../utils/WebUtils");
let context, page;

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
  page = await context.newPage();

  const mailId =
    process.env[
      process.env.SOURCE === "outlook" ? "PLATFORM_ADMIN" : "PLATFORM"
    ];
  if (process.env.SOURCE === "outlook") {
    const outlookPage = await context.newPage();
    await login(context, page, outlookPage, mailId);
  } else {
    await loginWithAPI(context, page, mailId);
  }
});

test.afterAll(async () => {
  await logout(page);
  await context.close();
});

test("Platform Product", async () => {
  await smokeProduct(page);
});

test("Platform DocType", async () => {
  await smokeDocType(page);
});

test("Platform Attribute", async () => {
  await smokeAttribute(page);
});

test("Platform Identifier", async () => {
  await smokeIdentifier(page);
});

test("Platform Event", async () => {
  await smokeEvent(page);
});

test("Platform Certification Scope", async () => {
  await smokeCertificationScope(page);
});
