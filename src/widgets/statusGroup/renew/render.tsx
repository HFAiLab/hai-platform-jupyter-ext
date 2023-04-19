import React, { useState } from 'react'
import { Popover2 } from '@hai-ui/popover2/lib/esm'
import { Button } from '@hai-ui/core/lib/esm/components/button/buttons'
import { Dialog } from '@hai-ui/core/lib/esm/components/dialog/dialog'
import { useEffect } from 'react'
import { conn } from '../../../serverConnection'
import { i18n, i18nKeys } from '@hai-platform/i18n'
import { AppToaster } from '@/utils/toast'
import { Callout } from '@hai-ui/core/lib/esm/components/callout/callout'
import { Colors, Position } from '@hai-ui/core'
import { icons, SVGWrapper } from '@/uiComponents'
import { DARK_THEME_KEY, LevelLogger } from '@/utils'
import {
    onboardingManager,
    OnBoardingTypes,
    WidgetKeys
} from '@/utils/onboarding'
import { getThemeColor } from '@/utils/dom'
import Joyride from 'react-joyride'
import classNames from 'classnames'
import { Tag } from '@hai-ui/core/lib/esm/components/tag/tag'

// 没有点开详情的话，30 秒更新一次
const NotActiveIntervalTime = 30 * 1000
// 点开详情的话，1 秒更新一次
const ActiveIntervalTime = 1000

export const convertSecondsToObject = (seconds: number) => {
    return {
        hours: (seconds < 0 ? Math.ceil : Math.floor)(seconds / (60 * 60)),
        minutes: (seconds < 0 ? Math.ceil : Math.floor)(
            (seconds % (60 * 60)) / 60
        ),
        seconds: (seconds < 0 ? Math.ceil : Math.floor)(
            (seconds % (60 * 60)) % 60
        )
    }
}

export const secondsFillZero = (seconds: number): string | number => {
    if (seconds < 0) {
        return seconds
    }
    return seconds < 10 ? `0${seconds}` : seconds
}

export const convertSecondsToDisplay = (seconds: number) => {
    const timeObj = convertSecondsToObject(seconds)
    return `${secondsFillZero(timeObj.hours)} ${i18n.t(
        i18nKeys.base_hours
    )} ${secondsFillZero(timeObj.minutes)} ${i18n.t(
        i18nKeys.base_minutes
    )} ${secondsFillZero(timeObj.seconds)} ${i18n.t(i18nKeys.base_seconds)}`
}

export const convertSecondsToShortDisplay = (seconds: number) => {
    const timeObj = convertSecondsToObject(seconds)
    return `${secondsFillZero(timeObj.hours)} ${i18n.t(
        i18nKeys.base_hours
    )} ${secondsFillZero(timeObj.minutes)} ${i18n.t(i18nKeys.base_minutes)}`
}

export const convertSecondsToTinyDisplay = (seconds: number) => {
    const timeObj = convertSecondsToObject(seconds)
    return `${secondsFillZero(timeObj.hours)}h${secondsFillZero(
        timeObj.minutes
    )}m`
}

