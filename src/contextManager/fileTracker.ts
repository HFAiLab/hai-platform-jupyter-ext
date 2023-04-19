import { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor'
import { ILabShell, JupyterFrontEnd } from '@jupyterlab/application'
import { Signal } from '@lumino/signaling'
import { Contents } from '@jupyterlab/services'
import { Widget } from '@lumino/widgets'

export interface IFileChangedParam {
    fileName: string
    fullPath: string
    widget: Widget
}

export interface IFindParams {
    focus: boolean
    path: string
}

export class FileTracker {
    constructor(options: {
        app: JupyterFrontEnd
        editorTracker: IEditorTracker
    }) {
        this._app = options.app
        this._editorTracker = options.editorTracker
        this._fileChanged = new Signal<this, IFileChangedParam>(this)
        this._lastChanged = null
        ;(this._app.shell as ILabShell).currentChanged.connect((_, changed) => {
            this._handleCurrentWidgetChange(changed.newValue)
        }, this)
        this._app.serviceManager.contents.fileChanged.connect((any, args) => {
            this._handleFileRename(args)
        })
    }

    get fileChanged(): Signal<this, IFileChangedParam> {
        return this._fileChanged
    }

    /**
     * Emit a signal when current editor changed to a new .py file.
     * @param widget Changed editor widget
     */
    _handleCurrentWidgetChange(widget: Widget | null) {
        if (widget === null) {
            this._lastChanged = null
            // @ts-ignore
            this._fileChanged.emit(null)
            return
        }

        // @ts-ignore
        const fullPath = widget.content
            ? (widget as any).content?.context?.path ?? null
            : null

        const fileName = fullPath
            ? fullPath
                  .replace(/\\/g, '/')
                  .split('/')
                  .slice(-1)[0]
            : ''

        const ret = { fileName, fullPath, widget }
        this._lastChanged = { ...ret }
        this._fileChanged.emit({ ...ret })
    }

    /**
     * If lastChanged renamed, emit a current changed signal.
     */
    _handleFileRename(args: Contents.IChangedArgs): void {
        if (args.type !== 'rename' || !this._lastChanged) {
            return
        }
        const oldPath = args.oldValue!.path
        if (oldPath === this._lastChanged.fullPath) {
            requestAnimationFrame(() => {
                this._handleCurrentWidgetChange(this._lastChanged!.widget)
            })
        }
    }

    find(p: IFindParams): FileEditor[] {
        return this._findInEditors(p)
    }

    _findInEditors(p: IFindParams): FileEditor[] {
        if (!this._editorTracker) {
            return []
        }

        const { focus, path } = p
        const found: FileEditor[] = []
        this._editorTracker.forEach(doc => {
            const fileEditor = doc.content
            if (
                (path !== fileEditor.context.path && path !== '*') ||
                !fileEditor.editor
            ) {
                return
            }
            found.push(fileEditor)
            if (focus) {
                this._app.shell.activateById(doc.id)
            }
        })

        return found
    }

    _app: JupyterFrontEnd
    _editorTracker: IEditorTracker
    _lastChanged: IFileChangedParam | null = null
    _fileChanged: Signal<this, IFileChangedParam>
}
