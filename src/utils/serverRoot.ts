import { PageConfig } from '@jupyterlab/coreutils'
import { Chain } from '@hai-platform/studio-pages/lib/model/Chain'

export function getServerRoot(): string {
    const root = PageConfig.getOption('serverRoot')
    return root.endsWith('/') ? root : root + '/'
}

export function maybeCreatedWithJupyter(chain: Chain) {
    const root = getServerRoot()
    return (
        (chain.nb_name.endsWith('.py') || chain.nb_name.endsWith('.sh')) &&
        (chain.workspace.startsWith(root))
    )}
