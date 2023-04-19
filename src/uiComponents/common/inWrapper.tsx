import React, { useContext } from 'react'
import { ServiceContext } from '../reactContext'

/**
 * Only show when user is a internal user.
 */
type IInWrapper = {
    addInClass?: boolean
} & React.HTMLAttributes<HTMLElement>

export const InWrapper = (p: IInWrapper): JSX.Element => {
    const ctx = useContext(ServiceContext)
    const cln = p.className
    delete p['className']
    if (ctx.ctx._user.in) {
        return (
            <div className={(cln ?? '') + (p.addInClass ? ' in' : '')} {...p}>
                {' '}
                {p.children}
            </div>
        )
    } else {
        return <></>
    }
}
