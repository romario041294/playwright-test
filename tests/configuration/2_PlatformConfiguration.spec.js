import { test, expect } from "@playwright/test";
import seedData from "../../seedData.js";
const {
  createProduct,
  createProductAPI,
  createOrganization,
  createDocType,
  createDocTypeAPI,
  createAttributeAPI,
  createIdentifierAPI,
  createCertificationScopeAPI,
  fillAttributeForm,
  fillIdentifierForm,
  selectItem,
  assignIdentifier,
  toggleAllSwitches,
  login,
  loginWithAPI,
  logout,
  createCertificateScope,
} = require("../../utils/WebUtils");
let context, page, cookieString;

test.beforeAll(async ({ browser, baseURL }) => {
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

  const cookies = await context.cookies(baseURL);
  cookieString = cookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
});

test.afterAll(async () => {
  await logout(page);
  await context.close();
});

test("Create Organizations", async () => {
  await page.waitForLoadState("networkidle");

  for (const org of seedData.platformLevel.organizations) {
    await createOrganization(
      page,
      org.name,
      org.address,
      org.adminName,
      org.adminEmail,
      org.ecoOperatorNo,
      org.vatNo,
      org.country,
      org.website,
      org.type
    );
  }
});

test("Create Platform Products", async ({ request }) => {
  for (const product of seedData.platformLevel.products) {
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

test("Create Platform DocumentTypes", async ({ request }) => {
  for (const docType of seedData.platformLevel.documentTypes) {
    if (process.env.SEED === "api") {
      await createDocTypeAPI(request, docType, cookieString);
    } else {
      await createDocType(
        page,
        docType.docType,
        docType.description,
        docType.isOcr,
        docType.configurationId
      );
    }
  }
});

test("Create Platform Attributes", async ({ request }) => {
  for (const attribute of seedData.platformLevel.attributes) {
    if (process.env.SEED === "api") {
      await createAttributeAPI(request, attribute, cookieString);
    } else {
      await fillAttributeForm(
        page,
        attribute.name,
        attribute.description,
        attribute.attributeType,
        attribute.attributeLevel
      );
    }
  }
});

test("Create Platform Identifiers", async ({ request }) => {
  for (const identifier of seedData.platformLevel.identifiers) {
    if (process.env.SEED === "api") {
      await createIdentifierAPI(request, identifier, cookieString);
    } else {
      await fillIdentifierForm(
        page,
        identifier.name,
        identifier.description,
        identifier.attributes,
        identifier.identifierType,
        identifier.identifierWidth
      );
    }
  }
});

test("Create Platform Scopes", async ({ request }) => {
  for (const scope of seedData.platformLevel.scopes) {
    if (process.env.SEED === "api") {
      await createCertificationScopeAPI(request, scope, cookieString);
    } else {
      await createCertificateScope(
        page,
        scope.scopeName,
        scope.isccEuCode,
        scope.isccEuLabel,
        scope.redCertEuCode,
        scope.redCertEuLabel,
        scope.twoBsVsCode,
        scope.twoBsVsLabel
      );
    }
  }
});

test("Create Template CreatePassport Event", async () => {
  await page.waitForLoadState("networkidle");

  await page.getByRole("menuitem", { name: "Configuration" }).hover();
  await page.getByRole("menuitem", { name: "Events" }).click();

  await page.getByRole("button", { name: "Add Event" }).click();
  await page.waitForSelector('h2:text("New Event")', { state: "visible" });
  await page.fill("#name", seedData.platformLevel.events.createPassport.name);
  await page.fill(
    "#description",
    seedData.platformLevel.events.createPassport.description
  );
  await selectItem(
    page,
    "#eventType",
    seedData.platformLevel.events.createPassport.type
  );
  await selectItem(
    page,
    "#icon",
    seedData.platformLevel.events.createPassport.icon
  );
  await page.fill(
    "#actionName",
    seedData.platformLevel.events.createPassport.actionName
  );
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h2:text("Common Passport Identifiers")', {
    state: "visible",
  });
  await assignIdentifier(
    page,
    seedData.platformLevel.events.createPassport.identifiers
  );
  await page.locator("div > button.ant-btn-sm").click();
  await toggleAllSwitches(
    page,
    seedData.platformLevel.events.createPassport.mandatoryIdentifiers
  );

  await page.locator("#enableCommentField").click();
  await page.locator("#enableDocumentUpload").click();
  await page
    .locator("#twinJourneyText")
    .fill(seedData.platformLevel.events.createPassport.journeyText);

  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h2:text("Emissions")', { state: "visible" });
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h1:text("PREVIEW")', { state: "visible" });

  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
});

test("Create Template OilExtraction Event", async () => {
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Add Event" }).click();
  await page.waitForSelector('h2:text("New Event")', { state: "visible" });
  await page.fill("#name", seedData.platformLevel.events.oilExtraction.name);
  await page.fill(
    "#description",
    seedData.platformLevel.events.oilExtraction.description
  );
  await selectItem(
    page,
    "#eventType",
    seedData.platformLevel.events.oilExtraction.type
  );
  await selectItem(
    page,
    "#icon",
    seedData.platformLevel.events.oilExtraction.icon
  );
  await page.fill(
    "#actionName",
    seedData.platformLevel.events.oilExtraction.actionName
  );
  await page
    .locator("#filterIdentifiers")
    .pressSequentially(seedData.platformLevel.events.oilExtraction.filterType, {
      delay: 100,
    });
  await page.keyboard.press("Enter");
  await page
    .locator('input[id^="filters_"]')
    .pressSequentially(
      seedData.platformLevel.events.oilExtraction.filterValue,
      { delay: 150 }
    );
  await page.waitForSelector(
    `div[title="${seedData.platformLevel.events.oilExtraction.filterValue}"]`,
    { state: "visible" }
  );
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h2:text("Common Passport Identifiers")', {
    state: "visible",
  });
  await assignIdentifier(
    page,
    seedData.platformLevel.events.oilExtraction.identifiers
  );
  await page.locator("div > button.ant-btn-sm").click();
  await toggleAllSwitches(
    page,
    seedData.platformLevel.events.oilExtraction.mandatoryIdentifiers
  );
  await page.locator("#enableCommentField").click();
  await page
    .locator("#twinJourneyText")
    .fill(seedData.platformLevel.events.oilExtraction.journeyText);
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h2:text("Emissions")', { state: "visible" });

  await page.getByLabel("Contains Emissions").check();

  await page
    .locator('input[id^="passportOutputs_"][id$="_type"]')
    .pressSequentially(
      seedData.platformLevel.events.oilExtraction.passportOutputs.output1.name,
      { delay: 100 }
    );
  await page.keyboard.press("Enter");
  await page
    .locator('input[id^="passportOutputs_"][id$="_category"]')
    .pressSequentially(
      seedData.platformLevel.events.oilExtraction.passportOutputs.output1
        .category,
      { delay: 100 }
    );
  await page.keyboard.press("Enter");
  await page.fill(
    'input[id^="passportOutputs_"][id$="_conversionFactor"]',
    seedData.platformLevel.events.oilExtraction.passportOutputs.output1
      .conversionFactor
  );
  await page.fill(
    'input[id^="passportOutputs_"][id$="_feedstockFactor"]',
    seedData.platformLevel.events.oilExtraction.passportOutputs.output1
      .feedStockFactor
  );
  await page.fill(
    'input[id^="passportOutputs_"][id$="_allocationFactor"]',
    seedData.platformLevel.events.oilExtraction.passportOutputs.output1
      .allocationFactor
  );
  await page.getByLabel(new RegExp("^Default value possible$")).check();
  await page.getByLabel(new RegExp("^Actual value possible$")).check();
  await page.getByLabel(new RegExp("^Total default value possible$")).check();

  await page.getByRole("button", { name: "Add Passport Output" }).click();

  await page
    .locator('input[id^="passportOutputs_"][id$="_type"]')
    .nth(1)
    .pressSequentially(
      seedData.platformLevel.events.oilExtraction.passportOutputs.output2.name,
      { delay: 100 }
    );
  await page.keyboard.press("Enter");
  await page
    .locator('input[id^="passportOutputs_"][id$="_category"]')
    .nth(1)
    .pressSequentially(
      seedData.platformLevel.events.oilExtraction.passportOutputs.output2
        .category
    );
  await page.keyboard.press("Enter");
  await page
    .locator('input[id^="passportOutputs_"][id$="_conversionFactor"]')
    .nth(1)
    .fill(
      seedData.platformLevel.events.oilExtraction.passportOutputs.output2
        .conversionFactor
    );
  await page
    .locator('input[id^="passportOutputs_"][id$="_feedstockFactor"]')
    .nth(1)
    .fill(
      seedData.platformLevel.events.oilExtraction.passportOutputs.output2
        .feedStockFactor
    );
  await page
    .locator('input[id^="passportOutputs_"][id$="_allocationFactor"]')
    .nth(1)
    .fill(
      seedData.platformLevel.events.oilExtraction.passportOutputs.output2
        .allocationFactor
    );

  await page.getByLabel("Ep").check();
  await page.fill(
    "#eventEmissions_ep",
    seedData.platformLevel.events.oilExtraction.ep
  );

  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h1:text("PREVIEW")', { state: "visible" });
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
});

