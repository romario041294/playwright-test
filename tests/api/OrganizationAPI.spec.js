import { test, expect } from "@playwright/test";
const { login, loginWithAPI } = require("../../utils/WebUtils");
let orgId, userId, cookieString;

test.beforeAll(async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

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

  const userRes = await context.request.post("/auth/verifyrequest", {
    headers: {
      Cookie: cookieString,
      "x-service-name": "auth-service",
      "x-original-url": "/auth/auth/walletinfo",
      "x-http-method": "post",
    },
  });
  const responseBody = await userRes.json();

  userId = responseBody.userId;
  orgId = responseBody.orgId;

  await context.close();
});

test("Validating Org-Users and their Roles", async ({ request }) => {
  const userResponse = await request.get("/auth/user/", {
    headers: {
      Cookie: cookieString,
    },
  });
  const userData = await userResponse.json();
  const userList = userData.userList;

  for (const user of userList) {
    // Checking whether the user is part of the organization using orgId.
    expect(user.org._id).toBe(orgId);
  }

  const orgAdmin = userList.find((user) =>
    user.roles.some((role) => role.name === "org-admin")
  ); // Checking whether the Org Admin has appropriate roles and if the roles are from the organization using orgId.
  expect(orgAdmin).toBeTruthy();
  const orgAdminRoles = orgAdmin.roles.map((role) => {
    const roleParts = role.name.split("_");
    if (roleParts.length > 1 && roleParts[0] === orgId) {
      const extractedOrgId = roleParts[0];
      expect(extractedOrgId).toBe(orgId);
      return roleParts[1];
    } else {
      return role.name;
    }
  });
  expect(orgAdminRoles).toContain(...["default-user", "org-admin"]);
  expect(orgAdminRoles).not.toContain("platform-admin");

  const orgUser = userList.find((user) =>
    user.roles.some((role) => role.name === "org-user")
  ); // Checking whether the Org User has appropriate roles and if the roles are from the organization using orgId.
  expect(orgUser).toBeTruthy();
  const orgUserRoles = orgUser.roles.map((role) => {
    const roleParts = role.name.split("_");
    if (roleParts.length > 1 && roleParts[0] === orgId) {
      const extractedOrgId = roleParts[0];
      expect(extractedOrgId).toBe(orgId);
      return roleParts[1];
    } else {
      return role.name;
    }
  });
  expect(orgUserRoles).toContain(...["default-user", "org-user"]);
  expect(orgUserRoles).not.toContain(...["org-admin", "platform-admin"]);
});

test("Validating Facility", async ({ request }) => {
  const facilityResponse = await request.get("/config/facilities?", {
    headers: {
      Cookie: cookieString,
    },
  });
  const facilityData = await facilityResponse.json();
  for (const facility of facilityData.rows) {
    const actualOrgId = facility.organizationId;
    expect(actualOrgId).toBe(orgId);
  }
});

test("Validating Products", async ({ request }) => {
  const facilityResponse = await request.get("/config/products/pagination?", {
    headers: {
      Cookie: cookieString,
    },
  });
  const productData = await facilityResponse.json();
  for (const row of productData.rows) {
    expect(
      row.organizationId === "" || row.organizationId === orgId
    ).toBeTruthy();
  }
});

test("Validating Document Types", async ({ request }) => {
  const docTypeResponse = await request.get("/vault/doctype/", {
    headers: {
      Cookie: cookieString,
    },
  });
  const docTypeData = await docTypeResponse.json();
  for (const docType of docTypeData) {
    expect(
      docType.organizationId === null || docType.organizationId === orgId
    ).toBeTruthy();
  }
});

test("Validating Attributes", async ({ request }) => {
  const attributeResponse = await request.get("/config/attributes/", {
    headers: {
      Cookie: cookieString,
    },
  });
  const attributeData = await attributeResponse.json();
  for (const attribute of attributeData) {
    expect(
      attribute.organizationId === "" || attribute.organizationId === orgId
    ).toBeTruthy();
  }
});

test("Validating Identifiers", async ({ request }) => {
  const identifierResponse = await request.get("/config/identifiers/", {
    headers: {
      Cookie: cookieString,
    },
  });
  const identifierData = await identifierResponse.json();
  for (const identifier of identifierData) {
    expect(
      identifier.organizationId === "" || identifier.organizationId === orgId
    ).toBeTruthy();
  }
});

test("Validating Composed Events", async ({ request }) => {
  const facilityResponse = await request.get(
    `/config/composed-events/pagination?organizationId=${orgId}`,
    {
      headers: {
        Cookie: cookieString,
      },
    }
  );
  const composedEventData = await facilityResponse.json();
  for (const row of composedEventData.rows) {
    expect(row.organizationId).toBe(orgId);
    expect(row.creator).toBe(userId);
  }
});

test.skip("Delete Facilities", async ({ request }) => {
  const facilityIds = [18, 19, 20, 21];
  const deletePromises = facilityIds.map((id) =>
    request.delete(`/config/facilities/${id}`, {
      headers: {
        Cookie: cookieString,
      },
    })
  );
  await Promise.all(deletePromises);
});

test.skip("Delete Certificates", async ({ request }) => {
  const certificateIds = [14, 15, 16];
  const deletePromises = certificateIds.map((id) =>
    request.delete(`/config/certificates/${id}`, {
      headers: {
        Cookie: cookieString,
      },
    })
  );
  await Promise.all(deletePromises);
});

test.skip("Delete Assets", async ({ request }) => {
  const assetIds = [1, 2];
  const deletePromises = assetIds.map((id) =>
    request.delete(`/ps/asset/${id}`, {
      headers: {
        Cookie: cookieString,
      },
    })
  );
  await Promise.all(deletePromises);
});
