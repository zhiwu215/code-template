import * as p from '@clack/prompts'
import color from 'picocolors'
import fs from 'fs'
import path from 'path'
import { createElectronVite } from './src/frameworks/electron-vite.js'

async function main() {
  console.clear()
  p.intro(color.bgCyan(color.black(' 专属脚手架开发工具 ')))

  // 1. 收集全局通用参数：项目名称与项目类型
  const globalConfig = await p.group(
    {
      projectName: () =>
        p.text({
          message: '请输入项目名称:',
          placeholder: 'my-app',
          defaultValue: 'my-app',
          validate: (val) => {
            const name = val.trim()
            if (!name) return '项目名称不能为空'
            if (fs.existsSync(path.resolve(process.cwd(), name))) {
              return `目录 "${name}" 已存在，请换一个名称`
            }
          }
        }),

      toolchain: () =>
        p.select({
          message: '请选择项目生态体系:',
          options: [
            { value: 'electron-vite', label: 'Electron 桌面应用 (基于 electron-vite)' }
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

  const projectName = globalConfig.projectName.trim()
  const targetDir = path.resolve(process.cwd(), projectName)

  // 2. 路由分发给对应的具体框架模块处理
  switch (globalConfig.toolchain) {
    case 'electron-vite':
      await createElectronVite(projectName, targetDir)
      break
    default:
      p.cancel('未知的项目类型')
      process.exit(1)
  }
}

main()
