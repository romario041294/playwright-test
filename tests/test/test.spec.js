import { test, expect } from "@playwright/test";
import seedData from "../../seedData.js";
const { login, loginWithAPI, logout } = require("../../utils/WebUtils");
let page, context, cookieString;

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

test("Test", async ({}) => {
  await page.pause();
  const title = await page.title();
  expect(title).toBe("Incorrect Title");
});
