import { JupyterFrontEndPlugin } from '@jupyterlab/application'
import { HFAILabExtension } from './main'

declare global {
    interface Window {
        // 开源版本插件不携带 __hflaunchers
        __hflaunchers: []
    }
}

const plugins: JupyterFrontEndPlugin<any>[] = [
    HFAILabExtension,
]

export default plugins
