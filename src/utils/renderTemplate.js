import fs from 'fs'
import path from 'path'

/**
 * 递归模板渲染与覆盖引擎
 * @param {string} src 源目录
 * @param {string} dest 目标目录
 */
export function renderTemplate(src, dest) {
  const stats = fs.statSync(src)

  if (stats.isDirectory()) {
    if (['node_modules', 'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock'].includes(path.basename(src))) return
    fs.mkdirSync(dest, { recursive: true })
    for (const file of fs.readdirSync(src)) {
      renderTemplate(path.resolve(src, file), path.resolve(dest, file))
    }
    return
  }

  const filename = path.basename(src)

  // 遇到 package.json 执行智能深度合并
  if (filename === 'package.json' && fs.existsSync(dest)) {
    const existingPkg = JSON.parse(fs.readFileSync(dest, 'utf-8'))
    const newPkg = JSON.parse(fs.readFileSync(src, 'utf-8'))
    const merged = deepMerge(existingPkg, newPkg)
    fs.writeFileSync(dest, JSON.stringify(merged, null, 2) + '\n', 'utf-8')
    return
  }

  // 普通文件直接覆盖
  fs.copyFileSync(src, dest)
}

/**
 * 递归合并两个 JavaScript 对象（专用于 package.json）
 */
export function deepMerge(target, source) {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    const oldVal = result[key]
    const newVal = source[key]

    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      result[key] = Array.from(new Set([...oldVal, ...newVal]))
    } else if (
      oldVal && typeof oldVal === 'object' &&
      newVal && typeof newVal === 'object' &&
      !Array.isArray(oldVal) && !Array.isArray(newVal)
    ) {
      result[key] = deepMerge(oldVal, newVal)
    } else {
      result[key] = newVal
    }
  }
  return result
}
