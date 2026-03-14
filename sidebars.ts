import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    {type: 'doc', id: 'introduction', label: 'Introduction'},
    {type: 'doc', id: 'quickstart', label: 'Quickstart'},
    {type: 'doc', id: 'authentication', label: 'Authentication'},
    {type: 'doc', id: 'concepts', label: 'Core Concepts'},
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api-reference/overview',
        'api-reference/authentication-api',
        'api-reference/memory-api',
        'api-reference/mcp-api',
        'api-reference/proxy-openai',
        'api-reference/proxy-anthropic',
        'api-reference/proxy-gemini',
        'api-reference/proxy-cohere',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/memory-for-agents',
        'guides/multi-provider',
        'guides/custom-providers',
        'guides/routing-optimizer',
        'guides/agentic-caching',
        'guides/guardrails',
        'guides/prompt-templates',
        'guides/virtual-keys',
        'guides/cache-tuning',
        'guides/error-handling',
      ],
    },
    {
      type: 'category',
      label: 'Platform',
      items: [
        'guides/dashboard',
        'guides/teams-and-users',
        'guides/sso-scim',
        'guides/audit-privacy',
      ],
    },
    {
      type: 'category',
      label: 'Migrations',
      items: [
        'guides/litellm-migration',
        'guides/google-adk-migration',
      ],
    },
    {
      type: 'category',
      label: 'SDKs',
      items: [
        'sdks/python',
        'sdks/typescript',
        'sdks/curl',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'reference/error-codes',
        'reference/field-limits',
        'reference/rate-limits',
        'reference/response-headers',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/hosted',
        'deployment/self-hosted',
      ],
    },
  ],
};

export default sidebars;
