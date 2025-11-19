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
    slots: Map<string, Obj>;
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
        // d.p(`looking up name '${name}' on`, this.name)//,this.print(2))
        if (name === 'self') {
            return this
        }
        return this.safe_lookup_slot(name, 7);
    }
    safe_lookup_slot(name: string, depth: number): Obj {
        // d.p("safe lookup slot",depth ,name,'on',this.name)
        if(depth < 1) {
            throw new Error("recursed too deep!")
        }
        if(this.slots.has(name)) {
            // d.p(`has slot '${name}'`);
            return this.slots.get(name)
        }
        if(this.parent) {
            // d.p("calling the get parent lookup on", this.parent.name);
            if (isNil(this.parent)) {
                // d.p("parent is nil")
            } else {
                return this.parent.safe_lookup_slot(name, depth - 1)
            }
        }
        d.warn(`slot not found!: '${name}'`)
        return NilObj()
    }

    get_js_slot(name: string):unknown {
        // d.p("getting js slot",name)
        // d.p("this is",this)
        return this.slots.get(name)
    }
    _get_js_number():number {
        return this.get_js_slot('jsvalue') as number
    }
    _get_js_string():string {
        return this.get_js_slot('jsvalue') as string
    }
    _get_js_boolean():boolean {
        return this.get_js_slot('jsvalue') as boolean
    }

    clone() {
        return new Obj(this.name + "(COPY)", this.parent, this.getSlots())
    }

    private getSlots():Record<string, unknown> {
        let slots:Record<string,unknown> = {}
        for(let key of this.slots.keys()) {
            slots[key] = this.slots.get(key)
        }
        return slots
    }

    dump() {
        if (this.name === 'NumberLiteral') {
            d.p("numberLiteral: " + this._get_js_number())
            return;
        }
        d.p(this.name)
        d.indent()
        for(let key of this.slots.keys()) {
            let value = this.slots.get(key)
            if (value instanceof Obj) {
                if (value.has_slot('jsvalue')) {
                    d.p("slot " + key, value.name, value.get_js_slot('jsvalue') + "")
                } else {
                    d.p("slot " + key, value.name + "")
                }
            }
            if (value instanceof Function) {
                d.p("slot " + key + " native function")
            }
        }
        if (this.name === 'ObjectProto') {
            d.p("ending")
        } else {
            if(this.parent) {
                d.p("parent")
                d.indent()
                this.parent.dump()
                d.outdent()
            }
        }
        d.outdent()
    }
}

const ROOT = new Obj("ROOT", null,{
    'makeSlot':(rec:Obj, args:Array<Obj>):Obj => {
        let slot_name = args[0]._get_js_string()
        let slot_value = args[1]
        rec.make_slot(slot_name,slot_value)
        if (slot_value.name === 'Block') {
            slot_value.parent = rec
        }
        return NilObj();
    },
    'getSlot':(rec:Obj, args:Array<Obj>):Obj => {
        let slot_name = args[0]._get_js_string()
        return rec.get_slot(slot_name)
    },
    'setSlot':(rec:Obj, args:Array<Obj>):Obj=> {
        let slot_name = args[0]._get_js_string()
        let slot_value = args[1]
        rec.set_slot(slot_name,slot_value)
        return NilObj()
    },
    'clone':(rec:Obj):Obj => rec.clone(),
    'dump':(rec:Obj):Obj => {
        d.p("DUMPING: ", rec.name)
        d.indent()
        rec.dump();
        d.outdent()
        return NilObj()
    }
});
const ObjectProto = new Obj("ObjectProto", ROOT, {})
const NilProto = new Obj("NilProto",ObjectProto,{});
const NilObj = () => new Obj("NilLiteral", NilProto, {})


const BooleanProto = new Obj("BooleanProto",ObjectProto,{
    'value':(rec:Obj) => rec,
    'if_true':(rec:Obj, args:Array<Obj>):Obj => {
        let val = rec._get_js_boolean()
        if(val) return eval_block_obj(args[0])
        return NilObj()
    },
    'if_false':(rec:Obj, args:Array<Obj>):Obj => {
        let val = rec._get_js_boolean()
        if(!val) return eval_block_obj(args[0])
        return NilObj()
    },
    'cond':(rec:Obj, args:Array<Obj>):Obj => {
        let val = rec._get_js_boolean()
        return eval_block_obj(val?args[0]:args[1])
    }
});
const BoolObj = (value:boolean) => new Obj("BooleanLiteral", BooleanProto, {'jsvalue':value})

