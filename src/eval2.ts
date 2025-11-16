import test from "node:test";
import {JoshLogger} from "./util.ts";
import {parseAst} from "./parser.ts";

import {Ast, BlockAst, GroupAst, IdAst, NumAst, StmtAst, StrAst} from "./ast.ts"
import assert from "node:assert";

const d = new JoshLogger()

type JSMethod = (rec:Obj, args:Array<Obj>) => Obj;

class Obj {
    name: string;
    parent: Obj|null;
    private slots: Map<string, Obj>;
    constructor(name: string, parent: Obj|null, props:Record<string,JSMethod>) {
        this.name = name;
        this.parent = parent
        this.slots = new Map<string,Obj>
        for(let key in props) {
            this.slots.set(key,props[key])
        }
    }

    make_slot(name: string, obj: Obj) {
        this.slots.set(name,obj)
    }
    set_slot(slot_name: string, slot_value: Obj) {
        // d.p(`setting slot ${slot_name} to `,slot_value.print(1))
        // d.p("on object",this.print(2))
        if(this.slots.has(slot_name)) {
            this.slots.set(slot_name, slot_value)
        }
        // d.p(this)
    }
    print(depth:number):string {
        if (depth < 1) {
            return this.name
        }
        let slots = Array.from(this.slots.keys()).map(key => {
            let val:unknown = this.slots.get(key)
            if (val instanceof Obj) {
                if (val.name === 'Block') {
                    val = 'Block'
                } else {
                    val = val.print(depth - 1)
                }
            } else {
                if (val instanceof Function) {
                    val = "<function>"
                } else {
                    val = val.toString()
                }
            }
            return key + ":" + val
        })
        let parent = this.parent?this.parent.print(1):'nil'
        return `${this.name} {${slots.join('\n')}}\n ${parent} `
    }
    has_slot(name: string) {
        return this.slots.has(name)
    }
    get_slot(name: string):Obj {
        return this.slots.get(name)
    }

    lookup_slot(name: string):Obj {
        // d.p('looking up name',name,'on',this.print(2))
        if(this.slots.has(name)) {
            return this.slots.get(name)
        }
        if(this.parent) {
            return this.parent.lookup_slot(name)
        }
        console.warn(`slot '${name}' not found!`)
        return NilObj()
    }

    get_js_slot(name: string):unknown {
        // d.p("getting js slot",name)
        // d.p("this is",this)
        return this.slots.get(name)
    }

    clone() {
        return new Obj(this.name, this.parent, this.getSlots())
    }

    private getSlots():Record<string, unknown> {
        let slots:Record<string,unknown> = {}
        for(let key of this.slots.keys()) {
            slots[key] = this.slots.get(key)
        }
        return slots
    }

}

const ObjectProto = new Obj("ObjectProto", null,{
    'makeSlot':(rec:Obj, args:Array<Obj>):Obj => {
        // d.p("inside make slot on",rec)
        // d.p('args are',args)
        let slot_name = args[0].get_js_slot('value') as string;
        let slot_value = args[1]
        rec.make_slot(slot_name,slot_value)
        if (slot_value.name === 'Block') {
            // d.p(`setting a block. making it a method ${slot_name} : ${slot_value.name}`)
            slot_value.parent = rec
        }
        return NilObj();
    },
    'getSlot':(rec:Obj, args:Array<Obj>):Obj => {
        // d.p("inside get slot")
        let slot_name = args[0].get_js_slot('value') as string;
        return rec.get_slot(slot_name)
    },
    'setSlot':(rec:Obj, args:Array<Obj>):Obj=> {
        // d.p("inside set slot")
        let slot_name = args[0].get_js_slot('value') as string;
        let slot_value = args[1]
        rec.set_slot(slot_name,slot_value)
        return NilObj()
    },
    'clone':(rec:Obj) => {
        // d.p("doing clone of ",rec)
        return rec.clone();
    }
});
const NilProto = new Obj("NilProto",ObjectProto,{});
const NilObj = () => new Obj("NilLiteral", NilProto, {})


