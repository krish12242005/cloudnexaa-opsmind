import { DescribeDBInstancesCommand, RDSClient } from "@aws-sdk/client-rds";
import { awsConfig } from "./config";

const rds = new RDSClient(awsConfig);

export async function getRDSInstances() {
  const response = await rds.send(
    new DescribeDBInstancesCommand({})
  );

  return response.DBInstances ?? [];
}
