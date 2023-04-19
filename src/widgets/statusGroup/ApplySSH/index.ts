/**
 * SSH ADDRESS DISPLAY FOR HUB USER
 */

import { Widget } from '@lumino/widgets'
import { JupyterFrontEnd } from '@jupyterlab/application'
import { conn } from '../../../serverConnection'
import { Intent } from '@hai-ui/core/lib/esm'
import { copyToClipboard } from '../../../utils'
import HFLogger from '@/utils/log'
import { HF_LOGGER_LEVEL } from '@hai-platform/logger'
import { i18n, i18nKeys } from '@hai-platform/i18n'
import { TopWidgetRanks } from '@/consts'
import { Context } from '@/contextManager'
import { AppToaster } from '@/utils/toast'

export class ApplySSH {
    constructor(app: JupyterFrontEnd, context: Context) {
        this._app = app
        this._sshInfo = null
        this.server_name = null
        this._ctx = context

        this.initWidget()
        this.checkServer()
    }

    initWidget() {
        this._widget = new Widget({})
        this._widget.id = 'hfext-ssh-top'
        this._widget.addClass('hf')
        this._widget.addClass('ssh')

        // 使用该类来靠右加选择器实现右贴边
        this._widget.addClass('corner-component')

        this._app.shell.add(this._widget, 'top', {
            rank: TopWidgetRanks.ApplySSHRank
        })

        this._widget.node.addEventListener('click', () => {
            if (this._latch) {
                return
            }

            if (this._sshInfo) {
                this.showSSHCmd()
                return
            }

            if (this.server_name) {
                this._latch = true
                conn.getSSHInfo()
                    .then(res => {
                        {
                            this._sshInfo = res
                            this.fillText(
                                `SSH: ${this._sshInfo.ip}:${this._sshInfo.port}`
                            )
                            this._latch = false
                            this.showSSHCmd()
                        }
                    })
                    .catch(e => {
                        this._sshInfo = null
                        this._latch = false
                        if (
                            e.response &&
                            e.response.status == 400 &&
                            String(e).includes('用户不能申请更多的')
                        ) {
                            this.fillText(i18n.t(i18nKeys.biz_ssh_no_quota))
                        } else {
                            this.fillText(i18n.t(i18nKeys.biz_ssh_failed))
                        }
                    })

                this.fillText(i18n.t(i18nKeys.biz_apply_ssh_applying))
            }
        })
    }

    fillText(text: string) {
        this._widget!.node.innerText = text
    }

    hideWidget() {
        const newClassName = this._widget!.node.className.replace(
            'corner-component',
            ''
        )
        this._widget!.node.setAttribute('style', 'display:none')
        this._widget!.node.setAttribute('class', newClassName)
    }

    showSSHCmd() {
        const userName = this._ctx._user.userName
        const addr = `ssh ${userName ? userName + '@' : ''}${
            this._sshInfo!.ip
        } -p ${this._sshInfo!.port}`
        const msg = i18n.t(i18nKeys.biz_ssh_copy_success) + addr
        if (copyToClipboard(addr)) {
            AppToaster.show({ message: msg, intent: Intent.SUCCESS })
        } else {
            AppToaster.show({
                message: i18n.t(i18nKeys.biz_ssh_copy_failed),
                intent: Intent.WARNING
            })
        }
    }

    async checkServer() {
        let isInternal
        try {
            isInternal = await conn.checkInternal()
        } catch (e) {
            HFLogger.log(`get_user_role_failed: ${e}`, HF_LOGGER_LEVEL.ERROR)
            this.hideWidget()
            return
        }

        if (isInternal) {
            try {
                const name = await conn.getServerName()
                if (name) {
                    this.server_name = name
                    this.fillText('SSH')
                } else {
                    this.hideWidget()
                }
            } catch (e) {
                this.hideWidget()
                HFLogger.log(
                    `get_server_name_failed: ${e}`,
                    HF_LOGGER_LEVEL.ERROR
                )
            }
        } else {
            this.hideWidget()
        }
    }

    server_name: string | null
    _app: JupyterFrontEnd
    _widget?: Widget
    _sshInfo: {
        ip: string
        port: number
    } | null = null
    _latch = false
    _ctx: Context
}
