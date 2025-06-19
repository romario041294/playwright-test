import { test, expect } from "@playwright/test";
import seedData from "../../seedData.js";
const {
  createFacility,
  assignUser,
  assignRoles,
  createProduct,
  createProductAPI,
  createFacilityAPI,
  createCertificateAPI,
  cloneEvent,
  selectItem,
  assignIdentifier,
  toggleAllSwitches,
  login,
  loginWithAPI,
  logout,
  createCertificate,
  createPartner,
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

test("Linked an Existing user to Org-1", async () => {
  await page.waitForLoadState("networkidle");
  for (const user of seedData.organizationLevel.organization1.users) {
    await assignUser(page, user.userEmail);
  }
});

test("Create Org-1 Facilities", async ({ request }) => {
  for (const facility of seedData.organizationLevel.organization1.facilities) {
    if (process.env.SEED === "api") {
      await createFacilityAPI(request, facility, cookieString);
    } else {
      await createFacility(
        page,
        facility.name,
        facility.address,
        facility.city,
        facility.country,
        facility.postcode,
        facility.latitude,
        facility.longitude,
        facility.massBalanceStartDate,
        facility.massBalanceDuration,
        facility.productionStartDate,
        facility.certificationScopes
      );
    }
  }
});

test("Create Org-1 Certificates", async ({ request }) => {
  for (const certificate of seedData.organizationLevel.organization1
    .certificates) {
    if (process.env.SEED === "api") {
      await createCertificateAPI(request, certificate, cookieString);
    } else {
      await createCertificate(
        page,
        certificate.scheme,
        certificate.body,
        certificate.number,
        certificate.bodyNumber,
        certificate.dateOfIssue,
        certificate.placeOfIssue,
        certificate.dateOfOriginalIssue,
        certificate.startDate,
        certificate.endDate,
        certificate.status,
        certificate.certificationScope,
        certificate.facility,
        certificate.documentType
      );
    }
  }
});

test("Create Org-1 Products", async ({ request }) => {
  for (const product of seedData.organizationLevel.organization1.products) {
    if (process.env.SEED === "api") {
      await createProductAPI(request, product, cookieString);
    } else {
      await createProduct(
        page,
        product.name,
        product.description,
        product.category,
        product.measurementType,
        product.lowerHeatingValue
      );
    }
  }
});

test("Create UcomeProduction Event in Org-1", async () => {
  await page.waitForLoadState("networkidle");

  await page.getByRole("menuitem", { name: "Configuration" }).hover();
  await page.getByRole("menuitem", { name: "Events" }).click();

  await page.getByRole("button", { name: "Add Event" }).click();
  await page.waitForSelector('h2:text("New Event")', { state: "visible" });
  await page.fill(
    "#name",
    seedData.organizationLevel.organization1.events.ucomeProduction.name
  );
  await page.fill(
    "#description",
    seedData.organizationLevel.organization1.events.ucomeProduction.description
  );
  await selectItem(
    page,
    "#eventType",
    seedData.organizationLevel.organization1.events.ucomeProduction.type
  );
  await selectItem(
    page,
    "#icon",
    seedData.organizationLevel.organization1.events.ucomeProduction.icon
  );
  await page.fill(
    "#actionName",
    seedData.organizationLevel.organization1.events.ucomeProduction.actionName
  );
  await page
    .locator("#filterIdentifiers")
    .pressSequentially(
      seedData.organizationLevel.organization1.events.ucomeProduction
        .filterType,
      { delay: 100 }
    );
  await page.keyboard.press("Enter");
  await page
    .locator('input[id^="filters_"]')
    .pressSequentially(
      seedData.organizationLevel.organization1.events.ucomeProduction
        .filterValue,
      { delay: 150 }
    );
  await page.waitForSelector(
    `div[title="${seedData.organizationLevel.organization1.events.ucomeProduction.filterValue}"]`,
    { state: "visible" }
  );
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h2:text("Common Passport Identifiers")', {
    state: "visible",
  });

  await assignIdentifier(
    page,
    seedData.organizationLevel.organization1.events.ucomeProduction.identifiers
  );

  await page.locator("div > button.ant-btn-sm").click();

  await toggleAllSwitches(
    page,
    seedData.organizationLevel.organization1.events.ucomeProduction
      .mandatoryIdentifiers
  );

  await page
    .locator("#twinJourneyText")
    .fill(
      seedData.organizationLevel.organization1.events.ucomeProduction
        .journeyText
    );
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h2:text("Emissions")', { state: "visible" });

  await page.getByLabel("Contains Emissions").check();

  await page.click('input[id^="passportOutputs_"][id$="_type"]');
  await page.click(
    `div[title="${seedData.organizationLevel.organization1.events.ucomeProduction.passportOutputs.output1.name}"]`
  );
  await page
    .locator('input[id^="passportOutputs_"][id$="_category"]')
    .pressSequentially(
      seedData.organizationLevel.organization1.events.ucomeProduction
        .passportOutputs.output1.category,
      { delay: 100 }
    );
  await page.keyboard.press("Enter");
  await page.fill(
    'input[id^="passportOutputs_"][id$="_conversionFactor"]',
    seedData.organizationLevel.organization1.events.ucomeProduction
      .passportOutputs.output1.conversionFactor
  );
  await page.fill(
    'input[id^="passportOutputs_"][id$="_feedstockFactor"]',
    seedData.organizationLevel.organization1.events.ucomeProduction
      .passportOutputs.output1.feedStockFactor
  );
  await page.fill(
    'input[id^="passportOutputs_"][id$="_allocationFactor"]',
    seedData.organizationLevel.organization1.events.ucomeProduction
      .passportOutputs.output1.allocationFactor
  );
  await page.getByLabel(new RegExp("^Default value possible$")).check();
  await page.fill(
    'input[id^="passportOutputs_"][id$="_eecDDV"]',
    seedData.organizationLevel.organization1.events.ucomeProduction
      .passportOutputs.output1.eecDDV
  );
  await page.fill(
    'input[id^="passportOutputs_"][id$="_epDDV"]',
    seedData.organizationLevel.organization1.events.ucomeProduction
      .passportOutputs.output1.epDDV
  );
  await page.fill(
    'input[id^="passportOutputs_"][id$="_etdDDV"]',
    seedData.organizationLevel.organization1.events.ucomeProduction
      .passportOutputs.output1.etdDDV
  );
  await page.getByLabel(new RegExp("^Actual value possible$")).check();
  await page.getByLabel(new RegExp("^Total default value possible$")).check();
  await page.fill(
    'input[id^="passportOutputs_"][id$="_tdv"]',
    seedData.organizationLevel.organization1.events.ucomeProduction
      .passportOutputs.output1.tdv
  );

  await page.getByRole("button", { name: "Add Passport Output" }).click();

  await page.getByLabel(new RegExp("^Generate Passport$")).nth(1).check();

  const type = await page
    .locator('input[id^="passportOutputs_"][id$="_type"]')
    .last();
  await type.click();
  await type.pressSequentially(
    seedData.organizationLevel.organization1.events.ucomeProduction
      .passportOutputs.output2.name,
    { delay: 100 }
  );
  await page.keyboard.press("Enter");

  await page
    .locator('input[id^="passportOutputs_"][id$="_category"]')
    .nth(1)
    .pressSequentially(
      seedData.organizationLevel.organization1.events.ucomeProduction
        .passportOutputs.output2.category,
      { delay: 100 }
    );
  await page.keyboard.press("Enter");
  await page
    .locator('input[id^="passportOutputs_"][id$="_conversionFactor"]')
    .nth(1)
    .fill(
      seedData.organizationLevel.organization1.events.ucomeProduction
        .passportOutputs.output2.conversionFactor
    );
  await page
    .locator('input[id^="passportOutputs_"][id$="_feedstockFactor"]')
    .nth(1)
    .fill(
      seedData.organizationLevel.organization1.events.ucomeProduction
        .passportOutputs.output2.feedStockFactor
    );
  await page
    .locator('input[id^="passportOutputs_"][id$="_allocationFactor"]')
    .nth(1)
    .fill(
      seedData.organizationLevel.organization1.events.ucomeProduction
        .passportOutputs.output2.allocationFactor
    );
  await page.getByLabel(new RegExp("^Actual value possible$")).nth(1).check();

  await page.getByLabel("Ep").check();
  await page.fill(
    "#eventEmissions_ep",
    seedData.organizationLevel.organization1.events.ucomeProduction.ep
  );

  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h1:text("PREVIEW")', { state: "visible" });
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
  await page.getByRole("button", { name: "Ok,thanks" }).click();
});

