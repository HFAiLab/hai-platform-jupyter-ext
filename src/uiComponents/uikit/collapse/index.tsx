import React, { ReactNode, useState } from 'react'
import { Collapse as HFCollapse } from '@hai-ui/core/lib/esm'

import { InlineIcon } from '../../svgIcon'

/**
 * Collapse
 */

export const Collapse = (p: ICollapse) => {
    const [_show, _setShow] = useState<boolean>(Boolean(p.defaultShow))
    const show = p.controller ?? _show
    const setter = p.handler ?? _setShow

    return (
        <div className="hf-collapse">
            <div
                className={`ptr ctl ${show ? 'show' : ''}`}
                onClick={() => setter(!show)}
            >
                <InlineIcon style={{ marginRight: '6px' }} name={'right'} />
                {p.desc}
            </div>
            <HFCollapse isOpen={show} keepChildrenMounted={true}>
                {p.children}
            </HFCollapse>
        </div>
    )
}

interface ICollapse extends React.HTMLAttributes<HTMLElement> {
    desc: string | ReactNode
    handler?: (p: boolean) => void
    controller?: boolean
    defaultShow?: boolean
}
