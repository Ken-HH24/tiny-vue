import {
  createRoot,
  NodeTypes,
  type AttributeNode,
  type DirectiveNode,
  type ElementNode,
  type ExpressionNode,
  type InterpolationNode,
  type Position,
  type SourceLocation,
  type TemplateChildNode,
  type TextNode,
} from './ast'

export interface ParserContext {
  // The original template string
  readonly originalSource: string

  source: string

  // The current position that this parser is reading
  offset: number
  line: number
  column: number
}

function createParserContext(content: string): ParserContext {
  return {
    originalSource: content,
    source: content,
    column: 1,
    line: 1,
    offset: 0,
  }
}

export const baseParse = (content: string) => {
  const context = createParserContext(content)
  const children = parseChildren(context, [])
  return createRoot(children)
}

function parseChildren(context: ParserContext, ancestors: ElementNode[]): TemplateChildNode[] {
  const nodes: TemplateChildNode[] = []

  while (!isEnd(context, ancestors)) {
    const s = context.source
    let node: TemplateChildNode | undefined = undefined

    if (s.startsWith('{{')) {
      node = parseInterpolation(context)
    } else if (s[0] === '<') {
      // If s starts with "<" and the next character is an alphabet, it is parsed as an element.
      if (/[a-z]/i.test(s[1])) {
        node = parseElement(context, ancestors)
      }
    }

    if (!node) {
      // If it does not match the above conditions, it is parsed as a TextNode.
      node = parseText(context)
    }

    pushNode(nodes, node)
  }

  return nodes
}

function parseText(context: ParserContext): TextNode {
  const endTokens = ['<', '{{']

  let endIndex = context.source.length
  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i], 1)
    if (index !== -1 && endIndex > index) {
      endIndex = index
    }
  }

  const start = getCursor(context)

  const content = parseTextData(context, endIndex)

  return {
    type: NodeTypes.TEXT,
    content,
    loc: getSelection(context, start),
  }
}

function parseTextData(context: ParserContext, length: number) {
  const rawText = context.source.slice(0, length)
  advanceBy(context, length)
  return rawText
}

// Function to determine the end of the while loop for parsing child elements
function isEnd(context: ParserContext, ancestors: ElementNode[]): boolean {
  const s = context.source

  // If s starts with "</" and the tag name of ancestors follows, it determines whether there is a closing tag (whether parseChildren should end).
  if (startsWith(s, '</')) {
    for (let i = ancestors.length - 1; i >= 0; --i) {
      if (startsWithEndTagOpen(s, ancestors[i].tag)) {
        return true
      }
    }
  }

  return !s
}

const enum TagType {
  Start,
  End,
}

function parseElement(context: ParserContext, ancestors: ElementNode[]): ElementNode | undefined {
  // Start tag.
  const element = parseTag(context, TagType.Start)

  // If it is a self-closing element like <img />, we end here (since there are no children or end tag).
  if (element.isSelfClosing) {
    return element
  }

  // Children.
  ancestors.push(element)
  const children = parseChildren(context, ancestors)
  ancestors.pop()

  element.children = children

  // End tag.
  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.End)
  }

  return element
}

function parseInterpolation(context: ParserContext): InterpolationNode | undefined {
  const [open, close] = ['{{', '}}']
  const closeIndex = context.source.indexOf(close)
  if (closeIndex === -1) {
    return undefined
  }

  const start = getCursor(context)
  advanceBy(context, open.length)

  const innerStart = getCursor(context)
  const innerEnd = getCursor(context)
  const rawContentLength = closeIndex - open.length
  const rawContent = context.source.slice(0, rawContentLength)
  const preTrimContent = parseTextData(context, rawContentLength)

  const content = preTrimContent.trim()

  const startOffset = content.indexOf(preTrimContent)

  if (startOffset > 0) {
    advancePositionWithMutation(innerStart, rawContent, startOffset)
  }

  const endOffset = rawContentLength - (preTrimContent.length - content.length - startOffset)
  advancePositionWithMutation(innerEnd, rawContent, endOffset)
  advanceBy(context, close.length)

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      isStatic: false,
      content,
      loc: getSelection(context, innerStart, innerEnd)
    },
    loc: getSelection(context, start),
  }
}

function startsWith(source: string, searchString: string): boolean {
  return source.startsWith(searchString)
}

function parseTag(context: ParserContext, type: TagType): ElementNode {
  // Tag open.
  const start = getCursor(context)
  const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source)!
  const tag = match[1]

  advanceBy(context, match[0].length)
  advanceSpaces(context)

  // Attributes.
  let props = parseAttributes(context, type)

  // Tag close.
  let isSelfClosing = false

  // If the next characters are "/>", it is a self-closing tag.
  isSelfClosing = startsWith(context.source, '/>')
  advanceBy(context, isSelfClosing ? 2 : 1)

  return {
    type: NodeTypes.ELEMENT,
    tag,
    props,
    children: [],
    isSelfClosing,
    codegenNode: undefined, // to be created during transform phase
    loc: getSelection(context, start),
  }
}

// Parsing the entire attributes (multiple attributes).
// eg. `id="app" class="container" style="color: red"`
function parseAttributes(context: ParserContext, type: TagType): (AttributeNode | DirectiveNode)[] {
  const props: (AttributeNode | DirectiveNode)[] = []
  const attributeNames = new Set<string>()

  // Continue reading until the end of the tag.
  while (
    context.source.length > 0 &&
    !startsWith(context.source, '>') &&
    !startsWith(context.source, '/>')
  ) {
    const attr = parseAttribute(context, attributeNames)

    if (type === TagType.Start) {
      props.push(attr)
    }

    advanceSpaces(context) // Skip spaces.
  }

  return props
}

