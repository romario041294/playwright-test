import { test } from "@playwright/test";
import seedData from "../../seedData.js";
const {
  createFacility,
  createFacilityAPI,
  createCertificateAPI,
  assignUser,
  assignRoles,
  cloneEvent,
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
    process.env[process.env.SOURCE === "outlook" ? "ORG_ADMIN2" : "ORGADM2"];

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

test("Linked an Existing user to Org-2", async () => {
  await page.waitForLoadState("networkidle");
  for (const user of seedData.organizationLevel.organization2.users) {
    await assignUser(page, user.userEmail);
  }
});

test("Create Org-2 Facilities", async ({ request }) => {
  for (const facility of seedData.organizationLevel.organization2.facilities) {
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
        facility.scope
      );
    }
  }
});

test("Create Org-2 Certificates", async ({ request }) => {
  for (const certificate of seedData.organizationLevel.organization2
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

test("Cloning Template Events in Org-2", async () => {
  await page.waitForLoadState("networkidle");

  await page.getByRole("menuitem", { name: "Configuration" }).hover();
  await page.getByRole("menuitem", { name: "Events" }).click();

  for (const event of seedData.organizationLevel.organization2.clonedEvents) {
    await cloneEvent(page, event);
    await page.waitForTimeout(3000); // Keep the delay between events
  }
});

test("Assigning Event Roles to Org-2 Users", async () => {
  await page.waitForLoadState("networkidle");

  await page.getByRole("menuitem", { name: "Administration" }).hover();
  await page.getByRole("menuitem", { name: "Users" }).click();

  for (const user of seedData.organizationLevel.organization2.roles) {
    await assignRoles(page, user.email, user.roles);
    await page.waitForTimeout(3000);
  }
});

test("Create Preferred Partners for org-2", async () => {
  await page.waitForLoadState("networkidle");

  await page.getByRole("menuitem", { name: "Configuration" }).hover();
  await page.getByRole("menuitem", { name: "Partners" }).click();

  for (const partner of seedData.organizationLevel.organization2
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
