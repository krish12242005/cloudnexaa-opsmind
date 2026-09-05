import {
  DescribeInstancesCommand,
  EC2Client,
  Instance,
} from "@aws-sdk/client-ec2";

import { awsConfig } from "./config";

const ec2 = new EC2Client(awsConfig);

export type NormalizedEC2Instance = Instance & {
  state: string;
};

export async function getEC2Instances(): Promise<NormalizedEC2Instance[]> {
  const response = await ec2.send(
    new DescribeInstancesCommand({})
  );

  const instances =
    response.Reservations?.flatMap(
      (reservation) => reservation.Instances ?? []
    ) ?? [];

  return instances.map((instance) => {
    const { State: _awsState, ...instanceWithoutState } = instance;

    return {
      ...instanceWithoutState,
      state: instance.State?.Name ?? "unknown",
    };
  });
}
