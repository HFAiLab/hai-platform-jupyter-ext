import { ILayoutRestorer } from '@jupyterlab/application'
import { IMainMenu } from '@jupyterlab/mainmenu'
import { Menu } from '@lumino/widgets'
import { ICommandPalette } from '@jupyterlab/apputils'
import { IFileBrowserFactory } from '@jupyterlab/filebrowser'
import { ILauncher } from '@jupyterlab/launcher'
import { Token } from '@lumino/coreutils'
import { Context } from '@/contextManager'
import { IStatusBar } from '@jupyterlab/statusbar'
import { ISettingRegistry } from '@jupyterlab/settingregistry'
import {
    getStudioBFFURL,
    getStudioWSURL,
    getStudioClusterServerURL,
    getDocURL
} from '@hai-platform/shared'

export const VERSION = '7.14.4'

export namespace CONSTS {
    export const WORKSPACE_ROOT_STR = '<workspace_root>'
    export const INVALID_GROUP = 'FAILED'
    export const DEFAULT_LOG_VIEWER_HEADER_HEIGHT = 34
    export const EXTENSION_CONFIG_KEY = 'jupyterlab_hai_platform_ext:config' // 目前这里只放 token，重启 hub 的时候会被重置
    export const EXTENSION_CONFIG_SETTINGS_KEY = 'jupyterlab_hai_platform_ext:settings' // 其他 settings
    export const CREATING_SETTINGS_KEY = '@HFAILab:CREATE_SETTINGS:'
    export const CREATING_SETTING_DEFAULT_NAME = '##DEFAULT_FILENAME##'
    export const CLOSED_MESSAGE = '@HFAILab:CLOSED_MESSAGE'
    export const SETTING_SHOW_NODES = '@HFAILab:SHOW_NODES'
    export const SETTING_SHOW_LINE_TIME = '@HFAILab:SHOW_LINE_TIME'
    export const SETTING_AUTO_SHOW_LOG = '@HFAILab:AUTO_SHOW_LOG'
    export const SETTING_TRAINING_CUSTOM_COLUMNS =
        '@HFAILab:TRAINING_CUSTOM_COLUMNS'
    export const DEFAULT_PRIORITY_VALUE_INTERNAL = 30
    export const DEFAULT_PRIORITY_VALUE_EXTERNAL = 0
    export const MEM_METRICS_REFRESH_INTERVAL_SEC = 5
    export const CLUSTER_REFRESH_INTERVAL_SEC = 30
    export const IPYNB_DANGEROUS_SIZE = 5 * 1024 * 1024 // > 1MB 时候提醒用户
    export const TRAININGS_TITLE = 'AILAB Trainings' // Trainings 页面的标题
    export const GLOBAL_TITLE = 'HF AILAB' // Trainings 页面的标题
    export const DEFAULT_TRAINING_CUSTOM_COLUMNS = [
        'gpu_util',
        'ib_rx',
        'ib_tx'
    ]
}

export namespace OpenCommands {
    export const LogViewer = 'jupyterlab_hai_platform_ext/LogViewer:open'
    export const InfoPanel = 'jupyterlab_hai_platform_ext/InfoPanel:open'
    export const ExtensionLogs = 'jupyterlab_hai_platform_ext/ExtensionLogs:open'
    export const NavigatorPanel = 'jupyterlab_hai_platform_ext/Navigator:open'
    export const ExperimentSidePanel = 'jupyterlab_hai_platform_ext/ExperimentSidePanel:open'
    export const PerformanceChart = 'jupyterlab_hai_platform_ext/PerformanceChart:open'
    export const ShowSidePanel = 'jupyterlab_hai_platform_ext/ExperimentSidePanel:show'

    // Widgets
    export const User = 'jupyterlab_hai_platform_ext/Widget_User:open'
    export const Dashboard = 'jupyterlab_hai_platform_ext/Widget_Dashboard:open'
    export const MyTrainings = 'jupyterlab_hai_platform_ext/Widget_MyTrainings:open'
    export const Timeline = 'jupyterlab_hai_platform_ext/Widget_Timeline:open'
    export const AvailablePath = 'jupyterlab_hai_platform_ext/Widget_AvailablePath:open'
    export const IoConnectionTip = 'jupyterlab_hai_platform_ext/IoConnectionTip:open'
}

