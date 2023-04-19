import type { HaiConfig } from '@hai-platform/shared'

declare global {
    interface Window {
        _hf_user_if_in: boolean
        haiConfig?: HaiConfig
    }
}

