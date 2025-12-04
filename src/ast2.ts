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

type Group = { type: 'group', body: Array<Ast2> }
type Assignment = { type: 'assignment', target: PlainId, value: Ast2 }
export type Statement = { type: 'statement', value: Ast2}
type BlockLiteral = { type: 'block', parameters: Array<PlainId>, body: Array<Statement>}

export type Ast2 = NumberLiteral | StringLiteral | PlainId | SymbolId | KeywordId
    | UnaryCall | BinaryCall | KeywordCall | MessageCall | KeywordArgument
    | Group | Assignment | Statement | BlockLiteral


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
export const Stmt = (value:Ast2):Statement => ({type:"statement", value})
export const Blk = (...body:Array<Statement>):BlockLiteral => ({type:"block", body, parameters:[] })
export const BlkArgs = (parameters:Array<PlainId>, body:Array<Statement>):BlockLiteral => ({type:'block',  parameters, body})