const BooleanProto = new Obj("BooleanProto",ObjectProto,{
    'if_true':(rec:Obj, args:Array<Obj>):Obj => {
        let val = rec.get_js_slot('value') as boolean
        if(val) return eval_block_obj(args[0])
        return NilObj()
    },
    'if_false':(rec:Obj, args:Array<Obj>):Obj => {
        let val = rec.get_js_slot('value') as boolean
        if(!val) return eval_block_obj(args[0])
        return NilObj()
    },
    'cond':(rec:Obj, args:Array<Obj>):Obj => {
        let val = rec.get_js_slot('value') as boolean
        return eval_block_obj(val?args[0]:args[1])
    }
});
const BoolObj = (value:boolean) => new Obj("BooleanLiteral", BooleanProto, {'value':value})

const js_num_op = (cb:(a:number,b:number)=>number) => {
    return function (rec:Obj, args:Array<Obj>){
        let a = rec.get_js_slot('value') as number
        let b = args[0].get_js_slot('value') as number
        return NumObj(cb(a, b))
    }
}
const js_bool_op = (cb:(a:number,b:number)=>boolean) => {
    return function (rec:Obj, args:Array<Obj>){
        let a = rec.get_js_slot('value') as number
        let b = args[0].get_js_slot('value') as number
        return BoolObj(cb(a, b))
    }
}
const NumberProto = new Obj("NumberProto",ObjectProto,{
    '+':js_num_op((a,b)=>a+b),
    '-':js_num_op((a,b)=>a-b),
    '*':js_num_op((a,b)=>a*b),
    '/':js_num_op((a,b)=>a/b),
    '<':js_bool_op((a,b)=>a<b),
    '>':js_bool_op((a,b)=>a>b),
    '==':js_bool_op((a,b)=>a==b),
    'sqrt':(rec:Obj):Obj => {
        let a = rec.get_js_slot('value') as number
        return NumObj(Math.sqrt(a))
    }
});
const NumObj = (value:number):Obj => new Obj("NumberLiteral", NumberProto, {'value': value})


const StringProto = new Obj("StringProto",ObjectProto,{
    '+':((rec:Obj, args:Array<Obj>) => {
        let a = rec.get_js_slot('value') as string;
        let b = args[0].get_js_slot('value') as string;
        return StrObj(a+b)
    })
});
const StrObj = (value:string):Obj => new Obj("StringLiteral", StringProto, {'value': value})

const DebugProto = new Obj("DebugProto",ObjectProto,{
    'equals':(rec:Obj, args:Array<Obj>) => {
        // d.p("comparing".toUpperCase(),args[0],'to',args[1])
        assert.deepStrictEqual(args[0],args[1])
        return NilObj()
    },
    'print':(rec:Obj, args:Array<Obj>) => {
        d.p("debug printing".toUpperCase())
        d.p(args)
        return NilObj()
    }
})
const SymRef = (value:string):Obj => new Obj("SymbolReference",ObjectProto,{'value':value})
const BlockProto = new Obj("BlockProto",ObjectProto,{
    'invoke':(rec:Obj,args:Array<Obj>) => {
        // d.p("this is a block invocation")
        // d.p("rec",rec)
        // if (rec.name !== 'Block') {
        //     throw new Error("cannot use 'invoke' on something that isn't a Block")
        // }
        let body = rec.get_js_slot('body') as Array<StmtAst>
        // d.p("body",body)
        if(!Array.isArray(body)) {
            console.error(body)
            throw new Error("block body isn't an array")
        }
        let scope = rec;
        // d.p("using block scope",scope)
        let res = body.map(a => eval_ast(a,scope))
        // d.p("block evaluated to",res)
        return res[res.length-1]
    }
})


function eval_block_obj(clause: Obj) {
    if (clause.name !== 'Block') {
        return clause
    }
    let meth = clause.get_js_slot('invoke') as Function
    return meth(clause,[])
}

function send_message(objs: Obj[], scope: Obj):Obj {
    if (objs.length < 1) {
        d.p("everything is empty")
        return null
    }
    if(objs.length == 1) {
        // d.p("message is only the receiver")
        let rec = objs[0]
        // d.p(rec)
        // d.p("in the scope",scope)
        if (rec.name === 'SymbolReference') {
            return scope.lookup_slot(rec.get_js_slot('value') as string)
        }
        return rec
    }
    // d.p("sending message")
    let rec = objs[0]
    // d.p('receiver',rec.name)
    if (rec.name === 'SymbolReference') {
        rec = scope.lookup_slot(rec.get_js_slot('value') as string)
        // d.p("better receiver is", rec)
    }

    let message = objs[1]
    // d.p("message",objs[1])
    // d.p("args",objs.slice(2))
    let message_name = message.get_js_slot('value') as string
    // d.p(`message name: '${message_name}' `)
    if (message_name === 'value') {
        return rec
    }
    let method = rec.lookup_slot(message_name)
    // d.p("got the method",method)
    if (method instanceof Function) {
        return method(rec,objs.slice(2))
    }
    if (method.name === 'NumberLiteral') {
        return method
    }
    if (method.name === 'Block') {
        // d.p("is a block as a method call")
        method.parent = rec
        let meth = method.get_js_slot('invoke') as Function
        // d.p('now method is',meth)
        return meth(method,objs.slice(2))
    }
    return method.invoke(rec,objs.slice(2))
}

