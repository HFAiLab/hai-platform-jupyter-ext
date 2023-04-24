/**
 * MEMORY USAGE FOR HUB USER
 */
import React from 'react'
import { Widget } from '@lumino/widgets'
import { JupyterFrontEnd } from '@jupyterlab/application'
import { conn } from '../../../serverConnection'
import { ReactWidget } from '@jupyterlab/apputils'
import { CONSTS, TopWidgetRanks } from '../../../consts'
import { Popover2 } from '@hai-ui/popover2/lib/esm'

class MemoryWidget extends ReactWidget {
    constructor() {
        super()
        this.ready = false
        this.interval = setInterval(() => {
            this.fetch()
        }, CONSTS.MEM_METRICS_REFRESH_INTERVAL_SEC * 1000)
        this.fetch()
    }

    setData(p: conn.IMemoryMetrics | null) {
        this.info = p
        requestAnimationFrame(() => {
            this.update()
        })
    }

    fetch() {
        if (document.hidden) {
            return
        }
        conn.getMemoryMetrics()
            .then(p => {
                this.setData(p)
            })
            .catch(e => {
                this.setData(null)
            })
    }

    render() {
        let u = 0
        if (this.info) {
            u =
                ((this.info.memory_rss_usage! + this.info.memory_cache_usage!) /
                    this.info.memory_limit) *
                100
        }
        const high = this.info && u > 85

        return (
            <Popover2
                interactionKind="hover"
                content={
                    <div className="mem pop">
                        <p>
                            RSS:{' '}
                            {this.info &&
                            typeof this.info?.memory_rss_usage === 'number'
                                ? this.info.memory_rss_usage.toFixed(1) + 'GiB'
                                : 'Unknown'}
                        </p>
                        <p>
                            Cache:{' '}
                            {this.info &&
                            typeof this.info.memory_cache_usage === 'number'
                                ? this.info!.memory_cache_usage.toFixed(1) +
                                  'GiB'
                                : 'Unknown'}
                        </p>
                        <p>
                            Limit:{' '}
                            {this.info &&
                            typeof this.info?.memory_limit === 'number'
                                ? this.info!.memory_limit.toFixed(1) + 'GiB'
                                : 'Unknown'}
                        </p>
                        <p>
                            Swap:{' '}
                            {this.info &&
                            this.info.memory_swap_enable &&
                            typeof this.info.memory_swap_usage === 'number' ? (
                                this.info!.memory_swap_usage.toFixed(1) + 'GiB'
                            ) : (
                                <span style={{ color: 'red' }}>Disabled</span>
                            )}
                        </p>
                    </div>
                }
            >
                <div
                    className={`wrap ${high ? 'high' : ''}`}
                    data-for="hf-mem-metric"
                    data-tip
                >
                    <div className="box" style={{ position: 'relative' }}>
                        <div
                            className="usage-box"
                            style={{ right: String(100 - u) + '%' }}
                        ></div>
                        <div
                            style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 10
                            }}
                        >
                            <span>MEM </span>
                            <span>{this.info ? u.toFixed(0) + '%' : '??'}</span>
                        </div>
                    </div>
                </div>
            </Popover2>
        )
    }

    dispose() {
        super.dispose()
        clearInterval(this.interval)
    }

    info: conn.IMemoryMetrics | null = null
    interval: number
    ready: boolean
}

export class MemoryMetrics {
    constructor(app: JupyterFrontEnd) {
        this._app = app

        this._app.started.then(() => {
            this.initWidget()
        })
    }

    initWidget() {
        this._widget = new MemoryWidget()
        this._widget.id = 'hfext-mem-top'
        this._widget.addClass('hf')
        this._widget.addClass('mem')

        // 使用该类来靠右加选择器实现右贴边
        this._widget.addClass('corner-component')

        this._app.shell.add(this._widget, 'top', {
            rank: TopWidgetRanks.MemoryMetricsRank
        })
    }

    hideWidget() {
        if (!this._widget) {
            return
        }
        const newClassName = this._widget.node.className.replace(
            'corner-component',
            ''
        )
        this._widget.node.setAttribute('style', 'display:none')
        this._widget.node.setAttribute('class', newClassName)
    }

    _app: JupyterFrontEnd
    _widget?: Widget
}
