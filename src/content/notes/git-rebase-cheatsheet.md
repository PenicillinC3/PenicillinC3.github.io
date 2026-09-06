---
title: Git Rebase 速查：何时用、何时逃
date: 2026-08-20
tags: [Git, 工具]
summary: 把 rebase 当作整理本地历史的手段，而不是合并分支的默认姿势。
---
`rebase` 的价值在于把本地一堆「WIP」压缩成清晰的提交。

## 常用命令

```bash
git rebase -i HEAD~3   # 整理最近 3 个提交
git rebase main        # 把分支移到 main 之上
git rebase --abort     # 反悔，回到整理前
```

## 黄金法则

**绝不对已推送的提交 rebase**。推送过的历史要改写时，先想清楚谁会受害。

被 force-push 打乱的同事实操：`git fetch && git reset --hard origin/main` 之前，先 `git stash` 或另开分支保命。
