import { test } from "@playwright/test";
const {
  login,
  loginWithAPI,
  logout,
  createPassport,
  oilExtraction,
  hvoProduction,
  splitPassport,
  productLoss,
  blend,
  initiateSale,
} = require("../../utils/WebUtils");

let context, page;

test.describe("Creating Passport and Recording events on it.", () => {
  test.beforeAll(async ({ browser }) => {
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
  });
  test.afterAll(async () => {
    await logout(page);
    await context.close();
  });

  test("Create Passport", async () => {
    await createPassport(
      page,
      "Rapeseed",
      "130",
      "supplier 1",
      "2024-09-05",
      "2024-09-03",
      "Supplier City, France",
      "Sustainability Declaration",
      "files/Rapeseed.pdf",
      "2024-09-15"
    );
  });

  test("Oil Extraction", async () => {
    await oilExtraction(page, "2024-09-16", "France", "Oil Extraction Event");
  });

  test("HVO Production", async () => {
    await hvoProduction(page, "2024-09-18", "France");
  });

  test("Split Passport", async () => {
    await splitPassport(page, "25");
  });

  test("Product Loss", async () => {
    await productLoss(
      page,
      "15",
      "2024-09-18",
      "Reducing 15MT",
      "Product Loss"
    );
  });

  test("Blend", async () => {
    await blend(page, "B30", "Marine Fuel", "50", "2024-09-20");
  });

  test("Passport Sale", async () => {
    await initiateSale(
      page,
      "Specific Amount",
      "15", //Leave it as an empty string if the saleType is "Full Amount".
      "org 2",
      "Facility 2",
      "2024-09-09"
    );
  });
});
