import {
    ILayoutRestorer,
    JupyterFrontEnd,
    JupyterFrontEndPlugin
} from '@jupyterlab/application'
import { ErrorHandler } from '@hai-platform/studio-pages/lib/utils/errorHandler'
import { IEditorTracker } from '@jupyterlab/fileeditor'
import { Context } from '@/contextManager'
import { HFLogViewer } from './widgets/LogViewer'
import { HFExtensionLogger } from './widgets/extensionLogger'
import { ISettingRegistry } from '@jupyterlab/settingregistry'
import { CONSTS, IHFContext } from './consts'
import { InfoPanel } from './widgets/InfoPanel'
import { NavigatorPanel } from './widgets/navPanel'
import { Menu } from '@lumino/widgets'
import { IMainMenu } from '@jupyterlab/mainmenu'
import { IThemeManager } from '@jupyterlab/apputils'
import { ICommandPalette } from '@jupyterlab/apputils'
import { IFileBrowserFactory } from '@jupyterlab/filebrowser'
import { ILauncher } from '@jupyterlab/launcher'
import { JupyterShellCommandsAdder } from './widgets/JupyterShellCommandsAdder'
import { ApplySSH } from './widgets/statusGroup/ApplySSH'
import { ClusterInfo } from './widgets/statusGroup/clusterInfoTopWidget'
import { MemoryMetrics } from './widgets/statusGroup/memoryMetrics'
import { RenewManager } from './widgets/statusGroup/renew'
import { TrainingsWindow } from './widgets/TrainingsManager'
import { IoConnectionTip } from './widgets/statusGroup/ioConnectionTip'
import { AvailablePathWindow } from './widgets/W_AvailablePath'
import HFLogger, { HF_LOGGER_LEVEL } from '@hai-platform/logger'
import { getGlobalErrorHandler } from './utils/errorHandler'
import { VERSION } from './consts'
import { HFPerformanceChart } from './widgets/PerformanceChart'
import { Languages, i18n } from '@hai-platform/i18n'
import {
    CountlyEventKey,
    getCurrentUserName,
    JupyterCountly
} from '@/utils/countly/countly'
import { MessengerWrapper } from './widgets/messenger'
import { PageConfig } from '@jupyterlab/coreutils'
import { IStatusBar } from '@jupyterlab/statusbar'
import { ExperimentPanel } from './widgets/experimentSidePanel'
import { getHFAPPVersion, LevelLogger, setToken } from './utils'
import { StatusSpan } from './widgets/statusGroup/statusSpan'
import { tryOpenFile } from './utils/jupyter'
import { KernelURLTip } from './widgets/statusGroup/KernelURL'
import { getUserAgentInfo } from './utils/browser'
import { GlobalVersionTrack } from './modules/versionTrack'
import { ServerDebugTip } from './widgets/statusGroup/ServerDebugTip'
import { conn } from './serverConnection'

