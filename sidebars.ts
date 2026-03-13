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
        'api-reference/proxy-openai',
        'api-reference/proxy-anthropic',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/claude-code',
        'guides/memory-for-agents',
        'guides/multi-provider',
        'guides/custom-providers',
        'guides/routing-optimizer',
        'guides/error-handling',
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
        'deployment/right-sizing',
      ],
    },
  ],
};

export default sidebars;
