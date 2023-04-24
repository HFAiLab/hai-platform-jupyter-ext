/**
 * Add launcher icon and context menu for lab shell
 */
import { JupyterFrontEnd } from '@jupyterlab/application'
import { labIcon } from '../../uiComponents'
import { Context } from '@/contextManager'
import {
    FuncCommands,
    HFHubCommands,
    OpenCommands,
    RequiredPlugins
} from '../../consts'
import { ICommandPalette } from '@jupyterlab/apputils'
import { ILauncher } from '@jupyterlab/launcher'
import { IMainMenu } from '@jupyterlab/mainmenu'
import { IFileBrowserFactory } from '@jupyterlab/filebrowser'
import { conn } from '../../serverConnection'
import { getLabFileUrl } from '../../utils'
import { Widget } from '@lumino/widgets'
import { i18n, i18nKeys } from '@hai-platform/i18n'
import { AppToaster } from '@/utils/toast'
import { Intent } from '@hai-ui/core'
import {
    errorDialog,
    successDialog,
    confirmDialog
} from '@hai-platform/studio-pages/lib/ui-components/dialog'
export class JupyterShellCommandsAdder {
    constructor(app: JupyterFrontEnd, context: Context) {
        this._app = app
        this._context = context
    }

    register(p: RequiredPlugins) {
        this._palette = p.palette
        this._launcher = p.launcher
        this._mainMenu = p.mainMenu
        this._fbFactory = p.fbFactory
        this._contextMenuInit()
        this._launcherInit()
        // this._addHighflyerTitle()
    }

    /**
     * Title besides main menu
     */
    _addHighflyerTitle() {
        const w = new Widget({})
        w.id = 'hfext-title-top'
        w.addClass('hf')
        w.addClass('top-title')
        w.node.innerHTML = 'High-Flyer AiLab'
        this._app.shell.add(w, 'top', { rank: 1 })
    }

    _handleIpynbConvert(path: string, method: 'convert' | 'clear') {
        if (!path.endsWith('.ipynb')) {
            errorDialog(i18n.t(i18nKeys.biz_commands_not_ipynb, { path }))
            return
        }
        const func =
            method === 'convert' ? conn.convertIpynb : conn.clearIpynbOutput
        func({ path })
            .then(res => {
                successDialog(res)
                this._fbFactory!.tracker!.currentWidget!.model.refresh()
            })
            .catch(e => {
                this._context._errorHandler.handleError(String(e))
            })
    }

    // Add function to context menu.
    _contextMenuInit() {
        const fbFactory = this._fbFactory
        const selectorNotDir = '.jp-DirListing-item[data-isdir="false"]'

        // fileBrowser 's context menu add  "open in new browser Tab"
        this._app.commands.addCommand(FuncCommands.OpenInNewBrowserTab, {
            execute: param => {
                if (param && param.path) {
                    window.open(getLabFileUrl(param.path as string))
                    return
                }

                const widget = fbFactory!.tracker.currentWidget
                if (!widget) {
                    return
                }
                const eArr = widget.selectedItems().iter()
                try {
                    const c = eArr.next()
                    window.open(getLabFileUrl(c!.path as string))
                } catch {}
            },
            /**
             * 请注意不要依赖多余的 @lumino/widgets
             * jupyterlab 自己依赖了 @lumino/virtualdom
             * 然后如果自己也依赖了 @lumino/widgets，他们两者的版本是不相同的，所以这里有问题
             */
            icon: labIcon.hfIconColor,
            label: () => i18n.t(i18nKeys.biz_commands_open_in_new_tab)
        })

        this._app.contextMenu.addItem({
            command: FuncCommands.OpenInNewBrowserTab,
            selector: selectorNotDir,
            rank: 0
        })

        // Add "convert ipynb to .py" function
        this._app.commands.addCommand(FuncCommands.ConvertIpynb, {
            execute: param => {
                const widget = fbFactory!.tracker.currentWidget
                if (!widget) {
                    return
                }
                const eArr = widget.selectedItems().iter()
                try {
                    const c = eArr.next()
                    const path = c!.path!
                    this._handleIpynbConvert(path, 'convert')
                    // eslint-disable-next-line no-empty
                } catch {}
            },
            // @ts-ignore
            icon: labIcon.hfIconColor,
            label: i18n.t(i18nKeys.biz_commands_convert_ipynb_py)
        })

        this._app.contextMenu.addItem({
            command: FuncCommands.ConvertIpynb,
            selector: selectorNotDir,
            rank: 0
        })

        // Add "Clear.ipynb's output' " function
        this._app.commands.addCommand(FuncCommands.ClearOutputOfIpynb, {
            execute: param => {
                const widget = fbFactory!.tracker.currentWidget
                if (!widget) {
                    return
                }
                const eArr = widget.selectedItems().iter()
                try {
                    const c = eArr.next()
                    const path = c!.path
                    confirmDialog(
                        i18n.t(i18nKeys.biz_commands_clear_confirm)
                    ).then(confirmed => {
                        if (confirmed) {
                            this._handleIpynbConvert(path, 'clear')
                        }
                    })
                } catch {}
            },
            // @ts-ignore
            icon: labIcon.hfIconColor,
            label: () => i18n.t(i18nKeys.biz_commands_clear_output)
        })

        this._app.contextMenu.addItem({
            command: FuncCommands.ClearOutputOfIpynb,
            selector: selectorNotDir,
            rank: 0
        })

        this._app.commands.addCommand(HFHubCommands.HFHubControlPanel, {
            label: i18n.t(i18nKeys.biz_hfhub_control_panel),
            execute: () => {
                window.open(window.location.origin)
            }
        })
    }

