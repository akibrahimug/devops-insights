/**
 * Performance Benchmark for Fake Data Generator
 * Tests the speed of data generation for all regions
 */

import { generateFakeMetrics } from './fake-data-generator';

const REGIONS = ['us-east', 'eu-west', 'eu-central', 'us-west', 'sa-east', 'ap-southeast'];
const ITERATIONS = 1000; // Generate 1000 times per region

function runBenchmark() {
  console.log('🚀 Starting performance benchmark...\n');
  console.log(`Testing ${ITERATIONS} iterations per region (${REGIONS.length} regions)`);
  console.log(`Total operations: ${ITERATIONS * REGIONS.length}\n`);

  const startTime = performance.now();

  // Simulate production load: generate metrics for all regions multiple times
  for (let i = 0; i < ITERATIONS; i++) {
    for (const region of REGIONS) {
      generateFakeMetrics(region);
    }
  }

  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const avgTimePerGeneration = totalTime / (ITERATIONS * REGIONS.length);
  const generationsPerSecond = 1000 / avgTimePerGeneration;

  console.log('✅ Benchmark Results:');
  console.log('─────────────────────────────────────────');
  console.log(`Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`Average per generation: ${avgTimePerGeneration.toFixed(4)}ms`);
  console.log(`Generations per second: ${generationsPerSecond.toFixed(2)}`);
  console.log(`Time for 6 regions (1 poll): ${(avgTimePerGeneration * 6).toFixed(4)}ms`);
  console.log('─────────────────────────────────────────\n');

  // Performance evaluation
  const targetTimePerPoll = 100; // Target: less than 100ms for all 6 regions
  const actualTimePerPoll = avgTimePerGeneration * 6;

  if (actualTimePerPoll < targetTimePerPoll) {
    console.log(`✨ EXCELLENT! Data loads in ${actualTimePerPoll.toFixed(2)}ms (target: <${targetTimePerPoll}ms)`);
  } else if (actualTimePerPoll < targetTimePerPoll * 2) {
    console.log(`⚠️  ACCEPTABLE but could be better: ${actualTimePerPoll.toFixed(2)}ms`);
  } else {
    console.log(`❌ NEEDS IMPROVEMENT: ${actualTimePerPoll.toFixed(2)}ms (target: <${targetTimePerPoll}ms)`);
  }

  // Memory test
  console.log('\n📊 Memory Usage:');
  const memUsage = process.memoryUsage();
  console.log(`Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`External: ${(memUsage.external / 1024 / 1024).toFixed(2)} MB`);
}

runBenchmark();
