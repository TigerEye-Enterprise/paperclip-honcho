// src/constants.ts
var PLUGIN_VERSION = "0.1.4";
var DEFAULT_WORKSPACE_PREFIX = "paperclip";
var DEFAULT_JOB_WAIT_TIMEOUT_MS = 15 * 60 * 1e3;
var SLOT_IDS = {
  settingsPage: "honcho-settings-page",
  issueTab: "honcho-issue-memory-tab"
};
var EXPORT_NAMES = {
  settingsPage: "HonchoSettingsPage",
  issueTab: "HonchoIssueMemoryTab",
  toolbarButton: "HonchoMemoryToolbarLauncher"
};
var JOB_KEYS = {
  initializeMemory: "initialize-memory"
};
var TOOL_NAMES = {
  getIssueContext: "honcho_get_issue_context",
  searchMemory: "honcho_search_memory",
  askPeer: "honcho_ask_peer",
  getWorkspaceContext: "honcho_get_workspace_context",
  searchMessages: "honcho_search_messages",
  searchConclusions: "honcho_search_conclusions",
  getSession: "honcho_get_session",
  getAgentContext: "honcho_get_agent_context",
  getHierarchyContext: "honcho_get_hierarchy_context"
};
var RUNTIME_LAUNCHERS = [
  {
    id: "honcho-memory-launcher",
    displayName: "Honcho Memory",
    placementZone: "globalToolbarButton",
    action: {
      type: "openDrawer",
      target: EXPORT_NAMES.toolbarButton
    },
    render: {
      environment: "hostOverlay"
    }
  }
];
var DEFAULT_CONFIG = {
  honchoApiBaseUrl: "https://api.honcho.dev",
  honchoApiKey: "",
  workspacePrefix: DEFAULT_WORKSPACE_PREFIX,
  syncIssueComments: true,
  syncIssueDocuments: true,
  enablePromptContext: false,
  enablePeerChat: true,
  observe_me: true,
  observe_others: true,
  noisePatterns: [],
  disableDefaultNoisePatterns: false,
  stripPlatformMetadata: true,
  flushBeforeReset: false,
  useLocalHonchoConfig: true,
  bootstrapLocalHonchoConfig: false,
  agentRuntimeHomePathTemplate: "",
  dlpGatewayUrl: "",
  dlpGatewayToken: "",
  dlpDefaultGuild: "devex"
};

