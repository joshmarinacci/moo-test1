import test from "node:test";
import {strict as assert} from "assert";
import {Ast, Blk, BlockAst, GroupAst, Grp, Id, IdAst, Num, NumAst, Stmt, StmtAst, Str, StrAst} from "./ast.ts"

import {parseAst} from "./parser.ts"

class Obj {
    proto: Obj | null
    slots: Map<string,Obj>
    name: string;
    _is_return: boolean;
    constructor(name:string,proto:Obj|null, slots?:Record<string,unknown>){
        this.name = name;
        this.proto = proto
        this.slots = new Map()
        this._is_return = false;
        if(slots) {
            this._set_slots(slots)
        }
    }

    lookup_method(message: Obj):unknown {
        let name = message._get_js_slot('value') as string
        if(this.slots.has(name)) return this.slots.get(name)
        if (this.proto) return this.proto.lookup_method(message)
        throw new Error(`method '${name}' not found`)
    }

    toString():string {
        return `Obj{${this.name} ${this.slots.get('value')}}`
    }

    lookup_symbol(value: string):Obj {
        if (value === 'self') return this
        if (value === 'super') {
            l.p("returning super on the object",this)
            return this.proto as Obj
        }
        if (this.slots.has(value)) return this.slots.get(value) as Obj
        if (this.proto) return this.proto.lookup_symbol(value)
        // console.log(`not found in scope ${value}`)
        return SymRef(value)
    }

    _set_slots(slots: Record<string, unknown>) {
        for(let key in slots) {
            this.slots.set(key,slots[key])
        }
    }

    _get_js_slot(name:string):unknown {
        return this.slots.get(name)
    }
    _set_js_slot(name:string, value:unknown) {
        this.slots.set(name,value)
    }

    _proto_chain() {
        return this.name+', '+ (this.proto ? this.proto._proto_chain() : '')
    }

    is_return() {
        return this._is_return
    }
}

let ObjectProto = new Obj("Object",null);
let NilProto = new Obj("Nil",ObjectProto);
let StringProto = new Obj("String",ObjectProto);


type JSFun = (receiver:Obj, ...args:Obj[]) => Obj
function mkJsFunc(name:string, fun:JSFun):Obj {
    let js_fun = new Obj("JSFun",ObjectProto);
    let str =  new Obj("StringLiteral", StringProto, {'value': name})
    js_fun.slots.set('name',str)
    js_fun._set_js_slot('js',fun)
    return js_fun
}

ObjectProto.slots.set('print', mkJsFunc('print', (rec) => {
    console.log("Object: OUTPUT ", rec.name, 'is',rec)
    return NilObj()
}))
ObjectProto.slots.set('clone', mkJsFunc('clone',(rec) => {
    let obj = new Obj("clone of " + rec.name, rec);
    // l.p("cloning the obj ", rec.name)
    for (let [key,value] of rec.slots.entries()) {
        // l.p("copying entry",key,value.name)
        obj.slots.set(key, value)
    }
    return obj
}))
ObjectProto.slots.set('setSlot', mkJsFunc('setSlot', (rec:Obj, arg:Obj, arg2:Obj) => {
    let name = arg._get_js_slot('value') as string
    // console.log(`set slot "${name}" of '${rec.name}' to be '${arg2.name}'`)
    if (name) {
        rec.slots.set(name, arg2)
    } else {
        console.warn("no value!")
    }
    if (arg2.name === "BlockLiteral") {
        arg2.slots.set('scope',rec)
        l.p(`set scope of '${arg2.name}' to be '${rec.name}'`)
    }
    return arg2
}))
ObjectProto.slots.set('getSlot', mkJsFunc('getSlot', (rec, arg) => {
    let name = arg._get_js_slot('value') as string
    // console.log(`get slot "${name}" of '${rec.name}' is '${rec.slots.get(name)}'`)
    // console.log("parent is", rec.proto)
    if (rec.slots.has(name)) {
        return rec.slots.get(name) as Obj
    } else {
        if (rec.proto && rec.proto.slots.has(name)) {
            return rec.proto.slots.get(name) as Obj
        } else {
            return NilObj()
        }
    }
}))
ObjectProto.slots.set("setClassname",mkJsFunc('setClassname',(rec:Obj, arg:Obj) => {
    rec.name = arg._get_js_slot('value')
    return rec
}))


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
    'add': mkJsFunc('add', (rec, arg0) => js_binop_num(rec, arg0, (a, b) => a + b)),
    '+': mkJsFunc('+',(rec,arg0) => js_binop_num(rec,arg0,(a,b)=>a+b)),
    '-': mkJsFunc('-',(rec,arg0) => js_binop_num(rec,arg0,(a,b)=>a-b)),
    '<': mkJsFunc('<',(rec,arg0) => js_binop_bool(rec,arg0,(a,b)=>a<b)),
    '>': mkJsFunc('>',(rec,arg0) => js_binop_bool(rec,arg0,(a,b)=>a>b)),
    '==': mkJsFunc('==',(rec,arg0) => js_binop_bool(rec,arg0,(a,b)=>a==b)),
})
StringProto._set_slots({
    'print': mkJsFunc('print', (rec): Obj => {
        console.log(`String: OUTPUT: ${rec.slots.get('value')}`)
        return StrObj(rec.slots.get('value') + "")
    }),
    'append':mkJsFunc('append', (rec, arg) => {
        let a = rec._get_js_slot('value') as string
        let b = arg._get_js_slot('value') as string
        return StrObj( a + b)
    }),
})

