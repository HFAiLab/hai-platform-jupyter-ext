# 状态栏

从左到右目前有这样几个：

```shell
- statusSpan(占位) - ioConnectionTip(长链接状态) - Kernel URL - ApplySSH - memoryMetrics - clusterInfoTopWidget -
```

# 如何新增一个

最简单的是 `ServerDebugTip`，可以进行参考

记得外层配置文件中需要新增 `TopWidgetRanks` 来优化这个排序
