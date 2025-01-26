import { parse } from '@babel/parser'
import MagicString from 'magic-string'

const defaultExportRE = /((?:^|\n|;)\s*)export(\s*)default/
const namedDefaultExportRE = /((?:^|\n|;)\s*)export(.+)(?:as)?(\s*)default/s

const hasDefaultExport = (input: string) => {
  return defaultExportRE.test(input) || namedDefaultExportRE.test(input)
}

export const rewriteDefault = (input: string, as: string) => {
  if (!hasDefaultExport(input)) {
    return `${input}\n const ${as} = {}`
  }

  const s = new MagicString(input)
  const ast = parse(input, {
    sourceType: 'module',
  }).program.body

  ast.forEach((node) => {
    // In case of default export
    if (node.type === 'ExportDefaultDeclaration') {
      if (node.declaration.type === 'ClassDeclaration') {
        // If it is `export default class Hoge {}`, replace it with `class Hoge {}`
        s.overwrite(node.start!, node?.declaration?.id?.start!, `class `)
        // Then, add code like `const ${as} = Hoge;` at the end.
        s.append(`\nconst ${as} = ${node.declaration.id?.name}`)
      } else {
        // For other default exports, replace the declaration part with a variable declaration.
        // eg 1) `export default { setup() {}, }`  ->  `const ${as} = { setup() {}, }`
        // eg 2) `export default Hoge`  ->  `const ${as} = Hoge`
        s.overwrite(node.start!, node.declaration.start!, `const ${as} = `)
      }
    }

    // There may be a default export in the declaration even in the case of named export.
    // Mainly 3 patterns
    //   1. In the case of declaration like `export { default } from "source";`
    //   2. In the case of declaration like `export { hoge as default }` from 'source'
    //   3. In the case of declaration like `export { hoge as default }`
    if (node.type === 'ExportNamedDeclaration') {
      for (const specifier of node.specifiers) {
        if (
          specifier.type === 'ExportSpecifier' &&
          specifier.exported.type === 'Identifier' &&
          specifier.exported.name === 'default'
        ) {
          // If there is a keyword `from`
          if (node.source) {
            if (specifier.local.name === 'default') {
              // 1. In the case of declaration like `export { default } from "source";`
              // In this case, extract it into an import statement and give it a name, then bind it to the final variable.
              // eg) `export { default } from "source";`  ->  `import { default as __VUE_DEFAULT__ } from 'source'; const ${as} = __VUE_DEFAULT__`
              const end = specifierEnd(input, specifier.local.end!, node.end!)
              s.prepend(`import { default as __VUE_DEFAULT__ } from '${node.source.value}'\n`)
              s.overwrite(specifier.start!, end, ``)
              s.append(`\nconst ${as} = __VUE_DEFAULT__`)
              continue
            } else {
              // 2. In the case of declaration like `export { hoge as default }` from 'source'
              // In this case, rewrite all specifiers as they are in the import statement, and bind the variable that is as default to the final variable.
              // eg) `export { hoge as default } from "source";`  ->  `import { hoge } from 'source'; const ${as} = hoge
              const end = specifierEnd(input, specifier.exported.end!, node.end!)
              s.prepend(
                `import { ${input.slice(
                  specifier.local.start!,
                  specifier.local.end!,
                )} } from '${node.source.value}'\n`,
              )

              // 3. In the case of declaration like `export { hoge as default }`
              // In this case, simply bind it to the final variable.
              s.overwrite(specifier.start!, end, ``)
              s.append(`\nconst ${as} = ${specifier.local.name}`)
              continue
            }
          }
          const end = specifierEnd(input, specifier.end!, node.end!)
          s.overwrite(specifier.start!, end, ``)
          s.append(`\nconst ${as} = ${specifier.local.name}`)
        }
      }
    }
  })
  return s.toString()
}

// Calculate the end of the declaration statement
function specifierEnd(input: string, end: number, nodeEnd: number | null) {
  // export { default   , foo } ...
  let hasCommas = false
  let oldEnd = end
  while (end < nodeEnd!) {
    if (/\s/.test(input.charAt(end))) {
      end++
    } else if (input.charAt(end) === ',') {
      end++
      hasCommas = true
      break
    } else if (input.charAt(end) === '}') {
      break
    }
  }
  return hasCommas ? end : oldEnd
}
