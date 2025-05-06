interface TaskWeight {
  cpu: number;
  memory: number;
  network?: boolean;
}

interface ClearancePolicy {
  minApprovals: number;
  requiredChecks?: string[];
}

export interface BuildSystemConfig {
  dagRules: {
    allowCycles: boolean;
    maxDepth?: number;
  };
  taskWeights: Record<string, TaskWeight>;
  clearancePolicies: Record<string, ClearancePolicy>;
}

const config: BuildSystemConfig = {
  dagRules: {
    allowCycles: false,
    maxDepth: 20,
  },
  taskWeights: {
    default: { cpu: 1, memory: 256 },
    codeScan: { cpu: 2, memory: 512 },
    deploy: { cpu: 1, memory: 128, network: true },
  },
  clearancePolicies: {
    productionDeploy: {
      minApprovals: 1,
      requiredChecks: ["securityScan", "allUnitTestsPassed"],
    },
  },
};

export default config;
