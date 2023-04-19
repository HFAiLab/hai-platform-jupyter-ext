import { LabIcon } from '@jupyterlab/ui-components'
import ailab_icon_color from '../../images/icon/ailab_icon_color.svg'
import ailab_icon_bw from '../../images/icon/ailab_icon_bw.svg'
import ailab_icon_exp from '../../images/icon/ailab_icon_exp.svg'
import histor_icon from '../../images/icon/icon_history.svg'
import pyfile_icon from '../../images/icon/pyfile.svg'
import shfile_icon from '../../images/icon/shfile.svg'
import ipynb_icon from '../../images/icon/ipynb.svg'
import info_icon from '../../images/icon/icon_info.svg'
import trainings_icon from '../../images/icon/trainings.svg'
import log_14px_icon from '../../images/icon/ailab_icon_log_14px.svg'

export class HFLabIcon extends LabIcon {
    render(container: HTMLElement, options?: LabIcon.IRendererOptions) {
        super.render(container, options)
        const fillColor = getComputedStyle(document.body).getPropertyValue(
            '--hf-theme-color'
        )
        const firstNode = container.firstChild as SVGElement
        firstNode.setAttribute('fill', fillColor)
    }
}

export namespace labIcon {
    export const hfIcon = new HFLabIcon({
        name: 'hfext:logo',
        svgstr: ailab_icon_bw
    })
    export const hfIconColor = new HFLabIcon({
        name: 'hfext:logo_color',
        svgstr: ailab_icon_color
    })
    export const pyfileIcon = new HFLabIcon({
        name: 'hfext:logo_pyfile',
        svgstr: pyfile_icon
    })
    export const shfileIcon = new HFLabIcon({
        name: 'hfext:logo_shfile',
        svgstr: shfile_icon
    })
    export const ipynbIcon = new HFLabIcon({
        name: 'hfext:logo_ipynbfile',
        svgstr: ipynb_icon
    })
    export const historyIcon = new HFLabIcon({
        name: 'hfext:icon_history',
        svgstr: histor_icon
    })
    export const experimentIcon = new HFLabIcon({
        name: 'hfext:icon_experiment',
        svgstr: ailab_icon_exp
    })
    export const infoIcon = new HFLabIcon({
        name: 'hfext:icon_info',
        svgstr: info_icon
    })
    export const trainingsIcon = new HFLabIcon({
        name: 'hfext:icon_trainings',
        svgstr: trainings_icon
    })
    export const log14Icon = new HFLabIcon({
        name: 'hfext:icon_log_14',
        svgstr: log_14px_icon
    })
}
