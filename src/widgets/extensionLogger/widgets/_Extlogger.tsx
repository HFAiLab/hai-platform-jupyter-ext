import { ILogMsg } from '../../../extLogHandler'

import React, { useRef, useEffect } from 'react'

import dayjs from 'dayjs'

/**
 * Main component
 * @param props
 * @returns
 */
export const ExtLoggerComponent = (props: {
    logs: Array<ILogMsg>
}): JSX.Element => {
    const outerDiv = useRef(null)

    useEffect(() => {
        // @ts-ignore
        const pDiv = outerDiv?.current?.parentElement as any
        if (pDiv) {
            pDiv.scrollTo(0, pDiv.scrollHeight)
        }
    }, [outerDiv.current, props.logs.length])

    return (
        <div ref={outerDiv}>
            <ul>
                {props.logs.length ? (
                    props.logs.map((item, index) => (
                        <li key={index}>
                            <LoglineComponent {...item} />
                        </li>
                    ))
                ) : (
                    <li>No Log</li>
                )}
            </ul>
        </div>
    )
}

/**
 * A line of log.
 * @param props ILogMsg
 * @returns
 */
const LoglineComponent = (props: ILogMsg): JSX.Element => {
    const cssMap = {
        INFO: '',
        SUCCESS: 'extlog-success',
        ERROR: 'extlog-error',
        DEFAULT: ''
    }
    const cssClass = [
        'extlog',
        cssMap[props.type as keyof typeof cssMap] ?? cssMap['DEFAULT']
    ].join(' ')

    const tString = props.time
        ? `${dayjs(props.time).format('MM-DD HH:mm:ss')}`
        : '??-?? ??:??:??'

    return (
        <pre>
            <span className="time">{tString}</span>{' '}
            <span className={cssClass}>{props.msg}</span>
        </pre>
    )
}
