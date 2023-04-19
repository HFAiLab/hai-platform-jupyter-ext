import { ServerConnection } from '@jupyterlab/services'

import { URLExt } from '@jupyterlab/coreutils'

export const getLabFileUrl = (path: string) => {
    const connectionSetting = ServerConnection.makeSettings()
    const newUrl =
        URLExt.join(
            connectionSetting.baseUrl,
            connectionSetting.appUrl,
            'tree',
            path
        ) + '?reset'
    return newUrl
}
export const getTrainingsUrl = (ifReset = false) => {
    const connectionSetting = ServerConnection.makeSettings()
    const newUrl =
        URLExt.join(
            connectionSetting.baseUrl,
            connectionSetting.appUrl,
            '/workspaces/trainings'
        ) + (ifReset ? '?reset' : '')
    return newUrl
}

export const openFileNewTabByPath = (path: string) => {
    window.open(getLabFileUrl(path))
}

export const openTrainingsNewTab = (ifReset = false) => {
    window.open(getTrainingsUrl(ifReset))
}

export const ifInTrainingsWorkspace = () => {
    /**
     * @hf/trainings_change:
     * 这里的背景是之前希望 Trainings 面板情况下打开文件是跳转到新的 Tab 的，目前看这个需求是个伪需求。
     * 所以现在不需要区分 Trainings 了，所以暂时直接返回 False，后续可以把相关代码也删除掉。
     */
    return false
    // return window.location.href.match(/^.*?\/workspaces\/training/);
}

export function getHFAPPVersion() {
    try {
        // @ts-ignore
        return process.env.HFAPP_VERSION
    } catch (e) {
        return 'no-version'
    }
}
