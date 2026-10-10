---
title: "MNE 预处理踩坑合集：顺序、阈值与那些不报错的坑"
description: "坏通道、滤波、重参考、ICA 的先后顺序为什么不能乱；哪些操作会静默出错而不给你任何提示。"
date: 2026-10-05
tags: ["MNE", "预处理", "工具"]
draft: false
---

在 181 个 EDF 文件上把预处理流程跑通，踩了不少坑。这里记录那些**不报错但会让结果变错**的问题。

## 坑 1：坏通道检测必须在平均参考之前

平均参考会把单个坏通道的噪声"分摊"到所有通道上。一旦做了平均参考，通道之间的相关性结构就变了，`correlation` 和 `RANSAC` 类判据会失准。

**正确顺序：坏通道检测与插值 → 滤波 → 重参考 → ICA。**

## 坑 2：用绝对相关阈值找坏通道，会把外侧电极整片误判

我们最初用"与其余通道的平均相关 < 0.4"当判据。结果每个文件都有 6–8 个通道被判为坏道，全是 `T3/T4/T5/T6/O1/O2/F7/F8`。

原因是：19 通道稀疏 montage 上，这些**外侧电极与其它电极本来就离得远，相关天然偏低**。

**改法**：用"相对"判据 —— 只有当某个通道的相关性**显著低于全体通道的中位数**（稳健 z 分数 < −4）时才判坏，另加一个绝对下限兜底。

改完之后，绝大多数文件只剩 0–2 个坏道。

## 坑 3：45 Hz 低通之后再陷波 50 Hz 是多余的

45 Hz 低通已经把 50 Hz 成分滤掉了，再陷波没有意义。

**正确顺序：先陷波（去掉工频干扰），再带通。**

## 坑 4：ICLabel 是在 1–100 Hz 数据上训练的

我们的分析需要低通到 45 Hz，但 ICLabel 的训练数据是 1–100 Hz。在 45 Hz 数据上调用它会打印一条 `not filtered between 1 and 100 Hz` 的警告。

**影响**：肌电（>45 Hz 已被滤掉）和线噪这两类的判定可靠性下降，**但眨眼成分仍能正确识别**。这是一个可以接受、但需要在论文里说明的取舍。

## 坑 5：`make_fixed_length_epochs` 不重叠时，末尾不足一段的数据会被丢掉

5 分钟的录音切成 2 秒一段是 150 段，不是 151 段。做数据量统计时要记得这一点。

## 坑 6：坏段剔除只给峰值阈值，死通道不会被剔除

`drop_bad(reject=dict(eeg=100e-6))` 只管峰值超限。如果某个通道整段是平坦的（电极脱落），它的峰值很小，**反而不会被剔掉**。

**改法**：补一个平坦判据 `flat=dict(eeg=1e-6)`。

## 坑 7：`standard_1020` 这个 montage 名字在新版 MNE 里被弃用了

新版会提示改用 `colin27_1020`。写兼容回退可以避免升级 MNE 之后直接报错。

## 坑 8：中文模块名 + GBK 控制台 = 直接崩

脚本里打印中文或 `▶ ✅ ⚠` 这类符号时，Windows 控制台默认 GBK 编码会抛 `UnicodeEncodeError`，整个批处理中断。

**改法**：在脚本最开头把 stdout 强制为 UTF-8：

```python
import sys
for s in ("stdout", "stderr"):
    getattr(sys, s).reconfigure(encoding="utf-8", errors="replace")
```

## 坑 9（最隐蔽）：MNE 的家目录不可写时，连 import 都过不去

MNE 在 `import` 时会去**读写** `%USERPROFILE%\.mne\mne-python.json` —— 注意是**即使只读也用 `r+` 模式打开**。

所以在"家目录不可写"的环境里（受限账户、沙箱、CI），你会看到一个和 MNE 毫无关系的 `PermissionError`，而程序连第一行都没跑完。

**改法**：把家目录重定向到项目内部，顺便让项目变成绿色免安装：

```python
import os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.environ["USERPROFILE"] = os.path.join(root, ".mne_home")
os.environ["HOME"] = os.environ["USERPROFILE"]
os.environ["MPLCONFIGDIR"] = os.path.join(root, ".mplcache")
os.environ["MNE_DONTWRITE_HOME"] = "true"
```

**必须在 `import mne` 之前执行。**

## 小结

这份清单里，坑 1、2、6、9 都会**静默地把结果做错或让程序莫名失败**，而不会给你任何明确提示。

预处理流程最难的地方不是"会不会调 API"，而是**知道每一步为什么在这个位置**。
