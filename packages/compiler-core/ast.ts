// This represents the type of node.
// It should be noted that the Node here does not refer to the HTML Node, but rather the granularity handled by this template compiler.
// So, not only Element and Text, but also Attribute are treated as one Node.
// This is in line with the design of Vue.js and will be useful when implementing directives in the future.
export const enum NodeTypes {
  ELEMENT,
  TEXT,
  INTERPOLATION,

  ATTRIBUTE,
  DIRECTIVE,
}

// All Nodes have type and loc.
// loc stands for location and holds information about where this Node corresponds to in the source code (template string).
// (e.g. which line and where on the line)
export interface Node {
  type: NodeTypes
  loc: SourceLocation
}

// Node for Element.
export interface ElementNode extends Node {
  type: NodeTypes.ELEMENT
  tag: string // e.g. "div"
  props: Array<AttributeNode | DirectiveNode> // e.g. { name: "class", value: { content: "container" } }
  children: TemplateChildNode[]
  isSelfClosing: boolean // e.g. <img /> -> true
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
  content: string // The content written inside the Mustache (in this case, the single variable name defined in setup will be placed here)
}

export interface DirectiveNode extends Node {
  type: NodeTypes.DIRECTIVE
  // Represents the format of `v-name:arg="exp"`.
  // eg. For `v-on:click="increment"`, it would be { name: "on", arg: "click", exp="increment" }
  name: string
  arg: string
  exp: string
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