type AttributeValue =
  | {
      content: string
      loc: SourceLocation
    }
  | undefined

// Parsing a single attribute.
// eg. `id="app"`
function parseAttribute(
  context: ParserContext,
  nameSet: Set<string>,
): AttributeNode | DirectiveNode {
  // Name.
  const start = getCursor(context)
  const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)!
  const name = match[0]

  nameSet.add(name)

  advanceBy(context, name.length)

  // Value
  let value: AttributeValue = undefined

  if (/^[\t\r\n\f ]*=/.test(context.source)) {
    advanceSpaces(context)
    advanceBy(context, 1)
    advanceSpaces(context)
    value = parseAttributeValue(context)
  }

  // directive
  const loc = getSelection(context, start)
  if (/^(v-[A-Za-z0-9-]|:|\.|@|#)/.test(name)) {
    const match = /(?:^v-([a-z0-9-]+))?(?:(?::|^\.|^@|^#)(\[[^\]]+\]|[^\.]+))?(.+)?$/i.exec(name)!

    let dirName = match[1] || (startsWith(name, ':') ? 'bind' : startsWith(name, '@') ? 'on' : '')

    let arg: ExpressionNode | undefined

    if (match[2]) {
      const startOffset = name.lastIndexOf(match[2])
      const loc = getSelection(
        context,
        getNewPosition(context, start, startOffset),
        getNewPosition(context, start, startOffset + match[2].length),
      )

      let content = match[2]
      let isStatic = true

      if (content.startsWith('[')) {
        isStatic = false
        if (!content.endsWith(']')) {
          console.error(`Invalid dynamic argument expression: ${content}`)
          content = content.slice(1)
        } else {
          content = content.slice(1, content.length - 1)
        }
      }

      arg = {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content,
        isStatic,
        loc,
      }
    }

    return {
      type: NodeTypes.DIRECTIVE,
      name: dirName,
      exp: value && {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: value.content,
        isStatic: false,
        loc: value.loc,
      },
      loc,
      arg,
    }
  }

  return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value: value && {
      type: NodeTypes.TEXT,
      content: value.content,
      loc: value.loc,
    },
    loc,
  }
}

// Parsing the value of an attribute.
// This implementation allows values to be parsed whether they are single-quoted or double-quoted.
// It simply extracts the value enclosed in quotes.
function parseAttributeValue(context: ParserContext): AttributeValue {
  const start = getCursor(context)
  let content: string

  const quote = context.source[0]
  const isQuoted = quote === `"` || quote === `'`
  if (isQuoted) {
    // Quoted value.
    advanceBy(context, 1)

    const endIndex = context.source.indexOf(quote)
    if (endIndex === -1) {
      content = parseTextData(context, context.source.length)
    } else {
      content = parseTextData(context, endIndex)
      advanceBy(context, 1)
    }
  } else {
    // Unquoted
    const match = /^[^\t\r\n\f >]+/.exec(context.source)
    if (!match) {
      return undefined
    }
    content = parseTextData(context, match[0].length)
  }

  return { content, loc: getSelection(context, start) }
}

function pushNode(nodes: TemplateChildNode[], node: TemplateChildNode): void {
  // If nodes of type Text are continuous, they are combined.
  if (node.type === NodeTypes.TEXT) {
    const prev = last(nodes)
    if (prev && prev.type === NodeTypes.TEXT) {
      prev.content += node.content
      return
    }
  }

  nodes.push(node)
}

function last<T>(xs: T[]): T | undefined {
  return xs[xs.length - 1]
}

function startsWithEndTagOpen(source: string, tag: string): boolean {
  return (
    startsWith(source, '</') &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase() &&
    /[\t\r\n\f />]/.test(source[2 + tag.length] || '>')
  )
}

function advanceBy(context: ParserContext, numberOfCharacters: number) {
  const { source } = context
  advancePositionWithMutation(context, source, numberOfCharacters)
  context.source = source.slice(numberOfCharacters)
}

function advanceSpaces(context: ParserContext): void {
  const match = /^[\t\r\n\f ]+/.exec(context.source)
  if (match) {
    advanceBy(context, match[0].length)
  }
}

function getCursor(context: ParserContext): Position {
  const { column, line, offset } = context
  return { column, line, offset }
}

function advancePositionWithMutation(
  pos: Position,
  source: string,
  numberOfCharacters: number = source.length,
): Position {
  let linesCount = 0
  let lastNewLinePos = -1
  for (let i = 0; i < numberOfCharacters; i++) {
    if (source.charCodeAt(i) === 10 /* newline char code */) {
      linesCount++
      lastNewLinePos = i
    }
  }

  pos.offset += numberOfCharacters
  pos.line += linesCount
  pos.column =
    lastNewLinePos === -1 ? pos.column + numberOfCharacters : numberOfCharacters - lastNewLinePos

  return pos
}

function getSelection(context: ParserContext, start: Position, end?: Position): SourceLocation {
  end = end || getCursor(context)
  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset),
  }
}

export function advancePositionWithClone(
  pos: Position,
  source: string,
  numberOfCharacters: number = source.length,
): Position {
  return advancePositionWithMutation({ ...pos }, source, numberOfCharacters)
}

function getNewPosition(
  context: ParserContext,
  start: Position,
  numberOfCharacters: number,
): Position {
  return advancePositionWithClone(
    start,
    context.originalSource.slice(start.offset, numberOfCharacters),
    numberOfCharacters,
  )
}
