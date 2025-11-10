import test from "node:test";
import {strict as assert} from "assert";
import {Ast, Blk, BlockAst, GroupAst, Grp, Id, IdAst, Num, NumAst, Stmt, StmtAst, Str, StrAst} from "./ast.ts"

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
    slots: Map<string,Obj>
    name: string;
    constructor(name:string,proto:Obj|null, slots?:Record<string,unknown>){
        this.name = name;
        this.proto = proto
        this.slots = new Map()
        if(slots) {
            this._set_slots(slots)
        }
    }

    lookup_method(message: Obj):unknown {
        // l.p("looking up message",message.slotsToString())
        if (message instanceof Function) {
            // l.p("message is a function")
            return message
        }
        let name = message.slots.get('value') as string
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
        return 'Obj: '+Array.from(this.slots.entries())
            .map(([k,v],i) => {
                if (v instanceof Function) {
                    return `${k}:JSFunction(${v.name})`
                }
              return `${k}:${v}`
            })
            .join(", ")// + ": proto "+ (this.proto?this.proto.slotsToString():"none")
    }
    toString():string {
        return `Obj{${this.name} ${this.slots.get('value')}}`
    }

    lookup_symbol(value: string):Obj {
        if (value === 'self') return this
        if (this.slots.has(value)) {
            return this.slots.get(value)
        }
        if(this.proto == null) {
            // throw new Error(`symbol ${value} not found`)
            console.log(`not found in scope ${value}`)
            // console.trace("here")
            return SymRef(value)
        } else {
            return this.proto.lookup_symbol(value)
        }
    }

    _set_slots(slots: Record<string, unknown>) {
        for(let key in slots) {
            this.slots.set(key,slots[key])
        }
    }

    _get_js_slot(name:string):unknown {
        return this.slots.get(name)
    }
}

let ObjectProto = new Obj("Object",null);
let NilProto = new Obj("Nil",ObjectProto);
let StringProto = new Obj("String",ObjectProto);


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



type JSFun = (receiver:Obj, message:Obj, argument:Obj) => Obj
function mkJsFunc(name:string, fun:JSFun):Obj {
    let jsfun = new Obj("JSFun",ObjectProto);
    let str =  new Obj("StringLiteral", StringProto, {'value': name})
    jsfun.slots.set('name',str)
    jsfun.slots.set('js',fun)
    return jsfun
}

type BinNumOp = (a:number, b:number) => number
type BinBoolOp = (a:number, b:number) => boolean
function js_binop_num(a:Obj, b:Obj, op:BinNumOp):Obj {
    let aa = a._get_js_slot('value') as number
    let bb = b._get_js_slot('value') as number
    return NumObj(op(aa,bb))
}
function js_binop_bool(a:Obj, b:Obj, op:BinBoolOp):Obj {
    let aa = a._get_js_slot('value') as number
    let bb = b._get_js_slot('value') as number
    return BoolObj(op(aa,bb))
}
let NumberProto = new Obj("Number",ObjectProto, {
    'print': mkJsFunc('print', (rec) => {
        console.log(`Number: OUTPUT ${rec.slots.get('value')}`)
        return StrObj(rec.slots.get('value') + "")
    }),
    'add': mkJsFunc('add', (rec, _msg, arg0) => js_binop_num(rec, arg0, (a, b) => a + b)),
    '+': mkJsFunc('+',(rec,msg,arg0) => js_binop_num(rec,arg0,(a,b)=>a+b)),
    '-': mkJsFunc('-',(rec,msg,arg0) => js_binop_num(rec,arg0,(a,b)=>a-b)),
    '<': mkJsFunc('<',(rec,msg,arg0) => js_binop_bool(rec,arg0,(a,b)=>a<b)),
    '>': mkJsFunc('>',(rec,msg,arg0) => js_binop_bool(rec,arg0,(a,b)=>a>b)),
})
StringProto._set_slots({
    'print': mkJsFunc('print', (rec, msg): Obj => {
        console.log(`String: OUTPUT: ${rec.slots.get('value')}`)
        return StrObj(rec.slots.get('value') + "")
    }),
    'append':mkJsFunc('append', (rec,msg, arg) => {
        let a = rec._get_js_slot('value') as string
        let b = arg._get_js_slot('value') as string
        return StrObj( a + b)
    }),
})

