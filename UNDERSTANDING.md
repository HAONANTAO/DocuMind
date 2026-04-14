# DocuMind 项目理解手册

> 这份文档是写给自己看的。目标：面试时能把每一个技术决策讲清楚，而不只是"我用了 RAG"。

---

## 一、这个项目到底做了什么

用一句话说：**用户上传 PDF，然后用自然语言问问题，AI 基于 PDF 内容回答，并告诉你答案来自哪段原文。**

这听起来像 ChatGPT，但有一个根本区别：  
ChatGPT 只能基于训练数据回答，它不知道你的 PDF 里写了什么。  
DocuMind 用的是 **RAG（检索增强生成）** 技术，在回答前先从你的文档里找相关内容，再让 AI 基于这些内容作答。

---

## 二、和"直接把文件传给 ChatGPT"有什么区别

这是面试最常被问到的问题，也是理解 RAG 价值的关键。

现在 ChatGPT 确实支持上传 PDF 然后提问，看起来和 DocuMind 一样。但两者有本质区别：

### 直接传文件给 ChatGPT 的做法

```
用户上传 PDF → ChatGPT 把整个 PDF 塞进上下文窗口 → 提问 → 回答
```

这种方式叫做 **"长上下文"方案**，本质是把整个文档都丢给模型。

**局限：**

| 问题 | 说明 |
|------|------|
| **上下文窗口有限** | GPT-4o 上下文约 128k token，约 10 万汉字。超过这个长度就塞不进去，只能截断 |
| **成本随文档大小线性增长** | 每次提问都要把整个文档重新传一遍，100 页文档每次提问消耗的 token 极多 |
| **无法扩展到多文档** | 如果有 50 份合同需要同时检索，根本塞不进同一个上下文 |
| **精度下降** | 研究表明，上下文越长，LLM 对中间部分的注意力越弱（"Lost in the middle"问题） |
| **不可持久化** | 每次对话都要重新上传，没有"记住这份文档"的概念 |

### DocuMind 的 RAG 做法

```
文档预先向量化存储（一次性）→ 提问时只检索最相关的 5 个片段 → 只把这 5 个片段给 LLM
```

**优势：**

| 优势 | 说明 |
|------|------|
| **不受文档长度限制** | 1000 页的 PDF 也能处理，因为每次只取最相关的几个 chunk |
| **成本可控** | 无论文档多大，每次提问只消耗 5 个 chunk + 问题的 token，成本恒定 |
| **精度更高** | LLM 拿到的上下文更短、更精准，注意力集中，回答质量更好 |
| **可以跨多文档扩展** | 向量数据库天然支持多文档存储，只需改 filter 条件就能跨文档检索 |
| **持久化** | 文档向量存在 Pinecone，下次提问不需要重新上传，直接检索 |
| **来源可溯** | 每条回答能精确显示来自哪个 chunk，用户可以核实 |

### 一句话总结

> 直接传文件给 ChatGPT 是"把整本书摊开让 AI 读"，RAG 是"先用索引找到相关页，只让 AI 读这几页"。数据量小时区别不大，数据量一大 RAG 的优势就非常明显。

---

## 三、这个项目的核心优势

从求职角度，这个项目展示了：

**技术深度**
- 完整实现了 RAG 的两个阶段（Indexing + Query），不是调包了事
- 理解向量、Embedding、相似度搜索的原理
- 自己组装了 prompt，没有直接用 LangChain 高层链，每一步都可控可解释

**工程能力**
- SSE 流式输出（不是简单的 request/response）
- 异步文档处理 + 状态机设计
- 多租户数据隔离（MongoDB + Pinecone namespace 双重隔离）
- JWT 认证、XSS 防护、CORS 限制等安全细节

**产品思维**
- 按 SaaS 模式设计，有完整的用户体系
- 异步上传 + 轮询状态，用户体验考虑到位
- 来源引用，让 AI 回答可验证而不是黑盒

---

## 四、RAG 是什么，为什么要用它

### 问题背景

LLM（大语言模型）有两个局限：
1. **训练截止日期**：不知道最新信息
2. **无法感知私有文档**：它没见过你的 PDF

