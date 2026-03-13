---
title: Self-Hosted Deployment
description: Deploy WorldFlow AI in your own Kubernetes infrastructure. Covers prerequisites, deployment options, Helm configuration, GPU deployment, vLLM backend, monitoring, scaling, and troubleshooting.
sidebar_position: 2
---

# Self-Hosted Deployment Guide

This guide covers deploying WorldFlow AI in your own Kubernetes infrastructure. WorldFlow AI acts as a semantic caching proxy between your applications and your LLM backend.

## Overview

In self-hosted mode, WorldFlow AI runs entirely within your infrastructure:

```
+-------------------------------------------------------------+
|                    Your Kubernetes Cluster                    |
|                                                              |
|  +----------+     +-------------------------------+          |
|  |          |     |         WorldFlow AI          |          |
|  |   Your   |---->|  Gateway --> Proxy --> TEI    |          |
|  |   Apps   |     |     |           |             |          |
|  |          |<----|     |      Cache Hit?          |          |
|  +----------+     |     |           |             |          |
|                   +-----|-----------|-------------+          |
|                         |           |                        |
|                         v           v Cache Miss             |
|                   +----------+  +----------+                 |
|                   |  Redis   |  |  Milvus  |                 |
|                   |  (L1)    |  |  (L2)    |                 |
|                   +----------+  +----------+                 |
|                                     |                        |
+-------------------------------------|------------------------+
                                      |
                                      v
                              +--------------+
                              |  Your LLM    |
                              |  Backend     |
                              |  (vLLM, TGI, |
                              |   Ollama)    |
                              +--------------+
```

## Prerequisites

### Required
- Kubernetes 1.25+
- Helm 3.10+
- kubectl configured for your cluster
- Redis 7.0+ (external or bundled)
- Milvus 2.3+ (external or bundled)

### Optional
- NVIDIA GPU nodes (for high-throughput embeddings)
- Prometheus Operator (for metrics collection)
- cert-manager (for TLS certificates)

## Deployment Options

### Option 1: Self-Hosted with Existing Infrastructure

Use this if you already have Redis and Milvus running:

```bash
helm install synapse ./helm/synapse \
  -f helm/synapse/values/self-hosted-pilot.yaml \
  --set dependencies.redis.external.url="redis://your-redis:6379" \
  --set dependencies.milvus.external.endpoint="your-milvus:19530" \
  --set providers.openai.apiKey="sk-..." \
  --namespace synapse \
  --create-namespace
```

### Option 2: Self-Hosted Bundled (All-in-One)

Use this for a complete self-contained deployment:

```bash
helm install synapse ./helm/synapse \
  -f helm/synapse/values/self-hosted-bundled.yaml \
  --set providers.openai.apiKey="sk-..." \
  --namespace synapse \
  --create-namespace
```

This deploys Redis and Milvus alongside WorldFlow AI.

### Option 3: Production with GPU

For high-throughput production deployments:

```bash
helm install synapse ./helm/synapse \
  -f helm/synapse/values/production.yaml \
  --set dependencies.redis.external.url="redis://your-redis:6379" \
  --set dependencies.milvus.external.endpoint="your-milvus:19530" \
  --set providers.openai.apiKey="sk-..." \
  --namespace synapse \
  --create-namespace
```

## Configuration

### Helm Values

Create a custom values file for your deployment:

```yaml
# my-values.yaml

# Gateway configuration
gateway:
  replicaCount: 2
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2
      memory: 4Gi
  config:
    rateLimitRps: 100
    maxConcurrentRequests: 500

# Proxy configuration
proxy:
  replicaCount: 2
  persistence:
    enabled: true
    size: 50Gi
    storageClass: "your-storage-class"

# Embeddings configuration
embeddings:
  provider: "bundled"
  bundled:
    deploy: true
    model: "BAAI/bge-m3"
    dimension: 1024
    gpu:
      enabled: false  # Set to true if you have GPU nodes

# LLM Provider configuration
providers:
  openai:
    enabled: true
    models:
      - gpt-4o
      - gpt-4o-mini
  anthropic:
    enabled: true
    models:
      - claude-3-5-sonnet-20241022

# External dependencies
dependencies:
  redis:
    mode: "external"
    external:
      url: "redis://redis.default.svc.cluster.local:6379"
  milvus:
    mode: "external"
    external:
      endpoint: "milvus.default.svc.cluster.local:19530"

# Ingress (optional)
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: synapse.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: synapse-tls
      hosts:
        - synapse.example.com
```

