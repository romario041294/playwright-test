import { expect } from "@playwright/test";
import seedData from "../seedData.js";
const fs = require("fs");

async function login(context, page, outlookPage, mailId) {
  page.on("request", async (request) => {
    if (request.url().includes("/api/configuration")) {
      const pageHostname = new URL(page.url()).hostname;
      const url = new URL(request.url());
      const projectId = url.searchParams.get("project_id");

      if (pageHostname.includes("dev") || pageHostname.includes("qa")) {
        expect(projectId).toBe(process.env.devWeb3Auth);
      } else if (pageHostname.includes("localhost")) {
        expect(projectId).toBe(process.env.localWeb3Auth);
      } else if (pageHostname.includes("staging")) {
        expect(projectId).toBe(process.env.stagingWeb3Auth);
      } else {
        throw new Error(`Unexpected hostname: ${pageHostname}`);
      }
    }
  });

  await page.goto("/");
  await outlookPage.goto("https://outlook.office365.com/mail/");

  await page.bringToFront();
  await page.waitForTimeout(3000);

  await page.getByPlaceholder("Type your email").pressSequentially(mailId);
  const [otpPage] = await Promise.all([
    context.waitForEvent("page"),
    page.getByRole("button", { name: "Login" }).click(),
  ]);
  await page.waitForTimeout(3000);

  await outlookPage.bringToFront();
  await outlookPage
    .locator('input[placeholder="Email, phone, or Skype"]')
    .pressSequentially(process.env.OUTLOOK_EMAIL, { delay: 150 });
  await outlookPage.getByRole("button", { name: "Next" }).click();
  await outlookPage
    .locator('input[placeholder="Password"]')
    .pressSequentially(process.env.OUTLOOK_PASSWORD, { delay: 150 });
  await outlookPage.locator("div >button").click();
  await outlookPage.getByRole("button", { name: "No" }).click();
  await outlookPage.waitForTimeout(5000);

  await outlookPage
    .locator('div[aria-label^="Unread FuelFWD"]:first-child')
    .first()
    .click();
  await outlookPage.waitForSelector(".x_report-section span", {
    state: "visible",
  });
  const otp = await outlookPage.locator(".x_report-section span").innerText();
  await outlookPage.close();

  await otpPage.bringToFront();
  const otpInputs = await otpPage.locator(
    'input[autocomplete="one-time-code"]'
  );
  for (let i = 0; i < otp.length; i++) {
    await otpInputs.nth(i).fill(otp[i]);
  }
  await page.bringToFront();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForTimeout(5000);
}

async function logout(page) {
  const currentURL = await page.url();
  if (currentURL.includes("/datafwd")) {
    await page
      .locator("span")
      .filter({
        hasText: /@(outlook\.com|fuelfwd\.testinator\.com)$/,
      })
      .hover();
  } else {
    await page
      .locator('div[data-menu-id^="rc-menu-"][data-menu-id$="-userprofile"]')
      .hover();
  }
  await page.locator(':text("Logout")').click();
  await expect(page).toHaveURL(/(login|datafwd)/);
}

async function register(
  context,
  fuelfwdPage,
  outlookPage,
  fName,
  lName,
  mailId
) {
  const emailId = process.env[mailId];
  await fuelfwdPage.goto("/");
  await outlookPage.goto("https://outlook.office365.com/mail/");

  await fuelfwdPage.bringToFront();
  await fuelfwdPage.waitForTimeout(3000);

  await fuelfwdPage.getByRole("button", { name: "Register" }).click();
  await fuelfwdPage.fill("#register_fname", fName);
  await fuelfwdPage.fill("#register_lname", lName);
  await fuelfwdPage.fill("#register_email", emailId);
  const [otpPage] = await Promise.all([
    context.waitForEvent("page"),
    await fuelfwdPage.getByRole("button", { name: "Register" }).click(),
  ]);
  await fuelfwdPage.waitForTimeout(3000);

  await outlookPage.bringToFront();
  await outlookPage
    .locator('input[placeholder="Email, phone, or Skype"]')
    .pressSequentially(process.env.OUTLOOK_EMAIL, { delay: 150 });
  await outlookPage.getByRole("button", { name: "Next" }).click();
  await outlookPage
    .locator('input[placeholder="Password"]')
    .pressSequentially(process.env.OUTLOOK_PASSWORD, { delay: 150 });
  await outlookPage.locator("div >button").click();
  await outlookPage.getByRole("button", { name: "No" }).click();
  // Wait for 3 seconds to get the email. This is necessary if there are multiple unread emails and we want the last one to arrive.
  await outlookPage.waitForTimeout(3000);
  // We use `first` in case there are multiple unread emails.
  await outlookPage
    .locator('div[aria-label^="Unread FuelFWD"]:first-child')
    .first()
    .click();
  await outlookPage.waitForSelector(".x_report-section span", {
    state: "visible",
  });
  const otp = await outlookPage.locator(".x_report-section span").innerText();
  await outlookPage.close();

  await otpPage.bringToFront();
  const otpInputs = await otpPage.locator(
    'input[autocomplete="one-time-code"]'
  );
  for (let i = 0; i < otp.length; i++) {
    await otpInputs.nth(i).fill(otp[i]);
  }
  await fuelfwdPage.bringToFront();
  await expect(fuelfwdPage.locator(".ant-message-success")).toBeVisible();
  await expect(
    fuelfwdPage.locator("span.ant-page-header-heading-title")
  ).toHaveText("Profile");
  await expect(fuelfwdPage).toHaveURL("/profile");
  await logout(fuelfwdPage);
  await fuelfwdPage.close();
}

async function createOrganization(
  page,
  fname,
  address,
  adminName,
  adminEmail,
  ecomNo,
  vatNo,
  country,
  website,
  legalType
) {
  await page.getByRole("button", { name: "Add" }).click();
  await page.locator("#org_name").fill(fname);
  await page.locator("#org_address").fill(address);
  await page.locator("#org_admin").click();
  await page.locator(`text="${adminName} (${adminEmail})"`).click();
  await page.locator('text="Add Organization"').click();
  await page.locator("#org_economicOperatorNumber").fill(ecomNo);
  await page.locator("#org_vatNumber").fill(vatNo);
  await page.locator("#org_country").pressSequentially(country, { delay: 150 });
  await page.keyboard.press("Enter");
  await page.locator("#org_mainContact").click();
  await page.locator(`text="${adminName} (${adminEmail})"`).nth(2).click();
  await page.locator('text="Add Organization"').click();
  await page.locator("#org_website").fill(website);
  await page.locator("#org_legalType").fill(legalType);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
}

async function assignUser(page, email) {
  await page.getByRole("menuitem", { name: "Administration" }).hover();
  await page.getByRole("menuitem", { name: "Users" }).click();
  await expect(page).toHaveURL("/user");
  await page.getByRole("button", { name: "Add User to Organization" }).click();
  await page.locator("#user").pressSequentially(email, { delay: 150 });
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Add" }).nth(1).click();
  await page.waitForSelector("div.ant-modal-content", { state: "hidden" });
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
}

async function assignRoles(page, user, roles) {
  await expect(page).toHaveURL("/user");
  await page
    .locator(`tr:has(td:has-text("${user}")) .ant-table-cell >> text=Edit`)
    .click();
  for (const role of roles) {
    const roleInput = await page.getByPlaceholder("Search here").first();
    await roleInput.pressSequentially(role, { delay: 100 });
    await page
      .locator(`tr:has(td:has-text("${role}")) .ant-checkbox-input`)
      .check();
    const inputWrapper = await roleInput.locator("..");
    await inputWrapper
      .locator(".ant-input-suffix .anticon-close-circle")
      .click();
    await page.waitForTimeout(2000);
  }
  await page.locator("div > button.ant-btn-sm").first().click();
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForTimeout(1000);
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
  await page.getByRole("button", { name: "Ok" }).click();
}

async function createProduct(
  page,
  name,
  desc,
  category,
  measurement,
  heatingValue
) {
  await expect(page).toHaveURL("/product");
  await page.getByRole("button", { name: "Add Product" }).click();
  await page.locator("#product_name").fill(name);
  await page.locator("#product_description").fill(desc);
  await page
    .locator("#product_category")
    .pressSequentially(category, { delay: 100 });
  await page.keyboard.press("Enter");
  await page
    .locator("#product_measurementType")
    .pressSequentially(measurement, { delay: 100 });
  await page.keyboard.press("Enter");
  await page.locator("#product_lowerHeatingValue").fill(`${heatingValue}`);
  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
}

async function createDocType(page, name, description, isOCR, ocrID) {
  await expect(page).toHaveURL("/doctypes");

  await page.getByRole("button", { name: "Add Document Type" }).click();

  await page.locator("#org_doctype").fill(name);
  await page.locator("#org_description").fill(description);
  const ocrCheckbox = await page.getByLabel("Enable OCR");
  if (isOCR) {
    await ocrCheckbox.check();
    const ocrField = page.locator("#org_configurationId");
    await ocrField.waitFor({ state: "visible" });
    await ocrField.fill(ocrID);
  } else {
    await ocrCheckbox.uncheck();
  }

  await page.getByRole("button", { name: "Save" }).click();

  await page.waitForSelector(".ant-message-success", { state: "visible" });
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
}

async function addOcrId(page, docType, ocrID) {
  await page
    .getByPlaceholder("Search for type")
    .pressSequentially(docType, { delay: 100 });

  const rowEdit = await page.locator("tr", {
    has: page.locator(`td`, { hasText: new RegExp(`^${docType}$`) }),
  });
  await rowEdit.waitFor({ state: "visible" });
  await rowEdit.getByText("Edit").click();

  await page.getByLabel("Enable OCR").check();
  await page.locator("#org_configurationId").fill(ocrID);
  await page.getByRole("button", { name: "Save" }).click();

  await page.waitForSelector(".ant-message-success", { state: "visible" });
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
}

async function fillAttributeForm(page, name, desc, type, level) {
  await page.getByRole("button", { name: "Add Attribute" }).click();
  await page.locator("#attribute_name").fill(name);
  await page.locator("#attribute_description").fill(desc);
  await page
    .locator("#attribute_attributeType")
    .pressSequentially(type, { delay: 100 });
  await page.keyboard.press("Enter");
  await page
    .locator("#attribute_attributeLevel")
    .pressSequentially(level, { delay: 100 });
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Ok" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
}

async function fillIdentifierForm(
  page,
  name,
  description,
  attributes,
  isIdentifierTypeSystem,
  width
) {
  await page.getByRole("button", { name: "Add Identifier" }).click();
  await page.locator("#identifier_name").fill(name);
  await page.locator("#identifier_description").fill(description);
  await page.locator("#identifier_attributes").click();
  for (const attribute of attributes) {
    await page
      .locator("#identifier_attributes")
      .pressSequentially(attribute, { delay: 100 });
    await page.keyboard.press("Enter");
  }
  await page.locator('h1:has-text("Create Identifier")').click();
  if (isIdentifierTypeSystem) {
    await page.locator("#identifier_isIdentifierTypeSystem").check();
  }
  await page.locator("#identifier_width").fill(width);
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Ok" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
}

async function assignIdentifier(page, identifierNames) {
  const itemsLocator = page.locator("li.ant-transfer-list-content-item");

  for (const identifierName of identifierNames) {
    const itemLocator = itemsLocator.locator(
      ".ant-transfer-list-content-item-text"
    );
    const count = await itemsLocator.count();

    for (let i = 0; i < count; i++) {
      const itemText = await itemLocator.nth(i).innerText();

      if (itemText.trim() === identifierName.trim()) {
        const checkbox = await itemsLocator
          .nth(i)
          .locator('input[type="checkbox"]');
        await checkbox.check();
        break;
      }
    }
  }
}

async function idGen(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

async function selectItem(page, selector, inputValue) {
  await page.click(selector);
  await page.waitForTimeout(2000);

  switch (selector) {
    case "#documentTypes":
      await page.fill(selector, inputValue);
      await page.keyboard.press("Enter");
      await page.click("footer.ant-layout-footer");
      break;

    case "#filterIdentifiers":
      await page.click(`text=${inputValue}`);
      break;

    case "#eventType":
      await page.click(`div[title='${inputValue}']`);
      break;

    case "#icon":
      const options = page.locator(".ant-select-item-option-content span");
      const count = await options.count();
      for (let i = 0; i < count; i++) {
        const itemText = await options.nth(i).textContent();
        if (itemText?.trim() === inputValue) {
          await options.nth(i).click();
          break;
        }
      }
      break;

    default:
      throw new Error(`Unknown selector: ${selector}`);
  }
}

async function toggleAllSwitches(page, buttonNames) {
  for (const buttonName of buttonNames) {
    const element = await page.locator(
      `li:has(span:text-matches("^${buttonName}$", "i"))`
    );
    await element.locator('button[role="switch"]').click();
  }
}

async function cloneEvent(page, eventName) {
  await page.getByText("Event Templates").scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);
  const templatesTable = await page.locator("div.ant-card-body").nth(1);
  const row = await templatesTable.locator(`tr:has-text("${eventName}")`);
  await row.locator('button:has-text("Clone")').click();

  await page.waitForSelector('h2:text("New Event")', { state: "visible" });
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h2:text("Common Passport Identifiers")', {
    state: "visible",
  });
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h2:text("Emissions")', { state: "visible" });
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector('h1:text("PREVIEW")', { state: "visible" });
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
  await page.getByRole("button", { name: "Ok,thanks" }).click();
}

