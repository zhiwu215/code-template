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

  // 校验模板特殊文件映射是否正确（目标 .gitignore 必须与源 _gitignore 内容完全一致）
  const gitignorePath = path.join(testDir, '.gitignore')
  const srcGitignorePath = path.resolve(ROOT_DIR, 'templates', 'electron-vite', 'react', '_gitignore')
  if (!fs.existsSync(gitignorePath)) {
    throw new Error('CI 验证失败: 目标项目中缺失 .gitignore 文件')
  }
  if (fs.readFileSync(gitignorePath, 'utf-8') !== fs.readFileSync(srcGitignorePath, 'utf-8')) {
    throw new Error('CI 验证失败: 生成的 .gitignore 与模板源文件内容不一致')
  }

  console.log('\nCI 测试通过: 模板生成完整且所有依赖均为具体版本号')
} finally {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true })
  }
}
