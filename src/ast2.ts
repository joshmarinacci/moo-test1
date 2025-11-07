import test from "node:test";
import {strict as assert} from "assert";

type GroupAST = {
    type:'group',
    value: ExpAst[]
}
type StmtAST = {
    type: 'stmt',
    value: ExpAst[],
}
type SymAst = {
    type:'sym',
    value:string,
}
type NumAst = {
    type: 'num',
    value: number,
}
type StrAst = {
    type:'str',
    value: string,
}
type BlockAst = {
    type:'block',
    value: ExpAst[],
}
type ExpAst = GroupAST | BlockAst | StmtAST | NumAst | StrAst | SymAst


const Num = (value:number):NumAst => ({type:'num', value})
const Str = (value:string):StrAst => ({type:'str', value})
const Sym = (value:string):SymAst => ({type:'sym', value})
const Stmt = (...args:ExpAst[]):StmtAST => ({type: 'stmt', value: Array.from(args)})
const Group = (...args:ExpAst[]):GroupAST => ({type: 'group', value: Array.from(args)})
const Block = (...args:ExpAst[]):BlockAst => ({type: 'block', value: Array.from(args)})

function p(...args: any[]) {
    console.log(...args)
}
function parse(str: string):ExpAst {
    let tokens = str.split(' ') // split by space
        .filter(str => str.trim().length != 0) // strip empty string tokens
    let exps = parseToken(tokens)
    return exps[0]
}
function parseGroup(toks:string[]):GroupAST {
    let stack:ExpAst[] = []
    while(true) {
        let tok = toks.shift()
        if (tok == undefined) break;
        if (tok == ")") {
            break;
        } else {
            stack.push(parseOneToken(tok, toks))
        }
    }
    return Group(...stack)
}
function parseBlock(toks:string[]):BlockAst {
    let stack:ExpAst[] = []
    while(true) {
        let tok = toks.shift()
        if (tok == undefined) break;
        if (tok == ".") {
            collapseStatement(stack)
            continue
        }
        if (tok == "]") {
            break;
        } else {
            stack.push(parseOneToken(tok))
        }
    }
    return Block(...stack)
}
function parseOneToken(tok:string,toks:string[]):ExpAst {
    if (tok.match(/^[0-9]+$/)) {
        return Num(parseInt(tok))
    }
    if (tok.match(/^".+"$/)) {
        return Str(tok.slice(1,tok.length-1))
    }
    if (tok.match(/^[a-zA-Z]+$/)) {
        return Sym(tok)
    }
    if (tok == "<" || tok == ">") {
        return Sym(tok)
    }
    if (tok == ":=") {
        return Sym(tok)
    }
    if (tok == '(') {
        return parseGroup(toks)
    }
    console.warn(`unhandled token: ${tok}`)
    throw new Error(`unhandled token ${tok}`)
}
function collapseStatement(stack: ExpAst[]) {
    let temp:ExpAst[] = []
    while(true) {
        let node = stack.shift()
        if (!node) {
            break;
        }
        temp.push(node)
    }
    stack.push(Stmt(...temp))
}
function parseToken(toks:string[]):ExpAst[] {
    let stack:ExpAst[] = []
    while(true) {
        let tok = toks.shift()
        if (tok == undefined) {
            break
        }
        switch (tok) {
            case "(": stack.push(parseGroup(toks)); break;
            case "[": stack.push(parseBlock(toks)); break;
            case ".": collapseStatement(stack); break;
            default: stack.push(parseOneToken(tok,toks));
        }
    }
    return stack;
}


test("parse expressions", () => {
    assert.deepStrictEqual(parse(" 4  "), Num(4));
    assert.deepStrictEqual(parse(" foo  "), Sym("foo"));
    assert.deepStrictEqual(parse(" <  "), Sym("<"));
    assert.deepStrictEqual(parse(` "dog"  `), Str("dog"));
    assert.deepStrictEqual(
        parse(" 4 < 5 . "),
        Stmt(Num(4),Sym('<'),Num(5))
    );
    assert.deepStrictEqual(
        parse(" ( 4 < 5 ) "),
        Group(Num(4),Sym('<'),Num(5))
    );
    assert.deepStrictEqual(
        parse(" ( 4 < 5 ) . "),
        Stmt(Group(Num(4),Sym('<'),Num(5)))
    );
    assert.deepStrictEqual(
        parse("[ 99 . ] "),
        Block(Stmt(Num(99))),
    )
    assert.deepStrictEqual(
        parse(` ( 4 < 5 ) ifTrue [ 99 . ] .`),
        Stmt(
            Group(Num(4),Sym('<'),Num(5)),
            Sym('ifTrue'),
            Block(Stmt(Num(99)))
        )
    );
    assert.deepStrictEqual(
        parse(' dog := Object clone .'),
        Stmt(Sym('dog'),Sym(':='),Sym('Object'),Sym('clone'))
    )
    assert.deepStrictEqual(parse('( ( 4 < 5 ) < 6 )'),Group(Group(Num(4),Sym('<'),Num(5)),Sym('<'),Num(6)))
})