async function createPartner(
  page,
  pname,
  paddress,
  ecomNo,
  vatNo,
  pcountry,
  website,
  legalType,
  fname,
  faddress,
  city,
  fcountry,
  postcode,
  latitude,
  longitude,
  massBalanaceDate,
  months,
  productionDate,
  option
) {
  await expect(page).toHaveURL("/partners");

  await page.getByRole("button", { name: "Add Partners" }).click();

  await page
    .locator("#partnerForm_name")
    .pressSequentially(pname, { delay: 100 });
  await page
    .locator("#partnerForm_address")
    .pressSequentially(paddress, { delay: 100 });
  await page
    .locator("#partnerForm_economicOperatorNumber")
    .pressSequentially(ecomNo, { delay: 100 });
  await page
    .locator("#partnerForm_vatNumber")
    .pressSequentially(vatNo, { delay: 100 });
  await page
    .locator("#partnerForm_country")
    .pressSequentially(pcountry, { delay: 150 });
  await page.keyboard.press("Enter");
  await page
    .locator("#partnerForm_website")
    .pressSequentially(website, { delay: 100 });
  await page
    .locator("#partnerForm_legalType")
    .pressSequentially(legalType, { delay: 100 });

  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Add More Facilities" }).click();

  await page.locator("#name").pressSequentially(fname, { delay: 100 });
  await page.locator("#address").pressSequentially(faddress, { delay: 100 });
  await page.locator("#city").pressSequentially(city, { delay: 100 });
  await page.locator("#country").pressSequentially(fcountry, { delay: 150 });
  await page.keyboard.press("Enter");
  await page.locator("#postcode").pressSequentially(postcode, { delay: 100 });
  await page.locator("#latitude").pressSequentially(latitude, { delay: 100 });
  await page.locator("#longitude").pressSequentially(longitude, { delay: 100 });
  await page.locator("#massBalanceStartDate").fill(massBalanaceDate);
  await page.locator("#massBalanceDuration").click();
  await page.locator(`.ant-select-item-option[title*="${months}"]`).click();
  await page.locator("#productionStartDate").pressSequentially(productionDate),
    { delay: 100 };
  await page.keyboard.press("Enter");

  await page.getByRole("button", { name: "OK" }).click();

  await page.waitForTimeout(2000);
  const inputField = page.locator(
    'input[id^="partnerForm_facility_"][id$="_type"]'
  );

  await inputField.click({ force: true });
  await inputField.press("Meta+A");
  await inputField.press("Backspace");
  await page.waitForTimeout(2000);
  await page.locator(`.ant-select-item-option[title*="${option}"]`).click();

  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
}

async function addPartner(page, existingOrgName, option) {
  await expect(page).toHaveURL("/partners");

  await page.getByRole("button", { name: "Add Partners" }).click();

  const fieldIds = [
    "#partnerForm_address",
    "#partnerForm_economicOperatorNumber",
    "#partnerForm_vatNumber",
    "#partnerForm_country",
    "#partnerForm_website",
    "#partnerForm_legalType",
  ];

  await page
    .locator("#partnerForm_name")
    .pressSequentially(existingOrgName, { delay: 100 });
  await page.keyboard.press("Enter");

  for (const fieldId of fieldIds) {
    if (fieldId == "#partnerForm_country") {
      const countryLoc = await page
        .locator(fieldId)
        .locator("..")
        .locator("+ .ant-select-selection-item");
      await expect(countryLoc).not.toBeEmpty();
    } else {
      const formLocator = await page.locator(fieldId);
      await expect(formLocator).toHaveValue(/.+/);
    }
  }

  await page.getByRole("button", { name: "Next" }).click();
  const inputField = page.locator(
    'input[id^="partnerForm_facility_"][id$="_type"]'
  );

  await inputField.click({ force: true });
  await inputField.press("Meta+A");
  await inputField.press("Backspace");
  await page.waitForTimeout(2000);
  await page.locator(`.ant-select-item-option[title*="${option}"]`).click();

  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
}

async function createFacility(
  page,
  name,
  address,
  city,
  country,
  postcode,
  latitude,
  longitude,
  massBalanaceDate,
  months,
  productionDate,
  cerScope
) {
  await page.getByRole("menuitem", { name: "Configuration" }).hover();
  await page.getByRole("menuitem", { name: "Facilities" }).click();
  await expect(page).toHaveURL("/facilities");
  await page.getByRole("button", { name: "Add Facility" }).click();
  await page.locator("#facility2_name").pressSequentially(name, { delay: 100 });
  await page
    .locator("#facility2_address")
    .pressSequentially(address, { delay: 100 });
  await page.locator("#facility2_city").pressSequentially(city, { delay: 100 });
  await page
    .locator("#facility2_country")
    .pressSequentially(country, { delay: 150 });
  await page.keyboard.press("Enter");
  await page
    .locator("#facility2_postcode")
    .pressSequentially(postcode, { delay: 100 });
  await page
    .locator("#facility2_latitude")
    .pressSequentially(`${latitude}`, { delay: 100 });
  await page
    .locator("#facility2_longitude")
    .pressSequentially(`${longitude}`, { delay: 100 });
  await page
    .locator("#facility2_massBalanceStartDate")
    .pressSequentially(massBalanaceDate, { delay: 100 });
  await page.locator("#facility2_massBalanceDuration").click();
  await page.locator(`.ant-select-item-option[title*="${months}"]`).click();
  await page
    .locator("#facility2_productionStartDate")
    .pressSequentially(productionDate, { delay: 100 });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2000);
  const scope = await page.locator("#facility2_certificationScopes");
  await scope.click();
  for (const scopeName of cerScope) {
    await scope.pressSequentially(scopeName, { delay: 100 });
    await page.keyboard.press("Enter");
  }
  await page.getByText("New Facility").click();
  await page.getByRole("button", { name: "Create Facility" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
}

async function createCertificate(
  page,
  cerScheme,
  cerBody,
  cerNo,
  cerBodyNo,
  dateOfIssue,
  placeOfIssue,
  dateOfOriginalIssue,
  startDate,
  endDate,
  cerStatus,
  cerScope,
  facility,
  docformCertificate
) {
  await page.getByRole("menuitem", { name: "Configuration" }).hover();
  await page.getByRole("menuitem", { name: "Certificates" }).click();

  await expect(page).toHaveURL("/certificates");

  await page.getByRole("button", { name: "Add Certificate" }).click();
  await page.locator("#certform_scheme").click();
  await page.locator(`.ant-select-item-option[title*="${cerScheme}"]`).click();
  await page.locator("#certform_body").click();
  await page.locator(`.ant-select-item-option[title*="${cerBody}"]`).click();
  await page.locator("#certform_number").fill(cerNo);
  await page
    .locator("#certform_bodyNumber")
    .pressSequentially(cerBodyNo, { delay: 100 });
  await page
    .locator("#certform_dateOfIssue")
    .pressSequentially(dateOfIssue, { delay: 100 });
  await page.keyboard.press("Enter");
  await page
    .locator("#certform_placeOfIssue")
    .pressSequentially(placeOfIssue, { delay: 100 });
  await page
    .locator("#certform_dateOfOriginalIssue")
    .pressSequentially(dateOfOriginalIssue, { delay: 100 });
  await page.keyboard.press("Enter");
  await page.getByLabel("Start Date").fill(startDate);
  await page
    .locator("#certform_endDate")
    .pressSequentially(endDate, { delay: 100 });
  await page.keyboard.press("Enter");
  await page.locator("#certform_status").click();
  await page.locator(`.ant-select-item-option[title*="${cerStatus}"]`).click();
  const scope = await page.locator("#certform_certificationScope");
  await scope.click();
  for (const scopeName of cerScope) {
    await scope.pressSequentially(scopeName, { delay: 100 });
    await page.keyboard.press("Enter");
  }

  await page.locator("div.ant-modal-title").click();
  await assignIdentifier(page, facility);
  await page.locator("div > button.ant-btn-sm").click();
  await page.getByRole("button", { name: "Add Document" }).click();
  const cer = await page.locator('input[id^="certform_docs_"][id$="_docType"]');
  await cer.click();
  await cer.pressSequentially(docformCertificate, { delay: 100 });
  await page.keyboard.press("Enter");

  const filePath = `files/${await idGen(5)}.txt`;
  const content = `Playwright test file\n${await idGen(10)}`;
  const buffer = Buffer.from(content);
  fs.writeFileSync(filePath, buffer);

  await page
    .locator('input[id^="certform_docs_"][id$="_document"]')
    .setInputFiles(filePath);

  await page.waitForSelector(".ant-message-success", { state: "visible" });
  await page.waitForSelector(".ant-message-success", { state: "hidden" });

  await page.getByRole("button", { name: "Add Certificate" }).nth(1).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });

  fs.unlinkSync(filePath);
}

async function createCertificateScope(
  page,
  name,
  isccCode,
  isccLabel,
  redCertCode,
  redCertLabel,
  bsvsCode,
  bsvsLabel
) {
  await expect(page).toHaveURL("/certificationscopes");

  await page.getByRole("button", { name: "Add Certification Scope" }).click();
  await page
    .locator("#scope_scopeName")
    .pressSequentially(name, { delay: 100 });
  await page
    .locator("#scope_isccEuCode")
    .pressSequentially(isccCode, { delay: 100 });
  await page
    .locator("#scope_isccEuLabel")
    .pressSequentially(isccLabel, { delay: 100 });
  await page
    .locator("#scope_redCertEuCode")
    .pressSequentially(redCertCode, { delay: 100 });
  await page
    .locator("#scope_redCertEuLabel")
    .pressSequentially(redCertLabel, { delay: 100 });
  await page
    .locator("#scope_twoBsVsCode")
    .pressSequentially(bsvsCode, { delay: 100 });
  await page
    .locator("#scope_twoBsVsLabel")
    .pressSequentially(bsvsLabel, { delay: 100 });

  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
}

async function createPassport(
  page,
  product,
  quantity,
  supplierName,
  dispatchDate,
  receiptDate,
  recipientAddress,
  docTypeForExtraction,
  docPath,
  arrivalDate
) {
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL("/dashboard");

  await page.getByText("Product Receipts & Inventory").click();
  await page.getByRole("button", { name: "Create product receipt" }).click();
  await page
    .locator("#productTypeId")
    .pressSequentially(product, { delay: 150 });
  await page.keyboard.press("Enter");
  await page.locator("#quantity").pressSequentially(quantity);
  await page
    .locator("#supplier")
    .pressSequentially(supplierName, { delay: 150 });
  await page.waitForSelector(
    `.ant-select-item-option[title*="${supplierName}"]`,
    { state: "visible" }
  );
  await page.keyboard.press("Enter");

  await page.locator("#dispatchDate").pressSequentially(dispatchDate);
  await page.keyboard.press("Enter");
  await page.locator("#receiptDate").pressSequentially(receiptDate);
  await page.keyboard.press("Enter");
  await page.locator("#recipientAddress").pressSequentially(recipientAddress);
  await page.getByLabel("Yes").check();
  await page.getByRole("button", { name: "Save product receipt" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
  await page
    .getByRole("button", { name: "Continue to Create a Passport" })
    .click();
  await page
    .locator('input[id^="docs_"][id$="_docType"]')
    .pressSequentially(docTypeForExtraction, { delay: 150 });
  await page.keyboard.press("Enter");
  await page
    .locator('input[id^="docs_"][id$="_document"]')
    .setInputFiles(docPath);
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForSelector("div.ant-modal-content", { state: "hidden" });

  await page.fill(
    'input[id^="Please specify the expected date of arrival_"]',
    arrivalDate
  );
  await page.getByRole("button", { name: "Next" }).click();

  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Next" }).click();

  await page.getByRole("button", { name: "Create Passport" }).click();
  await page.waitForSelector(".ant-message-success", { state: "visible" });
  await page.waitForSelector(".ant-message-success", { state: "hidden" });

  await expect(page).toHaveURL("/dashboard");
  await page.getByRole("button", { name: "View all passports" }).click();
  await page.waitForTimeout(3000);
  await page.waitForLoadState("networkidle");

  const passportCard = await page.locator("div.ant-card-body").first();
  await passportCard.waitFor({ state: "visible" });
  await passportCard.click();

  await page.waitForSelector('div:has-text("Actions") + div button', {
    state: "visible",
  });
  expect(await page.locator("div h1.ant-typography").textContent()).toMatch(
    new RegExp(/Passport - TNFT-\d+/)
  );
}

async function goToFirstPassport(page) {
  await expect(page).toHaveURL("/dashboard");
  await page.getByRole("button", { name: "View all passports" }).click();
  await page.waitForTimeout(3000);

  const passportCard = await page.locator("div.ant-card-body").first();
  await passportCard.waitFor({ state: "visible" });
  await passportCard.click();
  await page.waitForTimeout(5000);
}

async function oilExtraction(page, processingDate, processingCountry, comment) {
  await expect(page).toHaveURL(/\/twin\/\d+/);
  await page
    .getByRole("button", {
      name: "Oil Extraction",
      exact: true,
    })
    .click();

  await page.fill('input[id^="Processing Date_"]', processingDate);
  await page
    .locator('input[id^="Processing Country_"]')
    .pressSequentially(processingCountry, { delay: 150 });
  await page.waitForSelector(
    `.ant-select-item-option[title*="${processingCountry}"]`,
    { state: "visible" }
  );
  await page.keyboard.press("Enter");
  await page.fill("#comment", comment);
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(3000);

  await page.locator("div.ant-card-body").first().click();
  await page.locator("input#passportEmissions_isEecDdv").focus();
  await page.locator("input#passportEmissions_isEecDdv").click({ force: true });
  await page.click('div[title="DDV"]');
  await expect(
    page.locator("span.ant-select-selection-search + span").first()
  ).toHaveText("DDV");
  await page.waitForTimeout(3000);

  await page.getByRole("button", { name: "Finalise" }).click();
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByRole("button", { name: "Oil Extraction" }).click();
  await page.waitForSelector(".ant-message-success", { state: "visible" });
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
  await expect(page.locator("div h1.ant-typography")).toContainText(
    "Rapeseed Oil"
  );
  await expect(
    page.locator(
      'div:has-text("Actions") + div button:has-text("HVO Production")'
    )
  ).toBeVisible();
}

async function hvoProduction(page, productionDate, productionCountry) {
  await expect(page).toHaveURL(/\/twin\/\d+/);
  await page
    .getByRole("button", { name: "HVO Production", exact: true })
    .click();

  await page.fill('input[id^="Production Date_"]', productionDate);
  await page
    .locator('input[id^="Production Country_"]')
    .pressSequentially(productionCountry, { delay: 150 });
  await page.waitForSelector(
    `.ant-select-item-option[title*="${productionCountry}"]`,
    { state: "visible" }
  );
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Next" }).click();

  await page.locator("div.ant-card-body").nth(0).click();
  await page.getByLabel("Use TDV").check();
  await expect(page.getByLabel("Use TDV")).toBeChecked();
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: "Finalise" }).click();

  await page.locator("div.ant-card-body").nth(1).click();
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: "Finalise" }).click();

  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "HVO Production" }).click();
  await page.waitForSelector(".ant-message-success", { state: "visible" });
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
  await expect(page.locator("div h1.ant-typography")).toContainText("HVO");
}