test("Create Template HvoProduction Event", async () => {
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Add Event" }).click();
  await page.waitForSelector('h2:text("New Event")', { state: "visible" });
  await page.fill("#name", seedData.platformLevel.events.hvoProduction.name);
  await page.fill(
    "#description",
    seedData.platformLevel.events.hvoProduction.description
  );
  await selectItem(
    page,
    "#eventType",
    seedData.platformLevel.events.hvoProduction.type
  );
  await selectItem(
    page,
    "#icon",
    seedData.platformLevel.events.hvoProduction.icon
  );
  await page.fill(
    "#actionName",
    seedData.platformLevel.events.hvoProduction.actionName
  );
  await page
    .locator("#filterIdentifiers")
    .pressSequentially(seedData.platformLevel.events.hvoProduction.filterType, {
      delay: 100,
    });
  await page.keyboard.press("Enter");
  await page
    .locator('input[id^="filters_"]')
    .pressSequentially(
      seedData.platformLevel.events.hvoProduction.filterValue,
      { delay: 150 }
    );
  await page.waitForSelector(
    `div[title="${seedData.platformLevel.events.hvoProduction.filterValue}"]`,
    { state: "visible" }
  );
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h2:text("Common Passport Identifiers")', {
    state: "visible",
  });

  await assignIdentifier(
    page,
    seedData.platformLevel.events.hvoProduction.identifiers
  );

  await page.locator("div > button.ant-btn-sm").click();

  await toggleAllSwitches(
    page,
    seedData.platformLevel.events.hvoProduction.mandatoryIdentifiers
  );

  await page
    .locator("#twinJourneyText")
    .fill(seedData.platformLevel.events.hvoProduction.journeyText);
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h2:text("Emissions")', { state: "visible" });

  await page.getByLabel("Contains Emissions").check();

  await page
    .locator('input[id^="passportOutputs_"][id$="_type"]')
    .pressSequentially(
      seedData.platformLevel.events.hvoProduction.passportOutputs.output1.name,
      { delay: 100 }
    );
  await page.keyboard.press("Enter");
  await page
    .locator('input[id^="passportOutputs_"][id$="_category"]')
    .pressSequentially(
      seedData.platformLevel.events.hvoProduction.passportOutputs.output1
        .category,
      { delay: 100 }
    );
  await page.keyboard.press("Enter");
  await page.fill(
    'input[id^="passportOutputs_"][id$="_conversionFactor"]',
    seedData.platformLevel.events.hvoProduction.passportOutputs.output1
      .conversionFactor
  );
  await page.fill(
    'input[id^="passportOutputs_"][id$="_feedstockFactor"]',
    seedData.platformLevel.events.hvoProduction.passportOutputs.output1
      .feedStockFactor
  );
  await page.fill(
    'input[id^="passportOutputs_"][id$="_allocationFactor"]',
    seedData.platformLevel.events.hvoProduction.passportOutputs.output1
      .allocationFactor
  );
  await page.getByLabel(new RegExp("^Default value possible$")).check();
  await page.fill(
    'input[id^="passportOutputs_"][id$="_eecDDV"]',
    seedData.platformLevel.events.hvoProduction.passportOutputs.output1.eecDDV
  );
  await page.fill(
    'input[id^="passportOutputs_"][id$="_epDDV"]',
    seedData.platformLevel.events.hvoProduction.passportOutputs.output1.epDDV
  );
  await page.fill(
    'input[id^="passportOutputs_"][id$="_etdDDV"]',
    seedData.platformLevel.events.hvoProduction.passportOutputs.output1.etdDDV
  );
  await page.getByLabel(new RegExp("^Actual value possible$")).check();
  await page.getByLabel(new RegExp("^Total default value possible$")).check();
  await page.fill(
    'input[id^="passportOutputs_"][id$="_tdv"]',
    seedData.platformLevel.events.hvoProduction.passportOutputs.output1.tdv
  );

  await page.getByRole("button", { name: "Add Passport Output" }).click();

  await page.getByLabel(new RegExp("^Generate Passport$")).nth(1).check();
  await page
    .locator('input[id^="passportOutputs_"][id$="_type"]')
    .nth(1)
    .pressSequentially(
      seedData.platformLevel.events.hvoProduction.passportOutputs.output2.name,
      { delay: 100 }
    );
  await page.keyboard.press("Enter");
  await page
    .locator('input[id^="passportOutputs_"][id$="_category"]')
    .nth(1)
    .pressSequentially(
      seedData.platformLevel.events.hvoProduction.passportOutputs.output2
        .category
    );
  await page.keyboard.press("Enter");
  await page
    .locator('input[id^="passportOutputs_"][id$="_conversionFactor"]')
    .nth(1)
    .fill(
      seedData.platformLevel.events.hvoProduction.passportOutputs.output2
        .conversionFactor
    );
  await page
    .locator('input[id^="passportOutputs_"][id$="_feedstockFactor"]')
    .nth(1)
    .fill(
      seedData.platformLevel.events.hvoProduction.passportOutputs.output2
        .feedStockFactor
    );
  await page
    .locator('input[id^="passportOutputs_"][id$="_allocationFactor"]')
    .nth(1)
    .fill(
      seedData.platformLevel.events.hvoProduction.passportOutputs.output2
        .allocationFactor
    );
  await page.getByLabel(new RegExp("^Actual value possible$")).nth(1).check();

  await page.getByRole("button", { name: "Add Passport Output" }).click();

  await page
    .locator('input[id^="passportOutputs_"][id$="_type"]')
    .nth(2)
    .pressSequentially(
      seedData.platformLevel.events.hvoProduction.passportOutputs.output3.name,
      { delay: 100 }
    );
  await page.keyboard.press("Enter");
  await page
    .locator('input[id^="passportOutputs_"][id$="_category"]')
    .nth(2)
    .pressSequentially(
      seedData.platformLevel.events.hvoProduction.passportOutputs.output3
        .category
    );
  await page.keyboard.press("Enter");
  await page
    .locator('input[id^="passportOutputs_"][id$="_conversionFactor"]')
    .nth(2)
    .fill(
      seedData.platformLevel.events.hvoProduction.passportOutputs.output3
        .conversionFactor
    );
  await page
    .locator('input[id^="passportOutputs_"][id$="_feedstockFactor"]')
    .nth(2)
    .fill(
      seedData.platformLevel.events.hvoProduction.passportOutputs.output3
        .feedStockFactor
    );
  await page
    .locator('input[id^="passportOutputs_"][id$="_allocationFactor"]')
    .nth(2)
    .fill(
      seedData.platformLevel.events.hvoProduction.passportOutputs.output3
        .allocationFactor
    );

  await page.getByLabel("Ep").check();
  await page.fill(
    "#eventEmissions_ep",
    seedData.platformLevel.events.hvoProduction.ep
  );

  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h1:text("PREVIEW")', { state: "visible" });
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
});

