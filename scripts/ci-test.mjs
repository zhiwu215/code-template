import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { renderTemplate } from '../src/utils/renderTemplate.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const testDir = path.resolve(ROOT_DIR, '.ci-test-app')

if (fs.existsSync(testDir)) {
  fs.rmSync(testDir, { recursive: true, force: true })
}

console.log('=== 开始执行模板全链路生成与依赖校验测试 ===\n')

try {
  renderTemplate(path.resolve(ROOT_DIR, 'templates', 'electron-vite', 'react'), testDir)
  renderTemplate(path.resolve(ROOT_DIR, 'templates', 'electron-vite', 'plugins', 'tailwind'), testDir)
  renderTemplate(path.resolve(ROOT_DIR, 'templates', 'electron-vite', 'plugins', 'shadcn'), testDir)
  renderTemplate(path.resolve(ROOT_DIR, 'templates', 'electron-vite', 'plugins', 'zustand'), testDir)

  const pkgPath = path.join(testDir, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
  for (const [k, v] of Object.entries(allDeps)) {
    if (v === 'latest') {
      throw new Error(`CI 验证失败: 依赖中存在未解析的 latest: ${k}`)
    }
  }

  console.log('\nCI 测试通过: 模板生成完整且所有依赖均为具体版本号')
} finally {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true })
  }
}