**直接把整个 PDF 丢给 AI 行不行？**  
不行。一个 100 页的 PDF 有几万个 token，超过 LLM 的上下文窗口限制，而且每次都传全文成本极高。

### RAG 的解法

不传全文，只传**最相关的片段**。

```
文档预处理（一次性）：
PDF → 切成小块 → 每块转成向量 → 存入向量数据库

用户提问时：
问题 → 转成向量 → 找最相似的 5 块 → 只把这 5 块给 AI → AI 回答
```

类比：你在图书馆找资料，不是把整个图书馆的书都搬过来，而是先用索引找到最相关的几页，再读这几页。向量数据库就是这个索引。

---

## 三、核心概念：向量和相似度搜索

### 什么是向量（Embedding）

一段文字 → 一个数字数组（1536个数字）

```
"违约方须赔偿合同总额的20%" → [0.23, -0.45, 0.12, ..., 0.67]  (1536维)
"甲方违约需支付20%罚款"    → [0.24, -0.43, 0.11, ..., 0.65]  (1536维)
"今天天气很好"             → [-0.89, 0.12, -0.34, ..., 0.02]  (1536维)
```

**意思相近的文字，向量也相近**（数字数组的方向相近）。这就是"语义搜索"的基础。

由 `text-embedding-3-small`（OpenAI 的模型）负责把文字转成向量。

### 什么是相似度搜索

把用户问题也转成向量，然后在所有 chunk 的向量里，找"方向最接近"的几个。

数学上用的是**余弦相似度**（cosine similarity）：两个向量夹角越小，相似度越高。

Pinecone 就是专门做这件事的数据库，普通数据库（MongoDB）做不了向量相似度搜索。

---

## 四、项目完整数据流

### 上传文档时（Indexing 阶段）

```
1. 用户选择 PDF 文件
   ↓
2. 前端发 multipart/form-data 请求到 POST /api/documents/upload
   ↓
3. 后端 multer 接收文件，存在内存 buffer 里（不写磁盘）
   ↓
4. MongoDB 立刻创建一条记录，status: 'uploading'
   ↓
5. 后端立刻返回 201（用户不用等）
   ↓
6. 后台异步执行 processDocument()：
   ├─ 6a. pdf-parse 提取 PDF 里的纯文本
   ├─ 6b. RecursiveCharacterTextSplitter 把文本切成 chunk
   │       每块最多 1000 字符，相邻块重叠 200 字符
   ├─ 6c. 调 OpenAI text-embedding-3-small，把每个 chunk 转成向量
   └─ 6d. 把所有向量存入 Pinecone
           namespace: user_{userId}        ← 按用户隔离
           metadata: { documentId, chunkIndex }  ← 方便后续过滤
   ↓
7. 更新 MongoDB 状态为 'ready'，记录 chunkCount
   ↓
8. 前端每 3 秒轮询 GET /api/documents，看到状态变 ready 后激活 Chat 按钮
```

**为什么切块要有重叠（overlap: 200）？**  
如果一句话被切在两个 chunk 的边界上，没有重叠的话这句话的意思就丢失了。重叠保证边界处的内容在两个 chunk 里都出现，不会被遗漏。

### 用户提问时（Query 阶段）

```
1. 用户输入问题，前端用 fetch 发 POST /api/chat
   （不用 axios，因为 axios 不支持 SSE 流式读取）
   ↓
2. 后端验证：文档存在 + 属于该用户 + status 是 ready
   ↓
3. 查 MongoDB，找到这个用户对这个文档的对话历史
   取最后 6 条消息（防止 prompt 太长）
   ↓
4. 调 retrieveChunks()：
   ├─ 把问题转成向量（调 OpenAI Embedding）
   └─ 在 Pinecone 里搜索：
       namespace = user_{userId}
       filter = { documentId: xxx }
       返回最相似的 5 个 chunk
   ↓
5. 组装 prompt：
   ├─ SystemMessage: "只基于文档内容回答，不要编造"
   ├─ 历史消息（最近 6 条）
   └─ HumanMessage: [5个chunk的原文] + [用户的问题]
   ↓
6. 调 GPT-4o-mini，开启流式输出（streaming: true）
   ↓
7. 每生成一个 token，立刻通过 SSE 推送给前端：
   data: {"token": "根"}
   data: {"token": "据"}
   data: {"token": "文"}
   ...
   data: {"done": true, "sources": [...]}
   ↓
8. 前端读取 SSE 流，每收到一个 token 就追加到消息末尾
   → 打字机效果
   ↓
9. 收到 done 事件后，把 sources 挂到这条消息上显示来源
   ↓
10. 后端 res.end() 后，把这次对话存入 MongoDB
```

