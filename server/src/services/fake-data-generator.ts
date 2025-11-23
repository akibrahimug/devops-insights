/**
 * Fake Data Generator for DevOps Metrics
 * Generates realistic fake data to replace external API calls
 *
 * Performance optimizations:
 * - Pre-computed static data and worker configurations
 * - Object pooling for reusable data structures
 * - Reduced random number generation calls
 * - Cached region-specific deterministic values
 */

interface MockMetricsData {
  status: string;
  server_issue?: string | null;
  strict: boolean;
  version: string;
  roles: string[];
  results: {
    stats: {
      online: number;
      servers_count: number;
      session: number;
      server: {
        cpus: number;
        active_connections: number;
        wait_time: number;
        workers: Array<{
          id: string;
          pid: number;
          status: 'active' | 'busy' | 'overloaded';
          cpu_usage: number;
          memory_mb: number;
          uptime_hours: number;
          requests_handled: number;
          last_activity: string;
          core_affinity: number;
        }>;
        cpu_load: number;
        timers: number;
        worker_count: number;
        avg_worker_load: number;
        overloaded_workers: number;
        active_workers: number;
        total_worker_memory: number;
      };
    };
    services: {
      redis: boolean;
      database: boolean;
    };
    performance: {
      response_times: {
        p50: number;
        p95: number;
        p99: number;
      };
      error_rate: number;
      requests_per_second: number;
      uptime_percent: number;
    };
    deployment: {
      last_deployment: string;
      build_status: 'success' | 'failed' | 'pending';
      version_number: string;
      rollback_ready: boolean;
      failed_deployments_last_week: number;
      deployment_duration_minutes: number;
      last_rollback: string | null;
    };
    memory: {
      usage_percent: number;
      available_mb: number;
      total_mb: number;
      swap_usage_percent: number;
    };
    storage: {
      disk_usage_percent: number;
      io_wait_percent: number;
      read_ops_per_sec: number;
      write_ops_per_sec: number;
    };
    network: {
      bytes_in_per_sec: number;
      bytes_out_per_sec: number;
      packets_dropped: number;
      latency_ms: number;
    };
    alerts: {
      critical_alerts: number;
      warning_alerts: number;
      info_alerts: number;
    };
    security: {
      threat_level: 'low' | 'medium' | 'high';
      vulnerability_score: number;
      failed_auth_attempts: number;
      firewall_blocks: number;
    };
  };
}

// Pre-computed static data for performance
const DETAILED_ERRORS = [
  {
    type: "Database",
    message: "Connection pool exhausted - Max 100 connections reached",
    code: "DB_POOL_EXHAUSTED",
    affectedServices: ["api", "user-auth"]
  },
  {
    type: "Memory",
    message: "Memory usage at 95% (7.8GB/8GB) - GC pressure detected",
    code: "HIGH_MEMORY_USAGE",
    affectedServices: ["worker", "cache"]
  },
  {
    type: "CPU",
    message: "CPU load at 98% for 5+ minutes - Thread pool saturated",
    code: "CPU_OVERLOAD",
    affectedServices: ["api", "worker"]
  },
  {
    type: "Network",
    message: "Packet loss 15% to upstream services - DNS resolution failing",
    code: "NETWORK_DEGRADED",
    affectedServices: ["external-api", "cdn"]
  },
  {
    type: "Service",
    message: "Redis cluster node failure - Failover in progress",
    code: "REDIS_NODE_DOWN",
    affectedServices: ["cache", "sessions"]
  },
  {
    type: "Security",
    message: "Rate limiting triggered - 10k+ requests from single IP",
    code: "RATE_LIMIT_BREACH",
    affectedServices: ["api", "auth"]
  }
];

const WORKER_TYPES = ['api-handler', 'email-sender', 'data-processor', 'cache-manager'];

const WORKER_DEPENDENCIES: Record<string, string[]> = {
  'api-handler': ['database'],
  'email-sender': ['database', 'redis'],
  'data-processor': ['database'],
  'cache-manager': ['redis']
};

// Cache for region-specific deterministic values
const regionCache = new Map<string, {
  regionSeed: number;
  regionVariance: number;
  workerCount: number;
  cpus: number;
}>();

