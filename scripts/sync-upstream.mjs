import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const REACT_PKG_PATH = path.resolve(ROOT_DIR, 'templates', 'electron-vite', 'react', 'package.json')
const PLUGINS_DIR = path.resolve(ROOT_DIR, 'templates', 'electron-vite', 'plugins')

/**
 * 获取官方最新模板 package.json
 */
async function fetchOfficialReactPackage() {
  const url = 'https://cdn.jsdelivr.net/npm/@quick-start/create-electron@latest/template/react-ts/package.json'
  console.log(`正在拉取官方最新模板配置: ${url}`)
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) {
    throw new Error(`无法拉取官方模板配置，HTTP 状态码: ${res.status}`)
  }
  return await res.json()
}

/**
 * 查询单个 npm 包的最新版本号
 */
async function fetchLatestVersion(pkgName) {
  try {
    const encoded = pkgName.startsWith('@') ? '@' + encodeURIComponent(pkgName.slice(1)) : pkgName
    const res = await fetch(`https://registry.npmjs.org/${encoded}/latest`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000)
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.version ? `^${data.version}` : null
  } catch {
    return null
  }
}

/**
 * 更新插件模板中的依赖到最新版本
 * @param {string} pluginName 插件目录名
 * @param {object[]} changes 变更记录数组
 */
async function syncPluginDependencies(pluginName, changes) {
  const pkgPath = path.join(PLUGINS_DIR, pluginName, 'package.json')
  if (!fs.existsSync(pkgPath)) return

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  if (!pkg.dependencies) return

  const tasks = Object.entries(pkg.dependencies).map(async ([dep, currentVer]) => {
    const latestVer = await fetchLatestVersion(dep)
    if (latestVer && latestVer !== currentVer) {
      changes.push({
        dep,
        type: `plugins/${pluginName}`,
        from: currentVer,
        to: latestVer
      })
      pkg.dependencies[dep] = latestVer
    }
  })

  await Promise.all(tasks)
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
}

async function main() {
  console.log('=== 开始检查官方底座与插件依赖版本 ===\n')

  const changes = []

  // 1. 同步官方底座依赖
  console.log('[1/2] 检查官方 @quick-start/create-electron 底座版本...')
  const officialPkg = await fetchOfficialReactPackage()
  const localPkg = JSON.parse(fs.readFileSync(REACT_PKG_PATH, 'utf-8'))

  if (officialPkg.devDependencies) {
    for (const [dep, officialVer] of Object.entries(officialPkg.devDependencies)) {
      const localVer = localPkg.devDependencies?.[dep]
      if (localVer && localVer !== officialVer) {
        changes.push({ dep, type: 'base/devDependencies', from: localVer, to: officialVer })
        localPkg.devDependencies[dep] = officialVer
      }
    }
  }

  if (officialPkg.dependencies) {
    for (const [dep, officialVer] of Object.entries(officialPkg.dependencies)) {
      const localVer = localPkg.dependencies?.[dep]
      if (localVer && localVer !== officialVer) {
        changes.push({ dep, type: 'base/dependencies', from: localVer, to: officialVer })
        localPkg.dependencies[dep] = officialVer
      }
    }
  }

  fs.writeFileSync(REACT_PKG_PATH, JSON.stringify(localPkg, null, 2) + '\n', 'utf-8')

  // 2. 同步所有插件依赖到最新版本
  console.log('[2/2] 检查插件依赖最新版本...')
  const pluginDirs = fs.readdirSync(PLUGINS_DIR).filter((name) =>
    fs.statSync(path.join(PLUGINS_DIR, name)).isDirectory()
  )

  for (const pluginName of pluginDirs) {
    await syncPluginDependencies(pluginName, changes)
  }

  // 3. 输出结果
  if (changes.length === 0) {
    console.log('\n所有依赖均为最新版本，无需更新。')
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, 'has_changes=false\n')
    }
    return
  }

  console.log(`\n检测到 ${changes.length} 项依赖版本更新:`)
  for (const c of changes) {
    console.log(`  - [${c.type}] ${c.dep}: ${c.from} -> ${c.to}`)
  }

  // 为 GitHub Actions PR 生成说明内容
  const prBody = [
    '## 自动依赖版本同步',
    '',
    '检测到以下依赖有新版本，已自动对齐更新：',
    '',
    '| 依赖名称 | 来源 | 原版本 | 最新版本 |',
    '| :--- | :--- | :--- | :--- |',
    ...changes.map((c) => `| \`${c.dep}\` | ${c.type} | \`${c.from}\` | **\`${c.to}\`** |`),
    '',
    '> 该 PR 由 GitHub Actions 自动化工作流生成。'
  ].join('\n')

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, 'has_changes=true\n')
    const delimiter = 'PR_BODY_EOF'
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `pr_body<<${delimiter}\n${prBody}\n${delimiter}\n`
    )
  }
}

main().catch((err) => {
  console.error('执行同步脚本失败:', err)
  process.exit(1)
})
