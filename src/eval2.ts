import {JoshLogger} from "./util.ts";
import {parseBlockBody} from "./parser.ts";

import {Ast, BlockAst, GroupAst, IdAst, ListLiteralAst, MapLiteralAst, NumAst, StmtAst, StrAst} from "./ast.ts"
import assert from "node:assert";

const d = new JoshLogger()

type JSMethod = (rec:Obj, args:Array<Obj>) => Obj;

export class Obj {
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
        if(!obj) {
            throw new Error(`cannot make slot ${name}. value is null`)
        }
        // console.log(`make slot ${this.name}.${name} = ${obj.name}'`)
        this.slots.set(name,obj)
    }
    _make_js_slot(name: string, value:unknown) {
        this.slots.set(name,value)
    }
    set_slot(slot_name: string, slot_value: Obj):void {
        // console.log(`set slot ${this.name}.${slot_name} = ${slot_value.name}`)
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
        if (this.name === 'SymbolReference') {
            return `SymbolReference (${this._get_js_string()})`;
        }
        if (this.name === 'BooleanLiteral') {
            return `BooleanLiteral (${this._get_js_boolean()})`;
        }
        if (this.name === 'NilLiteral') {
            return `Nil`
        }
        if (this.name === 'Block') {
            return `Block (${this.get_slot('args')}) ${this.get_slot('body')}`
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
        // d.warn(`slot not found!: '${name}'`)
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
    _get_js_record():Record<string,Obj> {
        return this.get_js_slot('jsvalue') as Record<string,Obj>
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

export function eval_block_obj(clause: Obj, args:Array<Obj>) {
    if (clause.name !== 'Block') {
        return clause
    }
    let meth = clause.get_js_slot('value') as Function
    return meth(clause,args)
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

    d.p("sending message")
    d.p('receiver',rec.print())
    if (rec.name === 'SymbolReference') {
        rec = scope.lookup_slot(rec._get_js_string())
        d.p("better receiver is", rec.print())
    }


    let message = objs[1]
    let message_name = message._get_js_string()
    d.p(`message name: '${message_name}' `)

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
    if (method.print) {
        d.p("got the method", method.print())
    }
    if (isNil(method)) {
        throw new Error(`method is nil! could not find '${message._get_js_string()}'`)
    }
    let args:Array<Obj> = objs.slice(2)
    d.p("args",args)

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
    if (ast.type === 'array-literal') {
        let list = ast as ListLiteralAst
        let vals = list.value.map(v => eval_ast(v,scope))
        return ListObj(...vals)
    }
    if (ast.type === 'array-literal-map') {
        let map = ast as MapLiteralAst
        let obj:Record<string, Obj> = {}
        map.value.forEach(pair => {
            let key = pair[0] as IdAst
            let value = pair[1]
            obj[key.value] = eval_ast(value,scope)
        })
        return DictObj(obj)
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
export const ObjectProto = new Obj("ObjectProto", ROOT, {})
const NilProto = new Obj("NilProto",ObjectProto,{});
export const NilObj = () => new Obj("NilLiteral", NilProto, {})

const BooleanProto = new Obj("BooleanProto",ObjectProto,{
    'value':(rec:Obj) => rec,
    'if_true':(rec:Obj, args:Array<Obj>):Obj => {
        let val = rec._get_js_boolean()
        if(val) return eval_block_obj(args[0],[])
        return NilObj()
    },
    'if_false':(rec:Obj, args:Array<Obj>):Obj => {
        let val = rec._get_js_boolean()
        if(!val) return eval_block_obj(args[0],[])
        return NilObj()
    },
    'and':(rec:Obj, args:Array<Obj>):Obj => {
        let A = rec._get_js_boolean()
        let B = args[0]._get_js_boolean()
        return BoolObj(A && B)
    },
    'cond':(rec:Obj, args:Array<Obj>):Obj => {
        let val = rec._get_js_boolean()
        return eval_block_obj(val?args[0]:args[1],[])
    }
});
export const BoolObj = (value:boolean) => new Obj("BooleanLiteral", BooleanProto, {'jsvalue':value})

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
    'mod':js_num_op((a,b)=>a%b),
    'sqrt':(rec:Obj):Obj => NumObj(Math.sqrt(rec._get_js_number())),
    'range':(rec:Obj, args:Array<Obj>):Obj => {
        let start = rec._get_js_number()
        let end = args[0]._get_js_number()
        let block = args[1]
        for(let i=start; i<end; i++) {
            eval_block_obj(block, [NumObj(i)])
        }
    }
});
export const NumObj = (value:number):Obj => new Obj("NumberLiteral", NumberProto, { 'jsvalue': value,})

const StringProto = new Obj("StringProto",ObjectProto,{
    'value':(rec:Obj) => rec,
    '+':((rec:Obj, args:Array<Obj>) => StrObj(rec._get_js_string() + args[0]._get_js_string())),
    'print':(rec:Obj):Obj => {
        console.log("PRINT",rec._get_js_string())
        return NilObj()
    }
});
export const StrObj = (value:string):Obj => new Obj("StringLiteral", StringProto, {'jsvalue': value})

const DebugProto = new Obj("DebugProto",ObjectProto,{
    'equals':(rec:Obj, args:Array<Obj>) => {
        assert(objsEqual(args[0], args[1]),`not equal ${args[0].print()} ${args[1].print()}`)
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
        if(params.length !== args.length) {
            console.warn("parameters and args for block are different lengths")
            console.log(rec.print())
            throw new Error(`block requires ${params.length} arguments\n ${rec.print()}`)
        }
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
export const ListObj = (...args:Array<Obj>)=> new Obj("List", ListProto, {'jsvalue': args})

const DictProto = new Obj('DictProto',ObjectProto, {
    'get':(rec:Obj, args:Array<Obj>):Obj => {
        let arr = rec._get_js_record()
        let key = args[0]._get_js_string()
        return arr[key]
    },
    'set':(rec:Obj, args:Array<Obj>):Obj => {
        let arr = rec._get_js_record()
        let key = args[0]._get_js_string()
        arr[key] = args[1]
        return rec
    },
    'len':(rec):Obj=>{
        let record = rec._get_js_record()
        return NumObj(Object.keys(record).length)
    }
})
DictProto._make_js_slot("jsvalue",{})
export const DictObj = (obj:Record<string, Obj>) => new Obj("Dict",DictProto,{"jsvalue": obj})


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

export function cval(code:string, scope:Obj, expected?:Obj) {
    d.disable()
    d.p('=========')
    d.p(`code is '${code}'`)
    let body = parseBlockBody(code);
    d.p('ast is',body.toString())
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
export function make_default_scope():Obj {
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
    scope.make_slot("Dict",DictProto)
    scope.make_slot("Global",scope)
    ObjectProto.parent = scope;
    return scope
}
const no_test = (name:string, cb:unknown) => {

}


/*

    match / switch / case statement


    three := n mod 3 == 0.
    five  := n mod 5 == 0.
    result := case
        when (three and five) "FizzBuzz"
        when (three) "Fizz"
        when (five)  "Buzz"
        default "Error"
    result print.

    case is an object which
    when is a method on the object which takes a boolean and an expression
    when cond exp
        if cond.ret == nil
            if cond evaluates to true set case.ret := expr
            if cond evaluates to false, set case.ret := nil
            return self
        else
            eval nothing
            return self
    default exp
        if cond.ret == nil
            return exp
        else
            return cond.ret

   All of the 'when' messages are evaluated, then the default expression returns the value of the successful 'when' expression
   otherwise it returns the value of the default expression.


 */