const js_num_op = (cb:(a:number,b:number)=>number) => {
    return function (rec:Obj, args:Array<Obj>){
        if (args[0].name !== "NumberLiteral") {
            throw new Error("cannot add a non number to a number")
        }
        let a = rec._get_js_number()
        let b = args[0]._get_js_number()
        return NumObj(cb(a, b))
    }
}
const js_bool_op = (cb:(a:number,b:number)=>boolean) => {
    return function (rec:Obj, args:Array<Obj>){
        let a = rec._get_js_number()
        let b = args[0]._get_js_number()
        return BoolObj(cb(a, b))
    }
}
const NumberProto = new Obj("NumberProto",ObjectProto,{
    'value':(rec:Obj) => rec,
    '+':js_num_op((a,b)=>a+b),
    '-':js_num_op((a,b)=>a-b),
    '*':js_num_op((a,b)=>a*b),
    '/':js_num_op((a,b)=>a/b),
    '<':js_bool_op((a,b)=>a<b),
    '>':js_bool_op((a,b)=>a>b),
    '==':js_bool_op((a,b)=>a==b),
    'sqrt':(rec:Obj):Obj => NumObj(Math.sqrt(rec._get_js_number()))
});
const NumObj = (value:number):Obj => new Obj("NumberLiteral", NumberProto, { 'jsvalue': value,})


const StringProto = new Obj("StringProto",ObjectProto,{
    'value':(rec:Obj) => rec,
    '+':((rec:Obj, args:Array<Obj>) => {
        let a = rec._get_js_string()
        let b = args[0]._get_js_string()
        return StrObj(a+b)
    })
});
const StrObj = (value:string):Obj => new Obj("StringLiteral", StringProto, {'jsvalue': value})

