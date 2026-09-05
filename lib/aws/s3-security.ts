import {
  GetPublicAccessBlockCommand,
  GetBucketEncryptionCommand,
  GetBucketPolicyStatusCommand,
  GetBucketVersioningCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { awsConfig } from "./config";

const s3 = new S3Client(awsConfig);

export async function analyzeS3Bucket(bucketName: string) {
  const result = {
    bucket: bucketName,
    publicAccessBlocked: false,
    encrypted: false,
    versioningEnabled: false,
    publicPolicy: false,
  };

  try {
    const response = await s3.send(
      new GetPublicAccessBlockCommand({
        Bucket: bucketName,
      })
    );

    result.publicAccessBlocked =
      response.PublicAccessBlockConfiguration?.BlockPublicAcls === true &&
      response.PublicAccessBlockConfiguration?.IgnorePublicAcls === true &&
      response.PublicAccessBlockConfiguration?.BlockPublicPolicy === true &&
      response.PublicAccessBlockConfiguration?.RestrictPublicBuckets === true;
  } catch {}

  try {
    await s3.send(
      new GetBucketEncryptionCommand({
        Bucket: bucketName,
      })
    );

    result.encrypted = true;
  } catch {}

  try {
    const response = await s3.send(
      new GetBucketVersioningCommand({
        Bucket: bucketName,
      })
    );

    result.versioningEnabled =
      response.Status === "Enabled";
  } catch {}

  try {
    const response = await s3.send(
      new GetBucketPolicyStatusCommand({
        Bucket: bucketName,
      })
    );

    result.publicPolicy =
      response.PolicyStatus?.IsPublic === true;
  } catch {}

  return result;
}