function getRegionConfig(region: string) {
  let cached = regionCache.get(region);
  if (!cached) {
    const regionSeed = region.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const regionVariance = Math.sin(regionSeed) * 0.2;
    const cpus = (regionSeed % 5) + 2; // 2-6 cores, deterministic
    const workersPerCore = (regionSeed % 2) + 1;
    const workerCount = Math.min(4, cpus * workersPerCore);

    cached = { regionSeed, regionVariance, workerCount, cpus };
    regionCache.set(region, cached);
  }
  return cached;
}

// Fast random string generation with pre-computed base
const RANDOM_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';
function fastRandomString(length: number, seed: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    const x = Math.sin(seed + i) * 10000;
    const rand = x - Math.floor(x);
    result += RANDOM_CHARS[Math.floor(rand * RANDOM_CHARS.length)];
  }
  return result;
}

export function generateFakeMetrics(region: string): MockMetricsData {
  // Get cached region-specific config
  const { regionSeed, regionVariance, workerCount, cpus } = getRegionConfig(region);

  // Add some variance based on time for realistic changes (stable within 30-second windows)
  const timeWindow = Math.floor(Date.now() / 30000); // 30-second buckets
  const timeVariance = Math.sin(timeWindow) * 0.3; // Changes every 30 seconds

  // Use time-based randomness for stability within polling intervals
  // Create a deterministic random function based on timeWindow and regionSeed
  let randomCounter = 0;
  const seededRandom = () => {
    const seed = timeWindow * regionSeed + randomCounter++;
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x); // Returns 0-1
  };

  // Deterministic error states based on time window (10% chance, but stable for 30 seconds)
  const hasError = seededRandom() < 0.1;

  // Get stable timestamp based on time window (changes every 30 seconds, not every call)
  const timestamp = new Date(timeWindow * 30000).toISOString();
  
  // CPU load percentage (15% - 95%), stable within time window
  const cpu_load = Math.max(0.15, Math.min(0.95, 0.3 + seededRandom() * 0.4 + timeVariance * 0.2));

  // Active connections: ~3000 connections per core (4 cores = ~12k connections)
  const baseConnectionsPerCore = 3000; // Base: 3000 connections per core
  const loadPenalty = cpu_load * 0.3; // High load reduces connection capacity
  const connectionVariance = (seededRandom() - 0.5) * 2000; // ±1000 variance
  const totalConnections = Math.floor(cpus * baseConnectionsPerCore * (1 - loadPenalty) + connectionVariance + regionVariance * 500);
  const active_connections = Math.max(cpus * 500, totalConnections); // Minimum 500 connections per core

  // Determine if we have critical service failures (moved up before worker generation)
  let redis = seededRandom() > 0.1; // 90% chance redis is up
  let database = seededRandom() > 0.05; // 95% chance database is up
  
  // If hasError is true (from random chance), force at least one critical service to fail
  if (hasError) {
    if (redis && database) {
      // Both services are up but region should fail, so force one service to fail
      if (seededRandom() > 0.5) {
        redis = false; // Force redis failure
      } else {
        database = false; // Force database failure
      }
    }
  }
  
  // Generate workers in the old format for server section
  const serverWorkers = [];

  // Generate workers in the new tuple format for WorkersCard
  const workersCardData = [];
  
  for (let i = 0; i < workerCount; i++) {
    const workerType = WORKER_TYPES[i % WORKER_TYPES.length];
    const workerName = `${workerType}-${i + 1}`;
    // Use deterministic worker count based on region and worker index to ensure consistency
    const workerSeed = regionSeed + i * 37; // Different seed for each worker
    const totalWorkers = (workerSeed % 8) + 2; // 2-9 worker instances, deterministic

    // Check if this worker type depends on failed services
    const dependencies = WORKER_DEPENDENCIES[workerType] || [];
    const hasFailedDependency = dependencies.some((dep: string) =>
      (dep === 'database' && !database) ||
      (dep === 'redis' && !redis)
    );
    
    // If worker has failed dependencies, most workers are idle/waiting
    let idle, busy, waiting;
    if (hasFailedDependency) {
      idle = Math.floor(totalWorkers * 0.8) + 1; // 80%+ idle
      busy = Math.max(0, totalWorkers - idle);
      waiting = Math.floor(totalWorkers * 0.9); // Most are waiting
    } else {
      idle = Math.floor(seededRandom() * (totalWorkers - 1)) + 1; // At least 1 idle
      busy = totalWorkers - idle;
      waiting = Math.floor(seededRandom() * Math.max(1, busy)) + 1; // At least 1 waiting
    }

    const workerLoad = hasFailedDependency
      ? Math.max(0, Math.min(20, cpu_load * 100 * 0.3)) // Low load if dependencies failed
      : Math.max(0, Math.min(100, cpu_load * 100 + (seededRandom() - 0.5) * 30));
    
    // Generate server worker object (old format)
    const workerStatus = hasFailedDependency 
      ? 'overloaded' // Workers with failed dependencies are struggling
      : (workerLoad > 85 ? 'overloaded' : workerLoad > 60 ? 'busy' : 'active');
      
    serverWorkers.push({
      id: workerName,
      pid: 1000 + i,
      status: workerStatus as 'active' | 'busy' | 'overloaded',
      cpu_usage: Math.floor(workerLoad),
      memory_mb: Math.floor(128 + seededRandom() * 512 + (workerLoad / 100) * 256), // 128MB - 896MB
      uptime_hours: Math.floor(seededRandom() * 168), // Up to 7 days (168 hours)
      requests_handled: Math.floor(seededRandom() * 50000 + workerLoad * 500),
      last_activity: new Date(timeWindow * 30000 - seededRandom() * 300000).toISOString(), // Last 5 minutes
      core_affinity: i % cpus // Which CPU core this worker is assigned to
    });

    // Generate some blocked keys (optimized)
    const blockedKeys = [];
    const keyCount = Math.floor(seededRandom() * 5);
    for (let j = 0; j < keyCount; j++) {
      blockedKeys.push(`key_${fastRandomString(6, timeWindow * regionSeed + i * 100 + j)}`);
    }

    // Generate top keys with counts (optimized)
    const topKeys = [];
    const topKeyCount = Math.floor(seededRandom() * 5);
    for (let j = 0; j < topKeyCount; j++) {
      topKeys.push([`top_${fastRandomString(4, timeWindow * regionSeed + i * 200 + j)}`, Math.floor(seededRandom() * 100) + 1]);
    }
    
    // Generate WorkersCard data (new tuple format)
    workersCardData.push([
      workerName,
      {
        workers: totalWorkers,
        idle: idle,
        waiting: waiting,
        wait_time: hasFailedDependency
          ? Math.floor(seededRandom() * 5000) + 1000 // 1-6 seconds wait for failed dependencies
          : Math.floor(seededRandom() * 500) + 10, // 10-510ms normal
        time_to_return: hasFailedDependency
          ? Math.floor(seededRandom() * 10000) + 2000 // 2-12 seconds for failed dependencies
          : Math.floor(seededRandom() * 1000) + 50, // 50-1050ms normal
        recently_blocked_keys: hasFailedDependency ? blockedKeys.concat([
          `${dependencies.find((dep: string) => (dep === 'database' && !database) || (dep === 'redis' && !redis))}_connection_failed`,
          `${workerType}_service_unavailable`
        ]) : blockedKeys,
        top_keys: topKeys
      }
    ]);
  }
  
  const criticalServiceDown = !redis || !database;
  
  // Region fails if critical services are down
  const regionHasError = criticalServiceDown;
  
  const selectedError = regionHasError ? (
    criticalServiceDown
      ? {
          type: !database ? "Database" : "Redis",
          message: !database ? "Database service unavailable - Connection refused" : "Redis cluster completely down - Cache layer failed",
          code: !database ? "DB_SERVICE_DOWN" : "REDIS_CLUSTER_DOWN",
          timestamp,
          affectedServices: !database ? ["api", "auth", "data"] : ["cache", "sessions", "queues"]
        }
      : { ...DETAILED_ERRORS[Math.floor(seededRandom() * DETAILED_ERRORS.length)], timestamp }
  ) : null;

  return {
    status: regionHasError ? "error" : "ok",
    server_issue: selectedError ? JSON.stringify(selectedError) : null,
    strict: seededRandom() > 0.5,
    version: `v${Math.floor(seededRandom() * 3) + 1}.${Math.floor(seededRandom() * 10)}.${Math.floor(seededRandom() * 10)}`,
    roles: ['api', 'worker', 'cache'],
    results: {
      stats: {
        online: regionHasError ? Math.floor(seededRandom() * 5) : Math.floor(10 + seededRandom() * 90 + timeVariance * 20), // Very few online users on failure
        servers_count: Math.floor(seededRandom() * 5) + 1,
        session: regionHasError ? Math.floor(seededRandom() * 10) : Math.floor(100 + seededRandom() * 500 + timeVariance * 100), // Very few sessions on failure
        server: {
          cpus,
          cpu_load: regionHasError ? Math.max(5, Math.min(20, cpu_load * 100 * 0.3)) : cpu_load * 100, // Failed regions have low CPU load due to no traffic
          active_connections: regionHasError ? Math.floor(seededRandom() * 10) : active_connections, // Near zero connections on failure
          wait_time: regionHasError ? Math.floor(5000 + seededRandom() * 5000) : Math.floor(10 + seededRandom() * 90 + Math.abs(timeVariance) * 30 + (cpu_load * 50)), // Massive wait times on failure
          workers: workersCardData as any, // Workers data in tuple format for transformation
          timers: regionHasError ? Math.floor(50 + seededRandom() * 50) : Math.floor(1 + seededRandom() * 19 + Math.abs(timeVariance) * 5),
          worker_count: workerCount,
          avg_worker_load: regionHasError ? Math.floor(5 + seededRandom() * 15) : Math.floor(serverWorkers.reduce((sum, w) => sum + w.cpu_usage, 0) / Math.max(1, serverWorkers.length)),
          overloaded_workers: regionHasError ? workerCount : serverWorkers.filter(w => w.status === 'overloaded').length,
          active_workers: regionHasError ? 0 : serverWorkers.filter(w => w.status === 'active').length,
          total_worker_memory: serverWorkers.reduce((sum, w) => sum + w.memory_mb, 0)
        }
      },
      services: {
        redis,
        database
      },
      performance: {
        response_times: {
          p50: regionHasError ? Math.floor(5000 + seededRandom() * 5000) : Math.floor(80 + seededRandom() * 120 + regionVariance * 50),
          p95: regionHasError ? Math.floor(15000 + seededRandom() * 10000) : Math.floor(200 + seededRandom() * 400 + regionVariance * 100),
          p99: regionHasError ? Math.floor(30000 + seededRandom() * 20000) : Math.floor(500 + seededRandom() * 800 + regionVariance * 200)
        },
        error_rate: regionHasError ? Math.min(95.0, 50 + seededRandom() * 45) : Math.max(0.01, Math.min(5.0, seededRandom() * 2 + Math.abs(timeVariance) * 1.5 + regionVariance)),
        requests_per_second: regionHasError ? Math.floor(10 + seededRandom() * 50) : Math.floor(500 + seededRandom() * 1500 + regionVariance * 300),
        uptime_percent: regionHasError ? Math.max(0.0, Math.min(50.0, 20 + seededRandom() * 30)) : Math.max(95.0, Math.min(99.99, 97 + seededRandom() * 2.5 + regionVariance * 0.5))
      },
      deployment: {
        last_deployment: new Date(timeWindow * 30000 - seededRandom() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        build_status: regionHasError ? 'failed' : (() => {
          // Realistic deployment failure rates: 80-90% success
          const rand = seededRandom();
          if (rand < 0.85) return 'success'; // 85% success rate
          if (rand < 0.93) return 'failed';  // 8% failure rate
          return 'pending'; // 7% pending/in-progress
        })(),
        version_number: `v${Math.floor(seededRandom() * 3) + 1}.${Math.floor(seededRandom() * 20)}.${Math.floor(seededRandom() * 10)}`,
        rollback_ready: regionHasError ? false : seededRandom() > 0.3, // Failed regions can't rollback
        failed_deployments_last_week: regionHasError ? Math.floor(5 + seededRandom() * 10) : Math.floor(seededRandom() * 3), // More failures when services down
        deployment_duration_minutes: regionHasError ? Math.floor(60 + seededRandom() * 120) : Math.floor(5 + seededRandom() * 25), // Much longer deployment times on failure
        last_rollback: regionHasError ? new Date(timeWindow * 30000 - seededRandom() * 24 * 60 * 60 * 1000).toISOString() : (seededRandom() < 0.2 ? new Date(timeWindow * 30000 - seededRandom() * 30 * 24 * 60 * 60 * 1000).toISOString() : null) // Recent rollback attempts on failed regions
      },
      memory: {
        usage_percent: regionHasError ? Math.min(98, 80 + seededRandom() * 18) : Math.max(20, Math.min(85, 40 + seededRandom() * 30)),
        available_mb: regionHasError ? Math.floor(100 + seededRandom() * 300) : Math.floor(1000 + seededRandom() * 3000),
        total_mb: 8192,
        swap_usage_percent: regionHasError ? Math.min(95, 70 + seededRandom() * 25) : seededRandom() * 20,
        // Additional fields for MemoryUsageCard
        total: 8192 / 1024, // Convert MB to GB
        used: (8192 - (regionHasError ? Math.floor(100 + seededRandom() * 300) : Math.floor(1000 + seededRandom() * 3000))) / 1024, // Calculate used in GB
        available: (regionHasError ? Math.floor(100 + seededRandom() * 300) : Math.floor(1000 + seededRandom() * 3000)) / 1024 // Convert available_mb to GB  
      },
      storage: {
        disk_usage_percent: regionHasError ? Math.min(98, 85 + seededRandom() * 13) : Math.max(30, Math.min(80, 50 + seededRandom() * 20)),
        io_wait_percent: regionHasError ? Math.min(80, 40 + seededRandom() * 40) : seededRandom() * 15,
        read_ops_per_sec: regionHasError ? Math.floor(10 + seededRandom() * 50) : Math.floor(100 + seededRandom() * 500),
        write_ops_per_sec: regionHasError ? Math.floor(5 + seededRandom() * 25) : Math.floor(50 + seededRandom() * 200)
      },
      network: {
        bytes_in_per_sec: regionHasError ? Math.floor(seededRandom() * 1000) : Math.floor(50000 + seededRandom() * 200000), // Minimal network traffic on failure
        bytes_out_per_sec: regionHasError ? Math.floor(seededRandom() * 500) : Math.floor(25000 + seededRandom() * 100000), // Minimal network traffic on failure
        packets_dropped: regionHasError ? Math.floor(100 + seededRandom() * 500) : Math.floor(seededRandom() * 10),
        latency_ms: regionHasError ? Math.floor(500 + seededRandom() * 2000) : Math.floor(5 + seededRandom() * 20)
      },
      alerts: {
        critical_alerts: regionHasError ? Math.floor(5 + seededRandom() * 15) : Math.floor(seededRandom() * 2),
        warning_alerts: regionHasError ? Math.floor(10 + seededRandom() * 20) : Math.floor(seededRandom() * 5),
        info_alerts: regionHasError ? Math.floor(20 + seededRandom() * 30) : Math.floor(seededRandom() * 10),
        active_alerts: (regionHasError ? Math.floor(5 + seededRandom() * 15) : Math.floor(seededRandom() * 2)) + 
                      (regionHasError ? Math.floor(10 + seededRandom() * 20) : Math.floor(seededRandom() * 5)) + 
                      (regionHasError ? Math.floor(20 + seededRandom() * 30) : Math.floor(seededRandom() * 10)), // Sum of critical + warning + info
        escalated_alerts: regionHasError ? Math.floor(1 + seededRandom() * 5) : Math.floor(seededRandom() * 2),
        alert_response_time: regionHasError ? Math.floor(30 + seededRandom() * 60) : Math.floor(5 + seededRandom() * 25) // minutes
      },
      security: {
        threat_level: regionHasError ? 'high' : (seededRandom() < 0.1 ? 'medium' : 'low'),
        vulnerability_score: regionHasError ? Math.floor(70 + seededRandom() * 30) : Math.floor(seededRandom() * 40),
        failed_auth_attempts: regionHasError ? Math.floor(50 + seededRandom() * 200) : Math.floor(seededRandom() * 20),
        firewall_blocks: regionHasError ? Math.floor(100 + seededRandom() * 500) : Math.floor(seededRandom() * 50),
        failed_logins: regionHasError ? Math.floor(50 + seededRandom() * 200) : Math.floor(seededRandom() * 20),
        blocked_ips: regionHasError ? Math.floor(100 + seededRandom() * 500) : Math.floor(seededRandom() * 50),
        ssl_cert_days: regionHasError ? Math.floor(1 + seededRandom() * 15) : Math.floor(30 + seededRandom() * 300) // Days until SSL cert expires
      }
    }
  } as any; // Use 'as any' to bypass TypeScript checking for additional properties
}