test("Create RmeProduction Event in Org-1", async () => {
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Add Event" }).click();
  await page.waitForSelector('h2:text("New Event")', { state: "visible" });
  await page.fill(
    "#name",
    seedData.organizationLevel.organization1.events.rmeProduction.name
  );
  await page.fill(
    "#description",
    seedData.organizationLevel.organization1.events.rmeProduction.description
  );
  await selectItem(
    page,
    "#eventType",
    seedData.organizationLevel.organization1.events.rmeProduction.type
  );
  await selectItem(
    page,
    "#icon",
    seedData.organizationLevel.organization1.events.rmeProduction.icon
  );
  await page.fill(
    "#actionName",
    seedData.organizationLevel.organization1.events.rmeProduction.actionName
  );
  await page
    .locator("#filterIdentifiers")
    .pressSequentially(
      seedData.organizationLevel.organization1.events.rmeProduction.filterType,
      { delay: 100 }
    );
  await page.keyboard.press("Enter");
  await page
    .locator('input[id^="filters_"]')
    .pressSequentially(
      seedData.organizationLevel.organization1.events.rmeProduction.filterValue,
      { delay: 150 }
    );
  await page.waitForSelector(
    `div[title="${seedData.organizationLevel.organization1.events.rmeProduction.filterValue}"]`,
    { state: "visible" }
  );
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h2:text("Common Passport Identifiers")', {
    state: "visible",
  });

  await assignIdentifier(
    page,
    seedData.organizationLevel.organization1.events.rmeProduction.identifiers
  );

  await page.locator("div > button.ant-btn-sm").click();

  await toggleAllSwitches(
    page,
    seedData.organizationLevel.organization1.events.rmeProduction
      .mandatoryIdentifiers
  );

  await page
    .locator("#twinJourneyText")
    .fill(
      seedData.organizationLevel.organization1.events.rmeProduction.journeyText
    );
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h2:text("Emissions")', { state: "visible" });

  await page.getByLabel("Contains Emissions").check();

  await page.click('input[id^="passportOutputs_"][id$="_type"]');
  await page.click(
    `div[title="${seedData.organizationLevel.organization1.events.rmeProduction.passportOutputs.output1.name}"]`
  );
  await page
    .locator('input[id^="passportOutputs_"][id$="_category"]')
    .pressSequentially(
      seedData.organizationLevel.organization1.events.rmeProduction
        .passportOutputs.output1.category,
      { delay: 100 }
    );
  await page.keyboard.press("Enter");
  await page.fill(
    'input[id^="passportOutputs_"][id$="_conversionFactor"]',
    seedData.organizationLevel.organization1.events.rmeProduction
      .passportOutputs.output1.conversionFactor
  );
  await page.fill(
    'input[id^="passportOutputs_"][id$="_feedstockFactor"]',
    seedData.organizationLevel.organization1.events.rmeProduction
      .passportOutputs.output1.feedStockFactor
  );
  await page.fill(
    'input[id^="passportOutputs_"][id$="_allocationFactor"]',
    seedData.organizationLevel.organization1.events.rmeProduction
      .passportOutputs.output1.allocationFactor
  );
  await page.getByLabel(new RegExp("^Default value possible$")).check();
  await page.fill(
    'input[id^="passportOutputs_"][id$="_eecDDV"]',
    seedData.organizationLevel.organization1.events.rmeProduction
      .passportOutputs.output1.eecDDV
  );
  await page.fill(
    'input[id^="passportOutputs_"][id$="_epDDV"]',
    seedData.organizationLevel.organization1.events.rmeProduction
      .passportOutputs.output1.epDDV
  );
  await page.fill(
    'input[id^="passportOutputs_"][id$="_etdDDV"]',
    seedData.organizationLevel.organization1.events.rmeProduction
      .passportOutputs.output1.etdDDV
  );
  await page.getByLabel(new RegExp("^Actual value possible$")).check();
  await page.getByLabel(new RegExp("^Total default value possible$")).check();
  await page.fill(
    'input[id^="passportOutputs_"][id$="_tdv"]',
    seedData.organizationLevel.organization1.events.rmeProduction
      .passportOutputs.output1.tdv
  );

  await page.getByRole("button", { name: "Add Passport Output" }).click();

  const type = await page
    .locator('input[id^="passportOutputs_"][id$="_type"]')
    .last();
  await type.click();
  await type.pressSequentially(
    seedData.organizationLevel.organization1.events.rmeProduction
      .passportOutputs.output2.name,
    { delay: 100 }
  );
  await page.keyboard.press("Enter");
  await page
    .locator('input[id^="passportOutputs_"][id$="_category"]')
    .nth(1)
    .pressSequentially(
      seedData.organizationLevel.organization1.events.rmeProduction
        .passportOutputs.output2.category
    );
  await page.keyboard.press("Enter");
  await page
    .locator('input[id^="passportOutputs_"][id$="_conversionFactor"]')
    .nth(1)
    .fill(
      seedData.organizationLevel.organization1.events.rmeProduction
        .passportOutputs.output2.conversionFactor
    );
  await page
    .locator('input[id^="passportOutputs_"][id$="_feedstockFactor"]')
    .nth(1)
    .fill(
      seedData.organizationLevel.organization1.events.rmeProduction
        .passportOutputs.output2.feedStockFactor
    );
  await page
    .locator('input[id^="passportOutputs_"][id$="_allocationFactor"]')
    .nth(1)
    .fill(
      seedData.organizationLevel.organization1.events.rmeProduction
        .passportOutputs.output2.allocationFactor
    );

  await page.getByLabel("Ep").check();
  await page.fill(
    "#eventEmissions_ep",
    seedData.organizationLevel.organization1.events.rmeProduction.ep
  );

  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h1:text("PREVIEW")', { state: "visible" });
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
  await page.getByRole("button", { name: "Ok,thanks" }).click();
});

