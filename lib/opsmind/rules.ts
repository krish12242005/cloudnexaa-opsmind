export type FindingSeverity = "critical" | "warning" | "info" | "healthy";

export type OpsMindFinding = {
  id: string;
  severity: FindingSeverity;
  service: string;
  title: string;
  description: string;
  recommendation: string;
};

type AwsOverview = {
  region: string;
  resources: {
    ec2: {
      count: number;
      instances: any[];
    };
    s3: {
      count: number;
      buckets: any[];
    };
    rds: {
      count: number;
      instances: any[];
    };
    eks: {
      count: number;
      clusters: any[];
    };
  };
};

export function analyzeInfrastructure(
  data: AwsOverview
): OpsMindFinding[] {
  const findings: OpsMindFinding[] = [];

  const ec2Instances = data.resources.ec2.instances ?? [];
  const s3Buckets = data.resources.s3.buckets ?? [];
  const rdsInstances = data.resources.rds.instances ?? [];
  const eksClusters = data.resources.eks.clusters ?? [];

  const runningEC2 = ec2Instances.filter(
    (instance) => instance.State?.Name === "running"
  );

  const stoppedEC2 = ec2Instances.filter(
    (instance) => instance.State?.Name === "stopped"
  );

  // --------------------------------------------------
  // EC2 ANALYSIS
  // --------------------------------------------------

  if (stoppedEC2.length > 0) {
    findings.push({
      id: "EC2-001",
      severity: "warning",
      service: "EC2",
      title: `${stoppedEC2.length} stopped EC2 instance${
        stoppedEC2.length > 1 ? "s" : ""
      } detected`,
      description:
        "OpsMind found EC2 instances that are currently stopped.",
      recommendation:
        "Review stopped instances and terminate unused resources. EBS volumes attached to stopped instances may continue generating storage costs.",
    });
  }

  if (runningEC2.length === 0 && ec2Instances.length > 0) {
    findings.push({
      id: "EC2-002",
      severity: "critical",
      service: "EC2",
      title: "No running EC2 instances",
      description:
        "EC2 instances exist in the selected region, but none are currently running.",
      recommendation:
        "Verify whether the workload is intentionally offline. If not, investigate instance health and application availability.",
    });
  }

  if (runningEC2.length > 0) {
    findings.push({
      id: "EC2-003",
      severity: "healthy",
      service: "EC2",
      title: `${runningEC2.length} EC2 instance${
        runningEC2.length > 1 ? "s" : ""
      } running`,
      description:
        "OpsMind detected active EC2 compute capacity in the selected region.",
      recommendation:
        "Continue monitoring CPU utilization, memory, network activity and instance health.",
    });
  }

  if (ec2Instances.length === 0) {
    findings.push({
      id: "EC2-004",
      severity: "critical",
      service: "EC2",
      title: "No EC2 instances detected",
      description:
        "OpsMind did not find any EC2 instances in the selected region.",
      recommendation:
        "Verify the AWS region and account. If EC2 workloads are expected, investigate why compute resources are unavailable.",
    });
  }

  // --------------------------------------------------
  // S3 ANALYSIS
  // --------------------------------------------------

  if (s3Buckets.length === 0) {
    findings.push({
      id: "S3-001",
      severity: "info",
      service: "S3",
      title: "No S3 buckets detected",
      description:
        "OpsMind did not find any S3 buckets in the connected AWS environment.",
      recommendation:
        "No action required unless the workload is expected to use object storage.",
    });
  } else {
    findings.push({
      id: "S3-002",
      severity: "healthy",
      service: "S3",
      title: `${s3Buckets.length} S3 bucket${
        s3Buckets.length > 1 ? "s" : ""
      } detected`,
      description:
        "S3 resources are visible to OpsMind.",
      recommendation:
        "Continue monitoring encryption, bucket policies, public access settings, lifecycle rules and access logging.",
    });
  }

  // --------------------------------------------------
  // RDS ANALYSIS
  // --------------------------------------------------

  if (rdsInstances.length === 0) {
    findings.push({
      id: "RDS-001",
      severity: "info",
      service: "RDS",
      title: "No RDS databases detected",
      description:
        "No RDS database instances were discovered in the selected region.",
      recommendation:
        "No action required unless the application requires a managed relational database.",
    });
  } else {
    findings.push({
      id: "RDS-002",
      severity: "healthy",
      service: "RDS",
      title: `${rdsInstances.length} RDS instance${
        rdsInstances.length > 1 ? "s" : ""
      } detected`,
      description:
        "RDS database infrastructure is available.",
      recommendation:
        "Continue monitoring database availability, storage, connections, backups and performance.",
    });
  }

  // --------------------------------------------------
  // EKS ANALYSIS
  // --------------------------------------------------

  if (eksClusters.length === 0) {
    findings.push({
      id: "EKS-001",
      severity: "info",
      service: "EKS",
      title: "No EKS clusters detected",
      description:
        "No Amazon EKS clusters were discovered in the selected region.",
      recommendation:
        "No action required unless Kubernetes workloads are expected.",
    });
  } else {
    findings.push({
      id: "EKS-002",
      severity: "healthy",
      service: "EKS",
      title: `${eksClusters.length} EKS cluster${
        eksClusters.length > 1 ? "s" : ""
      } detected`,
      description:
        "Kubernetes infrastructure is visible to OpsMind.",
      recommendation:
        "Continue monitoring cluster health, node utilization, pod availability and control-plane status.",
    });
  }

  // --------------------------------------------------
  // INFRASTRUCTURE INVENTORY
  // --------------------------------------------------

  const totalResources =
    ec2Instances.length +
    s3Buckets.length +
    rdsInstances.length +
    eksClusters.length;

  if (totalResources === 0) {
    findings.push({
      id: "INFRA-001",
      severity: "critical",
      service: "Infrastructure",
      title: "AWS environment appears empty",
      description:
        "OpsMind did not detect EC2, S3, RDS or EKS resources in the selected region.",
      recommendation:
        "Verify the AWS account, credentials and region before taking any remediation action.",
    });
  } else {
    findings.push({
      id: "INFRA-002",
      severity: "healthy",
      service: "Infrastructure",
      title: `${totalResources} AWS resource${
        totalResources > 1 ? "s" : ""
      } discovered`,
      description:
        `OpsMind successfully inspected the connected AWS environment in ${data.region}.`,
      recommendation:
        "Continue monitoring infrastructure health and review critical or warning findings regularly.",
    });
  }

  // --------------------------------------------------
  // REGION VALIDATION
  // --------------------------------------------------

  if (!data.region) {
    findings.push({
      id: "INFRA-003",
      severity: "warning",
      service: "Infrastructure",
      title: "AWS region is not configured",
      description:
        "OpsMind could not determine the active AWS region.",
      recommendation:
        "Configure AWS_REGION explicitly and verify that resource discovery is targeting the intended region.",
    });
  }

  return findings;
}
