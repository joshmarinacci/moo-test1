
type NumberLiteral2 = { type:'number-literal' }
type StringLiteral2 = { type: 'string-literal' }
type PlainId = { type: 'plain-identifier'}
type SymbolId = { type: 'symbol-identifier'}
type UnaryCall  = { type: 'unary-call',  receiver: Ast2, message:PlainId   }
type BinaryCall = { type: 'binary-call', receiver: Ast2, message:SymbolId }
type KeywordId = { type: 'keyword-id'}
type KeywordArgument = {type: 'keyword-argument', name: KeywordId, value: Ast2}
type KeywordCall = { type: 'keyword-call', receiver: Ast2, keywords: Array<KeywordArgument> }
type Group = { type: 'group', body: Array<Ast2> }
type Assignment = { type: 'assignment', target: PlainId, value: Ast2 }
type Statement = { type: 'statement', value: Ast2}
type BlockLiteral = { type: 'block', parameters: Array<PlainId>, body: Array<Statement>}

export type Ast2 = NumberLiteral2 | StringLiteral2 | UnaryCall | BinaryCall | KeywordCall | Group | Assignment | Statement | BlockLiteral