async function rmeProduction(page, productionDate, productionCountry) {
  await expect(page).toHaveURL(/\/twin\/\d+/);
  await page
    .getByRole("button", { name: "RME Production", exact: true })
    .click();

  await page.fill('input[id^="Production Date_"]', productionDate);
  await page
    .locator('input[id^="Production Country_"]')
    .pressSequentially(productionCountry, { delay: 150 });
  await page.waitForSelector(
    `.ant-select-item-option[title*="${productionCountry}"]`,
    { state: "visible" }
  );
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Next" }).click();

  await page.locator("div.ant-card-body").first().click();
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: "Finalise" }).click();

  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "RME Production" }).click();
  await page.waitForSelector(".ant-message-success", { state: "visible" });
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
  await expect(page.locator("div h1.ant-typography")).toContainText("RME");
}

async function ucomeProduction(page, productionDate, productionCountry) {
  await expect(page).toHaveURL(/\/twin\/\d+/);
  await page
    .getByRole("button", { name: "UCOME Production", exact: true })
    .click();

  await page.fill('input[id^="Production Date_"]', productionDate);
  await page
    .locator('input[id^="Production Country_"]')
    .pressSequentially(productionCountry, { delay: 150 });
  await page.waitForSelector(
    `.ant-select-item-option[title*="${productionCountry}"]`,
    { state: "visible" }
  );
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Next" }).click();

  await page.locator("div.ant-card-body").first().click();
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: "Finalise" }).click();

  await page.locator("div.ant-card-body").last().click();
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: "Finalise" }).click();

  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "UCOME Production" }).click();
  await page.waitForSelector(".ant-message-success", { state: "visible" });
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
  await expect(page.locator("div h1.ant-typography")).toContainText("UCOME");
}

async function splitPassport(page, splitQuantity) {
  await expect(page).toHaveURL(/\/twin\/\d+/);
  await page
    .getByRole("button", { name: "Split Passport", exact: true })
    .click();

  await page.fill('input[id^="Split Quantity_"]', splitQuantity);

  const initialQuantity = await page
    .locator('input[id^="Initial Quantity_"]')
    .getAttribute("aria-valuenow");

  const remainingQuantity = await page
    .locator('input[id^="Remaining Quantity_"]')
    .getAttribute("aria-valuenow");

  const initialQty = parseFloat(initialQuantity);
  const remainingQty = parseFloat(remainingQuantity);
  const splitQty = parseFloat(splitQuantity);

  await expect(initialQty - splitQty).toBe(remainingQty);

  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Split Passport" }).click();
  await page.waitForSelector(".ant-message-success", { state: "visible" });
  await page.waitForSelector(".ant-message-success", { state: "hidden" });

  await expect(page.locator("div h1.ant-typography")).toContainText(
    splitQuantity
  );
}

async function productLoss(
  page,
  lostQuantity,
  eventDate,
  additionalInfo,
  comment
) {
  await expect(page).toHaveURL(/\/twin\/\d+/);
  await page.getByRole("button", { name: "Product Loss", exact: true }).click();

  await page.fill('input[id^="Lost Quantity_"]', lostQuantity);
  await page.fill('input[id^="Event Date_"]', eventDate);
  await page.fill('textarea[id^="Additional information_"]', additionalInfo);
  await page.fill("#comment", comment);

  const initialQuantity = await page
    .locator('input[id^="Initial Quantity_"]')
    .getAttribute("aria-valuenow");

  const remainingQuantity = await page
    .locator('input[id^="Remaining Quantity_"]')
    .getAttribute("aria-valuenow");

  const initialQty = parseFloat(initialQuantity);
  const remainingQty = parseFloat(remainingQuantity);
  const lostQty = parseFloat(lostQuantity);

  await expect(initialQty - lostQty).toBe(remainingQty);

  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Product Loss" }).click();
  await page.waitForSelector(".ant-message-success", { state: "visible" });
  await page.waitForSelector(".ant-message-success", { state: "hidden" });

  await expect(page.locator("div h1.ant-typography")).toContainText(
    remainingQuantity
  );
}

async function blend(
  page,
  blendType,
  fossilFuel,
  fossilFuelQunatity,
  eventDate
) {
  await expect(page).toHaveURL(/\/twin\/\d+/);
  await page.getByRole("button", { name: "Blend", exact: true }).click();

  await page
    .locator('input[id^="Blend Type_"]')
    .pressSequentially(blendType, { delay: 150 });
  await page.waitForSelector(`.ant-select-item-option[title*="${blendType}"]`, {
    state: "visible",
  });
  await page.keyboard.press("Enter");

  await page
    .locator('input[id^="Fossil Fuel_"]')
    .pressSequentially(fossilFuel, { delay: 150 });
  await page.waitForSelector(
    `.ant-select-item-option[title*="${fossilFuel}"]`,
    {
      state: "visible",
    }
  );
  await page.keyboard.press("Enter");

  await page.fill('input[id^="Fossil Fuel Quantity_"]', fossilFuelQunatity);
  await page.fill('input[id^="Event Date_"]', eventDate);

  const initialQuantity = await page
    .locator('input[id^="Initial Quantity_"]')
    .getAttribute("aria-valuenow");
  const shareOfBiofuel = await page
    .locator('input[id^="Share of Biofuel_"]')
    .getAttribute("value");

  const initialQty = parseFloat(initialQuantity);
  const fossilFuelQty = parseFloat(fossilFuelQunatity);
  const shareOfBf = parseFloat(shareOfBiofuel);

  expect((initialQty / (fossilFuelQty + initialQty)) * 100).toBeCloseTo(
    shareOfBf
  );

  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Blend" }).click();
  await page.waitForSelector(".ant-message-success", { state: "visible" });
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
}

async function initiateSale(
  page,
  saleType,
  amount,
  recipientName,
  recipientFacility,
  dateOfDispatch
) {
  await expect(page).toHaveURL(/\/twin\/\d+/);

  await page
    .getByRole("button", { name: "Initiate Sale", exact: true })
    .click();

  await page
    .locator("#saleQuantity")
    .pressSequentially(saleType, { delay: 150 });
  await page.waitForSelector(`.ant-select-item-option[title*="${saleType}"]`, {
    state: "visible",
  });
  await page.keyboard.press("Enter");

  if (saleType === "Specific Amount") {
    await page.waitForSelector("#saleAmount:enabled", { state: "visible" });
    await page.fill("#saleAmount", amount);
  } else {
    await page.waitForSelector("#saleAmount:disabled", { state: "visible" });
  }

  await page
    .locator("#company")
    .pressSequentially(recipientName, { delay: 150 });
  await page.waitForSelector(
    `.ant-select-item-option[title*="${recipientName}"]`,
    {
      state: "visible",
    }
  );
  await page.keyboard.press("Enter");

  await page
    .locator("#facility")
    .pressSequentially(recipientFacility, { delay: 150 });
  await page.waitForSelector(
    `.ant-select-item-option[title*="${recipientFacility}"]`,
    {
      state: "visible",
    }
  );
  await page.keyboard.press("Enter");

  await page.fill("#dateOfDispatch", dateOfDispatch);
  await page.getByLabel(new RegExp("^Same as dispatch$")).check();
  await expect(page.locator("#dispatchAddress")).toHaveValue(/.+/);
  await expect(page.locator("#recipientAddress")).toHaveValue(/.+/);
  await page.getByRole("button", { name: "Initiate Sale" }).click();
  await page.getByRole("button", { name: "Send sale proposal" }).click();

  await page.waitForSelector(".ant-message-success", { state: "visible" });
  await page.waitForSelector(".ant-message-success", { state: "hidden" });

  await page.waitForSelector("h4.ant-typography", {
    hasText: "Change of Ownership",
    state: "visible",
  });
  await page.waitForSelector("span.ant-tag", {
    hasText: "Offered for sale",
    state: "visible",
  });
}

async function createDocumentRules(page, name, description, rules) {
  await expect(page).toHaveURL("/documentrules");
  await page
    .getByRole("button", { name: "Add new group of rules", exact: true })
    .click();

  await page.locator("#groupName").pressSequentially(name, { delay: 100 });
  await page
    .locator("#description")
    .pressSequentially(description, { delay: 100 });

  for (let i = 0; i < rules.length; i++) {
    const currentRule = rules[i];
    await page.getByText("Create a new rule").click();

    await page.locator(`#rules_${i}_ruleName`).fill(currentRule.name);

    for (const docType of currentRule.docType) {
      await page.click(`#rules_${i}_documentTypes`);
      await page
        .locator(`div.ant-select-item-option-content`)
        .filter({ hasText: docType })
        .nth(i)
        .click();

      await page.keyboard.press("Escape");
    }

    for (let j = 0; j < currentRule.rule.length; j++) {
      const value = await page.locator(`#rules_${i}_rule_${j}`);
      const ruleValue = currentRule.rule[j];
      await value.click();
      await value.pressSequentially(ruleValue, { delay: 100 });
      await page.keyboard.press("Enter");
    }

    await page
      .locator(`#rules_${i}_errorMessage`)
      .pressSequentially(currentRule.errorMessage, { delay: 50 });
  }
  await page.getByRole("button", { name: "Save", exact: true }).click();

  await page.waitForSelector(".ant-message-success", { state: "visible" });
  await page.waitForSelector(".ant-message-success", { state: "hidden" });
}