let BooleanProto = new Obj("Boolean",ObjectProto, {
    'cond':mkJsFunc('cond',(rec:Obj, arg1:Obj,arg2:Obj) => {
        let val = rec._get_js_slot('value') as boolean
        if (val) {
            let invoke = arg1._get_js_slot('invoke') as Function
            return invoke(arg1, null,null)
        } else {
            let invoke = arg2._get_js_slot('invoke') as Function
            return invoke(arg2, null,null)
        }
    }),
    'ifTrue':mkJsFunc('ifTrue',(rec:Obj, arg1:Obj,arg2:Obj) => {
        let val = rec._get_js_slot('value') as boolean
        if (val) {
            let invoke = arg1._get_js_slot('invoke') as Function
            return invoke(arg1, null,null)
        }
    })
});

let ListProto = new Obj("List",ObjectProto, {
    'push':mkJsFunc('push',(rec:Obj, arg:Obj)=>{
        let arr:Array<unknown> = (rec._get_js_slot('value') as []);
        arr.push(arg);
    }),
    'at':mkJsFunc('at',(rec:Obj,arg:Obj) => {
        let arr:Array<unknown> = (rec._get_js_slot('value') as []);
        let index = arg._get_js_slot('value')
        return arr[index]
    }),
    'setAt':mkJsFunc('setAt',(rec:Obj,arg:Obj, arg2:Obj) => {
        let arr:Array<unknown> = (rec._get_js_slot('value') as []);
        let index = arg._get_js_slot('value') as number;
        arr[index] = arg2
        return rec
    }),
    'len':mkJsFunc('len',(rec)=>{
        let arr:Array<unknown> = (rec._get_js_slot('value') as []);
        return NumObj(arr.length)
    })
})
ListProto._set_js_slot('value',[])


const NumObj = (value:number):Obj => new Obj("NumberLiteral", NumberProto, {'value': value})
const StrObj = (value:string) => new Obj("StringLiteral", StringProto, {'value': value})
const SymRef = (value:string) => new Obj("SymbolReference", ObjectProto, {'value': value})
const BoolObj = (value:boolean) => new Obj("BooleanLiteral", BooleanProto, {'value': value})
const NilObj= () => new Obj("NilLiteral", NilProto, {'value': NilProto})

