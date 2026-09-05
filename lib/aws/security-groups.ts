import {
  DescribeSecurityGroupsCommand,
  EC2Client,
} from "@aws-sdk/client-ec2";
import { awsConfig } from "./config";

const ec2 = new EC2Client(awsConfig);

export async function getSecurityGroups() {
  const response = await ec2.send(
    new DescribeSecurityGroupsCommand({})
  );

  return response.SecurityGroups ?? [];
}
