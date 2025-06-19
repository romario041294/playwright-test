import { test } from "@playwright/test";
const { register, registerWithAPI } = require("../../utils/WebUtils");
import seedData from "../../seedData.js";

const mongo = require("mongodb");

const assignPlatformAdminRole = async (envVar) => {
  const db = new mongo.MongoClient(process.env.mongoDB);
  await db.connect();

  const authService = db.db("auth-service");

  const platformAdminRole = await authService
    .collection("roles")
    .findOne({ name: "platform-admin" });
  if (!platformAdminRole) throw new Error("No platform admin role");

  const adminUser = await authService
    .collection("users")
    .findOne({ email: process.env[envVar] });
  if (!adminUser) throw new Error("No platorm admin user");

  let hasPlatformAdminRole = false;
  adminUser.roles.forEach((role) => {
    if (role.toString() === platformAdminRole._id.toString())
      hasPlatformAdminRole = true;
  });

  if (!hasPlatformAdminRole) {
    await authService
      .collection("users")
      .updateOne(
        { email: process.env[envVar] },
        { $push: { roles: platformAdminRole._id } }
      );
  }

  await db.close();
};

test("Register users on the platform", async ({ browser }) => {
  for (const user of seedData.platformLevel.users) {
    const context = await browser.newContext();
    const page = await context.newPage();
    if (process.env.SOURCE === "outlook") {
      const outlookPage = await context.newPage();
      await register(
        context,
        page,
        outlookPage,
        user.fname,
        user.lname,
        user.envVar
      );
    } else {
      await registerWithAPI(context, page, user.fname, user.lname, user.envVar);
    }
  }
});

test("Assign platform admin role", async () => {
  await assignPlatformAdminRole(seedData.platformLevel.users[0].envVar);
});