export const RenewManagerRender = (props: { theme: string | null }) => {
    const [renewData, setRenewData] = useState<conn.IWatchDogInfo | null>(null)
    const [intervalTime, setIntervalTime] = useState(NotActiveIntervalTime)
    const [showDesc, setShowDesc] = useState(false)
    const [jupyterNoTime, setJupyterNoTime] = useState(false)
    const [alreadyRender, setAlreadyRender] = useState(false)

    const isSpot = renewData?.MARSV2_SPOT_JUPYTER === '1'

    const fetchData = () => {
        // hint: 这里不要使用 state 数据
        return conn
            .getWatchDogInfo()
            .then(p => {
                setRenewData(p)
                const jupyterNoTime =
                    !!p && !!(p.current_watchdog_time - p.running_seconds < 0)
                setJupyterNoTime(jupyterNoTime)
                return jupyterNoTime
            })
            .catch(e => {
                console.error('renew error:', e)
                LevelLogger.error('renew error:', e)
            })
    }

    useEffect(() => {
        const fetchDataIntervalImpl = (intervalId: number) => {
            fetchData().then(ifNoTime => {
                if (ifNoTime) {
                    clearInterval(intervalId)
                }
            })
        }
        const intervalId = setInterval(() => {
            fetchDataIntervalImpl(intervalId)
        }, intervalTime)
        fetchDataIntervalImpl(intervalId)
        return () => {
            clearInterval(intervalId)
        }
    }, [intervalTime])

    const changeShowDesc = () => {
        if (showDesc) {
            setIntervalTime(NotActiveIntervalTime), setShowDesc(false)
        } else {
            setIntervalTime(ActiveIntervalTime), setShowDesc(true)
        }
    }

    const renewRequest = () => {
        conn.renewWatchDogTime()
            .then(() => {
                AppToaster.show({
                    message: i18n.t(i18nKeys.biz_renew_succ),
                    intent: 'success',
                    icon: 'tick'
                })
                fetchData()
            })
            .catch(e => {
                AppToaster.show({
                    message: i18n.t(i18nKeys.biz_renew_error),
                    intent: 'danger',
                    icon: 'error'
                })
            })
    }

    const renew_time = renewData
        ? renewData!.current_watchdog_time - renewData!.running_seconds
        : null

    const getDescItems = () => {
        return [
            {
                colored: true,
                desc: i18n.t(i18nKeys.biz_renew_current_renew_time),
                value: renewData
                    ? convertSecondsToDisplay(
                          renewData!.current_watchdog_time -
                              renewData!.running_seconds
                      )
                    : '--'
            },
            {
                desc: i18n.t(i18nKeys.biz_renew_running_time),
                value: renewData
                    ? convertSecondsToDisplay(renewData!.running_seconds)
                    : '--'
            },
            {
                desc: i18n.t(i18nKeys.biz_renew_quota),
                value: i18n.t(i18nKeys.biz_renew_quota_no_limit)
            },
            {
                desc: i18n.t(i18nKeys.biz_renew_each_time),
                value: renewData
                    ? convertSecondsToDisplay(renewData?.renew_watchdog_time)
                    : '--'
            }
        ]
    }

    const getShortDisplay = () => {
        return renewData
            ? convertSecondsToShortDisplay(
                  renewData!.current_watchdog_time - renewData!.running_seconds
              )
            : '--'
    }

    const getTinyDisplay = () => {
        return renewData
            ? convertSecondsToTinyDisplay(
                  renewData!.current_watchdog_time - renewData!.running_seconds
              )
            : '--'
    }

    const getTextColor = () => {
        if (renew_time === null) {
            return props.theme === DARK_THEME_KEY
                ? Colors.LIGHT_GRAY1
                : Colors.DARK_GRAY1
        }
        if (renew_time < 5 * 60) {
            return Colors.RED2
        }
        if (renew_time < 60 * 60) {
            return Colors.ORANGE2
        }
        return props.theme === DARK_THEME_KEY
            ? Colors.LIGHT_GRAY1
            : Colors.DARK_GRAY1
    }

    const getIntent = () => {
        if (renew_time === null) {
            return 'none'
        }
        if (renew_time < 5 * 60) {
            return 'danger'
        }
        if (renew_time < 60 * 60) {
            return 'warning'
        }
        return 'none'
    }

    const stepComps = {
        [OnBoardingTypes.renew]: {
            target: '[data-id="hf-renew-btn"]',
            content: (
                <div className="renew-onboarding">
                    <p>
                        <i>{i18n.t(i18nKeys.biz_renew_onboarding)}</i>
                    </p>
                </div>
            )
        }
    }

    const onboardingTypes = onboardingManager.ifActiveOnboardingTypes(
        WidgetKeys.Renew,
        [OnBoardingTypes.renew]
    )
    const showOnboarding = !!onboardingTypes.length && alreadyRender
    const onboardingSteps = onboardingTypes.map(type => stepComps[type])

    useEffect(() => {
        // hint: 这里因为整体布局上受一些请求影响，所以我们这里延迟展示 onboarding
        setTimeout(() => {
            setAlreadyRender(true)
        }, 5 * 1000)
    }, [])

    return (
        <div>
            <Popover2
                interactionKind="hover"
                position={Position.BOTTOM}
                content={
                    <div className="renew-tip">
                        <p>
                            {isSpot
                                ? i18n.t(i18nKeys.biz_renew_tip_content_spot, {
                                      time: getShortDisplay()
                                  })
                                : i18n.t(i18nKeys.biz_renew_tip_content, {
                                      time: getShortDisplay()
                                  })}
                        </p>
                    </div>
                }
            >
                <Button
                    data-id="hf-renew-btn"
                    className={classNames('renew-btn', {
                        'renew-btn-spot': isSpot
                    })}
                    outlined
                    small
                    intent={getIntent()}
                    icon={
                        <>
                            {isSpot && (
                                <Tag className="renew-spot-tag">Spot</Tag>
                            )}
                            {!isSpot && (
                                <SVGWrapper
                                    width="14px"
                                    height="14px"
                                    svg={icons.hour_glass}
                                    fill={getTextColor()}
                                />
                            )}
                        </>
                    }
                    onClick={changeShowDesc}
                >
                    {getTinyDisplay()}
                </Button>
                {/* <div className="renew-container" style={{color: getTextColor()}}>
                {getShortDisplay()} <Button outlined onClick={changeShowDesc} className="renew-btn" small intent={getIntent()} >{i18n.t(i18nKeys.biz_renew)}</Button>
            </div> */}
            </Popover2>
            <Dialog
                isOpen={showDesc}
                className={'renew-dialog'}
                title={`Jupyter ${i18n.t(i18nKeys.biz_renew)}`}
                onClose={changeShowDesc}
            >
                <div className={'renew-desc-container'}>
                    <p>{i18n.t(i18nKeys.biz_renew_desc)}</p>
                    <div className="renew-desc-list">
                        <Callout>
                            {getDescItems().map(item => (
                                <div className="renew-desc-item">
                                    <div className="item-desc">{item.desc}</div>
                                    <div
                                        className="item-value"
                                        style={{
                                            color: item.colored
                                                ? getTextColor()
                                                : ''
                                        }}
                                    >
                                        {item.value}
                                    </div>
                                </div>
                            ))}
                        </Callout>
                    </div>
                    <div className="renew-req-container">
                        <Button
                            className="renew-req-btn"
                            intent="primary"
                            onClick={renewRequest}
                        >
                            {i18n.t(i18nKeys.biz_confirm_to_renew)}
                        </Button>
                    </div>
                </div>
            </Dialog>

            {showOnboarding && (
                <Joyride
                    steps={onboardingSteps}
                    continuous
                    styles={{
                        options: {
                            arrowColor: 'white',
                            backgroundColor: 'white',
                            primaryColor: getThemeColor()
                        }
                    }}
                    callback={data => {
                        onboardingManager.handleJoyrideCallback(
                            data,
                            WidgetKeys.Renew
                        )
                    }}
                />
            )}

            {jupyterNoTime && (
                <div className="closed-dialog-container">
                    <div className={'closed-dialog'}>
                        <h6>{i18n.t(i18nKeys.biz_renew_already_destroyed)}</h6>
                        <p>
                            {i18n.t(i18nKeys.biz_renew_already_destroyed_tip)}
                        </p>
                        <Button
                            className="renew-req-btn"
                            intent="primary"
                            onClick={() => {
                                window.location.replace(window.location.origin)
                            }}
                        >
                            {i18n.t(i18nKeys.biz_renew_return)}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
