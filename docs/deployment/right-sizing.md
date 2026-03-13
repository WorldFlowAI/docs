---
title: Right-Sizing Guide
description: Guidance for selecting the appropriate WorldFlow AI deployment size, including deployment tiers, key sizing factors, GPU selection, storage sizing, and scaling recommendations.
sidebar_position: 3
---

# Right-Sizing Guide

Guidance for selecting the appropriate WorldFlow AI deployment size based on your workload characteristics and performance requirements.

## Deployment Tiers

### Starter (Development / Proof of Concept)

For teams evaluating WorldFlow AI or running low-volume workloads.

| Component | Replicas | CPU | Memory | Storage | GPU |
|-----------|----------|-----|--------|---------|-----|
| Gateway | 1 | 250m | 512Mi | - | - |
| Proxy | 1 | 500m | 1Gi | 20Gi | - |
| Embeddings (TEI) | 1 | 4 | 8Gi | - | Optional |
| Redis | 1 | 100m | 256Mi | 1Gi | - |
| Milvus | 1 | 500m | 2Gi | 10Gi | - |
| PostgreSQL | 1 | 250m | 512Mi | 10Gi | - |

**Throughput**: ~50 req/s (CPU embeddings) or ~500 req/s (GPU embeddings)
**Monthly cost estimate**: $150--$400/month (cloud), $0 (on-prem hardware)
**API key capacity**: Up to 100 keys
**Suitable for**: <10,000 requests/day, single team, POC validation

### Standard (Production Pilot)

For production workloads with moderate volume and uptime requirements.

| Component | Replicas | CPU | Memory | Storage | GPU |
|-----------|----------|-----|--------|---------|-----|
| Gateway | 2 | 1 | 2Gi | - | - |
| Proxy | 2 | 2 | 4Gi | 50Gi | - |
| Embeddings (TEI) | 1 | 2 | 8Gi | - | 1x T4 |
| Redis | 1 (HA optional) | 500m | 1Gi | 5Gi | - |
| Milvus | 1 | 2 | 8Gi | 50Gi | - |
| PostgreSQL | 1 (Multi-AZ) | 1 | 2Gi | 50Gi | - |

**Throughput**: ~500 req/s with cache, ~200 req/s cache miss
**Monthly cost estimate**: $800--$1,500/month (cloud)
**API key capacity**: Up to 1,000 keys
**Suitable for**: 10,000--200,000 requests/day, multiple teams, SLA requirements

### Enterprise (High Volume)

For large-scale deployments with high availability and performance requirements.

| Component | Replicas | CPU | Memory | Storage | GPU |
|-----------|----------|-----|--------|---------|-----|
| Gateway | 3--5 | 2 | 4Gi | - | - |
| Proxy | 3--5 | 4 | 8Gi | 100Gi | - |
| Embeddings (TEI) | 2 | 4 | 16Gi | - | 1x A10G each |
| Redis | 3 (Cluster) | 1 | 4Gi | 10Gi | - |
| Milvus | 3 (Cluster) | 4 | 16Gi | 200Gi | - |
| PostgreSQL | Multi-AZ | 2 | 8Gi | 200Gi | - |

**Throughput**: ~2,000 req/s with cache, ~800 req/s cache miss
**Monthly cost estimate**: $3,000--$8,000/month (cloud)
**API key capacity**: 1,000+ keys
**Suitable for**: 200,000+ requests/day, organization-wide deployment, strict SLAs

## Key Sizing Factors

### 1. Request Volume

The primary sizing driver. Higher volume requires more gateway and proxy replicas.

| Daily Requests | Gateway Replicas | Proxy Replicas |
|---------------|-----------------|----------------|
| <10,000 | 1 | 1 |
| 10,000--100,000 | 2 | 2 |
| 100,000--500,000 | 3 | 3 |
| 500,000--1,000,000 | 4 | 4 |
| >1,000,000 | 5+ (HPA) | 5+ (HPA) |

### 2. Cache Hit Rate

Higher cache hit rates reduce load on LLM providers and proxy. WorldFlow AI typically achieves 30--60% cache hit rates for conversational workloads.

| Cache Hit Rate | Impact |
|---------------|--------|
| <20% | Size for full miss throughput |
| 20--40% | Standard sizing is sufficient |
| 40--60% | Can reduce proxy replicas by 1 |
| >60% | Significant cost savings, minimal proxy load |

### 3. Embedding Model Selection

The embedding model affects both accuracy and resource requirements.

| Model | Dimensions | Memory | GPU Requirement | Accuracy | Use Case |
|-------|-----------|--------|----------------|----------|----------|
| `BAAI/bge-base-en-v1.5` | 768 | 1Gi | Optional | Good | English-only, fast |
| `BAAI/bge-m3` | 1024 | 4Gi | Recommended | Better | Multilingual |
| `jina-embeddings-v4` | 1024 | 4Gi | Required | Best | Multilingual, Matryoshka |