function eval_ast(ast:Ast, scope:Obj):Obj {
    if (ast.type === 'num') {
        return NumObj((ast as NumAst).value)
    }
    if (ast.type === "str") {
        return StrObj((ast as StrAst).value)
    }
    if (ast.type === 'id') {
        let id = ast as IdAst;
        if (id.value === 'self') {
            return scope
        }
        return SymRef(id.value)
    }
    if (ast.type === 'group') {
        let group = ast as GroupAst;
        d.indent()
        let objs = group.value.map(a => eval_ast(a,scope))
        let ret = send_message(objs,scope)
        d.outdent()
        return ret
    }
    if (ast.type === 'stmt') {
        let stmt = ast as StmtAst;
        d.indent()
        let objs = stmt.value.map(a => eval_ast(a,scope))
        let ret = send_message(objs,scope)
        d.outdent()
        return ret
    }
    if (ast.type === 'block') {
        let blk = ast as BlockAst;
        let blk2 = BlockProto.clone()
        blk2.name = 'Block'
        blk2.make_slot('args',blk.args);
        blk2.make_slot('body',blk.body);
        blk2.parent = scope;
        return blk2
    }
    console.error("unknown ast type",ast)
    throw new Error(`unknown ast type ${ast.type}`)
}

function cval(code:string, scope:Obj, expected:Obj) {
    d.p('=========')
    d.p(`code is '${code}'`)
    let ast = parseAst(code);
    // d.p('ast is',ast)
    // d.p(ast)
    let obj = eval_ast(ast,scope);
    // d.p("returned")
    // d.p(obj)
    assert.deepStrictEqual(obj,expected)
}
function make_default_scope():Obj {
    let scope = new Obj("Global",ObjectProto,{});
    scope.make_slot("Object",ObjectProto)
    scope.make_slot("Number",NumberProto)
    scope.make_slot("Debug",DebugProto)
    scope.make_slot("Boolean",BooleanProto)
    scope.make_slot("true",BoolObj(true))
    scope.make_slot("false",BoolObj(false))
    scope.make_slot("Nil",NilProto)
    scope.make_slot('nil',NilObj())
    return scope
}
const no_test = (name:string, cb:unknown) => {

}

