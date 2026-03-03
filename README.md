# Vercel URL Shortener

基于 Vercel + Redis 的短链接服务。

## 功能特性

- ✅ 创建短链接（自动生成或自定义路径）
- ✅ 支持 TTL（过期时间）
- ✅ 列出所有短链接
- ✅ 删除短链接
- ✅ Bearer Token 认证
- ✅ 自动 302 重定向

## 环境变量

创建 `.env.development.local` 文件（用于本地开发）：

```bash
LINKS_REDIS_URL=redis://default:password@host:port
SECRET_KEY=your-secret-key-here
```

部署到 Vercel 时，在项目设置中添加这些环境变量。

## 本地开发

1. 安装依赖：
   ```bash
   npm install
   ```

2. 启动开发服务器：
   ```bash
   npm run dev
   ```

3. 访问 http://localhost:3000

## API 使用示例

### 创建短链（自动生成路径）
```bash
curl -X POST http://localhost:3000/api \
  -H "Authorization: Bearer your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

### 创建短链（指定路径）
```bash
curl -X POST http://localhost:3000/api \
  -H "Authorization: Bearer your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","path":"mylink"}'
```

### 创建短链（指定过期时间，单位：分钟）
```bash
curl -X POST http://localhost:3000/api \
  -H "Authorization: Bearer your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","path":"temp","ttl":60}'
```

### 访问短链（重定向）
```bash
curl -L http://localhost:3000/mylink
```

### 查询短链信息（需认证）
```bash
curl http://localhost:3000/mylink \
  -H "Authorization: Bearer your-secret-key"
```

### 列出所有短链
```bash
curl http://localhost:3000/api \
  -H "Authorization: Bearer your-secret-key"
```

### 删除短链
```bash
curl -X DELETE http://localhost:3000/api \
  -H "Authorization: Bearer your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"path":"mylink"}'
```

## 部署到 Vercel

1. 安装 Vercel CLI（如果还没安装）：
   ```bash
   npm install -g vercel
   ```

2. 部署：
   ```bash
   vercel
   ```

3. 在 Vercel 项目设置中添加环境变量：
   - `LINKS_REDIS_URL`
   - `SECRET_KEY`

## 项目结构

```
├── api/
│   ├── redis.js       # Redis 连接管理
│   ├── index.js       # 主 API（创建、列表、删除）
│   └── [path].js      # 动态路由（重定向、查询）
├── index.html         # 主页
├── vercel.json        # Vercel 配置
└── package.json       # 项目配置
```
