import * as p from '@clack/prompts'
import color from 'picocolors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { renderTemplate } from '../utils/renderTemplate.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..', '..')
const TEMPLATES_DIR = path.resolve(ROOT_DIR, 'templates', 'electron-vite')
const REACT_BASE_DIR = path.resolve(TEMPLATES_DIR, 'react')
const PLUGINS_DIR = path.resolve(TEMPLATES_DIR, 'plugins')

/**
 * 负责 electron-vite 项目的创建与组装
 * @param {string} projectName 项目名称
 * @param {string} targetDir 目标创建路径
 */
export async function createElectronVite(projectName, targetDir) {
  const options = await p.group(
    {
      framework: () =>
        p.select({
          message: '请选择前端框架:',
          options: [
            { value: 'react', label: 'React + TypeScript' }
          ]
        }),

      css: () =>
        p.select({
          message: '请选择 CSS 样式方案:',
          options: [
            { value: 'tailwind', label: 'Tailwind CSS (v4)' },
            { value: 'none', label: '无 (原生 CSS)' }
          ]
        }),

      ui: () =>
        p.select({
          message: '请选择 UI 组件库:',
          options: [
            { value: 'shadcn', label: 'shadcn/ui' },
            { value: 'none', label: '无 (不添加 UI 库)' }
          ]
        }),

      stateManagement: () =>
        p.select({
          message: '请选择状态管理方案:',
          options: [
            { value: 'zustand', label: 'Zustand (轻量响应式状态管理)' },
            { value: 'none', label: '无 (不添加状态管理库)' }
          ]
        })
    },
    {
      onCancel: () => {
        p.cancel('已取消创建。')
        process.exit(0)
      }
    }
  )

  const s = p.spinner()

  // 1. 渲染基础底座
  s.start(`正在初始化项目底座: ${color.cyan(projectName)}...`)
  renderTemplate(REACT_BASE_DIR, targetDir)

  // 更新目标 package.json 项目名称
  const pkgPath = path.join(targetDir, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  pkg.name = projectName
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
  s.stop('项目底座初始化完毕')

  // 2. 智能依赖计算：如果选了 shadcn/ui，自动补齐前置依赖 Tailwind CSS
  const needsTailwind = options.css === 'tailwind' || options.ui === 'shadcn'

  if (needsTailwind) {
    s.start('正在配置 Tailwind CSS...')
    renderTemplate(path.join(PLUGINS_DIR, 'tailwind'), targetDir)
    s.stop('Tailwind CSS 配置完成')
  }

  // 3. 叠加 shadcn/ui
  if (options.ui === 'shadcn') {
    s.start('正在配置 shadcn/ui...')
    renderTemplate(path.join(PLUGINS_DIR, 'shadcn'), targetDir)
    s.stop('shadcn/ui 配置完成')
  }

  // 4. 叠加 Zustand 状态管理
  if (options.stateManagement === 'zustand') {
    s.start('正在配置 Zustand 状态管理...')
    renderTemplate(path.join(PLUGINS_DIR, 'zustand'), targetDir)
    s.stop('Zustand 配置完成')
  }

  // 5. 交付提示（秒级完成，由用户自行按需安装依赖）
  p.outro(color.green('项目创建成功！'))
  console.log('\n接下来请运行以下命令启动项目：')
  console.log(color.cyan(`  cd ${projectName}`))
  console.log(color.cyan('  pnpm install  (或 npm install / yarn install)'))
  console.log(color.cyan('  pnpm dev      (或 npm run dev / yarn dev)\n'))
}