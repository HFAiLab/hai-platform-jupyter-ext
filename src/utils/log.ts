import { VERSION } from '@/consts'
import HFLogger, { HF_LOGGER_LEVEL } from '@hai-platform/logger'
export default HFLogger

export const LevelLogger = {
    trace: (...args: any[]) => {
        const str = args.map(item => item.toString()).join(',')
        HFLogger.log(`[${VERSION}] ${str}`, HF_LOGGER_LEVEL.TRACE)
    },
    debug: (...args: any[]) => {
        const str = args.map(item => item.toString()).join(',')
        HFLogger.log(`[${VERSION}] ${str}`, HF_LOGGER_LEVEL.DEBUG)
    },
    info: (...args: any[]) => {
        const str = args.map(item => item.toString()).join(',')
        HFLogger.log(`[${VERSION}] ${str}`, HF_LOGGER_LEVEL.INFO)
    },
    warn: (...args: any[]) => {
        const str = args.map(item => item.toString()).join(',')
        HFLogger.log(`[${VERSION}] ${str}`, HF_LOGGER_LEVEL.WARN)
    },
    error: (...args: any[]) => {
        const str = args.map(item => item.toString()).join(',')
        HFLogger.log(`[${VERSION}] ${str}`, HF_LOGGER_LEVEL.ERROR)
    }
}
