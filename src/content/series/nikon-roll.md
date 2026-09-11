---
title: Nikon D90 示例卷
date: 2023-12-09
cover: nikon-roll/dsc0025
workName: NIGHT
summary: 用两张实拍建立的示例卷：验证全屏暗房、卷备忘混排（横幅整行 / 竖幅左图右文）与真实 JPEG 构建期优化管线。
---

这是用真实照片搭建的示例卷。标题、地点、封面与备忘正文都在 `src/content/series/nikon-roll.md` 里，照片与照片各自说明在 `src/content/photos/nikon-roll/` 下（`dsc0025.jpg` / `dsc0015.jpg` 及同名 .md）。

想换成自己的内容时：改这个文件即可换卷名与故事；在 `photos` 里加同 `series` 的新照片，它会按拍摄日期排进本卷；`cover:` 字段指向的编号（卷名/文件名，如 `nikon-roll/dsc0025`）就是胶片/全屏的封面。

备忘正文支持 Markdown：段落、列表、引用都行。照片默认排在正文之后；想让某张照片插进文字中间，在正文里独占一行写 `![[nikon-roll/dsc0025]]` 即可（见写作教程「图文交错」）。
