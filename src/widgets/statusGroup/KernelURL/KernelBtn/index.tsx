import { getToken, simpleCopy } from '@/utils'
import { i18n, i18nKeys } from '@hai-platform/i18n'
import { PopoverPosition } from '@hai-ui/core/lib/esm/components'
import { Tooltip2 } from '@hai-ui/popover2/lib/esm/tooltip2'
import React from 'react'

export const KernelBtn = () => {
    const handleClick = () => {
        console.info('handle kernel click', window.location)
        const kernelURL = `${window.location.href.replace(
            /\/lab.*?$/g,
            ''
        )}?token=${getToken()}`
        simpleCopy(kernelURL, 'Kernel URL')
    }
    return (
        <Tooltip2
            className="io-status-icon-container"
            position={PopoverPosition.BOTTOM}
            content={i18n.t(i18nKeys.biz_jupyter_copy_kernel_url)}
        >
            <span onClick={handleClick}>Kernel URL</span>
        </Tooltip2>
    )
}