test('scope tests',() => {
    let scope:Obj = make_default_scope();
    // evaluates a number literal
    cval(` 5 .`,scope,NumObj(5))
    // self is the scope itself
    cval(` self .`,scope,scope)
    // the value message on a literal returns itself
    cval(' 5 value .',scope,NumObj(5))
    // block evaluates to the last statement
    cval('[ 5 . ] invoke .',scope, NumObj(5))
    // scope inside block can accept makeSlot. then looks up the v slot.
    cval(`[ self makeSlot "v" 5. self getSlot "v". ] invoke .`,scope, NumObj(5))
    // //
    // // group evaluates to the last expression in the group.
    cval('8 + 8.',scope,NumObj(16))
    cval('(8 + 8).',scope,NumObj(16))
    cval('8 clone.',scope,NumObj(8))
    cval('Object clone.', scope, ObjectProto.clone())
    cval('[ Object clone. ] invoke .', scope, ObjectProto.clone())
    // make an object with one slot
    cval(`[
        self makeSlot "v" (Object clone).
        v makeSlot "w" 5.
        v w.
    ] invoke.`,scope,NumObj(5))
    cval(`[
        self makeSlot "v" (Object clone).
        v makeSlot "w" [ 5. ].
        v w.
    ] invoke.`,scope,NumObj(5))

    cval(`[
        self makeSlot "v" 5.
        [
          v.
        ] invoke.
    ] invoke .`,scope,NumObj(5))

    cval(`[
        self makeSlot "x" 5.
        self makeSlot "w" [ self x. ].
        self w.
    ] invoke .`,scope,NumObj(5))
})
test('nil',() => {
    let scope:Obj = make_default_scope();
    cval(`nil .`,scope, NilObj())
})
test('numbers',() => {
    let scope:Obj = make_default_scope();
    cval('4 .',scope,NumObj(4));
    cval('4 + 5.',scope,NumObj(9));
    cval('4 - 5.',scope,NumObj(-1));
    cval('4 * 2.',scope,NumObj(8));
    cval('4 / 2.',scope,NumObj(2));
    cval('(4 * 5) * 6.',scope,NumObj(120));
    cval('(4 + 5) * 6.',scope,NumObj(54));
    cval('4 + (5 * 6).',scope,NumObj(34));
})
test('booleans',() => {
    let scope:Obj = make_default_scope();
    cval('true .',scope,BoolObj(true));
    cval('false .',scope,BoolObj(false));
    cval('4 < 5 .',scope,BoolObj(true));
    cval('4 > 5 .',scope,BoolObj(false));
    cval('4 == 4 .',scope,BoolObj(true));
    cval('4 == 5 .',scope,BoolObj(false));
})
test('strings',() => {
    let scope = make_default_scope()
    cval('"foo" .', scope,StrObj("foo"))
    cval('"foo" + "bar" .', scope,StrObj("foobar"))
})
test('conditions',() => {
    let scope = make_default_scope()
    cval(` (4 < 5) if_true 88.`,scope,NumObj(88))
    cval(` (4 > 5) if_true 88.`,scope,NilObj())
    cval(` (4 < 5) if_false 88.`,scope,NilObj())
    cval(` (4 > 5) if_false 88.`,scope,NumObj(88))

    cval(` (4 < 5) cond 88 89.`,scope,NumObj(88))
    cval(` (4 > 5) cond 88 89.`,scope,NumObj(89))
    cval(` (4 < 5) cond (44+44) 89.`,scope,NumObj(88))

    cval(` (4 < 5) cond [88.] [89.].`,scope,NumObj(88))
    cval(` (4 > 5) cond [88.] [89.].`,scope,NumObj(89))
})

test('Debug tests',() => {
    let scope = make_default_scope()
    cval(`Debug print 0.`,scope,NilObj())
    cval(`Debug equals 0 0.`,scope,NilObj())
    cval(`Debug print 0 0.`,scope,NilObj())
})

test("block arg tests",() => {
    let scope = make_default_scope()
    cval(`[
        self makeSlot "foo" [
            88.
        ]. 
        self foo.
     ] invoke .`,scope,NumObj(88))
    cval(`[
        self makeSlot "foo" [ v |
            88.
        ]. 
        self foo 1.
     ] invoke .`,scope,NumObj(88))
    // cval(`[
    //     self makeSlot "foo" [ v |
    //         88 + v.
    //     ].
    //     self foo 1.
    //  ] invoke .`,scope,NumObj(88))
})

no_test('Point class',() => {
    let scope = make_default_scope()

    cval(`[
        self makeSlot "PointProto" (Object clone).
        PointProto makeSlot "magnitude" [
            self makeSlot "xx" ((self x) * (self x)). 
            self makeSlot "yy" ((self y) * (self y)). 
            ((self yy) + (self xx)) sqrt.
        ].
        PointProto makeSlot "+" [ a |
            self makeSlot "xx" ( (self x) + (a x) ). 
            self makeSlot "yy" ( (self y) + (a y) ).
            self x. 
        ].
        self makeSlot "Point" (PointProto clone).
        Point makeSlot "x" 0.
        Point makeSlot "y" 0.

        self makeSlot "pt" (Point clone).
        pt makeSlot "name" "Point".
        Debug print "foo".
        Debug equals 0 0.
        Debug equals (pt x) 0.
        pt setSlot "x" 5.
        pt setSlot "y" 5.
        Debug equals (pt x) 5.
        Debug print (pt).
        pt magnitude.
        
        self makeSlot "pt2" (Point clone).
        pt2 setSlot "x" 8.
        pt2 setSlot "x" 9.
        
        pt + pt2.
    ] invoke .`,scope,NumObj(Math.sqrt(5*5+5*5)))
})
