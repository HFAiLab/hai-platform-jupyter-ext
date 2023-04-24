import { HF_LOGGER_LEVEL } from '@hai-platform/studio-toolkit/lib/esm/utils/log'
import { CallBackProps } from 'react-joyride'
import HFLogger from './log'

export enum WidgetKeys {
    Renew = 'hfext-renew-manager-top'
}

export enum OnBoardingTypes {
    renew = 'renew'
}

export interface OnboardingTypeInfo {
    type: OnBoardingTypes
    consumed: boolean
}

/**
 * 通用的 Onboarding 管理类，特点：
 * 1. 保证最多至出现一个 onboarding
 * 2. 主要承担 onboarding 的管理工作，调用的时候只需要关注具体的 UI 展示即可
 */
class OnboardingManager {
    currentWidgetKey?: string
    currentTypeLists: OnboardingTypeInfo[] = []

    constructor() {}

    ifActiveOnboardingTypes(widgetKey: string, typeLists: OnBoardingTypes[]) {
        if (this.currentWidgetKey === widgetKey) {
            this.currentTypeLists = this.currentTypeLists.filter(
                item => !item.consumed
            )
            return this.currentTypeLists.map(item => item.type)
        }

        if (this.currentWidgetKey) {
            return []
        }

        const resultTypeList = typeLists.filter(onboardingKey =>
            ifOnboardingActive(onboardingKey)
        )
        if (!resultTypeList.length) {
            return []
        }

        this.currentWidgetKey = widgetKey
        this.currentTypeLists = resultTypeList.map(type => {
            return {
                type,
                consumed: false
            }
        })
        return resultTypeList
    }

    handleJoyrideCallback(data: CallBackProps, widgetKey: string) {
        HFLogger.log(
            `handleJoyrideCallback, ${data.lifecycle}`,
            HF_LOGGER_LEVEL.DEBUG
        )

        if (widgetKey !== this.currentWidgetKey) {
            return
        }

        if (data.lifecycle !== 'complete') {
            return
        }
        // 点击空白处会触发 close，点击 next 会触发 next
        // 不过根据目前的分析，以 lifecycle complete 为准即可
        // if (data.action != 'close' && data.action != 'next') return;

        if (data.index > this.currentTypeLists.length) {
            HFLogger.log(
                `handleJoyrideCallback error: out of index ${data.index}, max: ${this.currentTypeLists.length}`,
                HF_LOGGER_LEVEL.ERROR
            )
            return
        }

        this.currentTypeLists[data.index].consumed = true
        consumeOnboarding(this.currentTypeLists[data.index].type)

        const totalConsumed = this.currentTypeLists.reduce(
            (curr, next) => curr && next.consumed,
            true
        )

        if (totalConsumed) {
            HFLogger.log(
                '[OnboardingManager] totalConsumed',
                HF_LOGGER_LEVEL.DEBUG
            )
            this.currentWidgetKey = void 0
            this.currentTypeLists = []
        }
    }
}

export const onboardingManager = new OnboardingManager()

export function ifOnboardingActive(onBoardingType: OnBoardingTypes) {
    return !localStorage.getItem(`jp_onboarding_${onBoardingType}`)
}

export function consumeOnboarding(onBoardingType: OnBoardingTypes) {
    return localStorage.setItem(`jp_onboarding_${onBoardingType}`, 'used')
}
