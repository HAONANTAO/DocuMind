---
description: 分析当前改动,自动生成符合仓库风格的 commit message 并直接 commit
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git restore:*)
---

你的任务是:**分析当前改动,生成一个高质量的 commit message,然后直接执行 commit**。不要等用户确认 message,直接提交;commit 完成后用一句话告诉用户做了什么。

## 工作流(严格按顺序)

### 1. 并行收集上下文(单次消息内同时调用三个 Bash)
- `git status`(看哪些文件改了/新增了/删了。**不要加 `-uall` 标志**)
- `git diff HEAD`(看具体改了什么内容,包含已暂存和未暂存)
- `git log --oneline -10`(看最近 10 条 commit,**学这个仓库的 message 风格**——是用 conventional commits 前缀(feat:/fix:/chore:)还是其他风格)

### 2. 分析改动并起草 commit message

**判断改动类型:**
- 新功能 → `feat:`
- 修 bug → `fix:`
- 重构(行为不变)→ `refactor:`
- 文档 → `docs:`
- 测试 → `test:`
- 构建/依赖/工具链 → `chore:`(或 `build:`)
- 性能 → `perf:`
- 多类合并 → 选最重要的那一类,其他在 body 里提

**起草规则:**
- 跟最近 commit 的风格一致(如果他们不用前缀,你也别用)
- 标题 ≤ 70 字符,祈使句、小写开头(除非是缩写)
- 多个改动主题 → 写 body,1-3 条 bullet 概括 **why** 不是 **what**(diff 已经说了 what)
- **不要凑字数**,简单的改动一行就够了
- 用户原话出现关键词 → 优先沿用(用户说"加限流",别写成"add throttling")

### 3. 安全检查(blocker)

如果以下任何一条命中,**停下来问用户,不要 commit**:
- 改动里有疑似 secrets(`.env` 文件、`api_key=...`、`password=...` 等明文)
- 改动跨太多无关主题(超过 3 个明显独立的特性混在一起)→ 建议拆分
- 有大量看起来无关的格式化改动混进来(可能是误操作)

### 4. 执行 commit

并行执行(单次消息内):

- `git add <具体文件名,逐个列>`(**不要用 `git add -A` 或 `git add .`**——避免误带入 .DS_Store / 临时文件 / secrets)
- `git commit -m "$(cat <<'EOF'`...`EOF`)"` 用 HEREDOC 传入 message,确保多行格式正确
- commit 末尾加一行:`Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`

然后**串行**(等 commit 完成后):
- `git status` 验证 commit 成功、工作区状态符合预期

### 5. 报告

一句话告诉用户:**commit 哈希前 7 位 + 标题**。例如:
> ✅ Committed `a1b2c3d` — feat: add rate limiting and helmet hardening

不要罗列完整 diff,不要解释你做了什么——用户能 `git show` 自己看。

## 边界与禁令

- **不许用 `--no-verify`** 跳过 hooks。如果 pre-commit hook 失败,**停下来报告失败原因**,让用户决定;**不要 amend 上一个 commit**(系统提示明确禁止)
- **不许 push**——本命令只 commit,push 由用户主动触发
- **不许改 git config**
- **不许 amend / rebase / reset --hard**
- **不许 `git restore`**(会丢改动)——只用来在用户明确要 unstage 时用,普通 commit 流程用不到
- 没有任何改动可 commit(工作区干净)→ 直接告诉用户"没有改动",不要创建空 commit
- 用户传了 `$ARGUMENTS`(比如 `/commit 修复登录 bug`)→ **把它作为 message 主题的提示**,但仍然要按上面规则润色,不要原样照抄
