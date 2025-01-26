import fs from 'node:fs'
import { createFilter, type Plugin } from 'vite'
import { compile } from '../../compiler-dom'
import { parse } from '../../compiler-sfc'
import { rewriteDefault } from '../../compiler-sfc/rewrite-default'

const vitePluginVue = (): Plugin => {
  const filter = createFilter('**/*.vue')

  return {
    name: 'vite-plugin-vue',

    resolveId(id) {
      if (id.match(/\.vue\.css$/)) {
        return id
      }
    },

    load(id) {
      if (id.match(/\.vue\.css$/)) {
        const filename = id.replace(/\.css$/, '')
        const content = fs.readFileSync(filename, 'utf-8') // Retrieve the SFC file normally
        const { descriptor } = parse(content, { filename }) // Parse the SFC

        // Join the content and return it as the result
        const styles = descriptor.styles.map((it) => it.content).join('\n')
        return { code: styles }
      }
    },

    transform(code, id) {
      if (!filter(id)) return

      const outputs: string[] = []
      outputs.push("import * as vue from 'vue'\n")
      outputs.push(`import '${id}.css'\n`)

      const { descriptor } = parse(code, { filename: id })

      // script
      const SFC_MAIN = '__sfc_main'
      const scriptCode = rewriteDefault(descriptor.script?.content ?? '', SFC_MAIN)
      outputs.push(scriptCode)

      // template
      const templateCode = compile(descriptor.template?.content ?? '', {
        isBrowser: false,
      })
      outputs.push(templateCode)

      outputs.push('\n')
      outputs.push(`export default { ...${SFC_MAIN}, render }`)

      const res = outputs.join('\n')

      return { code: res }
    },
  }
}

export default vitePluginVue