let BLOCK_COUNT = 0;
function BlockObj(args:Ast[],body:Ast[], slots:Record<string,Obj>):Obj {
    let obj = new Obj("BlockLiteral",ObjectProto, slots)
    obj.slots.set('args',args)
    // l.p("block literal scope is",slots.scope.name)
    obj.slots.set('invoke',(rec:Obj,...params):Obj => {
        // l.p("block invok. rec is", rec.name)
        let scope = new Obj("block-scope-"+(++BLOCK_COUNT),rec.slots.get('scope') as Obj)
        scope.slots.set("_name",StrObj('block-scope'))
        for(let i=0; i<args.length; i++) {
            let arg = args[i]
            let param = params[i]
            scope.slots.set(arg.value,param)
        }
        l.indent()
        let last = NilObj()
        for (let ast of body) {
            last = evalAst(ast,scope)
            if (!last) last = NilObj()
            if (last.is_return()) {
                if (last.slots.get('target') === scope) {
                    l.outdent()
                    return last.slots.get('value') as Obj
                }
                l.outdent()
                return last
            }
        }
        l.outdent()
        return last
    })
    return obj
}

function resolve_js_method(meth: unknown):JSFun {
    if(meth instanceof Obj) {
        if (meth.name === 'BlockLiteral') {
            return meth._get_js_slot('invoke') as JSFun
        } else if (meth.name == "JSFun") {
            return meth._get_js_slot('js') as JSFun
        }
    }
    return meth as JSFun
}

function eval_group(ast:GroupAst, scope:Obj):Obj {
    // console.log("eval group",ast)
    let receiver = evalAst(ast.value[0], scope)
    let message = SymRef(ast.value[1].value)
    // l.p("receiver",receiver)
    // l.p("message",message)
    let method = resolve_js_method(receiver.lookup_method(message))
    if (ast.value.length <= 2) {
        if (method instanceof Obj) {
            return method
        }
        return method(receiver)
    }
    let argument = evalAst(ast.value[2], scope)
    return method(receiver, argument)
}

function invoke_method(receiver:Obj, message:Obj, args:Obj[], scope:Obj):Obj {
    // move stuff around for the assignment operator
    // instead of sending a message to the receiver,
    // call setSlot on the scope with the receiver as the first argument
    if (message._get_js_slot('value') === ":=") {
        message = StrObj("setSlot")
        args = [receiver, ... args]
        receiver = scope;
    }
    let meth = receiver.lookup_method(message)
    let method = resolve_js_method(meth)
    if (meth instanceof Obj && meth.name === 'BlockLiteral') {
        receiver = meth
    }
    // console.log(`invoking method  '${message._get_js_slot('value')}' on ${receiver.name} with ${args[0]}`)
    if (method instanceof Function) {
        return method(receiver, ...args)
    } else {
        return method
    }
}
function eval_statement(asts: Array<Ast>, scope: Obj):Obj {
    // l.p("eval statement")
    l.indent()
    let receiver = evalAst(asts[0], scope)
    if (receiver.name == "SymbolReference") {
        // console.log("receiver is a symbol reference, not a symbol.")
    }
    if (asts.length <= 1) return receiver

    if (receiver._get_js_slot('value') === "return") {
        let ret = eval_statement(asts.slice(1), scope)
        let ret2 = new Obj('non-local-return',scope.proto)
        ret2._is_return = true;
        ret2.slots.set("_name",StrObj('non-local-return'))
        ret2.slots.set("value",ret)
        ret2.slots.set("target",scope.proto)
        return ret2
    }

    let message = SymRef(asts[1].value);
    let args:Obj[] = []
    for (let i=2; i<asts.length; i++) {
        args.push(evalAst(asts[i],scope))
    }
    // l.p("invoking method ",receiver.name,message._get_js_slot('value'))
    l.outdent()
    return invoke_method(receiver, message, args, scope)
}