Install with your custom values:

```bash
helm install synapse ./helm/synapse \
  -f my-values.yaml \
  --namespace synapse \
  --create-namespace
```

### Environment Variables

Key environment variables configured via the Helm chart:

| Variable | Description | Default |
|----------|-------------|---------|
| `SYNAPSE_CONFIG_PATH` | Path to config file | `/etc/synapse/config.json` |
| `RUST_LOG` | Log level | `info,synapse=debug` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry endpoint | - |

### Secrets

The chart can create secrets or reference existing ones:

```yaml
# Create secrets via Helm
secrets:
  create: true
  openaiApiKey: "sk-..."
  anthropicApiKey: "sk-ant-..."
  synapseApiKey: ""  # Auto-generated if empty

# Or reference existing secret
secrets:
  create: false
  existingSecret: "my-synapse-secrets"
```

Expected secret keys:
- `openai-api-key`
- `anthropic-api-key`
- `synapse-api-key`

## GPU Deployment

For production throughput, deploy TEI with GPU acceleration:

### Prerequisites
- NVIDIA GPU nodes with drivers installed
- NVIDIA device plugin for Kubernetes
- Node labels: `nvidia.com/gpu=true`

### GPU Node Group Setup

Each self-hosted deployment should have its own dedicated GPU node group. This ensures:
- Resource isolation between tenants
- Independent scaling
- Clear cost attribution
- No interference with other deployments

**AWS EKS Example:**
```bash
# Create a dedicated GPU node group for your deployment
eksctl create nodegroup \
  --cluster your-cluster \
  --region us-east-1 \
  --name gpu-synapse \
  --node-type g4dn.xlarge \
  --nodes 1 \
  --nodes-min 0 \
  --nodes-max 2 \
  --node-labels "nvidia.com/gpu=true,synapse.worldflow.ai/gpu-pool=dedicated" \
  --managed
```

**GPU Instance Type Selection:**

| Instance Type | GPU | Memory | vCPU | Use Case |
|--------------|-----|--------|------|----------|
| g4dn.xlarge | 1x T4 (16GB) | 16GB | 4 | Development, small pilots |
| g4dn.2xlarge | 1x T4 (16GB) | 32GB | 8 | Production pilots |
| g5.xlarge | 1x A10G (24GB) | 16GB | 4 | High-throughput production |
| g5.2xlarge | 1x A10G (24GB) | 32GB | 8 | Enterprise workloads |

**GPU Compute Capability:**

TEI requires specific image tags based on your GPU architecture:

| GPU | Compute Cap | TEI Image Tag |
|-----|-------------|---------------|
| T4 (g4dn) | 7.5 (Turing) | `turing-1.2` |
| A10G (g5) | 8.6 (Ampere) | `1.2` |
| A100 (p4d) | 8.0 (Ampere) | `1.2` |

Configure in values.yaml:
```yaml
embeddings:
  bundled:
    gpu:
      enabled: true
      count: 1
      compute: "turing"  # Use "turing" for T4/g4dn, "ampere" for A10G/g5
```

### Configuration

```yaml
embeddings:
  provider: "bundled"
  bundled:
    deploy: true
    gpu:
      enabled: true
      count: 1
    resources:
      requests:
        cpu: 2
        memory: 8Gi
      limits:
        cpu: 4
        memory: 16Gi
```

### Performance Comparison

