export type NumberLiteral = { type:'number-literal', value:number }
export type StringLiteral = { type: 'string-literal', value:string }
export type PlainId = { type: 'plain-identifier', name:string }
export type SymbolId = { type: 'symbol-identifier', name:string }
export type KeywordId = { type: 'keyword-id', name:string}
export type UnaryCall  = { type: 'unary-call',  message:PlainId   }
export type BinaryCall = { type: 'binary-call', operator:SymbolId, argument:Ast }
export type KeywordArgument = {type: 'keyword-argument', name: KeywordId, value: Ast}
export type KeywordCall = { type: 'keyword-call', args: Array<KeywordArgument> }

export type MessageCall = { type: 'message-call', receiver: Ast, call:UnaryCall | BinaryCall | KeywordCall}

export type Group = { type: 'group', body: Array<Ast> }
export type Assignment = { type: 'assignment', target: PlainId, value: Ast }
export type ReturnStatement = { type: 'return', value: Ast }
export type Statement = { type: 'statement', value: Ast}
export type BlockLiteral = { type: 'block-literal', parameters: Array<PlainId>, body: Array<Statement>}
export type CommentAst = { type: 'comment', content: string }
export type ListLiteral = { type: 'list-literal', body: Array<Ast> }
export type MapPair = { type: 'map-pair', name: PlainId, value: Ast }
export type MapLiteral = { type: 'map-literal', body: Array<MapPair> }

export type Ast = NumberLiteral | StringLiteral | PlainId | SymbolId | KeywordId
    | UnaryCall | BinaryCall | KeywordCall | MessageCall | KeywordArgument
    | Group | Assignment | Statement | BlockLiteral | ReturnStatement
    | CommentAst | ListLiteral | MapLiteral | MapPair


export const PlnId = (name:string):PlainId => ({type:'plain-identifier', name})
export const SymId = (name:string):SymbolId => ({type:'symbol-identifier', name})
export const KeyId = (name:string):KeywordId => ({type:'keyword-id', name})
export const Num = (value:number):NumberLiteral => ({type:"number-literal", value })
export const Str = (value:string):StringLiteral => ({type:"string-literal", value })
export const Grp = (...body:Ast[]):Group => ({type:"group", body})
export const Unary = (message:PlainId):UnaryCall => ({type:"unary-call", message })
export const Binary = (operator:SymbolId, argument:Ast):BinaryCall => ({type:"binary-call", operator, argument })
export const Keyword = (...args:Array<KeywordArgument>):KeywordCall => ({type:"keyword-call", args:args })
export const KeyArg = (name:KeywordId, value:Ast):KeywordArgument => ({type:"keyword-argument",name,value})
export const Method = (receiver:Ast, call:UnaryCall|BinaryCall|KeywordCall):MessageCall => ({type:"message-call",receiver,call})
export const Ass = (target:PlainId, value:Ast):Assignment => ({type:"assignment",target, value})
export const Ret = (value:Ast):ReturnStatement => ({type:'return',value})
export const Stmt = (value:Ast):Statement => ({type:"statement", value})
export const Blk = (...body:Array<Statement>):BlockLiteral => ({type:"block-literal", body, parameters:[] })
export const BlkArgs = (parameters:Array<PlainId>, body:Array<Statement>):BlockLiteral => ({type:'block-literal',  parameters, body})
export const Cmnt = (content:string):CommentAst => ({type:'comment',content})
export const ListLit = (...body:Array<Ast>):ListLiteral => ({type:'list-literal',body})
export const MapPair = (name:PlainId, value:Ast):MapPair => ({type:'map-pair',name:name,value})
export const MapLit = (...body:Array<MapPair>):MapLiteral => ({type:'map-literal',body})

export function AstToString(ast: Ast): string {
    let str = ''
    if (ast.type === 'group') {
        return '(' + ast.body.map(a => AstToString(a)).join(' ') +  ')'
    }
    if (ast.type === 'block-literal') {
        return '[' + ast.body.map(a => AstToString(a)).join(' ') + ']'
    }
    if (ast.type === 'assignment') {
        return AstToString(ast.target) + ":=" + AstToString(ast.value)
    }
    if (ast.type === 'symbol-identifier') {
        return ast.name
    }
    if (ast.type === 'number-literal') {
        return '#' + ast.value
    }
    if (ast.type === 'keyword-id') {
        return '' + ast.name
    }
    if (ast.type === 'string-literal') {
        return `'${ast.value}'`
    }
    if (ast.type === 'plain-identifier') {
        return `@${ast.name}`
    }
    if (ast.type === 'keyword-argument') {
        return AstToString(ast.name) + ' ' + AstToString(ast.value)
    }
    if (ast.type === 'unary-call') {
        return AstToString(ast.message)
    }
    if (ast.type === 'binary-call') {
        return AstToString(ast.operator) + AstToString(ast.argument)
    }
    if (ast.type === 'keyword-call') {
        return '{' + ast.args.map(a => AstToString(a)).join(' ') + '}'
    }
    if (ast.type === 'message-call') {
        return AstToString(ast.receiver) + AstToString(ast.call)
    }
    if (ast.type === 'statement') {
        return AstToString(ast.value) + '.'
    }
    if (ast.type === 'return') {
        return '^' + AstToString(ast.value)
    }
    str += ast.type + ' '
    return str
}
export function AstToSource(ast: Ast):string {
    return a2s(ast, 0)
}
const tab = (inset:number)=> {
    let str = ""
    for(let i=0; i<inset; i++) {
        str += "  "
    }
    return str
}
export function a2s(ast: Ast, inset:number):string {
    switch (ast.type) {
        case 'statement': return tab(inset) + a2s(ast.value,inset) + "."
        case 'group': return `(${ast.body.map(a => a2s(a,inset)).join(' ')})`

        case 'plain-identifier': return ast.name
        case 'symbol-identifier': return ast.name
        case 'number-literal': return ast.value+''
        case 'string-literal': return `'${ast.value}'`
        case 'block-literal': return (
            `[${ast.parameters.map(p => a2s(p,inset)).join(' ')}|`
            + "\n"
            + ast.body.map(a => a2s(a,inset+1)).join('\n')
            +`\n${tab(inset)}]`
        )

        case "message-call": return `${a2s(ast.receiver,inset)} ${a2s(ast.call,inset)}`
        case 'binary-call': return `${a2s(ast.operator,inset)} ${a2s(ast.argument,inset)}`
        case 'unary-call': return `${a2s(ast.message,inset)}`
        case 'keyword-call': return `${ast.args.map(a => a2s(a,inset)).join(' ')}`
        case 'keyword-argument': return `${a2s(ast.name,inset)} ${a2s(ast.value,inset)}`
        case 'keyword-id': return `${ast.name}`
        case 'assignment': return `${a2s(ast.target,inset)} := ${a2s(ast.value,inset)}`
    }
    return `not implemented yet for type '${ast.type}'`
}