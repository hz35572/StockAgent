import type React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from '../SettingsPage';

const {
  exportEnv,
  importEnv,
  desktopCheckForUpdates,
  desktopGetUpdateState,
  desktopInstallDownloadedUpdate,
  desktopOnUpdateStateChange,
  desktopOpenReleasePage,
  load,
  clearToast,
  setActiveCategory,
  save,
  resetDraft,
  setDraftValue,
  applyPartialUpdate,
  refreshAfterExternalSave,
  refreshStatus,
  settingsPanelErrorBoundary,
  useAuthMock,
  useSystemConfigMock,
  webBuildInfoMock,
} = vi.hoisted(() => ({
  exportEnv: vi.fn(),
  importEnv: vi.fn(),
  desktopCheckForUpdates: vi.fn(),
  desktopGetUpdateState: vi.fn(),
  desktopInstallDownloadedUpdate: vi.fn(),
  desktopOnUpdateStateChange: vi.fn(),
  desktopOpenReleasePage: vi.fn(),
  load: vi.fn(),
  clearToast: vi.fn(),
  setActiveCategory: vi.fn(),
  save: vi.fn(),
  resetDraft: vi.fn(),
  setDraftValue: vi.fn(),
  applyPartialUpdate: vi.fn(),
  refreshAfterExternalSave: vi.fn(),
  refreshStatus: vi.fn(),
  settingsPanelErrorBoundary: vi.fn(),
  useAuthMock: vi.fn(),
  useSystemConfigMock: vi.fn(),
  webBuildInfoMock: {
    version: '3.11.0',
    rawVersion: '3.11.0',
    buildId: 'build-20260329-021530Z',
    buildTime: '2026-03-29T02:15:30.000Z',
    isFallbackVersion: false,
  },
}));

const mockedAnchorClick = vi.fn();

vi.mock('../../hooks', () => ({
  useAuth: () => useAuthMock(),
  useSystemConfig: () => useSystemConfigMock(),
}));

vi.mock('../../api/systemConfig', () => ({
  systemConfigApi: {
    exportEnv: (...args: unknown[]) => exportEnv(...args),
    importEnv: (...args: unknown[]) => importEnv(...args),
  },
}));

vi.mock('../../utils/constants', async () => {
  const actual = await vi.importActual<typeof import('../../utils/constants')>('../../utils/constants');
  return {
    ...actual,
    WEB_BUILD_INFO: webBuildInfoMock,
  };
});