test("Create Template InitiateSale Event", async () => {
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Add Event" }).click();
  await page.waitForSelector('h2:text("New Event")', { state: "visible" });
  await page.fill("#name", seedData.platformLevel.events.initiateSale.name);
  await page.fill(
    "#description",
    seedData.platformLevel.events.initiateSale.description
  );
  await selectItem(
    page,
    "#eventType",
    seedData.platformLevel.events.initiateSale.type
  );
  await selectItem(
    page,
    "#icon",
    seedData.platformLevel.events.initiateSale.icon
  );
  await page.fill(
    "#actionName",
    seedData.platformLevel.events.initiateSale.actionName
  );
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h2:text("Common Passport Identifiers")', {
    state: "visible",
  });

  await page
    .locator("#twinJourneyText")
    .fill(seedData.platformLevel.events.initiateSale.journeyText);
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h2:text("Emissions")', { state: "visible" });

  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h1:text("PREVIEW")', { state: "visible" });
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
});

test("Create Template ProductLoss Event", async () => {
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Add Event" }).click();
  await page.waitForSelector('h2:text("New Event")', { state: "visible" });
  await page.fill("#name", seedData.platformLevel.events.productLoss.name);
  await page.fill(
    "#description",
    seedData.platformLevel.events.productLoss.description
  );
  await selectItem(
    page,
    "#eventType",
    seedData.platformLevel.events.productLoss.type
  );
  await selectItem(
    page,
    "#icon",
    seedData.platformLevel.events.productLoss.icon
  );
  await page.fill(
    "#actionName",
    seedData.platformLevel.events.productLoss.actionName
  );
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h2:text("Common Passport Identifiers")', {
    state: "visible",
  });

  await assignIdentifier(
    page,
    seedData.platformLevel.events.productLoss.identifiers
  );

  await page.locator("div > button.ant-btn-sm").click();

  await toggleAllSwitches(
    page,
    seedData.platformLevel.events.productLoss.mandatoryIdentifiers
  );

  await page
    .getByRole("button", { name: "Formula" })
    .nth(1)
    .click({ force: true });
  await page.locator("span#suggestion-highlight").nth(1).click({ force: true });
  await page
    .locator("span#suggestion-highlight")
    .nth(1)
    .pressSequentially(seedData.platformLevel.events.productLoss.formula1, {
      delay: 100,
    });
  await page.getByRole("button", { name: "Save" }).click();

  await page.waitForTimeout(3000);

  await page
    .getByRole("button", { name: "Formula" })
    .nth(2)
    .click({ force: true });
  await page.locator("span#suggestion-highlight").nth(1).click({ force: true });
  await page
    .locator("span#suggestion-highlight")
    .nth(1)
    .pressSequentially(seedData.platformLevel.events.productLoss.formula2, {
      delay: 100,
    });
  await page.getByRole("button", { name: "Save" }).click();

  await page.locator("#enableCommentField").click();
  await page.locator("#twinJourneyText").fill("Product Loss");
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h2:text("Emissions")', { state: "visible" });

  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h1:text("PREVIEW")', { state: "visible" });
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
});

