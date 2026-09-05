import {
  IAMClient,
  ListUsersCommand,
  ListRolesCommand,
} from "@aws-sdk/client-iam";

const iam = new IAMClient({
  region: process.env.AWS_REGION || "ap-south-1",
});

export async function getIAMUsers() {
  const response = await iam.send(
    new ListUsersCommand({})
  );

  return response.Users ?? [];
}

export async function getIAMRoles() {
  const response = await iam.send(
    new ListRolesCommand({})
  );

  return response.Roles ?? [];
}
