import {JoshLogger} from "./util.ts";

import {isNil, NilObj, Obj, ObjectProto} from "./obj.ts";
import {DictObj, ListObj} from "./arrays.ts";
import {NumObj} from "./number.ts";
import {StrObj} from "./string.ts";
import {objsEqual} from "./debug.ts";
import {parse} from "./parser3.ts";
import type {
    Ast2,
    BinaryCall,
    BlockLiteral,
    Group,
    KeywordCall,
    MessageCall,
    NumberLiteral,
    PlainId,
    Statement,
    StringLiteral,
    UnaryCall
} from "./ast2.ts";

const d = new JoshLogger()
d.disable()

export function eval_block_obj(clause: Obj, args:Array<Obj>) {
    if (clause.name !== 'Block') {
        return clause
    }
    let meth = clause.get_js_slot('value') as Function
    return meth(clause,args)
}
function send_message(objs: Obj[], scope: Obj):Obj {
    if (objs.length < 1) {
        throw new Error("cannot send message with not even a receiver");
    }
    let rec = objs[0]
    if(!rec) {
        console.error("receiver is null")
    }
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
        ret2._make_method_slot('value',ret)
        ret2._make_method_slot('target',scope.parent as Obj);
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

function perform_call(rec: Obj, call: UnaryCall | BinaryCall | KeywordCall, scope: Obj):Obj {
    console.log("doing call",call.type)
    if(call.type === 'unary-call') {
        let method = rec.lookup_slot(call.message.name)
        console.log('method is',method)
        if (isNil(method)) {
            throw new Error(`method is nil! could not find '${call.message.name}'`)
        }
        if (method instanceof Function) {
            return method(rec,[])
        }
    }
    if(call.type === 'binary-call') {
        let method = rec.lookup_slot(call.operator.name)
        if (isNil(method)) {
            throw new Error(`method is nil! could not find '${call.operator.name}'`)
        }
        let arg = eval_ast(call.argument,scope)
        console.log('method is',method)
        if (method instanceof Function) {
            return method(rec,[arg])
        }
    }
    if(call.type === 'keyword-call') {
        console.log('keyword call')
        let method = rec.lookup_slot(call.args[0].name.name)
        if (isNil(method)) {
            throw new Error(`method is nil! could not find '${call.args[0].name.name}'`)
        }
        let arg = eval_ast(call.args[0].value,scope)
        console.log('method is',method)
        if (method instanceof Function) {
            return method(rec,[arg])
        }
    }
}

export function eval_ast(ast:Ast2, scope:Obj):Obj {
    if (ast.type === 'number-literal') return NumObj((ast as NumberLiteral).value)
    if (ast.type === "string-literal") return StrObj((ast as StringLiteral).value)
    if (ast.type === 'plain-identifier') return SymRef((ast as PlainId).name)
    // if (ast.type === 'return') return SymRef("return")
    if (ast.type === 'group') {
        let group = ast as Group
        let objs = group.body.map(a => eval_ast(a,scope))
        return send_message(objs, scope)
    }
    if (ast.type === 'statement') {
        let stmt = ast as Statement;
        return eval_ast(stmt.value, scope)
    }
    if (ast.type === 'block-literal') {
        let blk = ast as BlockLiteral
        let blk2 = BlockProto.clone()
        blk2.name = 'Block'
        blk2._make_js_slot('args',blk.parameters);
        blk2._make_js_slot('body',blk.body);
        blk2.parent = scope;
        return blk2
    }
    // if (ast.type === 'array-literal') {
    //     let list = ast as ListLiteralAst
    //     let vals = list.value.map(v => eval_ast(v,scope))
    //     return ListObj(...vals)
    // }
    // if (ast.type === 'array-literal-map') {
    //     let map = ast as MapLiteralAst
    //     let obj:Record<string, Obj> = {}
    //     map.value.forEach(pair => {
    //         let key = pair[0] as IdAst
    //         let value = pair[1]
    //         obj[key.value] = eval_ast(value,scope)
    //     })
    //     return DictObj(obj)
    // }
    if (ast.type === 'message-call') {
        let msg = ast as MessageCall
        console.log('message call', msg)
        let rec = eval_ast(msg.receiver,scope)
        return perform_call(rec,msg.call,scope)
    }
    throw new Error(`unknown ast type '${ast.type}'`)
}


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
            scope._make_method_slot(params[i].value,args[i])
        }
        let last = NilObj()
        for(let ast of body) {
            last = eval_ast(ast,scope)
            if (!last) last = NilObj()
            if (last.name === 'SymbolReference') {
                last = scope.lookup_slot(last._get_js_string())
            }
            if (last._is_return) {
                let target:Obj = last._method_slots.get('target')
                if (target === scope) {
                    // d.p("fast return found. returning",last.slots.get('value'))
                    return last._method_slots.get('value') as Obj
                }
                if (target && target.parent === scope) {
                    // d.p("fast return through parent found. returning",last.slots.get('value'))
                    return last._method_slots.get('value') as Obj
                }
                return last
            }
        }
        return last
    }
})


export function cval(code:string, scope:Obj, expected?:Obj) {
    d.disable()
    d.p('=========')
    d.p(`code is '${code}'`)
    let body = parse(code);
    d.p('ast is',body.toString())
    let last = NilObj()
    if (Array.isArray(body)) {
        for(let ast of body) {
            last = eval_ast(ast,scope)
            if (!last) last = NilObj()
        }
    } else {
        last = eval_ast(body as Ast2, scope);
    }
    if (last._is_return) last = last.get_slot('value') as Obj;
    d.p("returned", last.print())
    if(typeof expected !== 'undefined') {
        if(!objsEqual(last,expected)) {
            console.log("not equal")
            console.log(last)
            console.log(expected)
        }
        // assert(objsEqual(last, expected))
    }
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