import {Parser, TreeCursor} from '@lezer/common'

export interface Tree {
  name: string
  from: number
  to: number
  children: Tree[]
}

export const parse = (code: string, parser: Parser): Tree => {
  let cursor = parser.parse(code).cursor()
  let visit = (cursor: TreeCursor): Tree => {
    let tree: Tree = {
      name: cursor.name,
      from: cursor.from,
      to: cursor.to,
      children: [],
    }

    let child = cursor.firstChild()
    if (!child) return tree

    do {
      let copy = cursor.node.cursor
      tree.children.push(visit(copy))
    } while (cursor.nextSibling())

    return tree
  }
  return visit(cursor)
}

export const printOnly = (code: string, tree: Tree): string => {
  let visit = (node: Tree, indent = '\n'): string => {
    let printed = ''
    let show = /^([A-Z]\w*|⚠)$/.test(node.name) || node.children.length
    if (show) printed += `${node.name}(`
    if (!node.children.length) {
      let snip = code.slice(node.from, node.to)
      snip = snip.replace(/\\n/g, `\\n`).replace(/\\t/g, `\\t`)
      snip = snip.replace(/"/g, `\\"`)
      printed += `"${snip}"`
      if (show) printed += ')'
    } else {
      let i2 = indent + '  '
      printed += i2 + node.children.map((c) => visit(c, i2)).join(i2)
      if (show) printed += indent + ')'
    }
    return printed
  }
  return visit(tree)
}

export const print = (code: string, parser: Parser) => {
  return printOnly(code, parse(code, parser))
}