| Mode | Throughput | Latency (p95) | Cost |
|------|------------|---------------|------|
| CPU (8 cores) | ~50 req/s | ~200ms | Low |
| GPU (T4) | ~500 req/s | ~20ms | Medium |
| GPU (A10G) | ~1000 req/s | ~10ms | High |

## Connecting Your Applications

### Update Base URL

Point your applications to WorldFlow AI instead of the LLM provider directly:

**Python (OpenAI SDK)**
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://synapse-gateway.synapse.svc.cluster.local:8080/v1",
    api_key="your-synapse-api-key"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

**Node.js**
```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://synapse-gateway.synapse.svc.cluster.local:8080/v1',
  apiKey: 'your-synapse-api-key',
});

const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

### Using with Your Own LLM Backend

If you are running your own LLM (vLLM, TGI, Ollama), configure WorldFlow AI to proxy to it:

```yaml
# In your values file
providers:
  custom:
    enabled: true
    endpoint: "http://vllm.default.svc.cluster.local:8000"
    apiType: "openai"  # openai | anthropic | custom
    models:
      - llama-3-70b
      - mistral-7b
```

### Deploying vLLM as Your LLM Backend

For a fully self-contained deployment, deploy vLLM alongside WorldFlow AI. This eliminates the need for external API keys (OpenAI, Anthropic) and keeps all inference within your infrastructure.

**vLLM Deployment:**

```bash
kubectl apply -n synapse -f - <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: synapse-vllm
  labels:
    app: synapse-vllm
spec:
  replicas: 1
  selector:
    matchLabels:
      app: synapse-vllm
  template:
    metadata:
      labels:
        app: synapse-vllm
    spec:
      nodeSelector:
        nvidia.com/gpu: "true"
      tolerations:
      - key: nvidia.com/gpu
        operator: Exists
        effect: NoSchedule
      containers:
      - name: vllm
        image: vllm/vllm-openai:v0.6.4.post1
        args:
        - "--model"
        - "Qwen/Qwen2.5-1.5B-Instruct"  # Fits on T4 16GB
        - "--port"
        - "8000"
        - "--max-model-len"
        - "4096"
        - "--gpu-memory-utilization"
        - "0.85"
        - "--dtype"
        - "float16"
        ports:
        - containerPort: 8000
          name: http
        resources:
          requests:
            cpu: 2
            memory: 8Gi
            nvidia.com/gpu: 1
          limits:
            cpu: 4
            memory: 16Gi
            nvidia.com/gpu: 1
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 300
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 180
          periodSeconds: 10
        volumeMounts:
        - name: model-cache
          mountPath: /root/.cache/huggingface
        - name: shm
          mountPath: /dev/shm
      volumes:
      - name: model-cache
        emptyDir:
          sizeLimit: 20Gi
      - name: shm
        emptyDir:
          medium: Memory
          sizeLimit: 4Gi
---
apiVersion: v1
kind: Service
metadata:
  name: synapse-vllm
  labels:
    app: synapse-vllm
spec:
  ports:
  - port: 8000
    name: http
  selector:
    app: synapse-vllm
EOF
```

**Recommended Models by GPU:**

| GPU | VRAM | Recommended Model | Parameters |
|-----|------|-------------------|------------|
| T4 (g4dn) | 16GB | Qwen/Qwen2.5-1.5B-Instruct | 1.5B |
| T4 (g4dn) | 16GB | microsoft/Phi-3-mini-4k-instruct | 3.8B |
| A10G (g5) | 24GB | Qwen/Qwen2.5-7B-Instruct | 7B |
| A10G (g5) | 24GB | meta-llama/Llama-3.1-8B-Instruct | 8B |
| A100 40GB | 40GB | meta-llama/Llama-3.1-70B-Instruct | 70B (4-bit) |

**Configure WorldFlow AI to use vLLM:**

```yaml
# In your values file
providers:
  vllm:
    enabled: true
    endpoint: "http://synapse-vllm:8000/v1"
    models:
      - "Qwen/Qwen2.5-1.5B-Instruct"
  openai:
    enabled: false  # Disable external providers
  anthropic:
    enabled: false