// src/manifest.ts
var PLUGIN_ID = "honcho-ai.paperclip-honcho";
var manifest = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Honcho Memory",
  description: "Tool-first Honcho memory integration for Paperclip companies, agents, issues, comments, and documents.",
  author: "Honcho AI",
  categories: ["connector", "automation", "ui"],
  capabilities: [
    "companies.read",
    "projects.read",
    "project.workspaces.read",
    "issues.read",
    "issue.comments.read",
    "issue.documents.read",
    "agents.read",
    "plugin.state.read",
    "plugin.state.write",
    "events.subscribe",
    "jobs.schedule",
    "agent.tools.register",
    "http.outbound",
    "instance.settings.register",
    "ui.detailTab.register",
    "ui.action.register"
  ],
  instanceConfigSchema: {
    type: "object",
    properties: {
      honchoApiBaseUrl: {
        type: "string",
        title: "Honcho API Base URL",
        default: DEFAULT_CONFIG.honchoApiBaseUrl
      },
      honchoApiKey: {
        type: "string",
        title: "Honcho API Key",
        description: "Paste your Honcho API key directly. If left blank, the plugin falls back to a HONCHO_API_KEY environment variable on the worker process, then to the shared ~/.honcho/config.json used by Hermes/Claude Code/opencode.",
        default: DEFAULT_CONFIG.honchoApiKey
      },
      workspacePrefix: {
        type: "string",
        title: "Workspace Prefix",
        default: DEFAULT_CONFIG.workspacePrefix
      },
      syncIssueComments: {
        type: "boolean",
        title: "Sync Issue Comments",
        default: DEFAULT_CONFIG.syncIssueComments
      },
      syncIssueDocuments: {
        type: "boolean",
        title: "Sync Issue Documents",
        default: DEFAULT_CONFIG.syncIssueDocuments
      },
      enablePromptContext: {
        type: "boolean",
        title: "Inject Honcho Prompt Context",
        default: DEFAULT_CONFIG.enablePromptContext
      },
      agentRuntimeHomePathTemplate: {
        type: "string",
        title: "Agent Runtime Home Path Template",
        description: `Absolute path template for this company's Codex CLI runtime home (e.g. /path/to/.paperclip/instances/default/companies/{companyId}/codex-home), with {companyId} substituted automatically. When set, clicking "Initialize Honcho memory" writes a small MCP bridge script here and registers it in that home's config.toml, so agents can call this plugin's Honcho tools on demand instead of only receiving pushed context. Leave blank to disable. Machine-specific; only applies to Codex-based agents on this host.`,
        default: DEFAULT_CONFIG.agentRuntimeHomePathTemplate
      },
      enablePeerChat: {
        type: "boolean",
        title: "Enable Peer Chat Tool",
        default: DEFAULT_CONFIG.enablePeerChat
      },
      observe_me: {
        type: "boolean",
        title: "Observe Current Agent",
        default: DEFAULT_CONFIG.observe_me
      },
      observe_others: {
        type: "boolean",
        title: "Observe Other Participants",
        default: DEFAULT_CONFIG.observe_others
      },
      noisePatterns: {
        type: "array",
        title: "Custom Noise Patterns",
        items: { type: "string" },
        default: DEFAULT_CONFIG.noisePatterns
      },
      disableDefaultNoisePatterns: {
        type: "boolean",
        title: "Disable Default Noise Patterns",
        default: DEFAULT_CONFIG.disableDefaultNoisePatterns
      },
      stripPlatformMetadata: {
        type: "boolean",
        title: "Strip Platform Metadata",
        default: DEFAULT_CONFIG.stripPlatformMetadata
      },
      flushBeforeReset: {
        type: "boolean",
        title: "Flush Before Reset",
        default: DEFAULT_CONFIG.flushBeforeReset
      },
      useLocalHonchoConfig: {
        type: "boolean",
        title: "Use Local Honcho Config",
        description: "On by default: reuse the shared local Honcho config (~/.honcho/config.json, as used by Hermes and Claude Code) for the API key when no key is configured above or via HONCHO_API_KEY. Applies to self-hosted/local Paperclip. Turn off to force a keyless or explicitly-configured-only setup.",
        default: DEFAULT_CONFIG.useLocalHonchoConfig
      },
      bootstrapLocalHonchoConfig: {
        type: "boolean",
        title: "Bootstrap Local Honcho Config",
        description: "Off by default: when a Honcho API key is configured above, write it to ~/.honcho/config.json if that file doesn't already exist, so Hermes/Claude Code/opencode on this box can reuse it too. Never overwrites an existing file. Only makes sense for a single-tenant, self-hosted Paperclip instance running on the same machine.",
        default: DEFAULT_CONFIG.bootstrapLocalHonchoConfig
      },
      dlpGatewayUrl: {
        type: "string",
        title: "B4 DLP Gateway URL",
        description: "Base URL of a memory_write DLP gateway (Presidio NER + OPA policy) to check issue comments and document revisions against before they are written to Honcho. Leave blank to disable this gate.",
        default: DEFAULT_CONFIG.dlpGatewayUrl
      },
      dlpGatewayToken: {
        type: "string",
        title: "B4 DLP Gateway Bearer Token",
        default: DEFAULT_CONFIG.dlpGatewayToken
      },
      dlpDefaultGuild: {
        type: "string",
        title: "B4 DLP Guild Label",
        description: "Label sent to the DLP gateway's policy engine for this company's content. This plugin has no native guild concept, so this is a fixed operator-set value.",
        default: DEFAULT_CONFIG.dlpDefaultGuild
      }
    }
  },
  entrypoints: {
    worker: "./dist/worker-bootstrap.js",
    ui: "./dist/ui"
  },
  jobs: [
    {
      jobKey: JOB_KEYS.initializeMemory,
      displayName: "Initialize Memory",
      description: "Connects Honcho, creates core mappings, imports baseline issue memory, and verifies manual prompt previews."
    }
  ],
  tools: [
    {
      name: TOOL_NAMES.getIssueContext,
      displayName: "Honcho Issue Context",
      description: "Retrieve compact Honcho context for the current issue session.",
      parametersSchema: {
        type: "object",
        properties: {
          issueId: { type: "string" }
        }
      }
    },
    {
      name: TOOL_NAMES.searchMemory,
      displayName: "Honcho Search Memory",
      description: "Search Honcho memory within the current workspace, narrowing to the current issue by default.",
      parametersSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          issueId: { type: "string" },
          scope: { type: "string", enum: ["workspace", "session"] },
          limit: { type: "number" }
        },
        required: ["query"]
      }
    },
    {
      name: TOOL_NAMES.askPeer,
      displayName: "Honcho Ask Peer",
      description: "Query Honcho peer chat for a target peer. Requires peer chat to be enabled in plugin config.",
      parametersSchema: {
        type: "object",
        properties: {
          targetPeerId: { type: "string" },
          query: { type: "string" },
          issueId: { type: "string" }
        },
        required: ["targetPeerId", "query"]
      }
    },
    {
      name: TOOL_NAMES.getWorkspaceContext,
      displayName: "Honcho Workspace Context",
      description: "Retrieve broad workspace recall from Honcho.",
      parametersSchema: {
        type: "object",
        properties: {
          query: { type: "string" }
        }
      }
    },
    {
      name: TOOL_NAMES.searchMessages,
      displayName: "Honcho Search Messages",
      description: "Search raw Honcho messages.",
      parametersSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          issueId: { type: "string" },
          limit: { type: "number" }
        },
        required: ["query"]
      }
    },
    {
      name: TOOL_NAMES.searchConclusions,
      displayName: "Honcho Search Conclusions",
      description: "Search high-signal summarized Honcho memory.",
      parametersSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          issueId: { type: "string" },
          limit: { type: "number" }
        },
        required: ["query"]
      }
    },
    {
      name: TOOL_NAMES.getSession,
      displayName: "Honcho Session",
      description: "Retrieve issue session context from Honcho.",
      parametersSchema: {
        type: "object",
        properties: {
          issueId: { type: "string" }
        }
      }
    },
    {
      name: TOOL_NAMES.getAgentContext,
      displayName: "Honcho Agent Context",
      description: "Retrieve peer context for a specific agent.",
      parametersSchema: {
        type: "object",
        properties: {
          agentId: { type: "string" },
          issueId: { type: "string" }
        },
        required: ["agentId"]
      }
    },
    {
      name: TOOL_NAMES.getHierarchyContext,
      displayName: "Honcho Hierarchy Context",
      description: "Retrieve delegated work context when the host provides lineage metadata.",
      parametersSchema: {
        type: "object",
        properties: {
          runId: { type: "string" },
          issueId: { type: "string" }
        }
      }
    }
  ],
  ui: {
    slots: [
      {
        type: "settingsPage",
        id: SLOT_IDS.settingsPage,
        displayName: "Honcho Settings",
        exportName: EXPORT_NAMES.settingsPage
      },
      {
        type: "detailTab",
        id: SLOT_IDS.issueTab,
        displayName: "Memory",
        exportName: EXPORT_NAMES.issueTab,
        entityTypes: ["issue"],
        order: 40
      }
    ],
    launchers: [
      {
        id: "honcho-memory-launcher",
        displayName: "Honcho Memory",
        placementZone: "globalToolbarButton",
        action: {
          type: "openDrawer",
          target: EXPORT_NAMES.toolbarButton
        },
        render: {
          environment: "hostOverlay"
        }
      }
    ]
  }
};
var manifest_default = manifest;
export {
  manifest_default as default
};
//# sourceMappingURL=manifest.js.map
