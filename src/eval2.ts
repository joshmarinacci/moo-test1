import test from "node:test";
import {JoshLogger} from "./util.ts";
import {parseBlockBody} from "./parser.ts";

import {Ast, BlockAst, GroupAst, IdAst, NumAst, StmtAst, StrAst} from "./ast.ts"
import assert from "node:assert";

const d = new JoshLogger()

type JSMethod = (rec:Obj, args:Array<Obj>) => Obj;

class Obj {
    name: string;
    parent: Obj|null;
    slots: Map<string, Obj>;
    _is_return: boolean;
    constructor(name: string, parent: Obj|null, props:Record<string,JSMethod>) {
        this.name = name;
        this.parent = parent
        this.slots = new Map<string,Obj>
        this._is_return = false;
        for(let key in props) {
            this.slots.set(key,props[key])
        }
    }

    make_slot(name: string, obj: Obj) {
        console.log(`make slot ${this.name}.${name} = ${obj.name}'`)
        this.slots.set(name,obj)
    }
    _make_js_slot(name: string, value:unknown) {
        this.slots.set(name,value)
    }
    set_slot(slot_name: string, slot_value: Obj):void {
        console.log(`set slot ${this.name}.${slot_name} = ${slot_value.name}`)
        if(!this.slots.has(slot_name)) {
            d.p(`${this.name} doesn't have the slot ${slot_name}`)
            if(this.parent) {
                return this.parent.set_slot(slot_name,slot_value)
            }
        } else {
            this.slots.set(slot_name, slot_value)
        }
    }
    print():string {
        return this.safe_print(5)
    }
    safe_print(depth:number):string {
        if (depth < 1) {
            return this.name
        }
        if (this.name === 'NumberLiteral') {
            return `NumberLiteral (${this._get_js_number()})`;
        }
        if (this.name === 'StringLiteral') {
            return `StringLiteral (${this._get_js_string()})`;
        }
        if (this.name === 'BooleanLiteral') {
            return `BooleanLiteral (${this._get_js_boolean()})`;
        }
        if (this.name === 'NilLiteral') {
            return `Nil`
        }
        let slots = Array.from(this.slots.keys()).map(key => {
            let val:unknown = this.slots.get(key)
            if (val instanceof Obj) {
                if (val.name === 'Block') {
                    val = 'Block'
                } else {
                    val = val.safe_print(depth - 1)
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
        let parent = this.parent?this.parent.safe_print(1):'nil'
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
    _get_js_array():Array<Obj> {
        return this.get_js_slot('jsvalue') as Array<Obj>
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

    parent_chain() {
        return this.name + ', ' + this.parent?.name + "," + this.parent?.parent?.name
    }
}

function eval_block_obj(clause: Obj) {
    if (clause.name !== 'Block') {
        return clause
    }
    let meth = clause.get_js_slot('value') as Function
    return meth(clause,[])
}
function isNil(method: Obj) {
    if(method.name === 'NilLiteral') return true;
    return false;
}
function send_message(objs: Obj[], scope: Obj):Obj {
    if (objs.length < 1) {
        throw new Error("cannot send message with not even a receiver");
    }
    let rec = objs[0]
    if(objs.length == 1) {
        if (rec.name === 'SymbolReference') {
            return scope.lookup_slot(rec._get_js_string())
        }
        return rec
    }
    if (rec._get_js_string() === 'return') {
        d.p("rewriting for a return call", rec)
        let ret = send_message(objs.slice(1),scope)
        let ret2 = new Obj('non-local-return',scope.parent,{})
        ret2._is_return = true
        ret2.make_slot('value',ret)
        ret2.make_slot('target',scope.parent as Obj);
        return ret2;
    }

    // d.p("sending message")
    // d.p('receiver',rec.name)
    if (rec.name === 'SymbolReference') {
        rec = scope.lookup_slot(rec._get_js_string())
        // d.p("better receiver is", rec)
    }


    let message = objs[1]
    let message_name = message._get_js_string()
    // d.p(`message name: '${message_name}' `)

    if(message_name === "::=") {
        d.p("rewrite the message call to make a slot")
        return send_message([
            scope,
            SymRef("makeSlot"),
            StrObj(objs[0]._get_js_string()),
            objs[2]
        ],scope)
    }

    if(message_name === ":=") {
        d.p("rewrite the message call to set a slot")
        return send_message([
            scope,
            SymRef("setSlot"),
            StrObj(objs[0]._get_js_string()),
            objs[2]
        ],scope)
    }


    let method = rec.lookup_slot(message._get_js_string())
    // d.p("got the method",method)
    if (isNil(method)) {
        throw new Error("method is nil!")
    }
    let args:Array<Obj> = objs.slice(2)
    // d.p("args",args)

    args = args.map((a:Obj) => {
        if (a.name === 'SymbolReference') {
            return scope.lookup_slot(a._get_js_string())
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
        method.parent = rec
        let meth = method.get_js_slot('value') as Function
        return meth(method,args)
    }
    throw new Error("invalid method")
}
function eval_ast(ast:Ast, scope:Obj):Obj {
    if (ast.type === 'num') return NumObj((ast as NumAst).value)
    if (ast.type === "str") return StrObj((ast as StrAst).value)
    if (ast.type === 'id') return SymRef((ast as IdAst).value)
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
        blk2._make_js_slot('args',blk.args);
        blk2._make_js_slot('body',blk.body);
        blk2.parent = scope;
        return blk2
    }
    console.error("unknown ast type",ast)
    throw new Error(`unknown ast type ${ast.type}`)
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
    'setObjectName':(rec:Obj, args:Array<Obj>):Obj => {
        rec.name = args[0]._get_js_string()
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
        return BoolObj(cb(rec._get_js_number(), args[0]._get_js_number()))
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
    '+':((rec:Obj, args:Array<Obj>) => StrObj(rec._get_js_string() + args[0]._get_js_string())),
    'print':(rec:Obj):Obj => {
        console.log("PRINT",rec._get_js_string())
        return NilObj()
    }
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
let BLOCK_COUNT = 0
const BlockProto = new Obj("BlockProto",ObjectProto,{
    'value':(rec:Obj,args:Array<Obj>) => {
        let params:Array<IdAst> = rec.get_slot('args') as unknown as Array<IdAst>
        let body = rec.get_js_slot('body') as Array<StmtAst>
        if(!Array.isArray(body)) throw new Error("block body isn't an array")
        let scope = new Obj(`block-activation-${++BLOCK_COUNT}`,rec,{})
        for(let i=0; i<params.length; i++) {
            scope.make_slot(params[i].value,args[i])
        }
        let last = NilObj()
        for(let ast of body) {
            last = eval_ast(ast,scope)
            if (!last) last = NilObj()
            if (last._is_return) {
                let target:Obj = last.slots.get('target')
                // d.p("looking for fast return to", target?.parent_chain())
                // d.p("scope is", scope.parent_chain())
                if (target === scope) {
                    // d.p("fast return found. returning",last.slots.get('value'))
                    return last.slots.get('value') as Obj
                }
                if (target && target.parent === scope) {
                    // d.p("fast return through parent found. returning",last.slots.get('value'))
                    return last.slots.get('value') as Obj
                }
                return last
            }
        }
        return last
    }
})

const ListProto = new Obj("ListProto",ObjectProto, {
    'push':(rec:Obj, args:Array<Obj>):Obj=>{
        let arr = rec._get_js_array()
        arr.push(args[0]);
        return NilObj()
    },
    'at':(rec:Obj,args:Array<Obj>):Obj => {
        let arr = rec._get_js_array()
        let index = args[0]._get_js_number()
        return arr[index]
    },
    'setAt':(rec:Obj, args:Array<Obj>):Obj => {
        let arr = rec._get_js_array()
        let index = args[0]._get_js_number()
        arr[index] = args[1]
        return rec
    },
    'len':(rec):Obj=>{
        let arr = rec._get_js_array()
        return NumObj(arr.length)
    }
})
ListProto._make_js_slot('jsvalue',[])


function objsEqual(a: Obj, b: Obj) {
    if(a.name !== b.name) return false
    if(a.slots.size !== b.slots.size) return false
    for(let key of a.slots.keys()) {
        let vala = a.slots.get(key) as unknown;
        let valb = b.slots.get(key) as unknown;
        if (typeof vala === 'number') {
            if (vala !== valb) return false
        }
        if (typeof vala === 'string') {
            if (vala !== valb) return false
        }
    }
    return true
}

function cval(code:string, scope:Obj, expected?:Obj) {
    // d.disable()
    d.p('=========')
    d.p(`code is '${code}'`)
    let body = parseBlockBody(code);
    // d.p('ast is',body)
    let last = NilObj()
    if (Array.isArray(body)) {
        for(let ast of body) {
            last = eval_ast(ast,scope)
            if (!last) last = NilObj()
        }
    } else {
        last = eval_ast(body as Ast, scope);
    }
    if (last._is_return) last = last.get_slot('value') as Obj;
    d.p("returned", last.print())
    if(expected) {
        assert(objsEqual(last, expected))
    }
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
    scope.make_slot("List",ListProto)
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
    cval('[ 5 . ] value .',scope, NumObj(5))
    // scope inside block can accept makeSlot. then looks up the v slot.
    cval(`[ self makeSlot "v" 5. self getSlot "v". ] value .`,scope, NumObj(5))
    cval(`[ self makeSlot "v" 5. self v. ] value .`,scope, NumObj(5))
    cval(`[ self makeSlot "v" 5. v. ] value .`,scope, NumObj(5))

    // group evaluates to the last expression in the group.
    cval('8 + 8.',scope,NumObj(16))
    cval('(8 + 8).',scope,NumObj(16))
    // cval('8 clone.',scope,NumObj(8))
    cval('Object clone.', scope, ObjectProto.clone())
    cval('[ Object clone. ] value .', scope, ObjectProto.clone())
    // make an object with one slot
    cval(`[
        self makeSlot "v" (Object clone).
        v makeSlot "w" 5.
        v w.
    ] value.`,scope,NumObj(5))
    cval(`[
        self makeSlot "v" (Object clone).
        v makeSlot "w" [ 5. ].
        v w.
    ] value.`,scope,NumObj(5))

    cval(`[
        self makeSlot "v" 5.
        [
          v.
        ] value.
    ] value .`,scope,NumObj(5))

    cval(`[
        self makeSlot "x" 5.
        self makeSlot "w" [ self x. ].
        self w.
    ] value .`,scope,NumObj(5))
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
     ] value .`,scope,NumObj(88))
    cval(`[
        self makeSlot "foo" [ v |
            88.
        ].
        self foo 1.
     ] value .`,scope,NumObj(88))
    cval(`[
        self makeSlot "foo" [ v |
            88 + v.
        ].
        self foo 1.
     ] value .`,scope,NumObj(89))

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
    ] value . `,scope, NilObj())
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
            self makeSlot "xx" ( (self x) + (a x) ). 
            self makeSlot "yy" ( (self y) + (a y) ).
            self makeSlot "pp" (Point make
                ((self x) + (a x))
                 ((self y) + (a y))).
            pp.
        ].
        PointProto makeSlot "print" [
            (("Point(" + (self x)) + ("," + (self y))) + ")".
        ].
        Global makeSlot "Point" (PointProto clone).
        Point makeSlot "x" 0.
        Point makeSlot "y" 0.
        Point makeSlot "name" "Point".
        Point makeSlot "make" [ x y |
            self makeSlot "pp" (Point clone).
            pp setSlot "x" x.
            pp setSlot "y" y.
            pp.
        ].

        self makeSlot "pt" (Point make 5 5).
        Debug equals (pt x) 5.
        Debug equals (pt y) 5.
        pt magnitude.
        
        self makeSlot "pt2" (Point make 1 1).
        
        self makeSlot "pt3" (pt + pt2).
        pt3 dump.
        pt3 print.
    ] value .`,scope,
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
    ] value .`,scope,NumObj(5))

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
    ] value .`,scope,StrObj("Foo"))
})
test('assignment operator', () => {
    let scope = make_default_scope()
    cval(`[
        v ::= 5.
        v.
    ] value.`,scope,NumObj(5))
    cval(`[
        v ::= 5.
        v := 6.
        v.
    ] value.`,scope,NumObj(6))
    cval(`[
        T ::= (Object clone).
        T makeSlot "v" 44.
        T makeSlot "gv" [
            self v.
        ].
        T makeSlot "sv" [ vv |
            v := vv.
        ].
        T sv 88.
        T gv.
    ] value.`,scope,NumObj(88))
})
test ('fib recursion',() => {
    let scope = make_default_scope()
    cval(`[
        Math ::= Object clone.
        Math makeSlot "fib" [n|
            (n == 0) if_true [ return 0. ].
            (n == 1) if_true [ return 1. ].
            (Math fib ( n - 2 ) ) + (Math fib (n - 1 ) ).
        ].
        Math fib 6.
     ] value . `,scope,NumObj(8))
})
test('non local return', () => {
    let scope = make_default_scope();
    cval(`[ 
        T ::= (Object clone).
        T makeSlot "nl" [ 
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
    ] value.`,scope,NumObj(2))
})
test('non local return 2', () => {
    let scope = make_default_scope();
    cval(`[
        return 4 + 5.
    ] value.`,scope,NumObj(9))
})
test('list class', () => {
    let scope = make_default_scope()
    cval('list ::= (List clone).',scope);
    cval(`[
        list push 7.
        list push 8.
        list push 9.
        list len.
    ] value.`,scope,NumObj(3))
    cval(`[
        list at 0.
    ] value.`,scope,NumObj(7))
    cval(`[
        list setAt 0 88.
        list at 0.
    ] value.`,scope,NumObj(88))
})
test('eval vector class',() => {
    let scope = make_default_scope()
    cval(`[
        Vector ::= (ObjectBase clone).
        Vector setObjectName "Vector".
        Vector makeSlot "x" 2.
        Vector makeSlot "y" 0.
        Vector makeSlot "z" 0.
        Vector makeSlot "add" [
            "pretending to add " print.
        ].
        Vector makeSlot "sx" [ xx |
           ("setting x " + xx) print.
           self setSlot "x" xx.
        ].
        v ::= (Vector clone).
        v sx 3.
        v x.
        
        a ::= (Vector clone).
        a sx 88.
        a x.
    ] value.`,scope,NumObj(88))
})

