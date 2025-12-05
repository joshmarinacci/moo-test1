export type NumberLiteral = { type:'number-literal', value:number }
export type StringLiteral = { type: 'string-literal', value:string }
export type PlainId = { type: 'plain-identifier', name:string }
export type SymbolId = { type: 'symbol-identifier', name:string }
export type KeywordId = { type: 'keyword-id', name:string}
export type UnaryCall  = { type: 'unary-call',  message:PlainId   }
export type BinaryCall = { type: 'binary-call', operator:SymbolId, argument:Ast2 }
export type KeywordArgument = {type: 'keyword-argument', name: KeywordId, value: Ast2}
export type KeywordCall = { type: 'keyword-call', args: Array<KeywordArgument> }

export type MessageCall = { type: 'message-call', receiver: Ast2, call:UnaryCall | BinaryCall | KeywordCall}

export type Group = { type: 'group', body: Array<Ast2> }
export type Assignment = { type: 'assignment', target: PlainId, value: Ast2 }
export type ReturnStatement = { type: 'return', value: Ast2 }
export type Statement = { type: 'statement', value: Ast2}
export type BlockLiteral = { type: 'block-literal', parameters: Array<PlainId>, body: Array<Statement>}
export type CommentAst = { type: 'comment', content: string }

export type Ast2 = NumberLiteral | StringLiteral | PlainId | SymbolId | KeywordId
    | UnaryCall | BinaryCall | KeywordCall | MessageCall | KeywordArgument
    | Group | Assignment | Statement | BlockLiteral | ReturnStatement
    | CommentAst


export const PlnId = (name:string):PlainId => ({type:'plain-identifier', name})
export const SymId = (name:string):SymbolId => ({type:'symbol-identifier', name})
export const KeyId = (name:string):KeywordId => ({type:'keyword-id', name})
export const Num = (value:number):NumberLiteral => ({type:"number-literal", value })
export const Str = (value:string):StringLiteral => ({type:"string-literal", value })
export const Grp = (...body:Ast2[]):Group => ({type:"group", body})
export const Unary = (message:PlainId):UnaryCall => ({type:"unary-call", message })
export const Binary = (operator:SymbolId, argument:Ast2):BinaryCall => ({type:"binary-call", operator, argument })
export const Keyword = (...args:Array<KeywordArgument>):KeywordCall => ({type:"keyword-call", args:args })
export const KArg = (name:KeywordId,value:Ast2):KeywordArgument => ({type:"keyword-argument",name,value})
export const Method = (receiver:Ast2, call:UnaryCall|BinaryCall|KeywordCall):MessageCall => ({type:"message-call",receiver,call})
export const Ass = (target:PlainId, value:Ast2):Assignment => ({type:"assignment",target, value})
export const Ret = (value:Ast2):ReturnStatement => ({type:'return',value})
export const Stmt = (value:Ast2):Statement => ({type:"statement", value})
export const Blk = (...body:Array<Statement>):BlockLiteral => ({type:"block-literal", body, parameters:[] })
export const BlkArgs = (parameters:Array<PlainId>, body:Array<Statement>):BlockLiteral => ({type:'block-literal',  parameters, body})
export const Cmnt = (content:string):CommentAst => ({type:'comment',content})

export function AstToString(ast: Ast2): string {
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
    str += ast.type + ' '
    return str
}