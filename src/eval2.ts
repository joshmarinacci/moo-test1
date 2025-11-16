import test from "node:test";
import {JoshLogger} from "./util.ts";
import {parseAst} from "./parser.ts";

import {Ast, Blk, BlockAst, GroupAst, Grp, Id, IdAst, Num, NumAst, Stmt, StmtAst, Str, StrAst} from "./ast.ts"
import assert from "node:assert";

const d = new JoshLogger()

class Obj {
    name: string;
    parent: Obj|null;
    private slots: Map<string, Obj>;
    constructor(name: string, parent: Obj|null, props:Record<string,unknown>) {
        this.name = name;
        this.parent = parent
        this.slots = new Map<string,Obj>
        for(let key in props) {
            // d.p("key",key, props[key])
            this.slots.set(key,props[key])
        }
    }

    makeSlot(name: string, obj: Obj) {
        this.slots.set(name,obj)
    }
    hasSlot(name: string) {
        return this.slots.has(name)
    }
    getSlot(name: string) {
        return this.slots.get(name)
    }

    lookup_slot(name: string):Obj {
        d.p('looking up name',name,'on',this)
        if(this.slots.has(name)) {
            return this.slots.get(name)
        }
        if(this.parent) {
            return this.parent.lookup_slot(name)
        }
        console.warn(`slot '${name}' not found!`)
        return null
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

class MethodObject {
    invoke(rec: Obj, args: Obj[]) {
        d.p("real method",rec,args)
    }
}

const ObjectProto = new Obj("ObjectProto", null,{
    'makeSlot':(rec:Obj, args:Array<Obj>) => {
        d.p("inside make slot on",rec)
        d.p('args are',args)
        let slot_name = args[0].get_js_slot('value') as string;
        let slot_value = args[1]
        rec.makeSlot(slot_name,slot_value)
        if (slot_value.name === 'Block') {
            d.p('setting a block. making it a method')
            slot_value.parent = rec
        }
        return null;
    },
    'getSlot':(rec:Obj, args:Array<Obj>)=> {
        d.p("inside get slot")
        let slot_name = args[0].get_js_slot('value') as string;
        return rec.getSlot(slot_name)
    },
    'clone':(rec:Obj) => {
        d.p("doing clone of ",rec)
        return rec.clone();
    }
});
const NumberProto = new Obj("NumberProto",ObjectProto,{
    '+':(rec:Obj, args:Array<Obj>) => {
        return NumObj(rec.get_js_slot('value') + args[0].get_js_slot('value'))
    }
});
const StringProto = new Obj("StringProto",ObjectProto,{});
const NumObj = (value:number):Obj => new Obj("NumberLiteral", NumberProto, {'value': value})
const StrObj = (value:string):Obj => new Obj("StringLiteral", StringProto, {'value': value})

const SymRef = (value:string):Obj => new Obj("SymbolReference",ObjectProto,{'value':value})
const BlockProto = new Obj("BlockProto",ObjectProto,{
    'invoke':(rec:Obj,args:Array<Obj>) => {
        // d.p("this is a block invocation")
        d.p("rec",rec)
        // if (rec.name !== 'Block') {
        //     throw new Error("cannot use 'invoke' on something that isn't a Block")
        // }
        let body:Array<StmtAst> = rec.get_js_slot('body')
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


function send_message(objs: Obj[], scope: Obj):Obj {
    if (objs.length < 1) {
        d.p("everything is empty")
        return null
    }
    if(objs.length == 1) {
        return objs[0]
    }
    d.p("sending message")
    let rec = objs[0]
    d.p('receiver',rec.name)
    if (rec.name === 'SymbolReference') {
        rec = scope.lookup_slot(rec.get_js_slot('value') as string)
        d.p("better receiver is", rec)
    }

    let message = objs[1]
    // d.p("message",objs[1])
    // d.p("args",objs.slice(2))
    let message_name = message.get_js_slot('value') as string
    d.p(`message name: '${message_name}' `)
    if (message_name === 'value') {
        return rec
    }
    let method = rec.lookup_slot(message_name)
    d.p("got the method",method)
    if (method instanceof Function) {
        return method(rec,objs.slice(2))
    }
    if (method.name === 'NumberLiteral') {
        return method
    }
    if (method.name === 'Block') {
        d.p("is a block")
        let meth = method.get_js_slot('invoke') as Function
        d.p('now method is',meth)
        return meth(method,objs.slice(2))
    }
    return method.invoke(rec,objs.slice(2))
}

function eval_ast(ast:Ast, scope:Obj):Obj {
    // d.p("eval",ast)
    if (ast.type === 'num') {
        let num:NumAst = ast;
        // d.p("number")
        return NumObj(num.value)
    }
    if (ast.type === "str") {
        return StrObj((ast as StrAst).value)
    }
    if (ast.type === 'id') {
        let id:IdAst = ast;
        // d.p(`resolving id '${id.value}'`)
        if (id.value === 'self') {
            return scope
        }
        // if (scope.hasSlot(id.value)) {
        //     return scope.getSlot(id.value)
        // } else {
        //     d.p("scope does not have the slot",scope)
        return SymRef(id.value)
        // }
    }
    if (ast.type === 'group') {
        let group:GroupAst = ast;
        d.indent()
        d.p("group");
        let objs = group.value.map(a => eval_ast(a,scope))
        let ret = send_message(objs,scope)
        d.p("done with group")
        d.outdent()
        return ret
    }
    if (ast.type === 'stmt') {
        let stmt:StmtAst = ast;
        d.p("statement")
        d.indent()
        let objs = stmt.value.map(a => eval_ast(a,scope))
        // d.p("objects",objs)
        let ret = send_message(objs,scope)
        d.p("done with statement")
        d.outdent()
        return ret
    }
    if (ast.type === 'block') {
        let blk:BlockAst = ast;
        d.p("block")
        let blk2 = BlockProto.clone()
        blk2.name = 'Block'
        blk2.makeSlot('args',blk.args);
        blk2.makeSlot('body',blk.body);
        blk2.makeSlot('parent',scope)
        blk2.parent = scope;
        return blk2
        // return new Obj("Block",BlockProto,{args:blk.args,body:blk.body,scope:scope})
    }
    console.error("unknown ast type",ast)
    throw new Error(`unknown ast type ${ast.type}`)
}

function cval(code:string, scope:Obj, expected:Obj) {
    d.p('=========')
    d.p(`code is '${code}'`)
    let ast = parseAst(code);
    d.p('ast is',ast)
    d.p(ast)
    let obj = eval_ast(ast,scope);
    d.p("returned")
    d.p(obj)
    assert.deepStrictEqual(obj,expected)
}
function make_default_scope():Obj {
    let scope = new Obj("Global",ObjectProto,{});
    scope.makeSlot("Object",ObjectProto)
    scope.makeSlot("Number",NumberProto)
    return scope
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
})