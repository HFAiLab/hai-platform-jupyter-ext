import { Intent } from '@hai-ui/core'
import { JupyterFrontEnd } from '@jupyterlab/application'
import { i18n, i18nKeys } from '@hai-platform/i18n'
import { AppToaster } from './toast'

export function tryOpenFile(
    app: JupyterFrontEnd,
    filePath: string,
    ignore_error?: boolean
) {
    return app.serviceManager.contents
        .get(filePath, { content: false })
        .then(() => {
            app.commands.execute('docmanager:open', {
                path: filePath
            })
            return true
        })
        .catch(e => {
            if (ignore_error) {
                return
            }
            AppToaster.show({
                intent: Intent.WARNING,
                message: i18n.t(i18nKeys.biz_file_not_exist)
            })
            return
        })
}