### 4. Number of API Keys

More API keys means more JWT validation overhead and larger key analytics tables.

| Key Count | Additional Resources |
|-----------|---------------------|
| <100 | None |
| 100--500 | +256Mi gateway memory |
| 500--1,000 | +512Mi gateway memory, consider PostgreSQL sizing |
| >1,000 | Dedicated PostgreSQL, +1Gi gateway memory |

### 5. Number of Models in Catalog

More models in the catalog increases routing decision computation time.

| Model Count | Impact |
|------------|--------|
| <10 | Negligible |
| 10--50 | Standard routing latency |
| 50--100 | +1--2ms routing overhead |
| >100 | Consider routing rule optimization |

## GPU Selection Guide

### Embedding Service (TEI)

| GPU Type | Instance (AWS) | VRAM | Throughput | Cost/hr | Recommendation |
|----------|---------------|------|-----------|---------|----------------|
| None (CPU) | m5.2xlarge | - | ~50 req/s | $0.384 | Dev/POC only |
| T4 | g4dn.xlarge | 16GB | ~500 req/s | $0.526 | Standard pilots |
| A10G | g5.xlarge | 24GB | ~1,000 req/s | $1.006 | High-volume production |
| A100 | p4d.24xlarge | 40GB | ~2,000 req/s | $32.77 | Maximum throughput |

### Self-Hosted LLM (vLLM)

If running your own LLM instead of using external providers:

| GPU Type | VRAM | Max Model Size | Instance (AWS) |
|----------|------|---------------|----------------|
| T4 | 16GB | 3B params (FP16), 7B (4-bit) | g4dn.xlarge |
| A10G | 24GB | 7B params (FP16), 13B (4-bit) | g5.xlarge |
| A100 40GB | 40GB | 13B params (FP16), 70B (4-bit) | p4d.24xlarge |

## Network Bandwidth Considerations

| Component | Bandwidth Need | Notes |
|-----------|---------------|-------|
| Gateway <-> Proxy | Low (~1 KB/req) | Internal cluster network |
| Proxy <-> Redis | Medium (~5 KB/req) | Cache reads/writes |
| Proxy <-> Milvus | Medium (~10 KB/req) | Vector search operations |
| Proxy <-> LLM Provider | High (~50 KB/req) | Token streaming |
| Gateway <-> TEI | Medium (~5 KB/req) | Embedding generation |

## Scaling Recommendations

### Horizontal Pod Autoscaling (HPA)

```yaml
autoscaling:
  gateway:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70
  proxy:
    enabled: true
    minReplicas: 2
    maxReplicas: 20
    targetCPUUtilizationPercentage: 70
```

### When to Scale Up

| Symptom | Component to Scale | Action |
|---------|-------------------|--------|
| Gateway p99 >200ms | Gateway | Add replicas or increase CPU |
| Cache miss rate >80% | Redis/Milvus | Increase memory, check threshold |
| Embedding latency >100ms | TEI | Add GPU or upgrade GPU tier |
| LLM provider 429s | Proxy | Add replicas, adjust rate limits |
| PostgreSQL CPU >70% | PostgreSQL | Upgrade instance class |

### When to Scale Down

| Condition | Action |
|-----------|--------|
| Gateway CPU <20% sustained | Reduce replicas |
| Cache hit rate >70% | May reduce proxy replicas |
| Off-peak hours | Use HPA with lower min replicas |

## Storage Sizing

| Component | Base | Growth Rate | Retention |
|-----------|------|-------------|-----------|
| Redis (L1 cache) | 1Gi | ~100MB/100K cached responses | Auto-eviction (LRU) |
| Milvus (L2 vectors) | 10Gi | ~1GB/1M vectors | Configurable TTL |
| PostgreSQL | 10Gi | ~1GB/1M routing decisions | Configurable retention |
| Proxy (RocksDB) | 20Gi | ~5GB/10M cached responses | Auto-compaction |

## Quick Reference

For a 600-key deployment with ~100,000 requests/day across multiple LLM providers:

```yaml
# Recommended: Standard tier with GPU embeddings
gateway:
  replicaCount: 2
  resources:
    requests: { cpu: 1, memory: 2Gi }
    limits: { cpu: 2, memory: 4Gi }

proxy:
  replicaCount: 2
  resources:
    requests: { cpu: 2, memory: 4Gi }
    limits: { cpu: 4, memory: 8Gi }

embeddings:
  bundled:
    gpu:
      enabled: true
      count: 1  # T4 is sufficient
    resources:
      requests: { cpu: 2, memory: 8Gi }
      limits: { cpu: 4, memory: 16Gi }

# PostgreSQL: db.t3.medium or equivalent (2 vCPU, 4 GiB)
# Redis: cache.t3.medium or equivalent (2 vCPU, 3.09 GiB)
```

Estimated monthly cost: $1,000--$1,500 on AWS (excluding LLM provider costs).
