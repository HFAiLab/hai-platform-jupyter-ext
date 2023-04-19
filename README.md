<a name="readme-top"></a>

# hai-platform-jupyter-ext

HAI Platform 的 jupyter 插件

## 介绍

本插件集成了 HAI Platform 的一些常用功能，包括但不限于：

* 直接通过 python 文件进行实验提交。
* 管理提交的实验，支持实验的实时监控、日志分析和实验状态管理。
* 当前容器内存、集群节点、任务状况查看。
* 个人 Quota 的查看和调整、可访问路径的查看。
* .ipynb 快速清除输出、快速转换 python 文件等增强功能。

## 安装

### **在 [HAI Platform](https://github.com/HFAiLab/hai-platform) 中集成**

在 [HAI Platform](https://github.com/HFAiLab/hai-platform) 中可以采用如下方式快速集成：

1. 下载本项目的 release 包并解压，放到集群的共享目录
2. 在 `storage` 数据表下添加如下挂载点：

    ```csv
    /path/to/jupyterlab_hai_platform_ext,/jupyter_ext/server/jupyterlab_hai_platform_ext,{public},"",Directory,true,add,true
    /path/to/jupyterlab_hai_platform_ext/labextension,/jupyter_ext/client/jupyterlab_hai_platform_ext,{public},"",Directory,true,add,true
    /path/to/jupyterlab_hai_platform_ext/jupyter-config/jupyterlab_hai_platform_ext.json,/usr/local/etc/jupyter_server_config.d/jupyterlab_hai_platform_ext.json,{public},"",File,true,add,true
    ```

3. 在 `train_environment` 数据表中添加对应的环境变量，这部分和下文直接安装的环境变量相同。

### **直接安装**

依赖：

* jupyterlab

```shell
pip install jupyterlab_hai_platform_ext
```

在启动的时候，请确保已经设置了以下几个环境变量：

```markdown
* BFF_URL: [ailab-server](https://github.com/HFAiLab/hai-platform-studio) 接入层短链接地址
* WS_URL: [ailab-server](https://github.com/HFAiLab/hai-platform-studio) 接入层长链接地址
* CLUSTER_SERVER_URL: [HAI Platform](https://github.com/HFAiLab/hai-platform) 集群 api 地址
```

另外，我们提供一些可选的环境变量配置：

```markdown
* JUPYTER_COUNTLY_URL: 如果需要开启 [Countly](https://countly.com/) 监控，请配置该字段
* JUPYTER_COUNTLY_API_KEY: 如果需要开启 [Countly](https://countly.com/) 监控，请配置该字段
```

## 本地调试

先对项目进行编译：

```shell
jlpm install
jlpm run build
```

编译完成后，先通过 `pip install .` 安装后，再将 `jupyterlab_hai_platform_ext`和 `jupyterlab_hai_platform_ext/labextension` 分别软链接到后端（位于 `site-packages` 目录）和前端（位于 `share/jupyter/labextensions` 目录）。

之后通过 `jlpm run watch` 可以进行前端插件的调试。

## 更多支持

在当前地开源的版本中，我们对一些功能进行了裁剪，你可以自行二次开发，或者[联系我们](https://github.com/HFAiLab/hai-platform-jupyter-ext/issues)获取更多支持：包括但不限于完整版本的试用、私有部署等。

## License

Distributed under the GPL License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
