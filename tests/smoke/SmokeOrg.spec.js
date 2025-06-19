import { test } from "@playwright/test";
const {
  login,
  loginWithAPI,
  smokeProduct,
  smokeDocType,
  smokeAttribute,
  smokeIdentifier,
  smokeEvent,
  smokePartner,
  smokeFacility,
  smokeCertificate,
  logout,
} = require("../../utils/WebUtils");
let context, page, cookieString;

test.beforeAll(async ({ browser, baseURL }) => {
  context = await browser.newContext();
  page = await context.newPage();

  const mailId =
    process.env[process.env.SOURCE === "outlook" ? "ORG_ADMIN1" : "ORGADM1"];

  if (process.env.SOURCE === "outlook") {
    const outlookPage = await context.newPage();
    await login(context, page, outlookPage, mailId);
  } else {
    await loginWithAPI(context, page, mailId);
  }

  const cookies = await context.cookies(baseURL);
  cookieString = cookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
});

test.afterAll(async () => {
  await logout(page);
  await context.close();
});

test("Organization Product", async () => {
  await smokeProduct(page);
});

test("Organization DocType", async () => {
  await smokeDocType(page);
});

test("Organization Attribute", async () => {
  await smokeAttribute(page);
});

test("Organization Identifier", async () => {
  await smokeIdentifier(page);
});

test("Organization Event", async () => {
  await smokeEvent(page);
});

test("Organization Partner", async () => {
  await smokePartner(page);
});

test("Organization Facility", async ({ request }) => {
  await smokeFacility(page, cookieString, request);
});

test("Organization Certificate", async ({ request }) => {
  await smokeCertificate(page, cookieString, request);
});
