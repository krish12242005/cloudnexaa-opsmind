import { DescribeClusterCommand, EKSClient, ListClustersCommand } from "@aws-sdk/client-eks";
import { awsConfig } from "./config";

const eks = new EKSClient(awsConfig);

export async function getEKSClusters() {
  const response = await eks.send(
    new ListClustersCommand({})
  );

  const clusterNames = response.clusters ?? [];

  const clusters = await Promise.all(
    clusterNames.map(async (name) => {
      const result = await eks.send(
        new DescribeClusterCommand({ name })
      );

      return result.cluster;
    })
  );

  return clusters.filter(Boolean);
}
