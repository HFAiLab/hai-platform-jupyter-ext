import React, { ReactElement, useState } from 'react'
import { SVGWrapper } from '..'

// import ReactTooltip from 'react-tooltip'
import uniqueId from 'lodash/uniqueId'
import { priorityToName } from '@hai-platform/shared'
import icon_down from '../../../images/down.svg'
import icon_right from '../../../images/right.svg'
import icon_chain from '../../../images/icon/icon_chain.svg'
import icon_help from '../../../images/icon/icon_help.svg'
import icon_history from '../../../images/icon/icon_history.svg'
import icon_home from '../../../images/icon/icon_home.svg'
import icon_loading from '../../../images/icon/icon_loading.svg'
import icon_pause from '../../../images/icon/icon_pause.svg'
import icon_refresh from '../../../images/icon/icon_refresh.svg'
import icon_restart from '../../../images/icon/icon_restart.svg'
import icon_selected from '../../../images/icon/icon_selected.svg'
import icon_stop from '../../../images/icon/icon_stop.svg'
import icon_error from '../../../images/icon/icon_error.svg'
import icon_storage from '../../../images/icon/icon_storage.svg'
import icon_waiting from '../../../images/icon/icon_waiting.svg'
import icon_edit from '../../../images/icon/icon_edit.svg'
import icon_highflyer from '../../../images/icon/ailab_icon_color.svg'
import icon_highflyer_footer from '../../../images/icon/icon_ailab_footer.svg'
import icon_highflyer_text from '../../../images/icon/icon_ailab_text.svg'
import icon_logtime from '../../../images/icon/icon_logtime.svg'
import icon_filter from '../../../images/icon/icon_filter.svg'
import icon_search from '../../../images/icon/icon_search.svg'
import icon_validate from '../../../images/icon/icon_validate.svg'
import icon_open_slide from '../../../images/icon/icon_open_slide.svg'
import icon_perf from '../../../images/icon/icon_perf.svg'
import icon_syslog from '../../../images/icon/icon_syslog.svg'
import icon_copy from '../../../images/icon/icon_copy.svg'
import icon_nodes from '../../../images/icon/icon_nodes.svg'
import icon_hour_glass from '../../../images/icon/hour_glass.svg'

// Priority icons
import iconPAuto from '../../../images/icon/priority/auto.svg'
import iconP0 from '../../../images/icon/priority/0.svg'
import iconP5 from '../../../images/icon/priority/5.svg'
import iconP10 from '../../../images/icon/priority/10.svg'
import iconP20 from '../../../images/icon/priority/20.svg'
import iconP30 from '../../../images/icon/priority/30.svg'
import iconP40 from '../../../images/icon/priority/40.svg'
import iconP50 from '../../../images/icon/priority/50.svg'

import { Tooltip2 } from '@hai-ui/popover2/lib/esm'

export namespace icons {
    export const down = icon_down
    export const right = icon_right
    export const chain = icon_chain
    export const help = icon_help
    export const history = icon_history
    export const home = icon_home
    export const loading = icon_loading
    export const pause = icon_pause
    export const refresh = icon_refresh
    export const restart = icon_restart
    export const selected = icon_selected
    export const stop = icon_stop
    export const error = icon_error
    export const storage = icon_storage
    export const waiting = icon_waiting
    export const highflyer = icon_highflyer
    export const highflyerText = icon_highflyer_text
    export const highflyerFooter = icon_highflyer_footer
    export const edit = icon_edit
    export const logtime = icon_logtime
    export const filter = icon_filter
    export const search = icon_search
    export const validate = icon_validate
    export const openSlide = icon_open_slide
    export const perf = icon_perf
    export const syslog = icon_syslog
    export const copy = icon_copy
    export const nodes = icon_nodes
    export const hour_glass = icon_hour_glass
}

export type TIcon =
    | 'down'
    | 'right'
    | 'chain'
    | 'help'
    | 'history'
    | 'home'
    | 'loading'
    | 'pause'
    | 'refresh'
    | 'restart'
    | 'selected'
    | 'stop'
    | 'error'
    | 'storage'
    | 'waiting'
    | 'highflyer'
    | 'edit'
    | 'logtime'
    | 'filter'
    | 'search'
    | 'validate'
    | 'openSlide'
    | 'perf'
    | 'syslog'
    | 'copy'
    | 'nodes'
    | 'hour_glass'
    | null

export const InlineIcon = (props: {
    name: TIcon
    id?: string
    fill?: string
    tooltip?: string | ReactElement | ReactElement[]
    tooltipPlace?: 'top' | 'right' | 'bottom' | 'left'
    style?: React.HTMLAttributes<HTMLElement>['style']
    onClick?: React.HTMLAttributes<HTMLElement>['onClick']
    iconObj?: string
}): JSX.Element => {
    const elTooltip = !(typeof props.tooltip === 'string')
    const [id] = useState<string>(props.id ?? uniqueId('hf_tooltip_id_'))
    return (
        <span
            style={props.style}
            onClick={props.onClick}
            className="hf svg-icon svg-baseline"
            data-for={id}
            data-tip={elTooltip ? '' : props.tooltip}
        >
            {props.tooltip ? (
                <Tooltip2 placement="top" content={<>{props.tooltip}</>}>
                    <SVGWrapper
                        fill={props.fill ?? 'var(--hf-ui-font-color1)'}
                        svg={props.iconObj ?? icons[props.name!]}
                    />
                </Tooltip2>
            ) : (
                <SVGWrapper
                    fill={props.fill ?? 'var(--hf-ui-font-color1)'}
                    svg={props.iconObj ?? icons[props.name!]}
                />
            )}
        </span>
    )
}

const PRIORITY_ICON = {
    AUTO: iconPAuto,
    LOW: iconP0,
    BELOW_NORMAL: iconP5,
    NORMAL: iconP10,
    ABOVE_NORMAL: iconP20,
    HIGH: iconP30,
    VERY_HIGH: iconP40,
    EXTREME_HIGH: iconP50
} as { [key in PRIORITY_KEYS]: string }

type PRIORITY_KEYS =
    | 'AUTO'
    | 'LOW'
    | 'NORMAL'
    | 'ABOVE_NORMAL'
    | 'HIGH'
    | 'VERY_HIGH'
    | 'EXTREME_HIGH'
    | string

export const PriorityIcon = (props: {
    priority: number | PRIORITY_KEYS
    marginRight?: number
    overwriteClassName?: string
}): JSX.Element => {
    const pName =
        typeof props.priority === 'string'
            ? props.priority
            : priorityToName(props.priority)
    const marginRight = props.marginRight ?? 4
    return (
        <span
            className={props.overwriteClassName ?? 'hf svg-icon svg-baseline'}
            title={`Priority : ${pName}`}
            style={{ marginRight }}
        >
            <SVGWrapper
                svg={PRIORITY_ICON[pName as PRIORITY_KEYS] ?? icon_help}
            ></SVGWrapper>
        </span>
    )
}
