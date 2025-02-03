// This represents the type of node.
// It should be noted that the Node here does not refer to the HTML Node, but rather the granularity handled by this template compiler.
// So, not only Element and Text, but also Attribute are treated as one Node.

import { isString } from '../shared'

// This is in line with the design of Vue.js and will be useful when implementing directives in the future.
export const enum NodeTypes {
  ROOT,
  ELEMENT,
  TEXT,
  INTERPOLATION,
  SIMPLE_EXPRESSION,

  ATTRIBUTE,
  DIRECTIVE,

  COMPOUND_EXPRESSION,

  // codegen
  VNODE_CALL,
  JS_CALL_EXPRESSION,
  JS_OBJECT_EXPRESSION,
  JS_PROPERTY,
  JS_ARRAY_EXPRESSION,
}

// All Nodes have type and loc.
// loc stands for location and holds information about where this Node corresponds to in the source code (template string).
// (e.g. which line and where on the line)
export interface Node {
  type: NodeTypes
  loc: SourceLocation
}

export type ExpressionNode = SimpleExpressionNode | CompoundExpressionNode

// Node for Element.
export interface ElementNode extends Node {
  type: NodeTypes.ELEMENT
  tag: string // e.g. "div"
  props: Array<AttributeNode | DirectiveNode> // e.g. { name: "class", value: { content: "container" } }
  children: TemplateChildNode[]
  isSelfClosing: boolean // e.g. <img /> -> true
  codegenNode: VNodeCall | SimpleExpressionNode | undefined
}

// Attribute that ElementNode has.
// It could have been expressed as just Record<string, string>,
// but it is defined to have name(string) and value(TextNode) like Vue.
export interface AttributeNode extends Node {
  type: NodeTypes.ATTRIBUTE
  name: string
  value: TextNode | undefined
}

export type TemplateChildNode = ElementNode | TextNode | InterpolationNode

export interface TextNode extends Node {
  type: NodeTypes.TEXT
  content: string
}

export interface InterpolationNode extends Node {
  type: NodeTypes.INTERPOLATION
  content: ExpressionNode
}

export type TemplateTextChildNode = TextNode | InterpolationNode

export interface SimpleExpressionNode extends Node {
  type: NodeTypes.SIMPLE_EXPRESSION
  content: string
  isStatic: boolean
}

export interface CompoundExpressionNode extends Node {
  type: NodeTypes.COMPOUND_EXPRESSION
  children: (
    | SimpleExpressionNode
    | CompoundExpressionNode
    | InterpolationNode
    | TextNode
    | string
  )[]
}

// This represents an expression that calls the h function.
// It assumes something like `h("p", { class: 'message'}, ["hello"])`.
export interface VNodeCall extends Node {
  type: NodeTypes.VNODE_CALL
  tag: string | symbol
  props: ObjectExpression | CallExpression | undefined // NOTE: It is implemented as PropsExpression in the source code (for future extensions)
  children:
    | TemplateChildNode[] // multiple children
    | TemplateTextChildNode
    | undefined
}

export type ParentNode = RootNode | ElementNode

export type JSChildNode =
  | VNodeCall
  | CallExpression
  | ObjectExpression
  | ArrayExpression
  | ExpressionNode

export interface CallExpression extends Node {
  type: NodeTypes.JS_CALL_EXPRESSION
  callee: string
  arguments: (string | JSChildNode | TemplateChildNode | TemplateChildNode[])[]
}

// This represents a JavaScript Object. It is used for the props of VNodeCall, etc.
export interface ObjectExpression extends Node {
  type: NodeTypes.JS_OBJECT_EXPRESSION
  properties: Array<Property>
}
export interface Property extends Node {
  type: NodeTypes.JS_PROPERTY
  key: ExpressionNode
  value: JSChildNode
}

// This represents a JavaScript Array. It is used for the children of VNodeCall, etc.
export interface ArrayExpression extends Node {
  type: NodeTypes.JS_ARRAY_EXPRESSION
  elements: Array<string | Node>
}

export interface RootNode extends Node {
  type: NodeTypes.ROOT
  children: TemplateChildNode[]
  codegenNode: (TemplateChildNode | VNodeCall)[] | undefined
}

export interface DirectiveNode extends Node {
  type: NodeTypes.DIRECTIVE
  // Represents the format of `v-name:arg="exp"`.
  // eg. For `v-on:click="increment"`, it would be { name: "on", arg: "click", exp="increment" }
  name: string
  arg: ExpressionNode | undefined
  exp: ExpressionNode | undefined
}

// Information about location.
// Node has this information.
// start and end contain position information.
// source contains the actual code (string).
export interface SourceLocation {
  start: Position
  end: Position
  source: string
}

export interface Position {
  offset: number // from start of file
  line: number
  column: number
}

export const locStub: SourceLocation = {
  source: '',
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 1, offset: 0 },
}

export function createRoot(children: TemplateChildNode[], loc: SourceLocation = locStub): RootNode {
  return {
    type: NodeTypes.ROOT,
    children,
    codegenNode: undefined,
    loc,
  }
}

export function createVNodeCall(
  tag: VNodeCall['tag'],
  props?: VNodeCall['props'],
  children?: VNodeCall['children'],
  loc: SourceLocation = locStub,
): VNodeCall {
  return {
    type: NodeTypes.VNODE_CALL,
    tag,
    props,
    children,
    loc,
  }
}

export function createArrayExpression(
  elements: ArrayExpression['elements'],
  loc: SourceLocation = locStub,
): ArrayExpression {
  return {
    type: NodeTypes.JS_ARRAY_EXPRESSION,
    elements,
    loc,
  }
}

export function createObjectExpression(
  properties: ObjectExpression['properties'],
  loc: SourceLocation = locStub,
): ObjectExpression {
  return {
    type: NodeTypes.JS_OBJECT_EXPRESSION,
    properties,
    loc,
  }
}

export function createObjectProperty(
  key: Property['key'] | string,
  value: Property['value'],
  loc: SourceLocation = locStub,
): Property {
  return {
    type: NodeTypes.JS_PROPERTY,
    key: isString(key) ? createSimpleExpression(key, true) : key,
    value,
    loc,
  }
}

export function createSimpleExpression(
  content: SimpleExpressionNode['content'],
  isStatic: SimpleExpressionNode['isStatic'] = false,
  loc: SourceLocation = locStub,
): SimpleExpressionNode {
  return {
    type: NodeTypes.SIMPLE_EXPRESSION,
    isStatic,
    content,
    loc,
  }
}

export function createCallExpression<T extends CallExpression['callee']>(
  callee: T,
  args: CallExpression['arguments'],
  loc: SourceLocation = locStub,
): CallExpression {
  return {
    type: NodeTypes.JS_CALL_EXPRESSION,
    callee,
    arguments: args,
    loc,
  }
}

export const createCompoundExpression = (children: CompoundExpressionNode['children'], loc: SourceLocation = locStub): CompoundExpressionNode => {
  return {
    type: NodeTypes.COMPOUND_EXPRESSION,
    children,
    loc
  }
}