async function loginWithAPI(context, page, mailId) {
  // Navigate to the homepage
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("Type your email").waitFor({ state: "visible" }); // Ensure page is loaded

  // Split email into [mail] and [domainName]
  const emailId = mailId;
  const [mail, domainPart] = emailId.split("@");
  const domainName = domainPart.split(".testinator.com")[0];

  // Fill login details and submit
  await page.getByPlaceholder("Type your email").fill(mailId);
  const [otpPage] = await Promise.all([
    context.waitForEvent("page"),
    page.getByRole("button", { name: "Login" }).click(),
  ]);

  // Wait for OTP email via Mailinator API
  let otp = null;
  let responseData = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    // Retry up to 10 times
    const response = await context.request.get(
      `https://mailinator.com/api/v2/domains/${domainName}.testinator.com/inboxes/${mail}`,
      {
        headers: { Authorization: `Bearer ${process.env.apiKey}` },
      }
    );

    if (response.ok()) {
      responseData = await response.json();
      if (responseData.msgs && responseData.msgs.length > 0) {
        const emailMessage = responseData.msgs[0];
        const subject = emailMessage.subject;

        // Extract OTP
        const otpMatch = subject.match(/\b\d{6}\b/);
        if (otpMatch) {
          otp = otpMatch[0];
          break; // Exit the loop if OTP is found
        }
      }
    }
    await new Promise((res) => setTimeout(res, 1000)); // Wait 1 second before retrying
  }

  if (!otp) {
    throw new Error(
      "Failed to retrieve OTP from Mailinator after multiple attempts."
    );
  }

  // Enter OTP on the login page
  await otpPage.bringToFront();
  const otpInputs = otpPage.locator('input[autocomplete="one-time-code"]');
  for (let i = 0; i < otp.length; i++) {
    await otpInputs.nth(i).fill(otp[i]);
  }

  // Verify successful login
  await page.bringToFront();
  await expect(page.locator(".ant-message-success")).toBeVisible();

  // Delete the email using Mailinator API
  const emailMessage = responseData.msgs[0];
  const id = emailMessage.id;

  const deleteRes = await context.request.delete(
    `https://mailinator.com/api/v2/domains/private/inboxes/${mail}/messages/${id}`
  );
  const deleteResData = await deleteRes.json();

  // Validate delete response
  expect(deleteResData.count).toBe(1);
  expect(deleteResData.status).toBe("ok");
}

async function registerWithAPI(context, page, fname, lname, mailId) {
  // Navigate to the homepage
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.waitForSelector("#login_email", { visible: true }); // Ensure page is loaded

  // Split email into [mail] and [domainName]
  const emailId = process.env[mailId];
  const [mail, domainPart] = emailId.split("@");
  const domainName = domainPart.split(".testinator.com")[0];

  // Register flow
  await page.getByRole("button", { name: "Register" }).click();
  await page.fill("#register_fname", fname);
  await page.fill("#register_lname", lname);
  await page.fill("#register_email", emailId);

  // Wait for OTP page to open
  const [otpPage] = await Promise.all([
    context.waitForEvent("page"),
    page.getByRole("button", { name: "Register" }).click(),
  ]);

  // Wait for OTP email via Mailinator API
  let otp = null;
  let responseData = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    // Retry up to 10 times
    const response = await context.request.get(
      `https://mailinator.com/api/v2/domains/${domainName}.testinator.com/inboxes/${mail}`,
      {
        headers: { Authorization: `Bearer ${process.env.apiKey}` },
      }
    );

    if (response.ok()) {
      responseData = await response.json();
      if (responseData.msgs && responseData.msgs.length > 0) {
        const emailMessage = responseData.msgs[0];
        const subject = emailMessage.subject;

        // Extract OTP
        const otpMatch = subject.match(/\b\d{6}\b/);
        if (otpMatch) {
          otp = otpMatch[0];
          break; // Exit the loop if OTP is found
        }
      }
    }
    await new Promise((res) => setTimeout(res, 1000)); // Wait 1 second before retrying
  }

  if (!otp) {
    throw new Error(
      "Failed to retrieve OTP from Mailinator after multiple attempts."
    );
  }

  // Enter OTP
  await otpPage.bringToFront();
  const otpInputs = otpPage.locator('input[autocomplete="one-time-code"]');
  for (let i = 0; i < otp.length; i++) {
    await otpInputs.nth(i).fill(otp[i]);
  }

  // Verify successful registration
  await page.bringToFront();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await expect(page.locator("span.ant-page-header-heading-title")).toHaveText(
    "Profile"
  );
  await expect(page).toHaveURL("/profile");

  // Logout
  await logout(page);

  // Delete the email using Mailinator API
  const emailMessage = responseData.msgs[0];
  const id = emailMessage.id;

  const deleteRes = await context.request.delete(
    `https://mailinator.com/api/v2/domains/private/inboxes/${mail}/messages/${id}`
  );
  const deleteResData = await deleteRes.json();

  // Validate delete response
  expect(deleteResData.count).toBe(1);
  expect(deleteResData.status).toBe("ok");

  // Clean up
  await page.close();
  await new Promise((resolve) => setTimeout(resolve, 5000)); //To avoid sending frequent requests to Web3Auth, which can result in a 429 Too Many Requests error
}

async function createProductAPI(request, product, cookieString) {
  const response = await request.post("/config/products", {
    headers: {
      Cookie: cookieString,
    },
    data: product,
  });

  if (response.status() !== 200) {
    throw new Error(`Failed to create product: ${product.name}`);
  }

  const responseBody = await response.json();
  expect(responseBody.name).toBe(product.name);
  expect(responseBody.description).toBe(product.description);
  expect(responseBody.category).toBe(product.category);
  expect(responseBody.measurementType).toBe(product.measurementType);
  expect(responseBody.lowerHeatingValue).toBe(product.lowerHeatingValue);
}

async function createDocTypeAPI(request, doc, cookieString) {
  const response = await request.post("/vault/doctype", {
    headers: {
      Cookie: cookieString,
    },
    data: doc,
  });

  if (response.status() !== 200) {
    throw new Error(`Failed to create document type: ${doc.docType}`);
  }

  const responseBody = await response.json();
  expect(responseBody.doctype).toBe(doc.docType);
  expect(responseBody.description).toBe(doc.description);
  expect(responseBody.isOcr).toBe(doc.isOcr);
  expect(responseBody.configurationId).toBe(doc.configurationId);
}

async function createAttributeAPI(request, attribute, cookieString) {
  if (attribute.attributeLevel === "Twin") {
    attribute = { ...attribute, ...seedData.platformLevel.defaultAttribute };
  }
  const response = await request.post("/config/attributes", {
    headers: {
      Cookie: cookieString,
    },
    data: attribute,
  });
  if (response.status() !== 201) {
    throw new Error(`Failed to create attribute: ${attribute.name}`);
  }
  const responseBody = await response.json();
  expect(responseBody.name).toBe(attribute.name);
  expect(responseBody.description).toBe(attribute.description);
  expect(responseBody.attributeType).toBe(attribute.attributeType);
  expect(responseBody.attributeLevel).toBe(attribute.attributeLevel);
}

async function createIdentifierAPI(request, identifier, cookieString) {
  const attributesResponse = await request.get("/config/attributes", {
    headers: {
      Cookie: cookieString,
    },
  });
  expect(attributesResponse.status()).toBe(200);
  const attributes = await attributesResponse.json();

  const attributeIds = identifier.attributes.map((attrName) => {
    const attribute = attributes.find((attr) => attr.name === attrName);
    return attribute.ID;
  });

  if (attributeIds.length === 0) {
    throw new Error("No attributes matching the specified names found.");
  }

  const identifierData = { ...identifier };
  identifierData.identifierWidth =
    identifierData.identifierWidth === "Half" ? 12 : 24;
  identifierData.identifierType = !identifierData.identifierType
    ? "user"
    : "system";
  delete identifierData.attributes;

  const identifierResponse = await request.post("/config/identifiers", {
    headers: {
      Cookie: cookieString,
    },
    data: identifierData,
  });
  expect(identifierResponse.status()).toBe(201);
  const createdIdentifier = await identifierResponse.json();
  const createdIdentifierID = createdIdentifier.ID;

  const assignmentResponse = await request.put(
    `/config/identifiers/attributes/${createdIdentifierID}`,
    {
      headers: {
        Cookie: cookieString,
      },
      data: { attributeIds: attributeIds },
    }
  );
  expect(assignmentResponse.status()).toBe(204);
}

async function createCertificationScopeAPI(request, scope, cookieString) {
  const response = await request.post("/config/certification-scope", {
    headers: {
      Cookie: cookieString,
    },
    data: scope,
  });

  if (response.status() !== 200) {
    throw new Error(`Failed to create scope: ${scope.scopeName}`);
  }

  const responseBody = await response.json();
  expect(responseBody.isccEuCode).toBe(scope.isccEuCode);
  expect(responseBody.isccEuLabel).toBe(scope.isccEuLabel);
  expect(responseBody.redCertEuCode).toBe(scope.redCertEuCode);
  expect(responseBody.redCertEuLabel).toBe(scope.redCertEuLabel);
  expect(responseBody.twoBsVsCode).toBe(scope.twoBsVsCode);
  expect(responseBody.twoBsVsLabel).toBe(scope.twoBsVsLabel);
}

async function createFacilityAPI(request, facility, cookieString) {
  const certificationScopeResponse = await request.get(
    "/config/certification-scope",
    {
      headers: {
        Cookie: cookieString,
      },
    }
  );
  expect(certificationScopeResponse.status()).toBe(200);
  const certificationScope = await certificationScopeResponse.json();

  const certificationScopeIDs = facility.certificationScopes.map((scope) => {
    const cerScope = certificationScope.find((sn) => sn.scopeName === scope);
    return cerScope.ID;
  });
  if (certificationScopeIDs.length === 0) {
    throw new Error(
      "No certification scope matching the specified names found."
    );
  }

  const facilityData = {
    ...facility,
    massBalanceDuration: `${facility.massBalanceDuration} months`,
    massBalanceStartDate: new Date(facility.massBalanceStartDate).toISOString(),
    productionStartDate: new Date(facility.productionStartDate).toISOString(),
    certificationScopes: certificationScopeIDs,
  };

  const facilityResponse = await request.post("/config/facilities", {
    headers: {
      Cookie: cookieString,
    },
    data: facilityData,
  });
  expect(facilityResponse.status()).toBe(200);
  const createdFacility = await facilityResponse.json();
  const createdFacilityID = createdFacility.ID;

  const assignmentResponse = await request.put(
    `config/facilities/certification_scopes/${createdFacilityID}`,
    {
      headers: {
        Cookie: cookieString,
      },
      data: { ids: certificationScopeIDs },
    }
  );
  expect(assignmentResponse.status()).toBe(204);
}

async function createCertificateAPI(request, certificate, cookieString) {
  const allFacilitiesResponse = await request.get("/config/facilities/all?", {
    headers: { Cookie: cookieString },
  });
  expect(allFacilitiesResponse.status()).toBe(200);
  const allFacilities = await allFacilitiesResponse.json();

  const facilityIDs = certificate.facility.map((facilityName) => {
    const matchingFacility = allFacilities.find(
      (facility) => facility.name === facilityName
    );
    if (!matchingFacility) {
      throw new Error(`Facility not found: ${facilityName}`);
    }
    return matchingFacility.ID;
  });

  const certificationScopeResponse = await request.get(
    "/config/certification-scope",
    {
      headers: { Cookie: cookieString },
    }
  );
  expect(certificationScopeResponse.status()).toBe(200);
  const allCertificationScopes = await certificationScopeResponse.json();

  const certificationScopeIDs = certificate.certificationScope.map(
    (scopeName) => {
      const matchingScope = allCertificationScopes.find(
        (scope) => scope.scopeName === scopeName
      );
      if (!matchingScope) {
        throw new Error(`Certification scope not found: ${scopeName}`);
      }
      return matchingScope.ID;
    }
  );

  const documentTypeResponse = await request.get("/vault/doctype", {
    headers: { Cookie: cookieString },
  });
  expect(documentTypeResponse.status()).toBe(200);
  const allDocumentTypes = await documentTypeResponse.json();

  const documentTypeID = (() => {
    const matchingDocType = allDocumentTypes.find(
      (docType) => docType.doctype === certificate.documentType
    );
    if (!matchingDocType) {
      throw new Error(`Document type not found: ${certificate.documentType}`);
    }
    return matchingDocType.ID;
  })();

  const formData = new FormData();
  formData.append(
    "uploadFile",
    new File(["Certificate Content"], "certificate.txt", { type: "text/plain" })
  );
  formData.append("doctypeid", documentTypeID);
  formData.append("documentvisibility", "PRIVATE");

  const documentUploadResponse = await request.post("/vault/assets/upload", {
    headers: { Cookie: cookieString },
    multipart: formData,
  });
  expect(documentUploadResponse.status()).toBe(200);

  const { asset: documentHash, assetid: documentID } =
    await documentUploadResponse.json();

  const certificateData = {
    ...certificate,
    dateOfIssue: new Date(certificate.dateOfIssue).toISOString(),
    dateOfOriginalIssue: new Date(
      certificate.dateOfOriginalIssue
    ).toISOString(),
    startDate: new Date(certificate.startDate).toISOString(),
    endDate: new Date(certificate.endDate).toISOString(),
    certificationScope: certificationScopeIDs,
  };

  const createCertificateResponse = await request.post("/config/certificates", {
    headers: { Cookie: cookieString },
    data: certificateData,
  });
  expect(createCertificateResponse.status()).toBe(200);
  const { ID: certificateID } = await createCertificateResponse.json();

  const documentAssignmentResponse = await request.put(
    `/config/certificates/facilities/${certificateID}`,
    {
      headers: { Cookie: cookieString },
      data: {
        documents: [
          {
            docType: documentTypeID,
            docId: documentID,
            docHash: documentHash,
          },
        ],
      },
    }
  );
  expect(documentAssignmentResponse.status()).toBe(204);

  const facilityAssignmentResponse = await request.put(
    `/config/certificates/facilities/${certificateID}`,
    {
      headers: { Cookie: cookieString },
      data: { ids: facilityIDs },
    }
  );
  expect(facilityAssignmentResponse.status()).toBe(204);

  const certificationScopeAssignmentResponse = await request.put(
    `/config/certificates/certification_scopes/${certificateID}`,
    {
      headers: { Cookie: cookieString },
      data: { ids: certificationScopeIDs },
    }
  );
  expect(certificationScopeAssignmentResponse.status()).toBe(204);
}