let BooleanProto = new Obj("Boolean",ObjectProto, {
    'cond':mkJsFunc('cond',(rec:Obj,msg:Obj,arg1:Obj,arg2:Obj) => {
        let val = rec._get_js_slot('value') as boolean
        if (val) {
            let invoke = arg1._get_js_slot('invoke') as Function
            return invoke(arg1, invoke,null)
        } else {
            let invoke = arg2._get_js_slot('invoke') as Function
            return invoke(arg2, invoke,null)
        }
    })
});


const NumObj = (value:number):Obj => new Obj("NumberLiteral", NumberProto, {'value': value})
const StrObj = (value:string) => new Obj("StringLiteral", StringProto, {'value': value})
const SymRef = (value:string) => new Obj("SymbolReference", ObjectProto, {'value': value})
const BoolObj = (value:boolean) => new Obj("BooleanLiteral", BooleanProto, {'value': value})
const NilObj= () => new Obj("NilLiteral", NilProto, {'value': NilProto})

function BlockObj(value:Ast[], slots:Record<string,Obj>):Obj {
    let obj = new Obj("BlockLiteral",ObjectProto,slots)
    obj.slots.set('value',value)
    obj.slots.set('invoke',function invoke(rec:Obj) {
        let scope = new Obj("block-scope",rec.slots.get('scope'))
        scope.slots.set("_name",StrObj('block-scope'))
        l.indent()
        let last = null
        for (let ast of value) {
            last = evalAst(ast,scope)
            if (!last) last = NilObj()
        }
        l.outdent()
        return last
    })
    return obj
}

function eval_group(ast:GroupAst, scope:Obj):Obj {
    let receiver = evalAst(ast.value[0], scope)
    let message = SymRef(ast.value[1].value)
    let method = receiver.lookup_method(message)
    if (method instanceof Obj) {
        if (method.name === 'JSFun') {
            method = method.slots.get('js')
        }
    }
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
    let message = SymRef(ast.value[1].value);
    let method = receiver.lookup_method(message)
    if(method instanceof Obj) {
        if (method.name === 'BlockLiteral') {
            console.log("Method is a block literal")
            method = method.slots.get('invoke')
        } else if (method.name == "JSFun") {
            method = method.slots.get('js')
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

function evalAst(ast: Ast, scope:Obj):Obj {
    if (ast.type == 'num') return NumObj((ast as NumAst).value);
    if (ast.type == 'str') return StrObj((ast as StrAst).value);
    if (ast.type == 'id')  return scope.lookup_symbol((ast as IdAst).value)
    if (ast.type == 'group') return eval_group(ast as GroupAst, scope)
    if (ast.type == 'stmt')  return eval_statement(ast as StmtAst, scope)
    if (ast.type == 'block') return BlockObj((ast as BlockAst).value, {'scope': scope})
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
    // l.p("returning",res)
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

    comp(parseAndEvalWithScope(
        `[ self setSlot "a" 6. a add 4.] invoke .`,scope)
        ,NumObj(10))

    parseAndEvalWithScope(`[
      ("global is " append (self name)) print.
    ] invoke.`,scope);

    // comp(parseAndEvalWithScope(` [
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
    // `,scope), NumObj(88))
})

test('eval nested blocks',() => {
    let scope = new Obj("Global",ObjectProto)
    scope.slots.set('Object',ObjectProto);
    scope.slots.set('Number',NumberProto);
    scope.slots.set('Boolean',BooleanProto);
    scope.slots.set('true',BoolObj(true));
    scope.slots.set('false',BoolObj(false));
    scope.slots.set('String',StringProto);
    scope.slots.set('Nil',NilProto);
    scope.slots.set('nil',NilObj());
    comp(parseAndEvalWithScope(
        `[ self setSlot "a" 5. [ a add 5.] invoke. ] invoke . `,scope)
        ,NumObj(10))

})