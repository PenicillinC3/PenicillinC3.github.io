---
title: Nikon D90 示例卷
date: 2023-12-09
cover: dsc0025
workName: NIGHT
summary: 用两张实拍建立的示例卷：验证全屏暗房、卷备忘混排（横幅整行 / 竖幅左图右文）与真实 JPEG 构建期优化管线。
---

这是用真实照片搭建的示例卷。标题、地点、封面与备忘正文都在 `src/content/series/nikon-roll.md` 里，照片与照片各自说明在 `src/content/photos/` 下（`dsc0025.jpg` / `dsc0015.jpg` 及同名 .md）。

想换成自己的内容时：改这个文件即可换卷名与故事；在 `photos` 里加同 `series` 的新照片，它会按拍摄日期排进本卷；`cover:` 字段指向的 slug 就是胶片/全屏的封面。

备忘正文支持 Markdown：可以放段落、列表、引用，甚至插入额外的大图（例如冲印对比、取景过程），它们会按顺序出现在照片区之前。
