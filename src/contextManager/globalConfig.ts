let globalConfig: GlobalConfig | null = null

export enum GlobalConfigKeys {}

// hint: 这部分之前隔离模式用到了，但是因为隔离模式后面又去掉了，所以暂时也没有地方用到
export class GlobalConfig {
    store = {}

    // 获取全局单例
    static get() {
        if (globalConfig) {
            return globalConfig
        }
        globalConfig = new GlobalConfig()
        return globalConfig
    }

    // 基础工具：
    getConfig(key: GlobalConfigKeys) {}

    setConfig(key: GlobalConfigKeys, value: any) {
        // @ts-ignore
        this.store[key] = value
    }
}
