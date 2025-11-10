import test from "node:test";
import {strict as assert} from "assert";
import {Ast, BlockAst, GroupAst, IdAst, NumAst, StmtAst, StrAst} from "./ast.ts"
import {Blk, Grp, Id, Num, Stmt, Str} from "./ast.ts"

import {parseAst} from "./parser.ts"
import * as util from "node:util";

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
    slots: Map<string,Obj>
    name: string;
    constructor(name:string,proto:Obj|null){
        this.name = name;
        this.proto = proto
        this.slots = new Map()
    }

    lookup_method(message: Obj):unknown {
        if (message instanceof Function) {
            l.p("message is a function")
            return message
        }
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

    slotsToString() {
        return Array.from(this.slots.entries())
            .map((k,v) => `${k}:${v}`)
            .join("   ,   ")
    }
    toString():string {
        return `Obj{${this.name} ${this.slots.get('value')}}`
    }

    lookup_symbol(value: string):Obj {
        if (this.slots.has(value)) {
            return this.slots.get(value)
        }
        if(this.proto == null) {
            // throw new Error(`symbol ${value} not found`)
            // console.log(`not found in scope ${value}`)
            // console.trace("here")
            return SymRef(value)
        } else {
            return this.proto.lookup_symbol(value)
        }
    }
}

