import React from 'react'
export const SVGWrapper = (props: {
    svg: any
    width?: number | string
    height?: number | string
    fill?: string
    dClassName?: string
}): JSX.Element => {
    return (
        <svg
            dangerouslySetInnerHTML={{ __html: String(props.svg) }}
            width={props.width || undefined}
            height={props.height || undefined}
            fill={props.fill || undefined}
            className={props.dClassName || undefined}
        ></svg>
    )
}