function evalAst(ast: Ast, scope:Obj):Obj {
    // l.p("ast ",ast.type, " ", scope.name)
    if (ast.type == 'num') return NumObj((ast as NumAst).value);
    if (ast.type == 'str') return StrObj((ast as StrAst).value);
    if (ast.type == 'id')  return scope.lookup_symbol((ast as IdAst).value)
    if (ast.type == 'group') {
        l.indent()
        let ret = eval_group(ast as GroupAst, scope)
        l.outdent()
        return ret
    }
    if (ast.type == 'stmt')  {
        l.indent()
        let ret = eval_statement((ast as StmtAst).value, scope)
        l.outdent()
        return ret
    }
    if (ast.type == 'block') return BlockObj((ast as BlockAst).args, (ast as BlockAst).body, {scope})
    console.warn("ast is",ast)
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
        console.log(this.generate_tab(),...args)
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

function pval(code: string, scope: Obj):Obj {
    l.p(`==========\neval with scope '${code}'`)
    let ast = parseAst(code)
    // l.p(`ast is `,util.inspect(ast,false,10))
    let res:Obj = evalAst(ast, scope)
    if (res.is_return()) {
        res = res.slots.get('value') as Obj
    }
    l.p("returning",res.toString())
    return res
}
ObjectProto.slots.set("name",StrObj("Global"))

let ObjectBase = new Obj("ObjectBase",ObjectProto)

function init_std_scope() {
    let scope = new Obj("Global",ObjectProto)
    scope.slots.set('Object',ObjectProto);
    scope.slots.set('ObjectBase',ObjectBase)
    scope.slots.set('Number',NumberProto);
    scope.slots.set('Boolean',BooleanProto);
    scope.slots.set('true',BoolObj(true));
    scope.slots.set('false',BoolObj(false));
    scope.slots.set('String',StringProto);
    scope.slots.set('List',ListProto);
    scope.slots.set('Nil',NilProto);
    scope.slots.set('nil',NilObj());
    return scope;
}

const no_test = (name,code) => {
    // test(name,code)
};

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
        Stmt(Blk([],[Stmt(Num(99))])),
    )
    assert.deepStrictEqual(
        parseAst(` ( 4 < 5 ) ifTrue [ 99 . ] .`),
        Stmt(
            Grp(Num(4),Id('<'),Num(5)),
            Id('ifTrue'),
            Blk([],[Stmt(Num(99))])
        )
    );
    assert.deepStrictEqual(
        parseAst(' dog := Object clone .'),
        Stmt(Id('dog'),Id(':='),Id('Object'),Id('clone'))
    )
    assert.deepStrictEqual(parseAst('( ( 4 < 5 ) < 6 ).'),
        Stmt(Grp(Grp(Num(4),Id('<'),Num(5)),Id('<'),Num(6))))

    assert.deepStrictEqual(parseAst('[ x | 4. ].'),
        Stmt(Blk([Id('x')],[Stmt(Num(4))])))
})

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
    let scope = init_std_scope()
    assert.deepStrictEqual(pval('4 add 5 .',scope),NumObj(9))
    assert.deepStrictEqual(pval('dog := 4.',scope),NumObj(4))
    pval('Object clone .',scope)
    pval('foo := 5 .',scope)
    assert.deepStrictEqual(pval(`foo print .`,scope),StrObj("5"))

    pval('Dog := ( Object clone ) .', scope);
    pval('Dog setSlot "bark" [ "woof" print . ] .', scope);
    pval('Dog bark .', scope);

    comp(pval('88.',scope),NumObj(88))
    comp(pval('88 .',scope),NumObj(88))
    comp(pval('[ 88 . ] invoke .',scope),NumObj(88))

    comp(pval('( 4 < 5 ) cond [ 44. ] [ 88. ] .',scope),NumObj(44))
    comp(pval(`( 4 > 5 )
    cond [ 44. ]
     [ 88. ] .`,scope),NumObj(88))
    comp(pval('true .',scope),BoolObj(true))
    comp(pval('false .',scope),BoolObj(false))
    comp(pval('nil .',scope),NilObj())

    comp(pval(
        `[ self setSlot "a" 6. a add 4.] invoke .`,scope)
        ,NumObj(10))

    pval(`[
      ("global is " append (self name)) print.
    ] invoke.`,scope);

    pval(` [
        Cat := (Object clone).
        Cat setSlot "stripes" 4.
        Cat setSlot "speak" [
           "I am a cat with stripes count" print.
           self setSlot "b" 6.
           (self getSlot "stripes") print.
        ].
        cat := (Cat clone).
        cat speak.
    ] invoke.`,scope)

    comp(pval(`["foo".] invoke.`,scope),StrObj("foo"))
    comp(pval(`["foo" append 5.] invoke.`,scope),StrObj("foo5"))
})