test("Cloning Template Events in Org-1", async () => {
  await page.waitForLoadState("networkidle");

  await page.getByRole("menuitem", { name: "Configuration" }).hover();
  await page.getByRole("menuitem", { name: "Events" }).click();

  for (const event of seedData.organizationLevel.organization1.clonedEvents) {
    await cloneEvent(page, event);
    await page.waitForTimeout(3000); // Keep the delay between events
  }
});

test("Assigning Event Roles to Org-1 Users", async () => {
  await page.waitForLoadState("networkidle");

  await page.getByRole("menuitem", { name: "Administration" }).hover();
  await page.getByRole("menuitem", { name: "Users" }).click();

  for (const user of seedData.organizationLevel.organization1.roles) {
    await assignRoles(page, user.email, user.roles);
    await page.waitForTimeout(3000);
  }
});

test("Create Preferred Partners for Org-1", async () => {
  await page.waitForLoadState("networkidle");

  await page.getByRole("menuitem", { name: "Configuration" }).hover();
  await page.getByRole("menuitem", { name: "Partners" }).click();

  for (const partner of seedData.organizationLevel.organization1
    .preferredPartners) {
    await createPartner(
      page,
      partner.name,
      partner.address,
      partner.ecoOperatorNo,
      partner.vatNo,
      partner.country,
      partner.website,
      partner.type,
      partner.facilityName,
      partner.facilityAddress,
      partner.facilityCity,
      partner.facilityCountry,
      partner.postCode,
      partner.latitude,
      partner.longitude,
      partner.massBalanceStartDate,
      partner.massBalanceDuration,
      partner.productionStartDate,
      partner.role
    );
  }
});