vi.mock('../../components/settings', () => ({
  AuthSettingsCard: () => <div>认证与登录保护</div>,
  ChangePasswordCard: () => <div>修改密码</div>,
  IntelligentImport: ({ onMerged }: { onMerged: (value: string) => void }) => (
    <button type="button" onClick={() => onMerged('SZ000001,SZ000002')}>
      merge stock list
    </button>
  ),
  LLMChannelEditor: ({
    onSaved,
  }: {
    onSaved: (items: Array<{ key: string; value: string }>) => void;
  }) => (
    <button
      type="button"
      onClick={() => onSaved([{ key: 'LLM_CHANNELS', value: 'primary,backup' }])}
    >
      save llm channels
    </button>
  ),
  NotificationTestPanel: ({ items }: { items: Array<{ key: string; value: string }> }) => (
    <div>通知测试面板:{items.map((item) => item.key).join(',')}</div>
  ),
  SettingsAlert: ({
    title,
    message,
    actionLabel,
    onAction,
  }: {
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  }) => (
    <div>
      {title}:{message}
      {actionLabel ? (
        <button type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  ),
  SettingsCategoryNav: ({
    categories,
    activeCategory,
    onSelect,
  }: {
    categories: Array<{ category: string; title: string }>;
    activeCategory: string;
    onSelect: (value: string) => void;
  }) => (
    <nav>
      {categories.map((category) => (
        <button
          key={category.category}
          type="button"
          aria-pressed={activeCategory === category.category}
          onClick={() => onSelect(category.category)}
        >
          {category.title}
        </button>
      ))}
    </nav>
  ),
  SettingsField: ({
    item,
    showHelpButton = true,
    showHelpDocs = true,
  }: {
    item: {
      key: string;
      schema?: {
        description?: string;
        options?: Array<string | { label: string; value: string }>;
      };
    };
    showHelpButton?: boolean;
    showHelpDocs?: boolean;
  }) => (
    <div>
      <div>{item.key}</div>
      {showHelpButton ? <button type="button">查看 {item.key} 配置说明</button> : null}
      {showHelpDocs ? <div>{item.key} 相关文档显示</div> : <div>{item.key} 相关文档隐藏</div>}
      {item.schema?.description ? <p>{item.schema.description}</p> : null}
      {item.schema?.options?.map((option) => {
        const label = typeof option === 'string' ? option : option.label;
        const value = typeof option === 'string' ? option : option.value;
        return <span key={`${item.key}-${value}`}>{label}</span>;
      })}
    </div>
  ),
  SettingsLoading: () => <div>loading</div>,
  SettingsPanelErrorBoundary: ({
    title,
    diagnosticHint,
    children,
  }: {
    title: string;
    diagnosticHint?: React.ReactNode;
    children: React.ReactNode;
  }) => {
    settingsPanelErrorBoundary(title);
    return (
      <>
        {diagnosticHint ? <div>{diagnosticHint}</div> : null}
        {children}
      </>
    );
  },
  SettingsSectionCard: ({
    title,
    description,
    children,
  }: {
    title: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  ),
}));

function createDesktopRuntime(overrides: Record<string, unknown> = {}) {
  return {
    version: '3.12.0',
    getUpdateState: desktopGetUpdateState,
    checkForUpdates: desktopCheckForUpdates,
    installDownloadedUpdate: desktopInstallDownloadedUpdate,
    openReleasePage: desktopOpenReleasePage,
    onUpdateStateChange: desktopOnUpdateStateChange,
    ...overrides,
  };
}

const baseCategories = [
  { category: 'system', title: 'System', description: '系统设置', displayOrder: 1, fields: [] },
  { category: 'base', title: 'Base', description: '基础配置', displayOrder: 2, fields: [] },
  { category: 'ai_model', title: 'AI 模型', description: '模型配置', displayOrder: 3, fields: [] },
  { category: 'data_source', title: '数据源', description: '数据源配置', displayOrder: 4, fields: [] },
  { category: 'notification', title: '通知渠道', description: '通知配置', displayOrder: 5, fields: [] },
  { category: 'agent', title: 'Agent', description: 'Agent 配置', displayOrder: 6, fields: [] },
];

type ConfigState = {
  categories: Array<{ category: string; title: string; description: string; displayOrder: number; fields: [] }>;
  itemsByCategory: Record<string, Array<Record<string, unknown>>>;
  issueByKey: Record<string, unknown[]>;
  activeCategory: string;
  setActiveCategory: typeof setActiveCategory;
  hasDirty: boolean;
  dirtyCount: number;
  toast: null;
  clearToast: typeof clearToast;
  isLoading: boolean;
  isSaving: boolean;
  loadError: null;
  saveError: null;
  retryAction: null;
  load: typeof load;
  retry: ReturnType<typeof vi.fn>;
  save: typeof save;
  resetDraft: typeof resetDraft;
  setDraftValue: typeof setDraftValue;
  applyPartialUpdate: typeof applyPartialUpdate;
  refreshAfterExternalSave: typeof refreshAfterExternalSave;
  configVersion: string;
  maskToken: string;
};

type ConfigOverride = Partial<ConfigState>;

function buildSystemConfigState(overrides: ConfigOverride = {}) {
  return {
    categories: baseCategories,
    itemsByCategory: {
      system: [
        {
          key: 'ADMIN_AUTH_ENABLED',
          value: 'true',
          rawValueExists: true,
          isMasked: false,
          schema: {
            key: 'ADMIN_AUTH_ENABLED',
            category: 'system',
            dataType: 'boolean',
            uiControl: 'switch',
            isSensitive: false,
            isRequired: false,
            isEditable: true,
            options: [],
            validation: {},
            displayOrder: 1,
          },
        },
      ],
      base: [
        {
          key: 'STOCK_LIST',
          value: 'SH600000',
          rawValueExists: true,
          isMasked: false,
          schema: {
            key: 'STOCK_LIST',
            category: 'base',
            dataType: 'string',
            uiControl: 'textarea',
            isSensitive: false,
            isRequired: false,
            isEditable: true,
            options: [],
            validation: {},
            displayOrder: 1,
          },
        },
      ],
      data_source: [
        {
          key: 'TICKFLOW_API_KEY',
          value: 'tickflow-key',
          rawValueExists: true,
          isMasked: false,
          schema: {
            key: 'TICKFLOW_API_KEY',
            category: 'data_source',
            dataType: 'string',
            uiControl: 'password',
            isSensitive: true,
            isRequired: false,
            isEditable: true,
            options: [],
            validation: {},
            displayOrder: 1,
          },
        },
        {
          key: 'REALTIME_SOURCE_PRIORITY',
          value: 'tencent,sina',
          rawValueExists: true,
          isMasked: false,
          schema: {
            key: 'REALTIME_SOURCE_PRIORITY',
            category: 'data_source',
            dataType: 'string',
            uiControl: 'textarea',
            isSensitive: false,
            isRequired: false,
            isEditable: true,
            options: [],
            validation: {},
            displayOrder: 2,
          },
        },
        {
          key: 'TAVILY_API_KEYS',
          value: 'tavily-key',
          rawValueExists: true,
          isMasked: false,
          schema: {
            key: 'TAVILY_API_KEYS',
            category: 'data_source',
            dataType: 'string',
            uiControl: 'password',
            isSensitive: true,
            isRequired: false,
            isEditable: true,
            options: [],
            validation: {},
            displayOrder: 3,
          },
        },
        {
          key: 'SERPAPI_API_KEYS',
          value: 'serp-key',
          rawValueExists: true,
          isMasked: false,
          schema: {
            key: 'SERPAPI_API_KEYS',
            category: 'data_source',
            dataType: 'string',
            uiControl: 'password',
            isSensitive: true,
            isRequired: false,
            isEditable: true,
            options: [],
            validation: {},
            displayOrder: 4,
          },
        },
        {
          key: 'NEWS_MAX_AGE_DAYS',
          value: '7',
          rawValueExists: true,
          isMasked: false,
          schema: {
            key: 'NEWS_MAX_AGE_DAYS',
            category: 'data_source',
            dataType: 'integer',
            uiControl: 'number',
            isSensitive: false,
            isRequired: false,
            isEditable: true,
            options: [],
            validation: {},
            displayOrder: 5,
          },
        },
        {
          key: 'NEWS_STRATEGY_PROFILE',
          value: 'short',
          rawValueExists: true,
          isMasked: false,
          schema: {
            key: 'NEWS_STRATEGY_PROFILE',
            category: 'data_source',
            dataType: 'string',
            uiControl: 'select',
            isSensitive: false,
            isRequired: false,
            isEditable: true,
            options: ['ultra_short', 'short', 'medium', 'long'],
            validation: {},
            displayOrder: 6,
          },
        },
        {
          key: 'TUSHARE_TOKEN',
          value: 'tushare-token',
          rawValueExists: true,
          isMasked: false,
          schema: {
            key: 'TUSHARE_TOKEN',
            category: 'data_source',
            dataType: 'string',
            uiControl: 'password',
            isSensitive: true,
            isRequired: false,
            isEditable: true,
            options: [],
            validation: {},
            displayOrder: 7,
          },
        },
        {
          key: 'SEARXNG_BASE_URLS',
          value: 'https://search.example.com',
          rawValueExists: true,
          isMasked: false,
          schema: {
            key: 'SEARXNG_BASE_URLS',
            category: 'data_source',
            dataType: 'string',
            uiControl: 'textarea',
            isSensitive: false,
            isRequired: false,
            isEditable: true,
            options: [],
            validation: {},
            displayOrder: 8,
          },
        },
      ],
      ai_model: [
        {
          key: 'LLM_CHANNELS',
          value: 'primary',
          rawValueExists: true,
          isMasked: false,
          schema: {
            key: 'LLM_CHANNELS',
            category: 'ai_model',
            dataType: 'string',
            uiControl: 'textarea',
            isSensitive: false,
            isRequired: false,
            isEditable: true,
            options: [],
            validation: {},
            displayOrder: 1,
          },
        },
      ],
      agent: [
        {
          key: 'AGENT_ORCHESTRATOR_TIMEOUT_S',
          value: '600',
          rawValueExists: true,
          isMasked: false,
          schema: {
            key: 'AGENT_ORCHESTRATOR_TIMEOUT_S',
            category: 'agent',
            dataType: 'integer',
            uiControl: 'number',
            isSensitive: false,
            isRequired: false,
            isEditable: true,
            options: [],
            validation: {},
            displayOrder: 1,
          },
        },
      ],
      notification: [
        {
          key: 'WECHAT_WEBHOOK_URL',
          value: 'https://qyapi.example.com/hook',
          rawValueExists: true,
          isMasked: false,
          schema: {
            key: 'WECHAT_WEBHOOK_URL',
            category: 'notification',
            dataType: 'string',
            uiControl: 'password',
            isSensitive: true,
            isRequired: false,
            isEditable: true,
            options: [],
            validation: {},
            displayOrder: 1,
          },
        },
        {
          key: 'FEISHU_WEBHOOK_URL',
          value: 'https://open.feishu.cn/open-apis/bot/v2/hook/mock',
          rawValueExists: true,
          isMasked: false,
          schema: {
            key: 'FEISHU_WEBHOOK_URL',
            category: 'notification',
            dataType: 'string',
            uiControl: 'password',
            isSensitive: true,
            isRequired: false,
            isEditable: true,
            options: [],
            validation: {},
            displayOrder: 2,
          },
        },
        {
          key: 'DINGTALK_APP_KEY',
          value: 'ding-app-key',
          rawValueExists: true,
          isMasked: false,
          schema: {
            key: 'DINGTALK_APP_KEY',
            category: 'notification',
            dataType: 'string',
            uiControl: 'password',
            isSensitive: true,
            isRequired: false,
            isEditable: true,
            options: [],
            validation: {},
            displayOrder: 3,
          },
        },
        {
          key: 'FEISHU_APP_ID',
          value: 'cli_mock',
          rawValueExists: true,
          isMasked: false,
          schema: {
            key: 'FEISHU_APP_ID',
            category: 'notification',
            dataType: 'string',
            uiControl: 'password',
            isSensitive: true,
            isRequired: false,
            isEditable: true,
            options: [],
            validation: {},
            displayOrder: 4,
          },
        },
        {
          key: 'PUSHPLUS_TOKEN',
          value: 'pushplus-token',
          rawValueExists: true,
          isMasked: false,
          schema: {
            key: 'PUSHPLUS_TOKEN',
            category: 'notification',
            dataType: 'string',
            uiControl: 'password',
            isSensitive: true,
            isRequired: false,
            isEditable: true,
            options: [],
            validation: {},
            displayOrder: 4,
          },
        },
      ],
    },
    issueByKey: {},
    activeCategory: 'ai_model',
    setActiveCategory,
    hasDirty: false,
    dirtyCount: 0,
    toast: null,
    clearToast,
    isLoading: false,
    isSaving: false,
    loadError: null,
    saveError: null,
    retryAction: null,
    load,
    retry: vi.fn(),
    save,
    resetDraft,
    setDraftValue,
    applyPartialUpdate,
    refreshAfterExternalSave,
    configVersion: 'v1',
    maskToken: '******',
    ...overrides,
  };
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    Object.assign(webBuildInfoMock, {
      version: '3.11.0',
      rawVersion: '3.11.0',
      buildId: 'build-20260329-021530Z',
      buildTime: '2026-03-29T02:15:30.000Z',
      isFallbackVersion: false,
    });
    load.mockResolvedValue(true);
    exportEnv.mockResolvedValue({
      content: 'STOCK_LIST=600519\n',
      configVersion: 'v1',
      updatedAt: '2026-03-21T00:00:00Z',
    });
    importEnv.mockResolvedValue({
      success: true,
      configVersion: 'v2',
      appliedCount: 1,
      skippedMaskedCount: 0,
      reloadTriggered: true,
      updatedKeys: ['STOCK_LIST'],
      warnings: [],
    });
    desktopGetUpdateState.mockResolvedValue({
      status: 'idle',
      currentVersion: '3.12.0',
      latestVersion: '',
      message: '',
    });
    desktopCheckForUpdates.mockResolvedValue({
      status: 'up-to-date',
      currentVersion: '3.12.0',
      latestVersion: '3.12.0',
      message: '当前桌面端已是最新版本。',
    });
    desktopInstallDownloadedUpdate.mockResolvedValue(true);
    desktopOpenReleasePage.mockResolvedValue(true);
    desktopOnUpdateStateChange.mockImplementation(() => () => undefined);
    useAuthMock.mockReturnValue({
      authEnabled: true,
      passwordChangeable: true,
      refreshStatus,
    });
    useSystemConfigMock.mockReturnValue(buildSystemConfigState());
    delete (window as { dsaDesktop?: unknown }).dsaDesktop;
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(mockedAnchorClick);
  });

  it('renders only AI model, data source, and notification settings categories', async () => {
    render(<SettingsPage />);

    expect(await screen.findByRole('heading', { name: '系统设置' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AI 模型' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '数据源' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '通知渠道' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'System' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Base' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agent' })).not.toBeInTheDocument();
    expect(screen.queryByText('认证与登录保护')).not.toBeInTheDocument();
    expect(screen.queryByText('修改密码')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '版本信息' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '配置备份' })).not.toBeInTheDocument();
    expect(load).toHaveBeenCalled();
  });

  it('resets local drafts from the page header button', () => {
    useSystemConfigMock.mockReturnValue(buildSystemConfigState({ hasDirty: true, dirtyCount: 2 }));

    render(<SettingsPage />);

    // Clear the initial load call from useEffect
    vi.clearAllMocks();

    fireEvent.click(screen.getByRole('button', { name: '重置' }));

    // Reset should call resetDraft and NOT call load
    expect(resetDraft).toHaveBeenCalledTimes(1);
    expect(load).not.toHaveBeenCalled();
  });

  it('redirects hidden active categories to the first visible settings category', () => {
    useSystemConfigMock.mockReturnValue(buildSystemConfigState({ activeCategory: 'agent' }));

    render(<SettingsPage />);

    expect(setActiveCategory).toHaveBeenCalledWith('ai_model');
    expect(screen.getByText('AI 模型接入')).toBeInTheDocument();
    expect(screen.queryByText('AGENT_ORCHESTRATOR_TIMEOUT_S')).not.toBeInTheDocument();
  });

  it('reset button semantic: discards local changes without network request', () => {
    // Simulate user has unsaved drafts
    const dirtyState = buildSystemConfigState({
      hasDirty: true,
      dirtyCount: 2,
    });

    useSystemConfigMock.mockReturnValue(dirtyState);

    render(<SettingsPage />);

    // Clear initial useEffect load call
    vi.clearAllMocks();

    // Click reset button
    fireEvent.click(screen.getByRole('button', { name: '重置' }));

    // Verify semantic: reset should only discard local changes
    // It should NOT trigger a network load
    expect(resetDraft).toHaveBeenCalledTimes(1);
    expect(load).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('only renders selected data source fields on the data source settings page', () => {
    useSystemConfigMock.mockReturnValue(buildSystemConfigState({ activeCategory: 'data_source' }));

    render(<SettingsPage />);

    expect(screen.getByText('TICKFLOW_API_KEY')).toBeInTheDocument();
    expect(screen.getByText('REALTIME_SOURCE_PRIORITY')).toBeInTheDocument();
    expect(screen.getByText('TAVILY_API_KEYS')).toBeInTheDocument();
    expect(screen.getByText('SERPAPI_API_KEYS')).toBeInTheDocument();
    expect(screen.getByText('NEWS_MAX_AGE_DAYS')).toBeInTheDocument();
    expect(screen.getByText('NEWS_STRATEGY_PROFILE')).toBeInTheDocument();
    expect(screen.queryByText('STOCK_LIST')).not.toBeInTheDocument();
    expect(screen.queryByText('TUSHARE_TOKEN')).not.toBeInTheDocument();
    expect(screen.queryByText('SEARXNG_BASE_URLS')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '查看 REALTIME_SOURCE_PRIORITY 配置说明' })).toBeInTheDocument();
    expect(screen.getByText('REALTIME_SOURCE_PRIORITY 相关文档隐藏')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '查看 TICKFLOW_API_KEY 配置说明' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '查看 TAVILY_API_KEYS 配置说明' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '查看 SERPAPI_API_KEYS 配置说明' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '查看 NEWS_MAX_AGE_DAYS 配置说明' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '查看 NEWS_STRATEGY_PROFILE 配置说明' })).not.toBeInTheDocument();
  });

  it('refreshes server state after llm channel editor saves', async () => {
    useSystemConfigMock.mockReturnValue(buildSystemConfigState({ activeCategory: 'ai_model' }));

    render(<SettingsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'save llm channels' }));

    expect(refreshAfterExternalSave).toHaveBeenCalledWith(['LLM_CHANNELS']);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('hides generic active config panel on ai model settings page', () => {
    useSystemConfigMock.mockReturnValue(buildSystemConfigState({ activeCategory: 'ai_model' }));

    render(<SettingsPage />);

    expect(screen.getByText('AI 模型接入')).toBeInTheDocument();
    expect(screen.queryByText('当前分类配置项')).not.toBeInTheDocument();
  });

  it('only renders non-webhook Feishu and DingTalk fields on notification settings page', () => {
    useSystemConfigMock.mockReturnValue(buildSystemConfigState({ activeCategory: 'notification' }));

    render(<SettingsPage />);

    expect(screen.queryByText(/通知测试面板/)).not.toBeInTheDocument();
    expect(screen.getByText('FEISHU_APP_ID')).toBeInTheDocument();
    expect(screen.getByText('DINGTALK_APP_KEY')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '查看 FEISHU_APP_ID 配置说明' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '查看 DINGTALK_APP_KEY 配置说明' })).not.toBeInTheDocument();
    expect(screen.queryByText('FEISHU_WEBHOOK_URL')).not.toBeInTheDocument();
    expect(screen.queryByText('WECHAT_WEBHOOK_URL')).not.toBeInTheDocument();
    expect(screen.queryByText('PUSHPLUS_TOKEN')).not.toBeInTheDocument();
    expect(settingsPanelErrorBoundary).toHaveBeenCalledWith('通知设置');
  });

  it('uses browser and backend logs in settings panel diagnostic hints outside desktop runtime', () => {
    useSystemConfigMock.mockReturnValue(buildSystemConfigState({ activeCategory: 'notification' }));

    render(<SettingsPage />);

    expect(screen.getAllByText(/浏览器开发者工具控制台与后端日志/)).toHaveLength(1);
    expect(screen.queryByText('desktop.log')).not.toBeInTheDocument();
  });

  it('uses desktop log in settings panel diagnostic hints during desktop runtime', () => {
    useSystemConfigMock.mockReturnValue(buildSystemConfigState({ activeCategory: 'notification' }));
    (window as { dsaDesktop?: unknown }).dsaDesktop = createDesktopRuntime();

    render(<SettingsPage />);

    expect(screen.getAllByText('desktop.log')).toHaveLength(1);
    expect(screen.queryByText(/浏览器开发者工具控制台与后端日志/)).not.toBeInTheDocument();
  });

  it('keeps env backup and desktop update controls hidden with system settings', () => {
    (window as { dsaDesktop?: unknown }).dsaDesktop = createDesktopRuntime();

    render(<SettingsPage />);

    expect(screen.queryByRole('heading', { name: '配置备份' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '导出 .env' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '导入 .env' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '检查更新' })).not.toBeInTheDocument();
  });
});
