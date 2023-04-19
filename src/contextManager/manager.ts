import dayjs from 'dayjs'
import { JupyterFrontEnd } from '@jupyterlab/application'
import { IEditorTracker } from '@jupyterlab/fileeditor'
import { Signal } from '@lumino/signaling'
import { CodeEditor } from '@jupyterlab/codeeditor'
import { ErrorHandler } from '@hai-platform/studio-pages/lib/utils/errorHandler'
import { User } from '../model'
import { Chain } from '@hai-platform/studio-pages/lib/index'
import { DARK_THEME_KEY, getDarkNameSpace } from '../utils'
import { FileTracker } from './fileTracker'
import { ISettingRegistry } from '@jupyterlab/settingregistry'
import { IThemeManager } from '@jupyterlab/apputils'
import { IChangedArgs } from '@jupyterlab/coreutils'
import HFLogger, { HF_LOGGER_LEVEL } from '@hai-platform/logger'
import { MessageManager } from './messageManagement'
import { i18n, i18nKeys } from '@hai-platform/i18n'
import { ExtLogHandler } from '@/extLogHandler'

export type IQueryType = 'path' | 'chainId'

export interface ChainUpdateArgs {
    chainId: string
    sender?: any
}

export interface ISidePanelChainUpdated {
    chain: Chain | null
    queryType: IQueryType
}

export class Context {
    constructor(
        app: JupyterFrontEnd,
        editorTracker: IEditorTracker,
        errorHandler: ErrorHandler,
        themeManager: IThemeManager
    ) {
        this._user = new User(errorHandler)

        /**
         * When jupyterlab's setting changed, auto handle it
         */
        this._tracker = new FileTracker({ app, editorTracker })
        this.messageManager = new MessageManager(this)

        this._errorHandler = errorHandler
        this._extLogHandler = new ExtLogHandler(app)
        this._app = app

        this.initThemeManager(themeManager)

        this.hfaiExtMount = new Signal<this, null>(this)

        this._invokeChainUpdated = new Signal<this, ChainUpdateArgs>(this)

        // 主要给侧面板用，发布更新后的 chain
        this.sidePanelChainUpdated = new Signal<
            this,
            ISidePanelChainUpdated | null
        >(this)

        this._createTaskLatch = false

        // auto_refresh
        this._auto_refresh_interval_id = 0

        this._user.settingChanged.connect(() => {
            if (this._user.settings['__ar__']) {
                this._errorHandler.success(
                    'Auto refresh bound experiment status: enabled.'
                )
                this._enableAutoRefresh()
            } else {
                if (this._auto_refresh_interval_id) {
                    clearInterval(this._auto_refresh_interval_id)
                    this._errorHandler.success(
                        'Auto refresh bound experiment status: disabled.'
                    )
                }
            }
        })
    }

    get currentWidgetChanged() {
        return this._tracker.fileChanged
    }

    initThemeManager(themeManager: IThemeManager) {
        this._themeManager = themeManager

        themeManager.themeChanged.connect(() => {
            this._updateTheme()
        })

        this._updateTheme()
    }

    _updateTheme() {
        HFLogger.log(
            `current theme: ${this._themeManager.theme}`,
            HF_LOGGER_LEVEL.INFO
        )

        if (this._themeManager.theme === DARK_THEME_KEY) {
            document.body.classList.add(getDarkNameSpace())
            document.body.classList.add('bp3-dark')
        } else {
            document.body.classList.remove(getDarkNameSpace())
            document.body.classList.remove('bp3-dark')
        }
    }

    bindUserTokenHandler(labSettings: ISettingRegistry.ISettings) {
        this._user.bindTokenLoaded(labSettings)
    }

    bindUserSettingHandler(labSettings: ISettingRegistry.ISettings) {
        this._user.bindSettingLoaded(labSettings)
    }

    /**
     * Auto Refresh
     */
    _enableAutoRefresh() {
        console.error('not support now')
    }

    get app() {
        return this._app
    }

    get currentTheme() {
        return this._themeManager.theme
    }

    themeChangedConnect(
        callback: (
            themeManager: IThemeManager,
            changed: IChangedArgs<string, string | null, string>
        ) => any
    ) {
        this._themeManager.themeChanged.connect(callback)
    }

    themeChangedDisconnect(
        callback: (
            themeManager: IThemeManager,
            changed: IChangedArgs<string, string | null, string>
        ) => any
    ): boolean {
        return this._themeManager.themeChanged.disconnect(callback)
    }

    get invokeChainUpdated() {
        return this._invokeChainUpdated
    }

    emitInvokeChainUpdate(args: ChainUpdateArgs) {
        this._invokeChainUpdated.emit(args)
    }

    // ------------------------------------ createTask ------------------------------------------

    get taskIsCreating() {
        return this._createTaskLatch
    }

    async editorReadyCheck(path: string): Promise<void> {
        const editors = this._tracker.find({
            focus: true,
            path: path
        })

        if (editors.length === 0) {
            throw new Error(i18n.t(i18nKeys.biz_create_no_editor, { path }))
        }

        // Use a private attribute: dirty
        interface AddDirtyModel extends CodeEditor.IModel {
            dirty: boolean
        }
        const e = editors[0]
        const codes = e.model.value.text
        const m = e.model as AddDirtyModel
        const dirty = m.dirty

        if (!codes) {
            throw new Error(i18n.t(i18nKeys.biz_create_no_code, { path }))
        }
        if (dirty) {
            throw new Error(i18n.t(i18nKeys.biz_create_not_save, { path }))
        }

        const content = await this._app.serviceManager.contents.get(path, {
            content: false
        })
        const diskLastModified = content?.last_modified
        if (!diskLastModified) {
            throw new Error(i18n.t(i18nKeys.biz_create_meta_failed, { path }))
        }

        const lastModified = e.context?.contentsModel?.last_modified || null
        if (lastModified) {
            const lt = dayjs(lastModified).unix()
            const disk_lt = dayjs(diskLastModified).unix()
            const p = Math.abs(lt - disk_lt)

            if (p > 1) {
                throw new Error(
                    i18n.t(i18nKeys.biz_create_time_conflict, {
                        path,
                        disk_time: dayjs(diskLastModified).format(
                            'MM-DD HH:mm:ss'
                        ),
                        tab_time: dayjs(lastModified).format('MM-DD HH:mm:ss')
                    })
                )
            }
        } else {
            throw new Error(
                i18n.t(i18nKeys.biz_create_get_modified_time_failed, {
                    path
                })
            )
        }
    }

    /**
     * User instance, include quota, name, settings...
     */
    _user: User

    /**
     * Editor tracker to init FileTracker.
     */
    _tracker: FileTracker

    /**
     * A handler to handle exceptions
     */
    _errorHandler: ErrorHandler

    _extLogHandler: ExtLogHandler

    /**
     * Avoid Sending more than one creating request at the same time.
     */
    _createTaskLatch: boolean

    _invokeChainUpdated: Signal<this, ChainUpdateArgs>

    sidePanelChainUpdated: Signal<this, ISidePanelChainUpdated | null>

    hfaiExtMount: Signal<this, ISidePanelChainUpdated | null>

    _app: JupyterFrontEnd

    _auto_refresh_interval_id: number

    _themeManager!: IThemeManager

    messageManager: MessageManager
}
