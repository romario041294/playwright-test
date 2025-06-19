import { test } from "@playwright/test";
import seedData from "../../seedData.js";
const {
  login,
  loginWithAPI,
  logout,
  addPartner,
} = require("../../utils/WebUtils");

for (const partner of seedData.partners) {
  test(`Assign ${partner.partnerOrg} as a ${partner.option} for ${partner.selfOrg}`, async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const email = process.env[partner.mailId];

    if (process.env.SOURCE === "outlook") {
      const outlookPage = await context.newPage();
      await login(context, page, outlookPage, email);
    } else {
      await loginWithAPI(context, page, email);
    }

    await page.getByRole("menuitem", { name: "Configuration" }).hover();
    await page.getByRole("menuitem", { name: "Partners" }).click();

    await addPartner(page, partner.partnerOrg, partner.option);

    await logout(page);

    await context.close();
  });
}