---

## 五、为什么用 SSE 而不是 WebSocket

**WebSocket** 是双向实时通信，适合聊天室、协作编辑等场景。  
**SSE（Server-Sent Events）** 是单向的：服务器 → 客户端推送，基于普通 HTTP 连接。

这里只需要服务器推 token 给浏览器，不需要浏览器反向推，所以 SSE 更合适：
- 实现更简单（普通的 HTTP 响应，只是不关闭连接）
- 自动重连
- 不需要额外的 WebSocket 服务

SSE 的格式是固定的，每条消息以 `data: ` 开头，两个换行结束：
```
data: {"token": "Hello"}\n\n
data: {"token": " World"}\n\n
data: {"done": true, "sources": []}\n\n
```

---

## 六、数据库分工

| 存什么 | 用哪个 | 为什么 |
|--------|--------|--------|
| 用户账号、密码 | MongoDB | 结构化数据，关系清晰 |
| 文档元数据（文件名、状态、大小） | MongoDB | 结构化数据 |
| 对话历史（问题和回答） | MongoDB | 结构化数据，要持久化 |
| 文档的向量（每个 chunk 的数字表示） | Pinecone | 专门做向量相似度搜索，MongoDB 做不了 |
| PDF 文件本身 | 不存 | 处理完就丢，只保留向量 |

MongoDB 和 Pinecone 通过 `documentId` 和 `userId` 关联：
- Pinecone 里每个向量的 metadata 里带着 `documentId`
- 查询时用 `filter: { documentId: xxx }` 只搜这个文档的向量

---

## 七、用户数据隔离是怎么做的

这是多租户系统的关键安全点：用户 A 不能看到用户 B 的文档。

**MongoDB 层面：**  
每次查询都带 `userId: req.userId`，这个 userId 从 JWT token 里解析出来，不依赖用户传入的参数。

```js
// 查文档时，必须同时满足：_id 匹配 AND 属于当前用户
Document.findOne({ _id: documentId, userId: req.userId })
```

**Pinecone 层面：**  
每个用户的向量存在独立的 namespace 里：`user_{userId}`  
查询时只在自己的 namespace 里搜，天然隔离。

```js
namespace: `user_${userId}`  // 上传时
namespace: `user_${userId}`  // 查询时
```

---

## 八、认证系统（JWT）

### 流程

```
注册/登录 → 后端生成 JWT → 前端存在 localStorage → 之后每次请求带上这个 token
```

### JWT 是什么

JSON Web Token，一个加密的字符串，包含：
- Header（算法）
- Payload（存的数据，这里只存 userId）
- Signature（用 JWT_SECRET 签名，防伪造）

解码后看起来像：
```json
{
  "userId": "6634abc123...",
  "iat": 1710000000,
  "exp": 1710604800
}
```

### 为什么只存 userId，不存 email 或 plan

- Payload 是 base64 编码，**不加密**，任何人都能解码看到内容
- 越少的数据越好，userId 够用了
- 敏感信息（plan、email）每次需要时从数据库查，保证是最新的

### 安全细节

- 密码用 bcrypt 哈希存储，cost factor 10，即使数据库泄露也无法反推原密码
- 登录失败时，"用户不存在"和"密码错误"返回**相同的错误信息**，防止攻击者枚举哪些邮箱注册过
- Token 有效期 7 天，过期后需要重新登录

---

## 九、异步处理和状态机

上传文档是一个**耗时操作**（解析 PDF + 调 OpenAI API 生成向量），可能需要几十秒。

如果同步等待，HTTP 请求会超时，用户体验很差。