test("Create Template SplitPassport Event", async () => {
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Add Event" }).click();
  await page.waitForSelector('h2:text("New Event")', { state: "visible" });
  await page.fill("#name", seedData.platformLevel.events.splitPassport.name);
  await page.fill(
    "#description",
    seedData.platformLevel.events.splitPassport.description
  );
  await selectItem(
    page,
    "#eventType",
    seedData.platformLevel.events.splitPassport.type
  );
  await selectItem(
    page,
    "#icon",
    seedData.platformLevel.events.splitPassport.icon
  );
  await page.fill(
    "#actionName",
    seedData.platformLevel.events.splitPassport.actionName
  );
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h2:text("Common Passport Identifiers")', {
    state: "visible",
  });

  await assignIdentifier(
    page,
    seedData.platformLevel.events.splitPassport.identifiers
  );

  await page.locator("div > button.ant-btn-sm").click();

  await toggleAllSwitches(
    page,
    seedData.platformLevel.events.splitPassport.mandatoryIdentifiers
  );

  await page
    .getByRole("button", { name: "Formula" })
    .nth(1)
    .click({ force: true });
  await page.locator("span#suggestion-highlight").nth(1).click({ force: true });
  await page
    .locator("span#suggestion-highlight")
    .nth(1)
    .pressSequentially(seedData.platformLevel.events.splitPassport.formula);
  await page.getByRole("button", { name: "Save" }).click();

  await page.getByRole("button", { name: "Add Relationship" }).click();
  const left = await page.locator(
    'input[id^="identifiersRelations_"][id$="_leftidentifierid"]'
  );
  await left.click();
  await left.pressSequentially(
    seedData.platformLevel.events.splitPassport.relationship.left,
    { delay: 100 }
  );
  await page.keyboard.press("Enter");

  const relationship = await page.locator(
    'input[id^="identifiersRelations_"][id$="_comparator"]'
  );
  await relationship.click();
  await relationship.pressSequentially(
    seedData.platformLevel.events.splitPassport.relationship.comparator,
    { delay: 100 }
  );
  await page.keyboard.press("Enter");

  const right = await page.locator(
    'input[id^="identifiersRelations_"][id$="_rightidentifierid"]'
  );
  await right.click();
  await right.pressSequentially(
    seedData.platformLevel.events.splitPassport.relationship.right,
    { delay: 100 }
  );
  await page.keyboard.press("Enter");

  await page
    .locator("#twinJourneyText")
    .fill(seedData.platformLevel.events.splitPassport.journeyText);
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h2:text("Emissions")', { state: "visible" });

  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h1:text("PREVIEW")', { state: "visible" });
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
});