async function smokeProduct(page) {
  await page.waitForLoadState("networkidle");

  await page.getByRole("menuitem", { name: "Configuration" }).hover();
  await page.getByRole("menuitem", { name: "Products" }).click();

  await createProduct(
    page,
    seedData.smokeData.product.initial.name,
    seedData.smokeData.product.initial.desc,
    seedData.smokeData.product.initial.category,
    seedData.smokeData.product.initial.measurement,
    seedData.smokeData.product.initial.heatingValue
  );

  const searchBar = await page.locator('input[placeholder="Search for type"]');
  await searchBar.click();
  await searchBar.pressSequentially(seedData.smokeData.product.initial.name, {
    delay: 100,
  });

  const productRow = page.locator(
    `tr:has-text("${seedData.smokeData.product.initial.name}")`
  );
  await expect(productRow).toBeVisible();

  const rowEdit = page.locator("tr", {
    hasText: seedData.smokeData.product.initial.name,
  });
  await rowEdit.getByText("Edit").click();

  await page
    .locator("#product_name")
    .fill(seedData.smokeData.product.updated.name);
  await page
    .locator("#product_description")
    .fill(seedData.smokeData.product.updated.desc);

  await page.locator("#product_category").clear();
  await page
    .locator("#product_category")
    .pressSequentially(seedData.smokeData.product.updated.category, {
      delay: 100,
    });
  await page.keyboard.press("Enter");

  await page.locator("#product_measurementType").clear();
  await page
    .locator("#product_measurementType")
    .pressSequentially(seedData.smokeData.product.updated.measurement, {
      delay: 100,
    });
  await page.keyboard.press("Enter");

  await page
    .locator("#product_lowerHeatingValue")
    .fill(`${seedData.smokeData.product.updated.heatingValue}`);
  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });

  await searchBar.fill(seedData.smokeData.product.updated.name);

  const updatedProductRow = page.locator(
    `tr:has-text("${seedData.smokeData.product.updated.name}")`
  );
  await expect(updatedProductRow).toBeVisible();
  await expect(updatedProductRow.locator("td:nth-child(2)")).toHaveText(
    seedData.smokeData.product.updated.desc
  );
  await expect(updatedProductRow.locator("td:nth-child(3)")).toHaveText(
    seedData.smokeData.product.updated.category
  );
  await expect(updatedProductRow.locator("td:nth-child(5)")).toHaveText(
    seedData.smokeData.product.updated.measurement
  );
  await expect(updatedProductRow.locator("td:nth-child(4)")).toHaveText(
    `${seedData.smokeData.product.updated.heatingValue}`
  );

  const rowDelete = page.locator("tr", {
    hasText: seedData.smokeData.product.updated.name,
  });
  await rowDelete.getByText("Delete").click();
  await page.getByRole("button", { name: "Yes" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });

  await expect(
    page.locator(`tr:has-text("${seedData.smokeData.product.updated.name}")`)
  ).not.toBeVisible();
}

async function smokeDocType(page) {
  await page.waitForLoadState("networkidle");

  await page.getByRole("menuitem", { name: "Configuration" }).hover();
  await page.getByRole("menuitem", { name: "Document Types" }).click();

  await createDocType(
    page,
    seedData.smokeData.documentType.initial.name,
    seedData.smokeData.documentType.initial.description,
    seedData.smokeData.documentType.initial.isOCR,
    seedData.smokeData.documentType.initial.ocrID
  );

  const searchBar = await page.locator('input[placeholder="Search for type"]');
  await searchBar.click();
  await searchBar.pressSequentially(
    seedData.smokeData.documentType.initial.name,
    { delay: 100 }
  );

  const docTypeRow = page.locator(
    `tr:has-text("${seedData.smokeData.documentType.initial.name}")`
  );
  await expect(docTypeRow).toBeVisible();

  const rowEdit = docTypeRow.getByText("Edit");
  await rowEdit.click();

  await page
    .locator("#org_doctype")
    .fill(seedData.smokeData.documentType.updated.name);
  await page
    .locator("#org_description")
    .fill(seedData.smokeData.documentType.updated.description);

  const ocrCheckbox = await page.getByLabel("Enable OCR");
  if (seedData.smokeData.documentType.updated.isOCR) {
    await ocrCheckbox.check();
    const ocrField = page.locator("#org_configurationId");
    await ocrField.waitFor({ state: "visible" });
    await ocrField.fill(seedData.smokeData.documentType.updated.ocrID);
  } else {
    await ocrCheckbox.uncheck();
  }

  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });

  await searchBar.fill(seedData.smokeData.documentType.updated.name);

  const updatedDocTypeRow = page.locator(
    `tr:has-text("${seedData.smokeData.documentType.updated.name}")`
  );
  await expect(updatedDocTypeRow).toBeVisible();
  await expect(updatedDocTypeRow.locator("td:nth-child(2)")).toHaveText(
    seedData.smokeData.documentType.updated.description
  );

  const rowDelete = page.locator("tr", {
    hasText: seedData.smokeData.documentType.updated.name,
  });
  await rowDelete.getByText("Delete").click();
  await page.getByRole("button", { name: "Yes" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });

  await expect(
    page.locator(
      `tr:has-text("${seedData.smokeData.documentType.updated.name}")`
    )
  ).not.toBeVisible();
}

async function smokeAttribute(page) {
  await page.waitForLoadState("networkidle");

  await page.getByRole("menuitem", { name: "Configuration" }).hover();
  await page.getByRole("menuitem", { name: "Attributes" }).click();

  await fillAttributeForm(
    page,
    seedData.smokeData.attribute.initial.name,
    seedData.smokeData.attribute.initial.description,
    seedData.smokeData.attribute.initial.type,
    seedData.smokeData.attribute.initial.level
  );

  const searchBar = await page.locator('input[placeholder="Search for name"]');
  await searchBar.click();
  await searchBar.pressSequentially(seedData.smokeData.attribute.initial.name, {
    delay: 100,
  });

  const attributeRow = page.locator(
    `tr:has-text("${seedData.smokeData.attribute.initial.name}")`
  );
  await expect(attributeRow).toBeVisible();

  const rowEdit = attributeRow.getByText("Edit");
  await rowEdit.click();

  await page
    .locator("#attribute_name")
    .fill(seedData.smokeData.attribute.updated.name);
  await page
    .locator("#attribute_description")
    .fill(seedData.smokeData.attribute.updated.description);

  await page.locator("#attribute_attributeType").clear();
  await page
    .locator("#attribute_attributeType")
    .pressSequentially(seedData.smokeData.attribute.updated.type, {
      delay: 100,
    });
  await page.keyboard.press("Enter");

  await page.locator("#attribute_attributeLevel").clear();
  await page
    .locator("#attribute_attributeLevel")
    .pressSequentially(seedData.smokeData.attribute.updated.level, {
      delay: 100,
    });
  await page.keyboard.press("Enter");

  await page.getByRole("button", { name: "Ok" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });

  await searchBar.fill(seedData.smokeData.attribute.updated.name);

  const updatedAttributeRow = page.locator(
    `tr:has-text("${seedData.smokeData.attribute.updated.name}")`
  );
  await expect(updatedAttributeRow).toBeVisible();
  await expect(updatedAttributeRow.locator("td:nth-child(2)")).toHaveText(
    seedData.smokeData.attribute.updated.description
  );
  await expect(updatedAttributeRow.locator("td:nth-child(3)")).toHaveText(
    seedData.smokeData.attribute.updated.type
  );
  await expect(updatedAttributeRow.locator("td:nth-child(4)")).toHaveText(
    seedData.smokeData.attribute.updated.level
  );

  const rowDelete = page.locator("tr", {
    hasText: seedData.smokeData.attribute.updated.name,
  });
  await rowDelete.getByText("Delete").click();
  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });

  await expect(
    page.locator(`tr:has-text("${seedData.smokeData.attribute.updated.name}")`)
  ).not.toBeVisible();
}

async function smokeIdentifier(page) {
  await page.waitForLoadState("networkidle");

  await page.getByRole("menuitem", { name: "Configuration" }).hover();
  await page.getByRole("menuitem", { name: "Identifiers" }).click();

  await fillIdentifierForm(
    page,
    seedData.smokeData.identifier.initial.name,
    seedData.smokeData.identifier.initial.description,
    seedData.smokeData.identifier.initial.attributes,
    seedData.smokeData.identifier.initial.isIdentifierTypeSystem,
    seedData.smokeData.identifier.initial.width
  );

  const searchBar = await page.locator('input[placeholder="Search for name"]');
  await searchBar.click();
  await searchBar.pressSequentially(
    seedData.smokeData.identifier.initial.name,
    { delay: 100 }
  );

  const identifierRow = page.locator(
    `tr:has-text("${seedData.smokeData.identifier.initial.name}")`
  );
  await expect(identifierRow).toBeVisible();

  const rowEdit = identifierRow.getByText("Edit");
  await rowEdit.click();
  await page.waitForTimeout(1000);

  await page
    .locator("#identifier_name")
    .fill(seedData.smokeData.identifier.updated.name);
  await page.waitForTimeout(1000);
  await page
    .locator("#identifier_description")
    .fill(seedData.smokeData.identifier.updated.description);
  await page.waitForTimeout(1000);

  await page.locator("#identifier_attributes").click();

  for (const attribute of seedData.smokeData.identifier.updated.attributes) {
    await page
      .locator("#identifier_attributes")
      .pressSequentially(attribute, { delay: 100 });
    await page.keyboard.press("Enter");
  }
  await page.locator('h1:has-text("Edit Identifier")').click();

  if (seedData.smokeData.identifier.updated.isIdentifierTypeSystem) {
    await page.locator("#identifier_isIdentifierTypeSystem").check();
  } else {
    await page.locator("#identifier_isIdentifierTypeSystem").uncheck();
  }

  await page
    .locator("#identifier_width")
    .fill(seedData.smokeData.identifier.updated.width);
  await page.keyboard.press("Enter");

  await page.getByRole("button", { name: "Ok" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });

  await searchBar.fill(seedData.smokeData.identifier.updated.name);

  const updatedIdentifierRow = page.locator(
    `tr:has-text("${seedData.smokeData.identifier.updated.name}")`
  );
  await expect(updatedIdentifierRow).toBeVisible();
  await expect(updatedIdentifierRow.locator("td:nth-child(2)")).toHaveText(
    seedData.smokeData.identifier.updated.description
  );
  if (seedData.smokeData.identifier.updated.isIdentifierTypeSystem) {
    await expect(updatedIdentifierRow.locator("td:nth-child(3)")).toHaveText(
      "system"
    );
  } else {
    await expect(updatedIdentifierRow.locator("td:nth-child(3)")).toHaveText(
      "user"
    );
  }
  await expect(updatedIdentifierRow.locator("td:nth-child(4)")).toHaveText(
    seedData.smokeData.identifier.updated.width
  );

  const rowDelete = page.locator("tr", {
    hasText: seedData.smokeData.identifier.updated.name,
  });
  await rowDelete.getByText("Delete").click();
  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });

  await expect(
    page.locator(`tr:has-text("${seedData.smokeData.identifier.updated.name}")`)
  ).not.toBeVisible();
}