解决方案：**立刻返回响应，后台继续处理**，用状态机告知进度。

```
uploading  →  processing  →  ready
                            ↘  error
```

后端用一个立即执行的异步函数（IIFE）在后台运行：
```js
res.status(201).json({ document })  // 先返回

;(async () => {
  // 后台继续跑，不阻塞响应
  await processDocument(...)
  await Document.findByIdAndUpdate(id, { status: 'ready' })
})()
```

前端轮询文档列表，只要列表里还有 `uploading` 或 `processing` 的文档就每 3 秒刷新一次，全部处理完后自动停止轮询。

---

## 十、代码结构速查

```
backend/src/
├── index.js              # 服务器入口，MongoDB 连接，注册路由
├── middleware/
│   └── auth.js           # JWT 验证，解析出 userId 挂到 req 上
├── models/
│   ├── User.js           # 用户：email, passwordHash, plan
│   ├── Document.js       # 文档：userId, fileName, fileSize, status, chunkCount
│   └── Conversation.js   # 对话：userId, documentId, messages[]
├── routes/
│   ├── auth.js           # POST /register, POST /login, GET /me
│   ├── documents.js      # POST /upload, GET /, DELETE /:id
│   └── chat.js           # POST / (SSE), GET /:documentId/history
└── config/
    ├── rag.js            # 初始化 OpenAI embeddings、LLM、Pinecone client
    ├── documentProcessor.js  # PDF → 切块 → 向量化 → 存 Pinecone
    └── retriever.js      # 相似度搜索 → 组装 prompt → 调 LLM → 流式返回
```

```
frontend/src/
├── App.js                # 路由配置，ProtectedRoute 守卫
├── context/
│   └── AuthContext.js    # 全局登录状态，login/logout 方法
├── api/
│   └── axios.js          # axios 实例，自动带 JWT token
└── pages/
    ├── Login.jsx         # 注册/登录表单
    ├── Documents.jsx     # 文档列表，上传，删除，轮询状态
    ├── Chat.jsx          # 核心页：SSE 流式聊天 + 侧边栏 + 来源引用
    └── Pricing.jsx       # 静态定价页
```

---

## 十一、面试常见追问和回答

**Q: 为什么 chunkSize 选 1000，overlap 选 200？**  
A: 1000 字符大约是 2-3 个段落，足够包含完整的语义单元，又不会太大导致检索不精准。200 字符的重叠约等于 1-2 句话，保证切分边界处的句子不被截断。这是经验值，实际项目里应该根据文档类型调整。

**Q: 为什么 top-k 取 5？**  
A: 5 个 chunk 约 5000 字符，在 GPT-4o-mini 的上下文窗口内，同时覆盖足够的相关内容。取太少可能漏掉关键信息，取太多会增加成本和噪声，降低答案质量。

**Q: 如果用户问的问题跨越多个 chunk 怎么办？**  
A: 这是 RAG 的已知局限，叫做"多跳推理问题"。本项目没有特别处理，依赖 chunk overlap 和 top-5 的覆盖范围。进阶做法是 HyDE（假设文档嵌入）或者 Graph RAG。

**Q: 向量搜索和关键字搜索有什么区别？**  
A: 关键字搜索（如 BM25）找的是词语完全匹配，向量搜索找的是语义相似。比如用户问"违约赔偿"，文档里写的是"甲方需支付罚款"，关键字搜索找不到，向量搜索可以。生产环境通常两种结合使用（Hybrid Search）。

**Q: 为什么不直接用 LangChain 的 ConversationalRetrievalChain？**  
A: 用了 LangChain 的基础模块（TextSplitter、PineconeStore、Embeddings），但自己组装了 prompt 和流式逻辑，而不是用高层链。这样对每一步有完全的控制权，更容易调试和面试讲解。

**Q: 多用户同时使用会不会有性能问题？**  
A: 每个请求都要调 OpenAI API（embedding + LLM），本身就有网络延迟。Render 免费版是单实例，Node.js 是单线程但异步 I/O，理论上可以处理并发请求。瓶颈在 OpenAI API 的速率限制和 Pinecone 的查询延迟，生产环境需要加队列。