test("Create Template Blend Event", async () => {
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Add Event" }).click();
  await page.waitForSelector('h2:text("New Event")', { state: "visible" });
  await page.fill("#name", seedData.platformLevel.events.blend.name);
  await page.fill(
    "#description",
    seedData.platformLevel.events.blend.description
  );
  await selectItem(
    page,
    "#eventType",
    seedData.platformLevel.events.blend.type
  );
  await selectItem(page, "#icon", seedData.platformLevel.events.blend.icon);
  await page.fill(
    "#actionName",
    seedData.platformLevel.events.blend.actionName
  );
  await page
    .locator("#filterIdentifiers")
    .pressSequentially(seedData.platformLevel.events.blend.filterType, {
      delay: 100,
    });
  await page.keyboard.press("Enter");
  const filter = await page.locator('input[id^="filters_"]');
  await filter.click();
  await filter.pressSequentially(
    seedData.platformLevel.events.blend.filterValue
  );
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h2:text("Common Passport Identifiers")', {
    state: "visible",
  });

  await assignIdentifier(page, seedData.platformLevel.events.blend.identifiers);

  await page.locator("div > button.ant-btn-sm").click();

  await toggleAllSwitches(
    page,
    seedData.platformLevel.events.blend.mandatoryIdentifiers
  );

  await page
    .getByRole("button", { name: "Formula" })
    .nth(1)
    .click({ force: true });
  await page.locator("span#suggestion-highlight").nth(1).click({ force: true });
  await page
    .locator("span#suggestion-highlight")
    .nth(1)
    .pressSequentially(seedData.platformLevel.events.blend.formula, {
      delay: 100,
    });
  await page.getByRole("button", { name: "Save" }).click();

  await page
    .locator("#twinJourneyText")
    .fill(seedData.platformLevel.events.blend.journeyText);
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h2:text("Emissions")', { state: "visible" });

  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h1:text("PREVIEW")', { state: "visible" });
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
});