async function smokeEvent(page) {
  await page.waitForLoadState("networkidle");

  await page.getByRole("menuitem", { name: "Configuration" }).hover();
  await page.getByRole("menuitem", { name: "Events" }).click();
  await page.waitForTimeout(2000);
  const eventTemplateLocator = await page
    .locator('span[title="Event Templates"]')
    .isVisible();

  await page.getByRole("button", { name: "Add Event" }).click();

  await page.fill("#name", seedData.smokeData.event.initial.name);
  await page.fill("#description", seedData.smokeData.event.initial.description);
  await selectItem(
    page,
    "#eventType",
    seedData.smokeData.event.initial.eventType
  );
  await selectItem(page, "#icon", seedData.smokeData.event.initial.icon);
  await page.fill("#actionName", seedData.smokeData.event.initial.actionName);

  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(2000);
  await page
    .locator("#twinJourneyText")
    .fill(seedData.smokeData.event.initial.twinJourneyText);

  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Create" }).click();

  await expect(page.locator(".ant-message-success")).toBeVisible();
  await expect(page.locator(".ant-message-success")).toBeHidden();

  if (eventTemplateLocator) {
    await page.getByRole("button", { name: "Ok,thanks" }).click();
  }

  const searchBar = await page.locator('input[placeholder="Search for name"]');
  await searchBar.pressSequentially(seedData.smokeData.event.initial.name, {
    delay: 100,
  });
  await expect(
    page.locator(`tr:has-text("${seedData.smokeData.event.initial.name}")`)
  ).toBeVisible();

  const rowEdit = await page.locator("tr", {
    hasText: seedData.smokeData.event.initial.name,
  });
  await expect(rowEdit).toBeVisible();
  await rowEdit.getByText("Edit").click();

  await page.fill("#name", seedData.smokeData.event.updated.name);
  await page.fill("#description", seedData.smokeData.event.updated.description);
  await page.fill("#actionName", seedData.smokeData.event.updated.actionName);
  await page.getByRole("button", { name: "Next" }).click();
  await page.fill(
    "#twinJourneyText",
    seedData.smokeData.event.updated.twinJourneyText
  );

  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Update" }).click();

  await expect(page.locator(".ant-message-success")).toBeVisible();
  await expect(page.locator(".ant-message-success")).toBeHidden();

  if (eventTemplateLocator) {
    await page.getByRole("button", { name: "Ok,thanks" }).click();
  }

  await searchBar.pressSequentially(seedData.smokeData.event.updated.name, {
    delay: 100,
  });

  const updatedEventRow = page.locator(
    `tr:has-text("${seedData.smokeData.event.updated.name}")`
  );
  await expect(updatedEventRow).toBeVisible();
  await expect(updatedEventRow.locator("td:nth-child(2)")).toHaveText(
    "saleInitiation"
  );

  const rowDelete = await page.locator("tr", {
    hasText: seedData.smokeData.event.updated.name,
  });
  await expect(rowDelete).toBeVisible();
  await rowDelete.getByText("Delete").click();
  await page.getByRole("button", { name: "Yes" }).click();

  await expect(
    page.locator(`tr:has-text("${seedData.smokeData.event.updated.name}")`)
  ).not.toBeVisible();
}

async function smokeCertificationScope(page) {
  await page.waitForLoadState("networkidle");

  await page.getByRole("menuitem", { name: "Configuration" }).hover();
  await page.getByRole("menuitem", { name: "Certification Scopes" }).click();

  await createCertificateScope(
    page,
    seedData.smokeData.certificationScope.initial.name,
    seedData.smokeData.certificationScope.initial.isccCode,
    seedData.smokeData.certificationScope.initial.isccLabel,
    seedData.smokeData.certificationScope.initial.redCertCode,
    seedData.smokeData.certificationScope.initial.redCertLabel,
    seedData.smokeData.certificationScope.initial.bsvsCode,
    seedData.smokeData.certificationScope.initial.bsvsLabel
  );

  const scopeRow = page.locator(
    `tr:has-text("${seedData.smokeData.certificationScope.initial.name}")`
  );
  await expect(scopeRow).toBeVisible();

  const rowEdit = page.locator("tr", {
    hasText: seedData.smokeData.certificationScope.initial.name,
  });
  await rowEdit.getByText("Edit").click();

  await page
    .locator("#scope_scopeName")
    .fill(seedData.smokeData.certificationScope.updated.name);
  await page
    .locator("#scope_isccEuCode")
    .fill(seedData.smokeData.certificationScope.updated.isccCode);
  await page
    .locator("#scope_isccEuLabel")
    .fill(seedData.smokeData.certificationScope.updated.isccLabel);
  await page
    .locator("#scope_redCertEuCode")
    .fill(seedData.smokeData.certificationScope.updated.redCertCode);
  await page
    .locator("#scope_redCertEuLabel")
    .fill(seedData.smokeData.certificationScope.updated.redCertLabel);
  await page
    .locator("#scope_twoBsVsCode")
    .fill(seedData.smokeData.certificationScope.updated.bsvsCode);
  await page
    .locator("#scope_twoBsVsLabel")
    .fill(seedData.smokeData.certificationScope.updated.bsvsLabel);

  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });

  const updatedScopeRow = page.locator(
    `tr:has-text("${seedData.smokeData.certificationScope.updated.name}")`
  );
  await expect(updatedScopeRow).toBeVisible();
  await expect(updatedScopeRow.locator("td:nth-child(2)")).toHaveText(
    seedData.smokeData.certificationScope.updated.isccCode
  );
  await expect(updatedScopeRow.locator("td:nth-child(3)")).toHaveText(
    seedData.smokeData.certificationScope.updated.isccLabel
  );
  await expect(updatedScopeRow.locator("td:nth-child(4)")).toHaveText(
    seedData.smokeData.certificationScope.updated.redCertCode
  );
  await expect(updatedScopeRow.locator("td:nth-child(5)")).toHaveText(
    seedData.smokeData.certificationScope.updated.redCertLabel
  );
  await expect(updatedScopeRow.locator("td:nth-child(6)")).toHaveText(
    seedData.smokeData.certificationScope.updated.bsvsCode
  );
  await expect(updatedScopeRow.locator("td:nth-child(7)")).toHaveText(
    seedData.smokeData.certificationScope.updated.bsvsLabel
  );

  const rowDelete = page.locator("tr", {
    hasText: seedData.smokeData.certificationScope.updated.name,
  });
  await rowDelete.getByText("Delete").click();
  await page.getByRole("button", { name: "Yes" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });

  await expect(
    page.locator(
      `tr:has-text("${seedData.smokeData.certificationScope.updated.name}")`
    )
  ).not.toBeVisible();
}

async function smokePartner(page) {
  await page.waitForLoadState("networkidle");

  await page.getByRole("menuitem", { name: "Configuration" }).hover();
  await page.getByRole("menuitem", { name: "Partners" }).click();

  await createPartner(
    page,
    seedData.smokeData.partner.initial.pname,
    seedData.smokeData.partner.initial.paddress,
    seedData.smokeData.partner.initial.ecomNo,
    seedData.smokeData.partner.initial.vatNo,
    seedData.smokeData.partner.initial.pcountry,
    seedData.smokeData.partner.initial.website,
    seedData.smokeData.partner.initial.legalType,
    seedData.smokeData.partner.initial.fname,
    seedData.smokeData.partner.initial.faddress,
    seedData.smokeData.partner.initial.city,
    seedData.smokeData.partner.initial.fcountry,
    seedData.smokeData.partner.initial.postcode,
    seedData.smokeData.partner.initial.latitude,
    seedData.smokeData.partner.initial.longitude,
    seedData.smokeData.partner.initial.massBalanaceDate,
    seedData.smokeData.partner.initial.months,
    seedData.smokeData.partner.initial.productionDate,
    seedData.smokeData.partner.initial.option
  );

  const partnerRow = page.locator(
    `tr:has-text("${seedData.smokeData.partner.initial.pname}")`
  );
  await expect(partnerRow).toBeVisible();

  const rowEdit = page.locator("tr", {
    hasText: seedData.smokeData.partner.initial.fname,
  });
  await rowEdit.getByText("Edit").click();
  await page.waitForTimeout(1000);

  await page
    .locator("#partnerForm_address")
    .fill(seedData.smokeData.partner.updated.paddress);
  await page
    .locator("#partnerForm_economicOperatorNumber")
    .fill(seedData.smokeData.partner.updated.ecomNo);
  await page
    .locator("#partnerForm_vatNumber")
    .fill(seedData.smokeData.partner.updated.vatNo);
  await page
    .locator("#partnerForm_country")
    .fill(seedData.smokeData.partner.updated.pcountry);
  await page.keyboard.press("Enter");
  await page
    .locator("#partnerForm_website")
    .fill(seedData.smokeData.partner.updated.website);
  await page
    .locator("#partnerForm_legalType")
    .fill(seedData.smokeData.partner.updated.legalType);

  await page.getByRole("button", { name: "Next" }).click();

  await page.locator("#partnerForm").getByText("Edit").click();
  await page.waitForTimeout(1000);

  await page.locator("#name").fill(seedData.smokeData.partner.updated.fname);
  await page
    .locator("#address")
    .fill(seedData.smokeData.partner.updated.faddress);
  await page.locator("#city").fill(seedData.smokeData.partner.updated.city);
  await page
    .locator("#country")
    .fill(seedData.smokeData.partner.updated.fcountry);
  await page.keyboard.press("Enter");
  await page
    .locator("#postcode")
    .fill(seedData.smokeData.partner.updated.postcode);
  await page
    .locator("#latitude")
    .fill(seedData.smokeData.partner.updated.latitude);
  await page
    .locator("#longitude")
    .fill(seedData.smokeData.partner.updated.longitude);
  await page
    .locator("#massBalanceStartDate")
    .fill(seedData.smokeData.partner.updated.massBalanaceDate);
  await page.keyboard.press("Enter");
  await page.locator("#massBalanceDuration").click({ force: true });
  await page
    .locator(
      `.ant-select-item-option[title*="${seedData.smokeData.partner.updated.months}"]`
    )
    .click();
  await page
    .locator("#productionStartDate")
    .fill(seedData.smokeData.partner.updated.productionDate);

  await page.getByRole("button", { name: "OK" }).click();

  const inputField = page.locator(
    'input[id^="partnerForm_facility_"][id$="_type"]'
  );
  await page.waitForTimeout(2000);

  await inputField.click({ force: true });
  await inputField.press("Meta+A");
  await inputField.press("Backspace");
  await page.waitForTimeout(2000);
  await page
    .locator(
      `.ant-select-item-option[title*="${seedData.smokeData.partner.updated.option}"]`
    )
    .click();
  await page.waitForTimeout(2000);

  await page
    .locator("div.ant-modal-title", {
      hasText: "Edit Partner",
    })
    .click();

  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });

  await page.reload();

  const updatedPartnerRow = page.locator(
    `tr:has-text("${seedData.smokeData.partner.updated.fname}")`
  );
  await expect(updatedPartnerRow).toBeVisible();
  await expect(updatedPartnerRow.locator("td:nth-child(2)")).toHaveText(
    seedData.smokeData.partner.updated.faddress
  );
  await expect(updatedPartnerRow.locator("td:nth-child(3)")).toHaveText(
    seedData.smokeData.partner.updated.fcountry
  );
  await expect(updatedPartnerRow.locator("td:nth-child(4)")).toHaveText(
    seedData.smokeData.partner.updated.city
  );
  await expect(updatedPartnerRow.locator("td:nth-child(5)")).toHaveText(
    seedData.smokeData.partner.updated.postcode
  );
  await expect(updatedPartnerRow.locator("td:nth-child(6)")).toHaveText(
    seedData.smokeData.partner.updated.option.toLowerCase()
  );
  await expect(updatedPartnerRow.locator("td:nth-child(7)")).toHaveText(
    seedData.smokeData.partner.initial.pname.toLowerCase()
  );

  const rowDelete = page.locator("tr", {
    hasText: seedData.smokeData.partner.updated.fname,
  });
  await rowDelete.getByText("Delete").click();
  await page.getByRole("button", { name: "Yes" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });

  await expect(
    page.locator(`tr:has-text("${seedData.smokeData.partner.updated.pname}")`)
  ).not.toBeVisible();
}