class LangObject {
    proto: LangObject | null
    slots: Map<string,any>
    name: string;
    constructor(name:string,proto:LangObject|null){
        this.name = name;
        this.proto = proto
        this.slots = new Map()
    }

    lookup_method(message: LangObject):unknown {
        let name = message.slots.get('value')
        // p(`looking up message ${name} in ${this.name}`)
        if(this.slots.has(name)) {
            return this.slots.get(name)
        } else {
            if (this.proto == null) {
                throw new Error(`method '${name}' not found`)
            } else {
                return this.proto.lookup_method(message)
            }
        }
    }
}

let ObjectProto = new LangObject("Object",null);
ObjectProto.slots.set('print', function(receiver:LangObject, message:LangObject, argument:LangObject) {
    console.log("OUTPUT ", receiver.name, 'is',receiver)
})
ObjectProto.slots.set('clone', function(receiver:LangObject, message:LangObject, argument:LangObject) {
    return new LangObject("clone of " + receiver.name, receiver)
})
ObjectProto.slots.set('setSlot', function(receiver:LangObject, message:LangObject, argument:LangObject, argument2:LangObject) {
    let name = argument.slots.get('value')
    receiver.slots.set(name,argument2)
    return argument2
})
ObjectProto.slots.set('getSlot', function(receiver:LangObject, message:LangObject, argument:LangObject) {
    let name = argument.slots.get('value')
    return receiver.slots.get(name)
})
let NumberProto = new LangObject("Number",ObjectProto);
NumberProto.slots.set('print', function(receiver:LangObject, message:LangObject, argument:LangObject) {
    console.log(`OUTPUT ${receiver.slots.get('value')}`)
    return StrObj(receiver.slots.get('value')+"")
})
NumberProto.slots.set('add',function(receiver:LangObject,message:LangObject,argument:LangObject) {
    let a = receiver.slots.get('value') as number
    let b = argument.slots.get('value') as number
    return NumObj(a+b)
})
NumberProto.slots.set('+',function(receiver:LangObject,message:LangObject,argument:LangObject) {
    let a = receiver.slots.get('value') as number
    let b = argument.slots.get('value') as number
    return NumObj(a+b)
})
NumberProto.slots.set('-',function(receiver:LangObject,message:LangObject,argument:LangObject) {
    let a = receiver.slots.get('value') as number
    let b = argument.slots.get('value') as number
    return NumObj(a-b)
})
NumberProto.slots.set('<',function(receiver:LangObject,message:LangObject,argument:LangObject) {
    let a = receiver.slots.get('value') as number
    let b = argument.slots.get('value') as number
    return BoolObj(a<b)
})
NumberProto.slots.set('>',function(receiver:LangObject,message:LangObject,argument:LangObject) {
    let a = receiver.slots.get('value') as number
    let b = argument.slots.get('value') as number
    return BoolObj(a>b)
})
let StringProto = new LangObject("String",ObjectProto);
StringProto.slots.set('print', function(rec,msg) {
    console.log(`OUTPUT: ${rec.slots.get('value')}`)
})
let BooleanProto = new LangObject("Boolean",ObjectProto);
BooleanProto.slots.set('cond', function(rec,msg, arg1, arg2) {
    let val = rec.slots.get('value')
    if (val === true) {
        let invoke = arg1.slots.get('invoke')
        return invoke(arg1, invoke,null)
    }
    if (val === false) {
        let invoke = arg2.slots.get('invoke')
        return invoke(arg2, invoke,null)
    }
})
let NilProto = new LangObject("Nil",ObjectProto);

function NumObj(value:number):LangObject {
    let obj = new LangObject("NumberLiteral",NumberProto)
    obj.slots.set('value',value)
    return obj
}

function StrObj(value:string):LangObject {
    let obj = new LangObject("StringLiteral",StringProto)
    obj.slots.set('value',value)
    return obj
}

function SymRef(value:string):LangObject {
    let obj = new LangObject("SymbolReference",ObjectProto)
    obj.slots.set('value',value)
    return obj
}

function BoolObj(value:boolean):LangObject {
    let obj = new LangObject("BooleanLiteral",BooleanProto)
    obj.slots.set('value',value)
    return obj
}

function NilObj():LangObject {
    let obj = new LangObject("NilLiteral",NilProto)
    obj.slots.set('value',NilProto)
    return obj
}

function BlockObj(value:ExpAst[]):LangObject {
    let obj = new LangObject("BlockLiteral",ObjectProto)
    obj.slots.set('value',value)
    obj.slots.set('invoke',function(rec:LangObject,msg,arg1, arg2) {
        return evalAst(value[0],rec)
    })
    return obj
}