```

**Note:** vLLM requires approximately 3-5 minutes to download the model and initialize on first startup. Monitor the pod logs to track progress:

```bash
kubectl logs -n synapse -l app=synapse-vllm -f
```

## Monitoring

### Prometheus Metrics

Enable ServiceMonitor for Prometheus Operator:

```yaml
monitoring:
  serviceMonitor:
    enabled: true
    interval: 15s
```

Key metrics:
- `synapse_requests_total` - Total requests by status
- `synapse_cache_hits_total` - Cache hit count
- `synapse_cache_misses_total` - Cache miss count
- `synapse_request_duration_seconds` - Request latency histogram
- `synapse_embedding_duration_seconds` - Embedding generation time

### Health Endpoints

```bash
# Liveness probe
curl http://synapse-gateway:8080/health

# Readiness probe
curl http://synapse-gateway:8080/ready

# Detailed stats
curl -H "Authorization: Bearer $API_KEY" \
  http://synapse-gateway:8080/api/v1/stats
```

### Grafana Dashboard

Import the provided dashboard from `helm/synapse/dashboards/synapse.json` or enable bundled Grafana:

```yaml
monitoring:
  grafana:
    enabled: true
```

## Scaling

### Horizontal Pod Autoscaling

Enable HPA for automatic scaling:

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

### Resource Guidelines

| Component | Min Resources | Production Resources |
|-----------|---------------|---------------------|
| Gateway | 250m CPU, 512Mi | 1 CPU, 2Gi |
| Proxy | 500m CPU, 1Gi | 2 CPU, 4Gi |
| TEI (CPU) | 4 CPU, 8Gi | 8 CPU, 16Gi |
| TEI (GPU) | 2 CPU, 8Gi + 1 GPU | 4 CPU, 16Gi + 1 GPU |
| Redis | 100m CPU, 256Mi | 500m CPU, 1Gi |
| Milvus | 500m CPU, 2Gi | 2 CPU, 8Gi |

## Troubleshooting

### Common Issues

**Pods not starting**
```bash
kubectl describe pod -n synapse -l app.kubernetes.io/name=synapse
kubectl logs -n synapse -l app.kubernetes.io/component=gateway
```

**Cache not working**
```bash
# Check Redis connectivity
kubectl exec -n synapse deploy/synapse-gateway -- redis-cli -u $REDIS_URL ping

# Check Milvus connectivity
kubectl logs -n synapse -l app.kubernetes.io/component=proxy | grep milvus
```

**High latency**
```bash
# Check embedding service
curl http://synapse-embeddings:8080/health

# Check cache hit rate
curl -H "Authorization: Bearer $API_KEY" \
  http://synapse-gateway:8080/api/v1/stats | jq '.cache_hit_rate'
```

### Logs

```bash
# Gateway logs
kubectl logs -n synapse -l app.kubernetes.io/component=gateway -f

# Proxy logs
kubectl logs -n synapse -l app.kubernetes.io/component=proxy -f

# TEI logs
kubectl logs -n synapse -l app.kubernetes.io/component=embeddings -f
```

## Upgrading

```bash
# Update chart
helm upgrade synapse ./helm/synapse \
  -f my-values.yaml \
  --namespace synapse

# Rollback if needed
helm rollback synapse --namespace synapse
```

## Uninstalling

```bash
# Remove Helm release
helm uninstall synapse --namespace synapse

# Remove PVCs (if desired)
kubectl delete pvc -n synapse -l app.kubernetes.io/name=synapse

# Remove namespace
kubectl delete namespace synapse
```

## Support

- Documentation: https://docs.worldflow.ai/synapse
- GitHub Issues: https://github.com/worldflowai/synapse/issues
- Email: support@worldflow.ai