async function smokeFacility(page, cookie, request) {
  await page.waitForLoadState("networkidle");

  await page.getByRole("menuitem", { name: "Configuration" }).hover();
  await page.getByRole("menuitem", { name: "Facilities" }).click();

  await createFacility(
    page,
    seedData.smokeData.facility.initial.name,
    seedData.smokeData.facility.initial.address,
    seedData.smokeData.facility.initial.city,
    seedData.smokeData.facility.initial.country,
    seedData.smokeData.facility.initial.postcode,
    seedData.smokeData.facility.initial.latitude,
    seedData.smokeData.facility.initial.longitude,
    seedData.smokeData.facility.initial.massBalanaceDate,
    seedData.smokeData.facility.initial.months,
    seedData.smokeData.facility.initial.productionDate,
    seedData.smokeData.facility.initial.cerScope
  );

  const facilityRow = page.locator(
    `tr:has-text("${seedData.smokeData.facility.initial.name}")`
  );
  await expect(facilityRow).toBeVisible();

  await facilityRow.getByText("Edit").click();
  await page.waitForTimeout(1000);

  await page
    .locator("#facility2_name")
    .fill(seedData.smokeData.facility.updated.name);
  await page
    .locator("#facility2_address")
    .fill(seedData.smokeData.facility.updated.address);
  await page
    .locator("#facility2_city")
    .fill(seedData.smokeData.facility.updated.city);
  await page
    .locator("#facility2_country")
    .fill(seedData.smokeData.facility.updated.country);
  await page.keyboard.press("Enter");
  await page
    .locator("#facility2_postcode")
    .fill(seedData.smokeData.facility.updated.postcode);
  await page
    .locator("#facility2_latitude")
    .fill(`${seedData.smokeData.facility.updated.latitude}`);
  await page
    .locator("#facility2_longitude")
    .fill(`${seedData.smokeData.facility.updated.longitude}`);
  await page
    .locator("#facility2_massBalanceStartDate")
    .fill(seedData.smokeData.facility.updated.massBalanaceDate);
  await page.locator("#facility2_massBalanceDuration").click({ force: true });
  await page
    .locator(
      `.ant-select-item-option[title*="${seedData.smokeData.facility.updated.months}"]`
    )
    .click();
  await page
    .locator("#facility2_productionStartDate")
    .fill(seedData.smokeData.facility.updated.productionDate);
  await page.keyboard.press("Enter");

  const updatedScope = page.locator("#facility2_certificationScopes");
  await updatedScope.click({ force: true });
  await updatedScope.press("Meta+A");
  await updatedScope.press("Backspace");
  await page.waitForTimeout(2000);
  for (const scopeName of seedData.smokeData.facility.updated.cerScope) {
    await updatedScope.pressSequentially(scopeName, { delay: 100 });
    await page.keyboard.press("Enter");
  }

  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });

  const updatedFacilityRow = page.locator(
    `tr:has-text("${seedData.smokeData.facility.updated.name}")`
  );
  await expect(updatedFacilityRow).toBeVisible();

  await expect(updatedFacilityRow.locator("td:nth-child(2)")).toHaveText(
    seedData.smokeData.facility.updated.address
  );
  await expect(updatedFacilityRow.locator("td:nth-child(3)")).toHaveText(
    seedData.smokeData.facility.updated.postcode
  );
  await expect(updatedFacilityRow.locator("td:nth-child(4)")).toHaveText(
    seedData.smokeData.facility.updated.city
  );
  await expect(updatedFacilityRow.locator("td:nth-child(5)")).toHaveText(
    seedData.smokeData.facility.updated.country
  );
  await expect(updatedFacilityRow.locator("td:nth-child(7)")).toHaveText(
    "15 Feb, 2024"
  );

  const facilityResponse = await request.get("/config/facilities?", {
    headers: {
      Cookie: cookie,
    },
  });
  const facilities = await facilityResponse.json();
  const facility = facilities.rows.find(
    (facility) => facility.name === seedData.smokeData.facility.updated.name
  );
  const facilityId = facility ? facility.ID : null;

  await request.delete(`/config/facilities/${facilityId}`, {
    headers: {
      Cookie: cookie,
    },
  });

  await page.reload();

  await expect(
    page.locator(`tr:has-text("${seedData.smokeData.facility.updated.name}")`)
  ).not.toBeVisible();
}

async function smokeCertificate(page, cookie, request) {
  await page.waitForLoadState("networkidle");

  await page.getByRole("menuitem", { name: "Configuration" }).hover();
  await page.getByRole("menuitem", { name: "Certificates" }).click();

  await createCertificate(
    page,
    seedData.smokeData.certificate.initial.cerScheme,
    seedData.smokeData.certificate.initial.cerBody,
    seedData.smokeData.certificate.initial.cerNo,
    seedData.smokeData.certificate.initial.cerBodyNo,
    seedData.smokeData.certificate.initial.dateOfIssue,
    seedData.smokeData.certificate.initial.placeOfIssue,
    seedData.smokeData.certificate.initial.dateOfOriginalIssue,
    seedData.smokeData.certificate.initial.startDate,
    seedData.smokeData.certificate.initial.endDate,
    seedData.smokeData.certificate.initial.cerStatus,
    seedData.smokeData.certificate.initial.cerScope,
    seedData.smokeData.certificate.initial.facility,
    seedData.smokeData.certificate.initial.docformCertificate
  );

  const certificateRow = page.locator(
    `tr:has-text("${seedData.smokeData.certificate.initial.cerNo}")`
  );
  await expect(certificateRow).toBeVisible();

  await certificateRow.getByText("Edit").click();
  await page.waitForTimeout(1000);

  await page.locator("#certform_scheme").click({ force: true });
  await page
    .locator(
      `.ant-select-item-option[title*="${seedData.smokeData.certificate.updated.cerScheme}"]`
    )
    .click();
  await page.locator("#certform_body").click({ force: true });
  await page
    .locator(
      `.ant-select-item-option[title*="${seedData.smokeData.certificate.updated.cerBody}"]`
    )
    .click();
  await page
    .locator("#certform_number")
    .fill(seedData.smokeData.certificate.updated.cerNo);
  await page
    .locator("#certform_bodyNumber")
    .fill(seedData.smokeData.certificate.updated.cerBodyNo);
  await page
    .locator("#certform_dateOfIssue")
    .fill(seedData.smokeData.certificate.updated.dateOfIssue);
  await page
    .locator("#certform_placeOfIssue")
    .fill(seedData.smokeData.certificate.updated.placeOfIssue);
  await page
    .locator("#certform_dateOfOriginalIssue")
    .fill(seedData.smokeData.certificate.updated.dateOfOriginalIssue);
  await page
    .locator("input[id^='certform_startDate']")
    .fill(seedData.smokeData.certificate.updated.startDate);
  await page
    .locator("#certform_endDate")
    .fill(seedData.smokeData.certificate.updated.endDate);
  await page.locator("#certform_status").click({ force: true });
  await page
    .locator(
      `.ant-select-item-option[title*="${seedData.smokeData.certificate.updated.cerStatus}"]`
    )
    .click();

  const updatedScope = await page.locator("#certform_certificationScope");
  await updatedScope.click({ force: true });
  await updatedScope.press("Meta+A");
  await updatedScope.press("Backspace");
  await page.waitForTimeout(2000);
  for (const scopeName of seedData.smokeData.certificate.updated.cerScope) {
    await updatedScope.pressSequentially(scopeName, { delay: 100 });
    await page.keyboard.press("Enter");
  }
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.waitForSelector(".ant-message-success", { state: "hidden" });

  const updatedCertificateRow = page.locator(
    `tr:has-text("${seedData.smokeData.certificate.updated.cerNo}")`
  );
  await expect(updatedCertificateRow).toBeVisible();

  await expect(updatedCertificateRow.locator("td:nth-child(2)")).toHaveText(
    "24 Aug 2024"
  );
  await expect(updatedCertificateRow.locator("td:nth-child(3)")).toHaveText(
    seedData.smokeData.certificate.updated.cerBody
  );
  await expect(updatedCertificateRow.locator("td:nth-child(4)")).toHaveText(
    "23 Aug 2024"
  );
  await expect(updatedCertificateRow.locator("td:nth-child(5)")).toHaveText(
    "22 Aug 2024"
  );
  await expect(updatedCertificateRow.locator("td:nth-child(6)")).toHaveText(
    "21 Aug 2024"
  );
  await expect(updatedCertificateRow.locator("td:nth-child(7)")).toHaveText(
    seedData.smokeData.certificate.updated.cerStatus
  );

  const certificateResponse = await request.get("/config/certificates?", {
    headers: {
      Cookie: cookie,
    },
  });
  const certificates = await certificateResponse.json();
  const certificate = certificates.rows.find(
    (cer) => cer.number === seedData.smokeData.certificate.updated.cerNo
  );
  const certificateId = certificate ? certificate.ID : null;

  await request.delete(`/config/certificates/${certificateId}`, {
    headers: {
      Cookie: cookie,
    },
  });

  await page.reload();

  await expect(
    page.locator(
      `tr:has-text("${seedData.smokeData.certificate.updated.cerNo}")`
    )
  ).not.toBeVisible();
}

async function smokeRecordType(page) {
  await page.waitForLoadState("networkidle");

  await page.goto("/datafwd");

  await page.getByText("Configurations").hover();
  await page.getByRole("link", { name: "Record Types" }).click();
  await expect(page.getByText("Record Types")).toBeVisible();

  await page.getByRole("button", { name: "Create new record type" }).click();
  const nameField = await page.getByPlaceholder("e.g. Purchase order");
  await nameField.fill(seedData.smokeData.recordType.initial.name);

  await page.getByRole("button", { name: "Create", exact: true }).click();
  await waitForAlert(page);

  const row = page.locator("tbody tr").filter({
    has: page.locator("td:first-child", {
      hasText: seedData.smokeData.recordType.initial.name,
      exact: true,
    }),
  });

  await expect(row).toBeVisible();
  await row.locator("button", { hasText: "Details" }).click();

  await expect(
    page.locator("h1", { hasText: seedData.smokeData.recordType.initial.name })
  ).toBeVisible();

  await page.getByRole("button", { name: "Edit Name" }).click();
  await page
    .getByRole("textbox")
    .fill(seedData.smokeData.recordType.updated.name);
  await page.getByRole("button", { name: "Save" }).click();
  await waitForAlert(page);
  await expect(
    page.locator("h1", { hasText: seedData.smokeData.recordType.updated.name })
  ).toBeVisible();

  for (const value of seedData.smokeData.recordType.initial.fieldValues) {
    await page.getByRole("button", { name: "Create new field" }).click();
    await page.getByRole("textbox").fill(value);
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await waitForAlert(page);
  }

  for (
    let i = 1;
    i <= seedData.smokeData.recordType.initial.fieldValues.length;
    i++
  ) {
    const row = page.locator(`tbody tr`).nth(i - 1);
    await expect(row).toBeVisible();
    await expect(row.locator("td:nth-child(1)")).toHaveText(`${i}`);
  }

  const search = page.getByRole("searchbox", {
    name: "search",
  });
  await search.fill("1");

  const filteredRow = page.locator(`tbody tr`).filter({
    has: page.locator("td:nth-child(1)", { hasText: "1" }),
  });
  await expect(filteredRow).toBeVisible();
  await expect(filteredRow.locator("td:nth-child(1)")).toHaveText("1");

  await search.fill("");

  await page
    .locator(`tbody tr`)
    .filter({ has: page.locator("td:nth-child(1)", { hasText: "1" }) })
    .locator('button:text("Remove")')
    .click();

  await expect(
    page.locator(`tbody tr`).filter({
      has: page.locator("td:nth-child(1)", { hasText: "1" }),
    })
  ).not.toBeVisible();

  await page.getByText("Configurations").hover();
  await page.getByRole("link", { name: "Record Types" }).click();

  await page
    .locator(`tbody tr`)
    .filter({
      has: page.locator("td", {
        hasText: seedData.smokeData.recordType.updated.name,
      }),
    })
    .locator('button:text("Delete")')
    .click();

  await page.getByRole("button", { name: "Confirm" }).click();
  await waitForAlert(page);

  await expect(
    page
      .locator(`tbody tr`)
      .filter({
        has: page.locator("td", {
          hasText: seedData.smokeData.recordType.updated.name,
        }),
      })
      .locator('button:text("Delete")')
  ).not.toBeVisible();
}

async function waitForAlert(page) {
  await expect(page.locator('div[role="alert"]')).toBeVisible();
  await page.waitForSelector('div[role="alert"]', { state: "hidden" });
}

async function waitForSpinner(page) {
  await page.locator("svg.animate-spin").waitFor({ state: "visible" });
  await page.locator("svg.animate-spin").waitFor({ state: "hidden" });
}

