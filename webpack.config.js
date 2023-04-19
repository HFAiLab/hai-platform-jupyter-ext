const path = require('path')
const webpack = require('webpack')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
    .BundleAnalyzerPlugin
const hfappVersion = require('./package.json').dependencies[
    '@hai-platform/studio-pages'
]
// const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

console.info('inject user webpack, process.env.HF_ENV:', process.env.HF_FE_ENV)

const buildApp = process.env.BUILD_APP || 'jupyter'

function getUserName() {
    const child_process = require('child_process')
    let uname = (child_process.execSync(`whoami`) + '').replace(/[\n\s]/g, '')
    return uname
}


const additionalPlugins = []


module.exports = {
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.svg'],
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@components': path.resolve('src/components'),
            '@utils': path.resolve('src/utils')
        }
    },
    // entry: {
    // 	'editor.worker': 'monaco-editor/esm/vs/editor/editor.worker.js'
    // },
    optimization: {
        usedExports: true
    },
    plugins: [
        // hint: 2022.07.09 补充：用了这个插件之后，反而产物更大了
        // new MonacoWebpackPlugin({
        //     languages: [],
        //     features: []
        // }),
        new webpack.NormalModuleReplacementPlugin(
            /.\/iconSvgPaths/,
            `${path.resolve(__dirname, 'src/svgReplace/iconSvgReplacePath.js')}`
        ),
        // 实际上 jupyterlab builder 本身并没有使用这个插件，所以我们可以放心使用
        new webpack.EnvironmentPlugin({
            DEBUG_USER_NAME: getUserName(),
            BLUEPRINT_NAMESPACE: 'hai-ui',
            HF_FE_ENV: process.env.HF_FE_ENV || 'production',
            REACT_APP_BLUEPRINT_NAMESPACE: 'hai-ui',
            REACT_APP_HFUI_NAMESPACE: 'hai-ui',
            HFAPP_VERSION: hfappVersion
        }),
        new BundleAnalyzerPlugin({
            // analyzerPort: 3004
            analyzerMode: 'static'
        })
    ],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
                // HINT: jupyterlab 自身只有 js 的引入情况，这里增加 ts/tsx
                issuer: /\.(ts|tsx)$/,
                use: {
                    loader: 'raw-loader'
                }
            },
            {
                test: /\.s[ac]ss$/i,
                use: [
                    // 将 JS 字符串生成为 style 节点
                    'style-loader',
                    // 将 CSS 转化成 CommonJS 模块
                    'css-loader',
                    // 将 Sass 编译成 CSS
                    {
                        loader: 'sass-loader',
                        options: {
                            sassOptions: loaderContext => {
                                return {
                                    functions: require('./sass-custom-functions.js')
                                }
                            }
                        }
                    }
                ]
            },
            {
                test: /\.less$/,
                use: [
                    {
                        loader: 'style-loader'
                    },
                    {
                        loader: 'css-loader' // translates CSS into CommonJS
                    },
                    {
                        loader: 'less-loader', // compiles Less to CSS
                        options: {
                            lessOptions: {
                                // If you are using less-loader@5 please spread the lessOptions to options directly
                                javascriptEnabled: true
                            }
                        }
                    }
                ]
            },
            ...additionalPlugins,
        ]
    }
}
