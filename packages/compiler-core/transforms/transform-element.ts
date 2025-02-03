import {
  createCallExpression,
  createObjectExpression,
  createObjectProperty,
  createSimpleExpression,
  createVNodeCall,
  NodeTypes,
  type CallExpression,
  type DirectiveNode,
  type ElementNode,
  type ExpressionNode,
  type ObjectExpression,
  type RootNode,
  type TemplateChildNode,
  type TemplateTextChildNode,
  type VNodeCall,
} from '../ast'
import type { TransformContext } from '../transform'
import { isStaticExp } from '../utils'

export type PropsExpression = ObjectExpression | CallExpression | ExpressionNode

export const transformElement = (node: TemplateChildNode | RootNode, context: TransformContext) => {
  return () => {
    node = context.currentNode!

    if (node?.type !== NodeTypes.ELEMENT) {
      return
    }

    const { tag, props } = node
    const vnodeTag = `"${tag}"`
    let vnodeProps: VNodeCall['props']
    let vnodeChildren: VNodeCall['children']

    if (props.length > 0) {
      const propsBuildResult = buildProps(node, context)
      vnodeProps = propsBuildResult.props
    }

    if (node.children.length > 0) {
      if (node.children.length === 1) {
        const child = node.children[0]
        const type = child.type
        const hasDynamicTextChild = type === NodeTypes.INTERPOLATION

        if (hasDynamicTextChild || type === NodeTypes.TEXT) {
          vnodeChildren = child as TemplateTextChildNode
        } else {
          vnodeChildren = node.children
        }
      } else {
        vnodeChildren = node.children
      }
    }

    node.codegenNode = createVNodeCall(vnodeTag, vnodeProps, vnodeChildren)
  }
}

export function buildProps(node: ElementNode, context: TransformContext) {
  const { props, loc: elementLoc } = node

  let properties: ObjectExpression['properties'] = []
  const runtimeDirectives: DirectiveNode[] = []
  const mergeArgs: PropsExpression[] = []

  const pushMergeArg = (arg?: PropsExpression) => {
    if (properties.length) {
      mergeArgs.push(createObjectExpression(properties, elementLoc))
      properties = []
    }
    if (arg) {
      mergeArgs.push(arg)
    }
  }

  for (let i = 0; i < props.length; i++) {
    const prop = props[i]

    if (prop.type === NodeTypes.ATTRIBUTE) {
      const { name, value } = prop

      properties.push(
        createObjectProperty(
          createSimpleExpression(name, true),
          createSimpleExpression(value ? value.content : '', true),
        ),
      )
    } else {
      // directive
      const { name, arg, exp } = prop
      const isVBind = name === 'bind'
      if (!arg && isVBind) {
        if (exp) {
          if (isVBind) {
            pushMergeArg()
            mergeArgs.push(exp)
          } else {
            // v-on
          }
        }
        continue
      }

      const directiveTransform = context.directiveTransforms[name]
      if (directiveTransform) {
        const { props } = directiveTransform(prop, node, context)

        properties.push(...props)
      } else {
        // custom directive.
      }
    }
  }

  let propsExpression: PropsExpression | undefined = undefined
  if (mergeArgs.length) {
    pushMergeArg()
    if (mergeArgs.length > 1) {
      propsExpression = createCallExpression('mergeProps', mergeArgs, elementLoc)
    } else {
      propsExpression = mergeArgs[0]
    }
  } else if (properties.length) {
    propsExpression = createObjectExpression(properties)
  }

  if (propsExpression) {
    switch (propsExpression.type) {
      case NodeTypes.JS_OBJECT_EXPRESSION:
        let classKeyIndex = -1
        let styleKeyIndex = -1

        for (let i = 0; i < propsExpression.properties.length; i++) {
          const key = propsExpression.properties[i].key
          if (isStaticExp(key)) {
            if (key.content === 'class') {
              classKeyIndex = i
            } else if (key.content === 'style') {
              styleKeyIndex = i
            }
          }
        }

        const classProp = propsExpression.properties[classKeyIndex]
        const styleProp = propsExpression.properties[styleKeyIndex]

        if (classProp && !isStaticExp(classProp.value)) {
          classProp.value = createCallExpression('normalizeClass', [classProp.value])
        }

        if (
          styleProp &&
          ((styleProp.value.type === NodeTypes.SIMPLE_EXPRESSION &&
            styleProp.value.content.trim()[0] === `[`) ||
            styleProp.value.type === NodeTypes.JS_ARRAY_EXPRESSION)
        ) {
          styleProp.value = createCallExpression('normalizeStyle', [styleProp.value])
        } else {
          // dynamic key binding, wrap with `normalizeProps`
          propsExpression = createCallExpression('normalizeProps', [propsExpression])
        }
        break

      case NodeTypes.JS_CALL_EXPRESSION:
        // mergeProps call, do nothing
        break

      default:
        // single v-bind
        propsExpression = createCallExpression('normalizeProps', [propsExpression])
        break
    }
  }

  return {
    props: propsExpression,
    directives: runtimeDirectives,
  }
}