async function smokeCheck(page) {
  await page.waitForLoadState("networkidle");

  await page.goto("/datafwd");

  await page.getByText("Configurations").hover();
  await page.getByRole("link", { name: "Record Types" }).click();
  await expect(page.getByText("Record Types")).toBeVisible();

  await page.getByRole("button", { name: "Create new record type" }).click();
  const nameField = await page.getByPlaceholder("e.g. Purchase order");
  await nameField.fill(seedData.smokeData.recordType.initial.name);

  await page.getByRole("button", { name: "Create", exact: true }).click();
  await waitForAlert(page);

  const row = page.locator("tbody tr").filter({
    has: page.locator("td:first-child", {
      hasText: seedData.smokeData.recordType.initial.name,
      exact: true,
    }),
  });
  await expect(row).toBeVisible();

  await page.getByText("Configurations").hover();
  await page.getByRole("link", { name: "Checks" }).click();
  await expect(
    page.locator("div span").filter({ hasText: "Checks" })
  ).toBeVisible();

  await expect(
    page.locator(
      `tr:has(td span:text("${seedData.smokeData.recordType.initial.name}"))`
    )
  ).toBeVisible();
  await page
    .locator(
      `tr:has(td span:text("${seedData.smokeData.recordType.initial.name}")) span`
    )
    .click();

  await expect(
    page.getByText(`${seedData.smokeData.recordType.initial.name} - Checks`)
  ).toBeVisible();

  for (const rule of seedData.smokeData.validationRule.initial.rules) {
    await page.getByRole("button", { name: "Create new check" }).click();
    await page.getByRole("textbox").fill(rule);
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await waitForSpinner(page);
  }

  const search = page.getByRole("searchbox", {
    name: "search",
  });
  await search.first().fill(seedData.smokeData.validationRule.initial.rules[1]);

  await expect(
    page.locator(
      `tr:has(td:text("${seedData.smokeData.validationRule.initial.rules[1]}"))`
    )
  ).toBeVisible();
  await page
    .locator(
      `tr:has(td:text("${seedData.smokeData.validationRule.initial.rules[1]}"))`
    )
    .locator("button", { hasText: "Edit" })
    .click();

  await page
    .getByRole("textbox")
    .fill(seedData.smokeData.validationRule.updated.rule);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await waitForSpinner(page);
  await search.first().fill("");

  await page
    .locator(
      `tr:has(td:text("${seedData.smokeData.validationRule.updated.rule}"))`
    )
    .locator("button", { hasText: "Delete" })
    .click();

  await page.getByRole("button", { name: "Confirm" }).click();
  await waitForAlert(page);

  await expect(
    page.locator(
      `tr:has(td:text("${seedData.smokeData.validationRule.updated.rule}"))`
    )
  ).not.toBeVisible();

  await expect(
    page.getByText(
      `${seedData.smokeData.recordType.initial.name} - Multi Checks`
    )
  ).toBeVisible();

  for (const rule of seedData.smokeData.validationRule.initial.multiRules) {
    await page.getByRole("button", { name: "Create new multi check" }).click();
    await page.getByRole("textbox").fill(rule);
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await waitForSpinner(page);
  }

  await search.last().fill("supplier address");

  const tableRow = page.locator("tbody tr").last();

  const firstTd = tableRow.locator("td").first();
  await expect(firstTd).toHaveText(/supplier address/);
  await expect(firstTd).toHaveText(/Test/);
  await expect(firstTd).toHaveText(/Proof of Sustainability/);
  await expect(firstTd).toHaveText(/Purchase Order/);

  const secondTd = tableRow.locator("td").nth(1);
  await expect(secondTd).toHaveText(
    "Proof Of Sustainability, Purchase Order, Test"
  );
  await tableRow.locator("button", { hasText: "Edit" }).click();

  await page
    .getByRole("textbox")
    .fill(seedData.smokeData.validationRule.updated.multiRule);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await waitForSpinner(page);
  await expect(firstTd).toHaveText(/supplier address/);
  await expect(firstTd).toHaveText(/Test/);
  await expect(firstTd).toHaveText(/Purchase Order/);
  await expect(secondTd).toHaveText("Purchase Order, Test");
  await search.last().fill("");

  await tableRow.first().locator("button", { hasText: "Delete" }).click();

  await page.getByRole("button", { name: "Confirm" }).click();
  await waitForAlert(page);

  await expect(
    page.locator(
      `tr:has(td:text("${seedData.smokeData.validationRule.updated.multiRule}"))`
    )
  ).not.toBeVisible();

  await page.getByText("Configurations").hover();
  await page.getByRole("link", { name: "Record Types" }).click();

  await page
    .locator(`tr:has(td:text("${seedData.smokeData.recordType.initial.name}"))`)
    .locator('button:text("Delete")')
    .click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await waitForAlert(page);

  await expect(
    page
      .locator(`tbody tr`)
      .filter({
        has: page.locator("td", {
          hasText: seedData.smokeData.recordType.initial.name,
        }),
      })
      .locator('button:text("Delete")')
  ).not.toBeVisible();
}

async function smokeRecord(page) {
  await createRecord(
    page,
    seedData.smokeData.createRecord.BOL.source,
    seedData.smokeData.createRecord.BOL.docPathXls,
    seedData.smokeData.createRecord.BOL.recordType
  );

  const searchInput = page.locator('input[type="search"]');
  await applyFilter(
    page,
    "Bill Of Lading",
    "Bill of Lading Number",
    seedData.smokeData.record.initial.refName
  );
  await page.waitForSelector("tbody tr td:first-child");

  const firstCells = page.locator("tbody tr td:first-child");
  await firstCells.evaluateAll((cells, expectedText) => {
    for (const cell of cells) {
      if (!cell.textContent?.trim().includes(expectedText)) {
        throw new Error(
          `Cell does not contain expected text: "${expectedText}"`
        );
      }
    }
  }, seedData.smokeData.record.initial.refName);

  await page
    .getByText(seedData.smokeData.record.initial.refName)
    .first()
    .click();
  await page.getByRole("button", { name: "Edit" }).click();
  await page
    .locator('input[type="textArea"]')
    .first()
    .fill(seedData.smokeData.record.updated.refName);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator("div.mb-2 span")).toHaveText(
    seedData.smokeData.record.updated.refName
  );

  await verifyFileDownload(page, seedData.smokeData.record.updated.refName);

  await searchInput.first().fill("vessel");
  await expect(page.locator("text=Vessel:")).toBeVisible();
  await expect(page.locator("text=Issuance Date:")).not.toBeVisible();

  await searchInput.last().fill("MBLX123456");
  await page.getByRole("button", { name: "Link", exact: true }).first().click();

  const linkedRecordsSection = await page
    .locator("h2", { hasText: "Linked Records" })
    .locator("..")
    .locator("..");
  await expect(linkedRecordsSection.locator("text=1 results")).toBeVisible();
  await expect(linkedRecordsSection.locator("text=MBLX123456")).toBeVisible();

  await page.getByRole("button", { name: "Unlink", exact: true }).click();
  await expect(linkedRecordsSection.locator("text=0 results")).toBeVisible();

  await page.getByText("Delete Record").click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  const alertLocator = page.locator('div[role="alert"]');
  await expect(alertLocator).toBeVisible();
  await alertLocator.waitFor({ state: "hidden" });

  await applyFilter(
    page,
    "Bill Of Lading",
    "Bill of Lading Number",
    seedData.smokeData.record.updated.refName
  );
  await expect(page.locator("tbody")).toBeEmpty();

  await verifyFileDownload(page, "document_overview");
}

async function createRecord(page, source, docPath, recordType) {
  await page.waitForLoadState("networkidle");

  await page.goto("/datafwd");
  await page.getByRole("button", { name: "Create New Record" }).click();

  if (source === "UDB" || source === "ERP") {
    await page
      .getByRole("button", {
        name: `Fetch Transactions from ${source}`,
      })
      .click();
  } else if (source === "file") {
    await page.locator("#singleFileInput").setInputFiles(docPath);
    const uploadedFileName = docPath.split("/").pop();
    const fileNameElement = page.locator("div.px-4 > span:first-child");
    await expect(fileNameElement).toHaveText(uploadedFileName);
    await page.getByRole("button", { name: "Select Record Type" }).click();
    await page.getByRole("button", { name: recordType, exact: true }).click();
  } else {
    throw new Error(`Invalid source: ${source}`);
  }

  await waitForSpinner(page);
  await waitForAlert(page);

  const firstRow = page.locator("tbody tr:first-child");
  const expectedType =
    source === "UDB" || source === "ERP" ? "Transaction" : recordType;
  await expect(firstRow.locator("td:nth-child(2)")).toHaveText(expectedType);

  await expect(firstRow.locator("td:nth-child(3)")).toHaveText(/^[0-5]s ago$/);
  await expect(firstRow.locator("td:nth-child(4)")).toHaveText(/^[0-5]s ago$/);
}

async function smokeReference(page) {
  await page.waitForLoadState("networkidle");
  await page.goto("/datafwd");

  await page.getByText("Configurations").hover();
  await page.getByRole("link", { name: "References" }).click();

  await expect(
    page.locator("div span.font-bold", { hasText: "References" })
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Create new reference list", exact: true })
    .click();

  await page
    .getByPlaceholder("Add a new reference")
    .fill(seedData.smokeData.reference.refName);
  await page.getByRole("button", { name: "Add", exact: true }).click();

  const refLocator = page.locator("tbody tr:nth-child(1) td:nth-child(1)");

  await expect(refLocator).toHaveText(seedData.smokeData.reference.refName);
  await page
    .getByText(seedData.smokeData.reference.refName, { exact: true })
    .click();
  await page.getByRole("button", { name: "Edit Name" }).click();
  await page
    .getByRole("textbox")
    .fill(seedData.smokeData.reference.updatedName);
  await page.getByRole("button", { name: "Save" }).click();
  await waitForAlert(page);
  await expect(
    page.locator("h2", { hasText: seedData.smokeData.reference.updatedName })
  ).toBeVisible();

  await page.getByRole("button", { name: "Configure", exact: true }).click();
  await page
    .getByPlaceholder("Enter new schema name")
    .fill(seedData.smokeData.reference.schema);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const colElement = await page.locator("div > ul");
  await expect(colElement).not.toBeEmpty();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await waitForAlert(page);

  await expect(
    page.locator("thead th", {
      hasText: seedData.smokeData.reference.schema,
      exact: true,
    })
  ).toBeVisible();
  await expect(page.locator("tbody")).toBeEmpty();

  await page
    .locator("#singleFileInput")
    .setInputFiles(seedData.smokeData.reference.filePath);
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.locator("tbody")).not.toBeEmpty();

  await verifyFileDownload(page, "Test");

  await page.getByRole("button", { name: "Configure", exact: true }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(colElement).toBeEmpty();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await waitForAlert(page);
  await expect(page.locator("thead th")).not.toBeVisible();

  await page.getByText("Configurations").hover();
  await page.getByRole("link", { name: "References" }).click();

  await verifyFileDownload(page, "Test");
  const ref = await page.locator("tr", {
    hasText: seedData.smokeData.reference.updatedName,
    exact: true,
  });
  await ref.getByRole("button", { name: "Delete" }).click();
  await expect(ref).not.toBeVisible();
}

async function createReference(page, refName, schemas, file) {
  await page.waitForLoadState("networkidle");
  await page.goto("/datafwd");

  await page.getByText("Configurations").hover();
  await page.getByRole("link", { name: "References" }).click();

  await expect(
    page.locator("div span.font-bold", { hasText: "References" })
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Create new reference list", exact: true })
    .click();

  await page.getByPlaceholder("Add a new reference").fill(refName);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByText(refName, { exact: true }).click();

  await page.getByRole("button", { name: "Configure", exact: true }).click();

  for (const schema of schemas) {
    await page.getByPlaceholder("Enter new schema name").fill(schema);
    await page.getByRole("button", { name: "Add", exact: true }).click();
  }
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await waitForAlert(page);

  await page.locator("#singleFileInput").setInputFiles(file);
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
}

async function verifyFileDownload(page, refName) {
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: /Export|Download & Update/ })
    .first()
    .click();
  const download = await downloadPromise;

  const savePath = `files/${download.suggestedFilename()}`;
  await download.saveAs(savePath);

  const filePath = download.path();
  expect(filePath).toBeDefined();

  const expectedFileName = `${refName}.xlsx`;
  const fileName = savePath.split("/").pop();
  expect(fileName).toBe(expectedFileName);

  const fileSize = (await fs.promises.stat(savePath)).size;
  expect(fileSize).toBeGreaterThan(0);

  await fs.promises.unlink(savePath);
}

async function applyFilter(page, recordType, fieldName, fieldValue) {
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Apply filters" }).click();

  if (recordType) {
    await page
      .getByPlaceholder("Select Record Type")
      .pressSequentially(recordType, { delay: 150 });

    const listItems = await page.locator("div ul li a").allTextContents();
    expect(listItems.length).toBeGreaterThanOrEqual(1);
    expect(listItems.length).toBeLessThanOrEqual(2);
    expect(listItems).toContain(recordType);

    await page.getByRole("button", { name: recordType, exact: true }).click();
    await expect(page.locator('input[type="text"]').first()).toHaveAttribute(
      "placeholder",
      recordType
    );
  }

  if (fieldName) {
    await page
      .getByPlaceholder("Select Field")
      .pressSequentially(fieldName, { delay: 150 });

    const fieldItems = await page.locator("div ul li a").allTextContents();
    expect(fieldItems.length).toBeGreaterThanOrEqual(1);
    expect(fieldItems.length).toBeLessThanOrEqual(2);
    expect(fieldItems).toContain(fieldName);

    await page.getByRole("button", { name: fieldName, exact: true }).click();
    await expect(page.locator('input[type="text"]').nth(1)).toHaveAttribute(
      "placeholder",
      fieldName
    );
  }

  if (fieldValue) {
    await page
      .getByPlaceholder("Enter value")
      .pressSequentially(fieldValue, { delay: 150 });
  }

  await page.getByRole("button", { name: "Apply", exact: true }).click();
}

module.exports = {
  login,
  loginWithAPI,
  register,
  registerWithAPI,
  logout,
  createProduct,
  createProductAPI,
  createFacility,
  createCertificateScope,
  createDocType,
  createDocTypeAPI,
  createAttributeAPI,
  createIdentifierAPI,
  createCertificationScopeAPI,
  createFacilityAPI,
  createCertificateAPI,
  addOcrId,
  cloneEvent,
  assignRoles,
  idGen,
  createOrganization,
  createCertificate,
  assignUser,
  selectItem,
  fillAttributeForm,
  fillIdentifierForm,
  toggleAllSwitches,
  assignIdentifier,
  createPartner,
  addPartner,
  createPassport,
  goToFirstPassport,
  oilExtraction,
  hvoProduction,
  rmeProduction,
  ucomeProduction,
  splitPassport,
  productLoss,
  blend,
  initiateSale,
  createDocumentRules,
  smokeProduct,
  smokeDocType,
  smokeAttribute,
  smokeIdentifier,
  smokeEvent,
  smokeCertificationScope,
  smokePartner,
  smokeFacility,
  smokeCertificate,
  smokeRecordType,
  smokeCheck,
  smokeRecord,
  smokeReference,
  createRecord,
  createReference,
  verifyFileDownload,
};