function evalAst(ast: ExpAst, scope:LangObject):LangObject {
    if (ast.type == 'num') {
        return NumObj(ast.value);
    }
    if (ast.type == 'str') {
        return StrObj(ast.value);
    }
    if (ast.type == 'sym') {
        if (ast.value === 'self') {
            return scope
        }
        if (scope.slots.has(ast.value)) {
            return scope.slots.get(ast.value)
        }
        return SymRef(ast.value)
    }
    if (ast.type == 'group') {
        let receiver = evalAst(ast.value[0], scope)
        let message = evalAst(ast.value[1], scope)
        let method = receiver.lookup_method(message)
        if (ast.value.length <= 2) {
            if (method instanceof LangObject) {
                return method
            }
            return method(receiver,method,null)
        }
        let argument = evalAst(ast.value[2], scope)
        return method(receiver, message, argument)
    }
    if (ast.type == 'stmt') {
        let receiver = evalAst(ast.value[0], scope)
        if (receiver.name == "SymbolReference") {
            console.log("receiver is a symbol reference, not a symbol.")
        }
        if (ast.value.length <= 1) {
            return receiver
        }
        let message = evalAst(ast.value[1], scope)
        let method = receiver.lookup_method(message)
        // console.log("method is", method)
        if(method instanceof LangObject) {
            if (method.name === 'BlockLiteral') {
                // console.log("Method is a block literal")
                method = method.slots.get('invoke')
            }
        }
        if (ast.value.length <= 2) {
            return method(receiver,method,null)
        }
        let argument = evalAst(ast.value[2], scope)
        if (ast.value.length <= 3) {
            return method(receiver, message, argument)
        }
        let argument2 = evalAst(ast.value[3], scope)
        return method(receiver, message, argument, argument2)
    }
    if (ast.type == 'block') {
        return BlockObj(ast.value)
    }
    throw new Error(`unknown ast type ${ast.type}`)
}

type DeepStrictEqual<T> = (actual: unknown, expected:T, message?: string | Error) => void;
let comp:DeepStrictEqual<unknown> = assert.deepStrictEqual;

test('eval expressions', () => {
    let scope = new LangObject("Global",ObjectProto)
    comp(evalAst(Num(4),scope),NumObj(4));
    comp(evalAst(Str("dog"),scope),StrObj("dog"));
    comp(evalAst(Stmt(Num(4),Sym("add"),Num(5)),scope),NumObj(9));
    comp(evalAst(Stmt(Num(4),Sym('<'),Num(5)),scope),BoolObj(true));
    comp(evalAst(Stmt(Num(4),Sym('+'),Num(5)),scope),NumObj(9));
    comp(evalAst(Stmt(Num(4),Sym('-'),Num(5)),scope),NumObj(-1));
    comp(evalAst(Stmt(Group(Num(4),Sym('add'),Num(5))),scope), NumObj(9))
})

function parseAndEvalWithScope(code: string, scope: LangObject):LangObject {
    // p(`eval with scope '${code}'`)
    let ast = parse(code)
    // p(`ast is `,ast)
    let res = evalAst(ast, scope)
    // p("returning",res)
    return res
}

test('eval with scope', () => {
    let scope = new LangObject("Global",ObjectProto)
    scope.slots.set('Object',ObjectProto);
    scope.slots.set('Number',NumberProto);
    scope.slots.set('Boolean',BooleanProto);
    scope.slots.set('true',BoolObj(true));
    scope.slots.set('false',BoolObj(false));
    scope.slots.set('String',StringProto);
    scope.slots.set('Nil',NilProto);
    scope.slots.set('nil',NilObj());
    assert.deepStrictEqual(parseAndEvalWithScope('4 add 5 .',scope),NumObj(9))
    assert.deepStrictEqual(parseAndEvalWithScope('self setSlot "dog" 4 .',scope),NumObj(4))
    parseAndEvalWithScope('Object clone .',scope)
    parseAndEvalWithScope('self setSlot "foo" 5 .',scope)
    assert.deepStrictEqual(parseAndEvalWithScope(`foo print .`,scope),StrObj("5"))

    parseAndEvalWithScope('self setSlot "Dog" ( Object clone ) .', scope);
    parseAndEvalWithScope('Dog setSlot "bark" [ "woof" print . ] .', scope);
    parseAndEvalWithScope('Dog bark .', scope);

    comp(parseAndEvalWithScope('88',scope),NumObj(88))
    comp(parseAndEvalWithScope('88 .',scope),NumObj(88))
    comp(parseAndEvalWithScope('[ 88 . ] invoke .',scope),NumObj(88))

    comp(parseAndEvalWithScope('( 4 < 5 ) cond [ 44 ] [ 88 ] .',scope),NumObj(44))
    comp(parseAndEvalWithScope('( 4 > 5 ) cond [ 44 ] [ 88 ] .',scope),NumObj(88))
    comp(parseAndEvalWithScope('true .',scope),BoolObj(true))
    comp(parseAndEvalWithScope('false .',scope),BoolObj(false))
    comp(parseAndEvalWithScope('nil .',scope),NilObj())

})