test('eval nested blocks',() => {
    let scope = init_std_scope()
    comp(pval(
        `[ a := 5. [ a add 5.] invoke. ] invoke . `,scope)
        ,NumObj(10))

})

test ('fib recursion',() => {
    let scope = init_std_scope()
    comp(pval(`[ 
        Math := Object clone.
        Math setSlot "fib" [n| 
            (n == 0) ifTrue [ return 0. ].
            (n == 1) ifTrue [ return 1. ].
            (Math fib ( n - 2 ) ) + (Math fib (n - 1 ) ).
        ].
        Math fib 6.
     ] invoke . `,scope)
        ,NumObj(8))
})
test('objects with slots',() => {
    let scope = init_std_scope()
    pval(`[
     self setSlot "A" (ObjectBase clone).
     A setClassname "Awesome".
     A setSlot "x" 0.
     A setSlot "gx" [
        x.
     ].
     A setSlot "sx" [
        "inside sx" print.
        self setSlot "sx" 5.
     ].
     a := (A clone).
     "cloned awesome" print.
     a sx 5.
     (a gx ) print.
    ] invoke .`, scope)
})
test('list class', () => {
    let scope = init_std_scope()
    pval('list := (List clone).',scope);
    comp(pval(`[
    list push 7.
    list push 8.
    list push 9.
    list len.
    ] invoke.`,scope),NumObj(3))
    comp(pval(`[
        list at 0.
    ] invoke.`,scope),NumObj(7))
    comp(pval(`[
        list setAt 0 88.
        list at 0.
    ] invoke.`,scope),NumObj(88))
})
test('eval vector class',() => {
    let scope = init_std_scope()
    pval('Vector := (ObjectBase clone).',scope);
    pval(`[
    Vector setSlot "x" 0.
    Vector setSlot "y" 0.
    Vector setSlot "z" 0.
    Vector setSlot "add" [
        "pretending to add " print.
    ].
    Vector setSlot "g" [
       "inside vector " print.
       self x.
    ].
    v := (Vector clone).
    v g.
    ] invoke.
    `,scope)

    comp(pval(`[
    a :=  ( Vector clone ).
    "here now" print.
    a setSlot "x" 10.
    (a x ) print.
    b := ( Vector clone ).
    b setSlot "x" 20.
    (b x) print.

    c := (a add b).
    55.

    ] invoke.`,scope),NumObj(55))
})

test('eval assignment operator', () => {
    let scope = init_std_scope()
    comp(pval(`v := 5.`,scope),NumObj(5))
    comp(pval('v.',scope),NumObj(5))
    comp(pval(`[
        T := (Object clone).
        T setSlot "v" 0.
        T setSlot "sv" [ x |
           super setSlot "v" x.
           self v.
        ].
        T setSlot "gv" [
          self v.
        ].
        T sv 88.
        T gv.
    ] invoke.`,scope),NumObj(88))
})

test('eval blocks with args',() => {
    let scope = init_std_scope()
    comp(pval(`[
        T := (Object clone).
        T setSlot "foo" [ x |
            "inside the block " print.
            x print.
            x.
        ].
        T foo 5.
    ] invoke.`,scope),NumObj(5))
})

test('non local return', () => {
    let scope = init_std_scope()
    comp(pval(`[ 
        T := (Object clone).
        T setSlot "nl" [ 
          "inside method" print.
          ( 4 > 5 ) cond [
            "method 1" print.
            return 1.
          ] [ 
            "method 2" print.
            return 2.
          ].
          "after return" print.
        ].
        T nl. 
    ] invoke.`,scope),NumObj(2))
})

test('non local return 2', () => {
    let scope = init_std_scope()
    comp(pval(`[
        "doing regular return " print.
        return 2.
    ] invoke.`,scope),NumObj(2))
})