import test from "node:test";
import {strict as assert} from "assert";
import { Grp, Id, Num, Stmt, Str, Blk} from "./ast.ts"

import type {Ast, BlockAst, GroupAst} from "./ast.ts"

import {parseAst} from "./parser.ts"

test("parse expressions", () => {
    assert.deepStrictEqual(parseAst(" 4 ."), Stmt(Num(4)))
    assert.deepStrictEqual(parseAst(" foo  ."), Stmt(Id("foo")))
    assert.deepStrictEqual(parseAst(" <  ."), Stmt(Id("<")));
    assert.deepStrictEqual(parseAst(` "dog"  .`), Stmt(Str("dog")));
    assert.deepStrictEqual(
        parseAst(" 4 < 5 . "),
        Stmt(Num(4),Id('<'),Num(5))
    );
    assert.deepStrictEqual(
        parseAst(" ( 4 < 5 ) ."),
        Stmt(Grp(Num(4),Id('<'),Num(5)))
    );
    assert.deepStrictEqual(
        parseAst(" ( 4 < 5 ) . "),
        Stmt(Grp(Num(4),Id('<'),Num(5)))
    );
    assert.deepStrictEqual(
        parseAst("[ 99 . ] ."),
        Stmt(Blk(Stmt(Num(99)))),
    )
    assert.deepStrictEqual(
        parseAst(` ( 4 < 5 ) ifTrue [ 99 . ] .`),
        Stmt(
            Grp(Num(4),Id('<'),Num(5)),
            Id('ifTrue'),
            Blk(Stmt(Num(99)))
        )
    );
    assert.deepStrictEqual(
        parseAst(' dog := Object clone .'),
        Stmt(Id('dog'),Id(':='),Id('Object'),Id('clone'))
    )
    assert.deepStrictEqual(parseAst('( ( 4 < 5 ) < 6 ).'),
        Stmt(Grp(Grp(Num(4),Id('<'),Num(5)),Id('<'),Num(6))))
})

class Obj {
    proto: Obj | null
    slots: Map<string,any>
    name: string;
    constructor(name:string,proto:Obj|null){
        this.name = name;
        this.proto = proto
        this.slots = new Map()
    }

