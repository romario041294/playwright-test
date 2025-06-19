import { test } from "@playwright/test";
import seedData from "../../seedData.js";
const {
  login,
  loginWithAPI,
  logout,
  smokeRecordType,
  smokeCheck,
  smokeRecord,
  createRecord,
  smokeReference,
  createReference,
} = require("../../utils/WebUtils");
let context, page;

test.describe("Smoke Tests for Record Types, Validation Rules, and Record Creation Flow.", () => {
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

  test("Smoke Record Type", async () => {
    await smokeRecordType(page);
  });

  test("Smoke Check", async () => {
    await smokeCheck(page);
  });

  test("Smoke Record", async () => {
    await smokeRecord(page);
  });

  test("Smoke Reference", async () => {
    await smokeReference(page);
  });

  test("Create Record for PoS", async () => {
    await createRecord(
      page,
      seedData.smokeData.createRecord.PoS.source,
      seedData.smokeData.createRecord.PoS.docPath,
      seedData.smokeData.createRecord.PoS.recordType
    );
  });

  test("Create Record for PoS - BioGas", async () => {
    await createRecord(
      page,
      seedData.smokeData.createRecord.PoSBioGas.source,
      seedData.smokeData.createRecord.PoSBioGas.docPath,
      seedData.smokeData.createRecord.PoSBioGas.recordType
    );
  });

  test("Create Record for SD", async () => {
    await createRecord(
      page,
      seedData.smokeData.createRecord.SD.source,
      seedData.smokeData.createRecord.SD.docPath,
      seedData.smokeData.createRecord.SD.recordType
    );
  });

  test.skip("Create Record for UDB", async () => {
    await createRecord(
      page,
      seedData.smokeData.createRecord.UDB.source,
      "",
      ""
    );
  });

  test.skip("Create Record for ERP", async () => {
    await createRecord(
      page,
      seedData.smokeData.createRecord.ERP.source,
      "",
      ""
    );
  });

  test("Create Record for Bill of Lading - PDF", async () => {
    await createRecord(
      page,
      seedData.smokeData.createRecord.BOL.source,
      seedData.smokeData.createRecord.BOL.docPath,
      seedData.smokeData.createRecord.BOL.recordType
    );
  });

  test("Create Record for Bill of Lading - XLS", async () => {
    await createRecord(
      page,
      seedData.smokeData.createRecord.BOL.source,
      seedData.smokeData.createRecord.BOL.docPathXls,
      seedData.smokeData.createRecord.BOL.recordType
    );
  });

  test("Create Reference for Suppliers", async () => {
    await createReference(
      page,
      seedData.smokeData.createReference.refName,
      seedData.smokeData.createReference.schema,
      seedData.smokeData.createReference.filePath
    );
  });
});
