export const DEMO_AWS_DATA = {
  environment: {
    mode: "demo",
    name: "Cloudnexaa Demo Environment",
    region: "ap-south-1",
    status: "healthy",
  },

  ec2: {
    count: 9,
    instances: [
      {
        instanceId: "i-demo-web-01",
        name: "web-server-01",
        state: "running",
        instanceType: "t3.micro",
        availabilityZone: "ap-south-1a",
        health: "healthy",
      },
      {
        instanceId: "i-demo-web-02",
        name: "web-server-02",
        state: "running",
        instanceType: "t3.micro",
        availabilityZone: "ap-south-1b",
        health: "healthy",
      },
      {
        instanceId: "i-demo-api-01",
        name: "api-server-01",
        state: "running",
        instanceType: "t3.small",
        availabilityZone: "ap-south-1a",
        health: "warning",
      },
    ],
  },

  s3: {
    count: 6,
    buckets: [
      {
        name: "cloudnexaa-demo-assets",
        region: "ap-south-1",
        status: "healthy",
        publicAccess: "blocked",
      },
      {
        name: "cloudnexaa-demo-backups",
        region: "ap-south-1",
        status: "healthy",
        publicAccess: "blocked",
      },
    ],
  },

  rds: {
    count: 3,
    databases: [
      {
        identifier: "cloudnexaa-demo-db",
        engine: "postgres",
        status: "available",
        health: "healthy",
      },
      {
        identifier: "cloudnexaa-prod-replica",
        engine: "postgres",
        status: "available",
        health: "warning",
      },
    ],
  },

  eks: {
    count: 2,
    clusters: [
      {
        name: "cloudnexaa-demo-eks",
        status: "ACTIVE",
        version: "1.33",
        health: "healthy",
      },
      {
        name: "cloudnexaa-staging-eks",
        status: "ACTIVE",
        version: "1.33",
        health: "healthy",
      },
    ],
  },

  findings: [
    {
      id: "demo-finding-001",
      severity: "critical",
      category: "security",
      title: "Public SSH access detected",
      resource: "sg-demo-web",
      status: "open",
    },
    {
      id: "demo-finding-002",
      severity: "warning",
      category: "cost",
      title: "Underutilized EC2 instance",
      resource: "i-demo-api-01",
      status: "open",
    },
    {
      id: "demo-finding-003",
      severity: "warning",
      category: "storage",
      title: "Bucket versioning disabled",
      resource: "cloudnexaa-demo-assets",
      status: "open",
    },
  ],

  cost: {
    currentMonthSpend: 184.72,
    projectedMonthSpend: 221.45,
    currency: "USD",
  },

  opsmind: {
    score: 87,
    status: "healthy",
    recommendations: [
      "Restrict public SSH access to approved source ranges.",
      "Review underutilized EC2 capacity.",
      "Enable S3 versioning for important assets.",
    ],
  },
} as const;