    // Add a create .py file function in launcher and context menu.
    _launcherInit() {
        // These command is jupyterlab's
        const createNew = (cwd: string, ext: string) => {
            try {
                const { tracker } = this._fbFactory!
                tracker.currentWidget!.createNewFile({ ext })
            } catch (e) {
                AppToaster.show({
                    message: i18n.t(i18nKeys.biz_create_new_python_file_failed),
                    intent: Intent.DANGER
                })
            }
        }

        this._app.commands.addCommand(FuncCommands.CreatePyFile, {
            label: args =>
                args['isPalette'] || args['contextMenu']
                    ? i18n.t(i18nKeys.biz_commands_new_py)
                    : '.py File',
            caption: () => i18n.t(i18nKeys.biz_commands_create_new_py),
            // @ts-ignore
            icon: args => (args['isPalette'] ? undefined : labIcon.pyfileIcon),
            execute: args => {
                const cwd =
                    args['cwd'] || this._fbFactory!.defaultBrowser.model.path
                return createNew(cwd as string, 'py')
            }
        })

        this._app.commands.addCommand(FuncCommands.CreateShFile, {
            label: args =>
                args['isPalette'] || args['contextMenu']
                    ? i18n.t(i18nKeys.biz_commands_new_sh)
                    : '.sh File',
            caption: () => i18n.t(i18nKeys.biz_commands_create_new_sh),
            // @ts-ignore
            icon: args => (args['isPalette'] ? undefined : labIcon.shFileIcon),
            execute: args => {
                const cwd =
                    args['cwd'] || this._fbFactory!.defaultBrowser.model.path
                return createNew(cwd as string, 'sh')
            }
        })

        this._app.commands.addCommand(FuncCommands.CreateIpynbFile, {
            label: args =>
                args['isPalette'] || args['contextMenu']
                    ? i18n.t(i18nKeys.biz_commands_new_ipynb)
                    : '.ipynb File',
            caption: () => i18n.t(i18nKeys.biz_commands_create_new_ipynb),
            // @ts-ignore
            icon: args => (args['isPalette'] ? undefined : labIcon.ipynbIcon),
            execute: args => {
                const cwd =
                    args['cwd'] || this._fbFactory!.defaultBrowser.model.path
                // HINT: Notebook 新建的文件并不是空的，所以不能直接使用 createNew
                return this._app.commands.execute('notebook:create-new', {
                    cwd,
                    kernelName: 'python3'
                })
            }
        })

        // Trainings 面板在 launcher 的入口
        this._launcher!.add({
            command: OpenCommands.MyTrainings,
            category: 'Other',
            rank: -1
        })

        // this._palette!.addItem({
        //     command: FuncCommands.CreatePyFile,
        //     args: { isPalette: true },
        //     category: 'Text Editor'
        // })
        this._launcher!.add({
            command: FuncCommands.CreateShFile,
            category: 'Other',
            rank: 20
        })
        // this._mainMenu!.fileMenu.newMenu.addGroup([{ command: FuncCommands.CreatePyFile }], 40)
        this._app.contextMenu.addItem({
            command: FuncCommands.CreatePyFile,
            args: { contextMenu: true },
            selector: '.jp-DirListing-content',
            rank: 2.9
        })
        this._app.contextMenu.addItem({
            command: FuncCommands.CreateShFile,
            args: { contextMenu: true },
            selector: '.jp-DirListing-content',
            rank: 2.95
        })

        this._app.contextMenu.addItem({
            command: FuncCommands.CreateIpynbFile,
            args: { contextMenu: true },
            selector: '.jp-DirListing-content',
            rank: 2.8
        })
    }

    _createWidget(): null {
        return null
    }

    _context: Context
    _app: JupyterFrontEnd
    _palette?: ICommandPalette
    _launcher?: ILauncher
    _mainMenu?: IMainMenu
    _fbFactory?: IFileBrowserFactory
}