    lookup_method(message: Obj):unknown {
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

let ObjectProto = new Obj("Object",null);
ObjectProto.slots.set('print', function(receiver:Obj, message:Obj, argument:Obj) {
    console.log("OUTPUT ", receiver.name, 'is',receiver)
})
ObjectProto.slots.set('clone', function(receiver:Obj, message:Obj, argument:Obj) {
    return new Obj("clone of " + receiver.name, receiver)
})
ObjectProto.slots.set('setSlot', function(receiver:Obj, message:Obj, argument:Obj, argument2:Obj) {
    let name = argument.slots.get('value')
    receiver.slots.set(name,argument2)
    return argument2
})
ObjectProto.slots.set('getSlot', function(receiver:Obj, message:Obj, argument:Obj) {
    let name = argument.slots.get('value')
    return receiver.slots.get(name)
})
let NumberProto = new Obj("Number",ObjectProto);
NumberProto.slots.set('print', function(receiver:Obj, message:Obj, argument:Obj) {
    console.log(`OUTPUT ${receiver.slots.get('value')}`)
    return StrObj(receiver.slots.get('value')+"")
})
NumberProto.slots.set('add',function(receiver:Obj,message:Obj,argument:Obj) {
    let a = receiver.slots.get('value') as number
    let b = argument.slots.get('value') as number
    return NumObj(a+b)
})
NumberProto.slots.set('+',function(receiver:Obj,message:Obj,argument:Obj) {
    let a = receiver.slots.get('value') as number
    let b = argument.slots.get('value') as number
    return NumObj(a+b)
})
NumberProto.slots.set('-',function(receiver:Obj,message:Obj,argument:Obj) {
    let a = receiver.slots.get('value') as number
    let b = argument.slots.get('value') as number
    return NumObj(a-b)
})
NumberProto.slots.set('<',function(receiver:Obj,message:Obj,argument:Obj) {
    let a = receiver.slots.get('value') as number
    let b = argument.slots.get('value') as number
    return BoolObj(a<b)
})
NumberProto.slots.set('>',function(receiver:Obj,message:Obj,argument:Obj) {
    let a = receiver.slots.get('value') as number
    let b = argument.slots.get('value') as number
    return BoolObj(a>b)
})
let StringProto = new Obj("String",ObjectProto);
StringProto.slots.set('print', function(rec:Obj,msg:Obj) {
    console.log(`OUTPUT: ${rec.slots.get('value')}`)
})
let BooleanProto = new Obj("Boolean",ObjectProto);
BooleanProto.slots.set('cond', function(rec:Obj,msg:Obj, arg1:Obj, arg2:Obj) {
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
let NilProto = new Obj("Nil",ObjectProto);

function NumObj(value:number):Obj {
    let obj = new Obj("NumberLiteral",NumberProto)
    obj.slots.set('value',value)
    return obj
}

function StrObj(value:string):Obj {
    let obj = new Obj("StringLiteral",StringProto)
    obj.slots.set('value',value)
    return obj
}

function SymRef(value:string):Obj {
    let obj = new Obj("SymbolReference",ObjectProto)
    obj.slots.set('value',value)
    return obj
}

function BoolObj(value:boolean):Obj {
    let obj = new Obj("BooleanLiteral",BooleanProto)
    obj.slots.set('value',value)
    return obj
}

function NilObj():Obj {
    let obj = new Obj("NilLiteral",NilProto)
    obj.slots.set('value',NilProto)
    return obj
}

function BlockObj(value:Ast[]):Obj {
    let obj = new Obj("BlockLiteral",ObjectProto)
    obj.slots.set('value',value)
    obj.slots.set('invoke',function(rec:Obj) {
        return evalAst(value[0],rec)
    })
    return obj
}

function evalAst(ast: Ast, scope:Obj):Obj {
    if (ast.type == 'num') {
        return NumObj(ast.value);
    }
    if (ast.type == 'str') {
        return StrObj(ast.value);
    }
    if (ast.type == 'id') {
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
            if (method instanceof Obj) {
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
        if(method instanceof Obj) {
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
    let scope = new Obj("Global",ObjectProto)
    comp(evalAst(Num(4),scope),NumObj(4));
    comp(evalAst(Str("dog"),scope),StrObj("dog"));
    comp(evalAst(Stmt(Num(4),Id("add"),Num(5)),scope),NumObj(9));
    comp(evalAst(Stmt(Num(4),Id('<'),Num(5)),scope),BoolObj(true));
    comp(evalAst(Stmt(Num(4),Id('+'),Num(5)),scope),NumObj(9));
    comp(evalAst(Stmt(Num(4),Id('-'),Num(5)),scope),NumObj(-1));
    comp(evalAst(Stmt(Grp(Num(4),Id('add'),Num(5))),scope), NumObj(9))
})

function parseAndEvalWithScope(code: string, scope: Obj):Obj {
    // p(`eval with scope '${code}'`)
    let ast = parseAst(code)
    // p(`ast is `,ast)
    let res = evalAst(ast, scope)
    // p("returning",res)
    return res
}

test('eval with scope', () => {
    let scope = new Obj("Global",ObjectProto)
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

    comp(parseAndEvalWithScope('88.',scope),NumObj(88))
    comp(parseAndEvalWithScope('88 .',scope),NumObj(88))
    comp(parseAndEvalWithScope('[ 88 . ] invoke .',scope),NumObj(88))

    comp(parseAndEvalWithScope('( 4 < 5 ) cond [ 44. ] [ 88. ] .',scope),NumObj(44))
    comp(parseAndEvalWithScope(`( 4 > 5 ) 
    cond [ 44. ]
     [ 88. ] .`,scope),NumObj(88))
    comp(parseAndEvalWithScope('true .',scope),BoolObj(true))
    comp(parseAndEvalWithScope('false .',scope),BoolObj(false))
    comp(parseAndEvalWithScope('nil .',scope),NilObj())

})