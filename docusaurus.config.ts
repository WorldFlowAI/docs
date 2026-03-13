import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'WorldFlow AI Docs',
  tagline: 'The enterprise memory layer for AI',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  url: 'https://docs.worldflowai.com',
  baseUrl: '/',

  organizationName: 'worldflowai',
  projectName: 'docs',

  onBrokenLinks: 'throw',

  markdown: {
    format: 'md',
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/worldflowai/docs/edit/main/',
          routeBasePath: 'docs',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themes: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        indexBlog: false,
        docsRouteBasePath: '/docs',
      },
    ],
  ],

  themeConfig: {
    image: 'img/og-image.png',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'WorldFlow AI',
      logo: {
        alt: 'WorldFlow AI',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/api-reference/overview',
          label: 'API Reference',
          position: 'left',
        },
        {
          to: '/docs/sdks/python',
          label: 'SDKs',
          position: 'left',
        },
        {
          href: 'https://worldflowai.com',
          label: 'Home',
          position: 'right',
        },
        {
          href: 'https://github.com/worldflowai',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Quickstart', to: '/docs/quickstart'},
            {label: 'API Reference', to: '/docs/api-reference/overview'},
            {label: 'SDKs', to: '/docs/sdks/python'},
          ],
        },
        {
          title: 'Guides',
          items: [
            {label: 'Memory for Agents', to: '/docs/guides/memory-for-agents'},
            {label: 'Claude Code', to: '/docs/guides/claude-code'},
            {label: 'Multi-Provider Setup', to: '/docs/guides/multi-provider'},
          ],
        },
        {
          title: 'Company',
          items: [
            {label: 'Website', href: 'https://worldflowai.com'},
            {label: 'LinkedIn', href: 'https://www.linkedin.com/company/worldflow-ai'},
            {label: 'GitHub', href: 'https://github.com/worldflowai'},
          ],
        },
      ],
      copyright: `Copyright \u00a9 ${new Date().getFullYear()} WorldFlow AI, Inc.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'python', 'typescript', 'yaml'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
