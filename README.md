This extension is a reproduction for the performance loss in `vscode.workspace.fs` reported in https://github.com/microsoft/vscode/issues/324223

It shows the performance impact of the extra rpc call for every FS operation.

```
[info] **** Starting new round of benchmark ***
[info] starting file:/// benchmark
[info] [readDirectory] via workspace.fs: 333.0ms
[info] [readDirectory] direct: 153.1ms
[info] [readDirectory] Direct is 179.9ms faster (2.2x speedup)
[info] [stat] via workspace.fs: 1911.8ms
[info] [stat] direct: 323.6ms
[info] [stat] Direct is 1588.3ms faster (5.9x speedup)
[info] [readFile] via workspace.fs: 2960.5ms
[info] [readFile] direct: 1722.1ms
[info] [readFile] Direct is 1238.4ms faster (1.7x speedup)
[info] starting VFS benchmark
[info] [readDirectory] via workspace.fs: 76.9ms
[info] [readDirectory] direct: 6.1ms
[info] [readDirectory] Direct is 70.9ms faster (12.6x speedup)
[info] [stat] via workspace.fs: 1003.3ms
[info] [stat] direct: 15.4ms
[info] [stat] Direct is 987.9ms faster (65.3x speedup)
[info] [readFile] via workspace.fs: 888.1ms
[info] [readFile] direct: 10.6ms
[info] [readFile] Direct is 877.5ms faster (84.0x speedup)
```

The PR in https://github.com/microsoft/vscode/pull/324070 fixes this issue.