const DebugProto = new Obj("DebugProto",ObjectProto,{
    'equals':(rec:Obj, args:Array<Obj>) => {
        assert(objsEqual(args[0], args[1]))
        return NilObj()
    },
    'print':(rec:Obj, args:Array<Obj>) => {
        d.p("debug printing".toUpperCase())
        d.p(args)
        return NilObj()
    }
})
const SymRef = (value:string):Obj => new Obj("SymbolReference",ObjectProto,{'jsvalue':value})
const BlockProto = new Obj("BlockProto",ObjectProto,{
    'invoke':(rec:Obj,args:Array<Obj>) => {
        // d.p("this is a block invocation")
        // d.p("rec",rec)
        // if (rec.name !== 'Block') {
        //     throw new Error("cannot use 'invoke' on something that isn't a Block")
        // }
        // d.p("parameters are", rec.get_slot('args'))
        let params:Array<IdAst> = rec.get_slot('args')
        // d.p("args are", args)
        let body = rec.get_js_slot('body') as Array<StmtAst>
        // d.p("body",body)
        if(!Array.isArray(body)) {
            console.error(body)
            throw new Error("block body isn't an array")
        }
        let scope = new Obj("block-activation",rec,{})

        for(let i=0; i<params.length; i++) {
            let name = params[i]
            let value = args[i]
            // d.p("setting parameter",name.value,'to',value)
            scope.make_slot(name.value,value)
        }

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

function isNil(method: Obj) {
    if(method.name === 'NilLiteral') return true;
    return false;
}

function send_message(objs: Obj[], scope: Obj):Obj {
    if (objs.length < 1) {
        d.p("everything is empty")
        return null
    }
    if(objs.length == 1) {
        d.p("message is only the receiver")
        let rec = objs[0]
        d.p(rec)
        d.p("in the scope",scope)
        if (rec.name === 'SymbolReference') {
            d.p("returning " + " " + rec._get_js_string())
            return scope.lookup_slot(rec._get_js_string())
        }
        return rec
    }
    d.p("sending message")
    let rec = objs[0]
    d.p('receiver',rec.name)
    if (rec.name === 'SymbolReference') {
        rec = scope.lookup_slot(rec._get_js_string())
        d.p("better receiver is", rec)
    }

    let message = objs[1]
    d.p("message",objs[1])
    let message_name = message._get_js_string()
    d.p(`message name: '${message_name}' `)
    let method = rec.lookup_slot(message_name)
    d.p("got the method",method)
    if (isNil(method)) {
        throw new Error("method is nil!")
    }
    let args:Array<Obj> = objs.slice(2)
    d.p("args",args)

    args = args.map((a:Obj) => {
        d.p("arg is",a);
        if (a.name === 'SymbolReference') {
            let aa = scope.lookup_slot(a._get_js_string())
            d.p("found a better value",aa)
            return aa
        }
        return a
    })

    if (method instanceof Function) {
        return method(rec,args)
    }
    if (method.name === 'NumberLiteral') {
        return method
    }
    if (method.name === 'StringLiteral') {
        return method
    }
    if (method.name === 'Block') {
        d.p("is a block as a method call")
        method.parent = rec
        let meth = method.get_js_slot('invoke') as Function
        d.p('now method is',meth)
        return meth(method,args)
    }
    return method.invoke(rec,args)
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
        // d.enable()
        let ret = send_message(objs,scope)
        // d.disable()
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

function objsEqual(a: Obj, b: Obj) {
    if(a.name !== b.name) return false
    if(a.slots.size !== b.slots.size) return false
    for(let key of a.slots.keys()) {
        let vala = a.slots.get(key)
        let valb = b.slots.get(key)
        if (typeof vala === 'number') {
            if (vala !== valb) {
                return false
            }
        }
        if (typeof vala === 'string') {
            if (vala !== valb) {
                return false
            }
        }
    }
    return true
}

function cval(code:string, scope:Obj, expected:Obj) {
    d.p('=========')
    d.p(`code is '${code}'`)
    d.disable()
    let ast = parseAst(code);
    d.p('ast is',ast)
    // d.p(ast)
    let obj = eval_ast(ast,scope);
    // d.p("returned")
    // obj.dump()
    // d.p(obj)
    // assert.deepStrictEqual(obj,expected)
    assert(objsEqual(obj,expected))
}
function make_default_scope():Obj {
    let scope = new Obj("Global",ROOT,{});
    scope.make_slot("Object",ObjectProto)
    scope.make_slot("Number",NumberProto)
    scope.make_slot("Debug",DebugProto)
    scope.make_slot("Boolean",BooleanProto)
    scope.make_slot("true",BoolObj(true))
    scope.make_slot("false",BoolObj(false))
    scope.make_slot("Nil",NilProto)
    scope.make_slot('nil',NilObj())
    scope.make_slot("Global",scope)
    ObjectProto.parent = scope;
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
    // cval('8 clone.',scope,NumObj(8))
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
    cval('4 value .',scope,NumObj(4))
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
    cval(`[
        self makeSlot "foo" [ v |
            88 + v.
        ].
        self foo 1.
     ] invoke .`,scope,NumObj(89))

    cval(`[
        self makeSlot "foo" (Object clone).
        foo makeSlot "bar" 88.
        Debug equals (foo bar) 88.
        foo makeSlot "get_bar" [
            self bar.
        ].
        Debug equals (foo get_bar) 88.
        foo makeSlot "get_bar_better" [
            bar.
        ].
        Debug equals (foo get_bar_better) 88.
    ] invoke . `,scope, NilObj())
})

test('Point class',() => {
    let scope = make_default_scope()

    cval(`[
        Global makeSlot "PointProto" (Object clone).
        PointProto makeSlot "name" "PointProto".
        PointProto makeSlot "magnitude" [
            self makeSlot "xx" ((self x) * (self x)). 
            self makeSlot "yy" ((self y) * (self y)). 
            ((self yy) + (self xx)) sqrt.
        ].
        PointProto makeSlot "+" [ a |
            Debug print "inside of +".
            self makeSlot "xx" ( (self x) + (a x) ). 
            Debug print "inside of + 2".
            self makeSlot "yy" ( (self y) + (a y) ).
            Debug print "inside of + 3".
            self makeSlot "pp" (Point clone).
            Debug print "inside of + 4".
            pp setSlot "x" xx.
            pp setSlot "y" yy.
            pp.
        ].
        PointProto makeSlot "print" [
            (("Point(" + (self x)) + ("," + (self y))) + ")".
        ].
        Global makeSlot "Point" (PointProto clone).
        Point makeSlot "x" 0.
        Point makeSlot "y" 0.
        Point makeSlot "name" "Point".

        self makeSlot "pt" (Point clone).
        Debug equals (pt x) 0.
        pt setSlot "x" 5.
        pt setSlot "y" 5.
        Debug equals (pt x) 5.
        pt magnitude.
        
        self makeSlot "pt2" (Point clone).
        pt2 setSlot "x" 1.
        pt2 setSlot "y" 1.
        
        self makeSlot "pt3" (pt + pt2).
        pt3 dump.
        pt3 print.
    ] invoke .`,scope,
        StrObj("Point(6,6)")
    )
})

test("global scope tests",() => {
    let scope = make_default_scope()
    cval(`[
        Global makeSlot "foo" (Object clone).
        foo makeSlot "x" 5.
        foo makeSlot "bar" [
            self makeSlot "blah" (foo clone).
            blah x.
        ].
        foo bar.
    ] invoke .`,scope,NumObj(5))

    cval(`[
        Global makeSlot "Foo" (Object clone).
        Foo makeSlot "make" [
            self makeSlot "blah" (Foo clone).
            blah makeSlot "name" "Foo".
            blah.
        ].
        Foo makeSlot "bar" [
            self makeSlot "blah" (self make).
            blah name.
        ].
        Foo bar.
    ] invoke .`,scope,StrObj("Foo"))
})