let ObjectProto = new Obj("Object",null);
ObjectProto.slots.set('print', function print(receiver:Obj, message:Obj, argument:Obj) {
    console.log("Object: OUTPUT ", receiver.name, 'is',receiver)
    return NilObj()
})
ObjectProto.slots.set('clone', function(receiver:Obj, message:Obj, argument:Obj) {
    return new Obj("clone of " + receiver.name, receiver)
})
ObjectProto.slots.set('setSlot', function(receiver:Obj, message:Obj, argument:Obj, argument2:Obj) {
    let name = argument.slots.get('value')
    if (name) {
        receiver.slots.set(name, argument2)
    } else {
        console.warn("no value!")
    }
    return argument2
})
ObjectProto.slots.set('getSlot', function(receiver:Obj, message:Obj, argument:Obj) {
    let name = argument.slots.get('value')
    return receiver.slots.get(name)
})
let NumberProto = new Obj("Number",ObjectProto);
NumberProto.slots.set('print', function(receiver:Obj, message:Obj, argument:Obj) {
    console.log(`Number: OUTPUT ${receiver.slots.get('value')}`)
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
    console.log(`String: OUTPUT: ${rec.slots.get('value')}`)
})
StringProto.slots.set('append', function(rec:Obj,msg:Obj, argument:Obj) {
    let a = rec.slots.get('value') as string
    let b = argument.slots.get('value') as string
    return StrObj( a + b)
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
    obj.slots.set('invoke',function invoke(rec:Obj) {
        let scope = new Obj("blockscope",rec)
        scope.slots.set("_name",StrObj('block-scope'))
        l.p("Block invoke. using scope:", scope.slotsToString())
        l.indent()
        let last = null
        for (let ast of value) {
            l.p("current scope:", scope.slotsToString())
            last = evalAst(ast,scope)
            // l.p("returned",last)
            l.p("block statement returned:",last.slotsToString())
        }
        l.outdent()
        l.p("ending block scope is",scope)
        return last
    })
    return obj
}

function eval_group(ast:GroupAst, scope:Obj):Obj {
    let receiver = evalAst(ast.value[0], scope)
    let message = evalAst(ast.value[1], scope)
    let method = receiver.lookup_method(message)
    if (ast.value.length <= 2) {
        if (method instanceof Obj) {
            return method
        }
        return method(receiver, method, null)
    }
    let argument = evalAst(ast.value[2], scope)
    return method(receiver, message, argument)
}

function eval_statement(ast: StmtAst, scope: Obj) {
    let receiver = evalAst(ast.value[0], scope)
    if (receiver.name == "SymbolReference") {
        console.log("receiver is a symbol reference, not a symbol.")
    }
    if (ast.value.length <= 1) {
        return receiver
    }
    let message = evalAst(ast.value[1], scope)
    l.p("statement. receiver",receiver)
    l.p("message",message)
    let method = receiver.lookup_method(message)
    l.p("method is", method)
    if(method instanceof Obj) {
        if (method.name === 'BlockLiteral') {
            console.log("Method is a block literal")
            method = method.slots.get('invoke')
        }
    }
    if (ast.value.length <= 2) {
        l.p("doing two arg version")
        return method(receiver,method,null)
    }
    let argument = evalAst(ast.value[2], scope)
    if (ast.value.length <= 3) {
        return method(receiver, message, argument)
    }
    let argument2 = evalAst(ast.value[3], scope)
    return method(receiver, message, argument, argument2)

}

function evalAst(ast: Ast, scope:Obj):Obj {
    if (ast.type == 'num') {
        return NumObj((ast as NumAst).value);
    }
    if (ast.type == 'str') {
        return StrObj((ast as StrAst).value);
    }
    if (ast.type == 'id') {
        let id = ast as IdAst
        if (id.value === 'self') {
            return scope
        }
        return scope.lookup_symbol(id.value)
    }
    if (ast.type == 'group') {
        l.p("evaluating group",ast)
        l.indent()
        let ret = eval_group(ast as GroupAst,scope)
        l.outdent()
        l.p("group returned:",ret)
        return ret
    }
    if (ast.type == 'stmt') {
        l.p("evaluating statement:",ast.toString())
        l.indent()
        let ret = eval_statement(ast as StmtAst,scope)
        l.outdent()
        // if(!ret) ret = NilObj()
        l.p("statement returned:",ret)
        return ret
    }
    if (ast.type == 'block') {
        return BlockObj((ast as BlockAst).value)
    }
    throw new Error(`unknown ast type ${ast.type}`)
}

type DeepStrictEqual<T> = (actual: unknown, expected:T, message?: string | Error) => void;
let comp:DeepStrictEqual<unknown> = assert.deepStrictEqual;


class JoshLogger {
    insetCount: number
    constructor() {
        this.insetCount = 0
    }
    p(...args:any[]) {
        // console.log(this.generate_tab(),...args)
    }

    private generate_tab() {
        let tab = ""
        for(let i=0; i<this.insetCount; i++) {
            tab += "---"
        }
        return tab
    }

    indent() {
        this.insetCount += 1
    }

    outdent() {
        this.insetCount -= 1
    }
}
const l = new JoshLogger();

function parseAndEvalWithScope(code: string, scope: Obj):Obj {
    l.p(`==========\neval with scope '${code}'`)
    let ast = parseAst(code)
    // l.p(`ast is `,util.inspect(ast,false,10))
    let res = evalAst(ast, scope)
    l.p("returning",res)
    return res
}
ObjectProto.slots.set("name",StrObj("Global"))

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
    assert.deepStrictEqual(parseAndEvalWithScope(`foo print .`,scope),NilObj())

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

    comp(parseAndEvalWithScope(
        `[ self setSlot "a" 6. a add 4.] invoke .`,scope)
        ,NumObj(10))


    // parseAndEvalWithScope(`[
    //   ("global is " append (self name)) print.
    // ] invoke.`,scope);

    //     comp(parseAndEvalWithScope(` [
//     self setSlot "Cat" (Object clone).
//     Cat setSlot "stripes" 4.
//     Cat setSlot "speak" [
//        "I am a cat with stripes count" print.
//        (self getSlot "stripes") print.
//     ].
//     self setSlot "cat" (Cat clone).
//     cat speak.
// ] invoke.
//
//     `,scope), NumObj(88))
})

// test('eval nested blocks',() => {
//     let scope = new Obj("Global",ObjectProto)
//     scope.slots.set('Object',ObjectProto);
//     scope.slots.set('Number',NumberProto);
//     scope.slots.set('Boolean',BooleanProto);
//     scope.slots.set('true',BoolObj(true));
//     scope.slots.set('false',BoolObj(false));
//     scope.slots.set('String',StringProto);
//     scope.slots.set('Nil',NilProto);
//     scope.slots.set('nil',NilObj());
//     comp(parseAndEvalWithScope(
//         `[ self setSlot "a" 5. [ a add 5.] invoke. ] invoke . `,scope)
//         ,NumObj(10))
//
// })