export const HFAILabExtension: JupyterFrontEndPlugin<Context> = {
    id: 'jupyterlab_hai_platform_ext:Extension',
    requires: [
        IEditorTracker,
        ISettingRegistry,
        ILayoutRestorer,
        IMainMenu,
        ICommandPalette,
        IFileBrowserFactory,
        ILauncher,
        IThemeManager,
        IStatusBar
    ],
    autoStart: true,
    provides: IHFContext,
    activate: async (
        app: JupyterFrontEnd,
        editorTracker: IEditorTracker,
        settingRegistry: ISettingRegistry,
        restorer: ILayoutRestorer,
        mainMenu: IMainMenu,
        palette: ICommandPalette,
        fbFactory: IFileBrowserFactory,
        launcher: ILauncher,
        themeManager: IThemeManager,
        statusBar: IStatusBar
    ) => {
        const begin = Date.now()

        PageConfig.setOption('appName', CONSTS.GLOBAL_TITLE)

        
        // HFAI_DELETE_FRAGMENT_PREFIX
        // 这个要在比较前面，因为后面可能有用到请求地址的地方，很多都要被这里覆盖
        const getHAIConfig = async () => {
            const beginTime = Date.now()
            const haiConfig = await conn.getHAIConfig()
            const dur = Date.now() - beginTime
            LevelLogger.info('hfai lab getHAIConfig, cost:', dur)
            window.haiConfig = haiConfig
        }
        await getHAIConfig()
        // HFAI_DELETE_FRAGMENT_SUFFIX

        const countlyPrepare = () => {
            try {
                // 埋点：
                JupyterCountly.lazyInit()
                // 日志：
                HFLogger.initConfig({
                    dbName: 'HFAILabExtensionLog'
                })
                // 日志错误监控：
                getGlobalErrorHandler()
            } catch (e) {
                // do nothing
                console.error('countlyPrepare fatal error:', e)
            }

            return Date.now() - begin
        }

        const lanInit = async () => {
            // i18n:
            const language = await settingRegistry.get(
                '@jupyterlab/translation-extension:plugin',
                'locale'
            )
            i18n.setLanguage(language.user as Languages)
            console.log(
                'init jupyter extension, current language:',
                language,
                language.composite
            )
            return Date.now() - begin
        }

        const handler = new ErrorHandler()

        // context
        const ctx = new Context(app, editorTracker, handler, themeManager)

        const configInit = async () => {
            const [tokenSettings, configSettings] = await Promise.all([
                settingRegistry.load(CONSTS.EXTENSION_CONFIG_KEY),
                settingRegistry.load(CONSTS.EXTENSION_CONFIG_SETTINGS_KEY)
            ])

            const token = tokenSettings.get('token').composite as string
            token && setToken(token as string)

            await ctx._user.fetchUserInfo(token)
            ctx.bindUserTokenHandler(tokenSettings)
            ctx.bindUserSettingHandler(configSettings)

            return Date.now() - begin
        }

        const [
            prepareInitCost,
            lanInitCost,
            configInitCost
        ] = await Promise.all([countlyPrepare(), lanInit(), configInit()])

        JupyterCountly.safeReport(CountlyEventKey.ExtPrepareInit, {
            dur: prepareInitCost
        })
        JupyterCountly.safeReport(CountlyEventKey.ExtLanInit, {
            dur: lanInitCost,
            segmentation: {
                lan: i18n.currentLanguage
            }
        })
        JupyterCountly.safeReport(CountlyEventKey.ExtConfigInit, {
            dur: configInitCost
        })

        const browserAndVersion = getUserAgentInfo()
        const browser = browserAndVersion.split('-')[0]
        const browserAndVersionWithUser = `${browserAndVersion}-${getCurrentUserName()}`
        JupyterCountly.safeReport(CountlyEventKey.VisitBrowserVersion, {
            segmentation: {
                browserAndVersion,
                browserAndVersionWithUser,
                browser
            }
        })
        GlobalVersionTrack.reportVersionTrack()

        // menu
        const hfMenu: Menu = new Menu({ commands: app.commands })
        hfMenu.title.label = 'HFAILab'

        const p = {
            hfMenu: hfMenu,
            mainMenu,
            restorer,
            palette,
            fbFactory,
            launcher,
            statusBar,
            settingRegistry
        }

        new StatusSpan(app)

        // Experiment panel
        new ExperimentPanel(app, ctx).register(p)

        // logViewer
        new HFLogViewer(app, ctx).register(p)

        // extLogger
        new HFExtensionLogger(app, ctx).register(p)

        // infoPanel
        new InfoPanel(app, ctx).register(p)

        // navigatorPanel
        new NavigatorPanel(app, ctx).register(p)

        // copy kernel url
        new KernelURLTip(app)

        // 当前是否处于调试模式的提示
        new ServerDebugTip(app)

        // SSH apply, no need to register
        new ApplySSH(app, ctx)

        // MemoryMetrics, no need to register
        new MemoryMetrics(app)

        // renew manager:
        new RenewManager(app, ctx)

        //ClusterInfo at top corner no need to register
        new ClusterInfo(app, ctx)

        new IoConnectionTip(app)

        //PerformanceChart
        new HFPerformanceChart(app, ctx).register(p)

        //TrainingsWindow
        new TrainingsWindow(app, ctx).register(p)

        // AvailablePathWindow
        new AvailablePathWindow(app, ctx).register(p)

        // MessengerWrapper
        new MessengerWrapper(app, ctx)

        //Add shell commands
        new JupyterShellCommandsAdder(app, ctx).register(p)

        // app.docRegistry.addWidgetExtension('Notebook', new ButtonExtension());

        console.log('High-Flyer AiLab extension loaded')

        HFLogger.log(
            `High-Flyer AiLab extension loaded, version: ${VERSION}, hfappVersion: ${getHFAPPVersion()}`,
            HF_LOGGER_LEVEL.INFO
        )

        // @ts-ignore
        window.HFLogger = HFLogger

        const searchParams = new URLSearchParams(window.location.search)
        let defaultOpenFile = searchParams.get('default_open_file')
        if (defaultOpenFile) {
            defaultOpenFile = decodeURIComponent(defaultOpenFile)
            ctx.hfaiExtMount.connect(() => {
                tryOpenFile(app, defaultOpenFile!, true)
            })
        }
        const originHFUserName = searchParams.get('origin_hf_user_name')

        // 此函数是可以重复执行的
        const disableAllEditors = (): void => {
            editorTracker.forEach(doc => {
                const fileEditor = doc.content
                    // hint: 有可能后面还会被后续流程更改，所以我们这里多做几次：
                ;[200, 1000, 2000].forEach((timeout: number) => {
                    setTimeout(() => {
                        fileEditor.editor.setOption('readOnly', true)
                    }, timeout)
                })
                const codeMirrorNode = fileEditor.node.getElementsByClassName(
                    'CodeMirror cm-s-jupyter'
                )[0]
                if (codeMirrorNode) {
                    codeMirrorNode.classList.add('hf-admin-lock')
                }
            })
        }

        const widgetAddedCallback = (): void => {
            const currentOpName = originHFUserName

            if (!ctx._user.userName) {
                // 可能太早导致还没获取到用户名
                setTimeout(widgetAddedCallback, 1000)
                return
            }

            if (currentOpName && ctx._user.userName !== currentOpName) {
                disableAllEditors()
            }
        }

        // hint: 管理员登录的时候，禁用编辑能力防止误操作
        editorTracker.widgetAdded.connect(widgetAddedCallback)

        return ctx
    }
}
