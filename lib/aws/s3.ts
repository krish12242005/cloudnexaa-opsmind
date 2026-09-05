import { ListBucketsCommand, S3Client } from "@aws-sdk/client-s3";
import { awsConfig } from "./config";

const s3 = new S3Client(awsConfig);

export async function getS3Buckets() {
  const response = await s3.send(
    new ListBucketsCommand({})
  );

  return response.Buckets ?? [];
}