export namespace FuncCommands {
    export const OpenInNewBrowserTab = 'jupyterlab_hai_platform_ext/Func:openInNewBrowserTab'
    export const ConvertIpynb = 'jupyterlab_hai_platform_ext/Func:convertIpynb'
    export const ClearOutputOfIpynb = 'jupyterlab_hai_platform_ext/Func:clearOutputOfIpynb'
    export const CreatePyFile = 'jupyterlab_hai_platform_ext/Func:createPyFile'
    export const CreateShFile = 'jupyterlab_hai_platform_ext/Func:createShFile'
    export const CreateIpynbFile = 'jupyterlab_hai_platform_ext/Func:createIpynbFile'
}

export namespace HideCommands {
    export const InfoPanel = 'jupyterlab_hai_platform_ext/InfoPanel:hide'
    export const ExperimentSidePanel = 'jupyterlab_hai_platform_ext/ExperimentSidePanel:hide'
    export const IoConnectionTip = 'jupyterlab_hai_platform_ext/IoConnectionTip:hide'
}

export namespace HFHubCommands {
    export const HFHubControlPanel = 'hfhub:control-panel'
}

export namespace TopWidgetRanks {
    export const StatusSpanRank = 1980
    export const IoConnectionTipRank = 1990
    export const ServerDebugTip = 1993
    export const KernelURLRank = 1995
    export const ApplySSHRank = 2000
    export const MemoryMetricsRank = 2010
    export const ClusterInfoRank = 2020
    export const RenewMetricsRank = 2030
}

export interface RequiredPlugins {
    hfMenu: Menu
    mainMenu: IMainMenu
    restorer: ILayoutRestorer
    palette: ICommandPalette
    fbFactory: IFileBrowserFactory
    launcher: ILauncher
    statusBar: IStatusBar
    settingRegistry: ISettingRegistry
}

export const IHFContext = new Token<Context>('jupyterlab_hai_platform_ext:Extension:Context')

declare global {
    interface Window {
        getProductionWSSUrl: () => string
    }
}

const commonGetURLProps = {
    internal: window._hf_user_if_in,
    prepub: false // 默认都是线上，本地等其他场景的话手动修改
}

export function getBFFUrl() {
    return getStudioBFFURL(commonGetURLProps)
}

window.getProductionWSSUrl = () => {
    return getStudioWSURL(commonGetURLProps)
}

export const getProxyUrl = () => `${getBFFUrl()}/proxy/s`
export const getCountlyBffUrl = () => `${getBFFUrl()}/report/countly/i`

export const getMarsServerURL = () => {
    // 如果需要测试，直接在这里返回测试需要的地址
    return (
        window._d_mars_server_url ||
        getStudioClusterServerURL(commonGetURLProps)
    )
}

export const getMarsServerHost = () => {
    return window._d_mars_server_host
}

export const hasCustomMarsServer = () => {
    return !!window._d_mars_server_url
}

export const DebugAilabServerPathWhiteList = [
    'trainings/user/safe_get_user_info',
    'trainings/user_config/get_config_text',
    'trainings/log_upload/query_should_upload',
    'trainings/data_panel/user_node_quota_info'
]

export const docURL = getDocURL(commonGetURLProps)

export const getGuides = () => {
    return [
        // OPENSOURCE_DELETE_BEGIN
        {
            title: '集群基本介绍',
            desc: '学习如何使用幻方萤火集群',
            URL: docURL + 'start/hfai_intro.html'
        },
        {
            title: '分时调度策略',
            desc: '了解幻方萤火集群服务的分时调度策略',
            URL: docURL + 'guide/schedule.html#'
        }
        // OPENSOURCE_DELETE_END
    ]
}

export const MESSAGE_MANAGER = {
    refreshInterval: 5 * 60 * 1000
}

export const LOG_REFRESH_TOASTER_TIMEOUT = 1500
