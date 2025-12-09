import {JoshLogger} from "./util.ts";

import {isNil, NilObj, Obj, ObjectProto} from "./obj.ts";
import {NumObj} from "./number.ts";
import {StrObj} from "./string.ts";
import {objsEqual} from "./debug.ts";
import {parse} from "./parser3.ts";
import {AstToSource, AstToString} from "./ast2.ts"
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
import assert from "node:assert";
import {DictObj, ListObj} from "./arrays.ts";

const d = new JoshLogger()
d.disable()

export function eval_block_obj(clause: Obj, args:Array<Obj>) {
    if (clause.name !== 'Block') {
        return clause
    }
    let meth = clause.get_js_slot('value') as Function
    return meth(clause,args)
}

function perform_call(rec: Obj, call: UnaryCall | BinaryCall | KeywordCall, scope: Obj):Obj {
    d.p("doing call",call.type)
    if(call.type === 'unary-call') {
        d.p(`method name '${call.message.name}' `)
        let method = rec.lookup_slot(call.message.name)
        // console.log('method is',method)
        if (isNil(method)) {
            throw new Error(`method is nil! could not find '${call.message.name}'`)
        }
        if (method instanceof Function) {
            return method(rec,[])
        }
        if (method.is_kind_of("NativeMethod")) {
            return (method.get_js_slot('jsvalue') as Function)(rec,[])
        }
        if (method.name === 'Block') {
            method.parent = rec
            let meth = method.get_js_slot('value') as Function
            // console.log("looked up method is",meth)
            if (meth instanceof Function) {
                return meth(method,[])
            }
        }
        if (method instanceof Obj) {
            return method
        }
    }
    if(call.type === 'binary-call') {
        d.p("receiver is",rec)
        d.p('operator name:',call.operator.name)
        let method = rec.lookup_slot(call.operator.name)
        if (isNil(method)) {
            throw new Error(`could not find method '${call.operator.name}' on ${rec.print()}'`)
        }
        d.p('actual method is',method)
        let arg = eval_ast(call.argument,scope)
        d.p("arg is",arg)
        if (method instanceof Function) {
            return method(rec,[arg])
        }
        if (method.is_kind_of("NativeMethod")) {
            return (method.get_js_slot('jsvalue') as Function)(rec,[arg])
        }
    }
    if(call.type === 'keyword-call') {
        d.p('KEYWORD CALL')
        d.p("receiver:",rec.print())
        let method_name = call.args.map(arg => {
            return arg.name.name
        }).join("")
        d.p('method name:',method_name)
        let method = rec.lookup_slot(method_name)
        if (isNil(method)) {
            throw new Error(`method is nil! could not find '${method_name}'`)
        }
        let args = call.args.map(arg => eval_ast(arg.value,scope))
        // console.log('method is',method)
        // console.log('args are',args)
        // console.log("invoking")
        if (method instanceof Function) {
            return method(rec,args)
        }
        if (method.is_kind_of("NativeMethod")) {
            return (method.get_js_slot('jsvalue') as Function)(rec,args)
        }
        if (method.name === 'Block') {
            method.parent = rec
            let meth = method.get_js_slot('value') as Function
            // console.log("looked up method is",meth)
            if (meth instanceof Function) {
                return meth(method,args)
            }
        }
    }

    throw new Error("method call not performed properly.")
}

export function eval_ast(ast:Ast2, scope:Obj):Obj {
    // d.p(`eval: '${ast.type}' `)
    if (ast.type === 'number-literal') return NumObj((ast as NumberLiteral).value)
    if (ast.type === "string-literal") return StrObj((ast as StringLiteral).value)
    if (ast.type === 'plain-identifier') return scope.lookup_slot(ast.name)
    if (ast.type === 'assignment') {
        d.p("doing assignment",AstToString(ast))
        d.indent()
        // let target = eval_ast(ast.target,scope)
        let target = StrObj(ast.target.name)
        d.p('target is',target.print())
        let ret = eval_ast(ast.value,scope)
        d.p("value resolved to ", ret.print())
        scope._make_method_slot(ast.target.name,ret)
        d.outdent()
        return ret
    }
    if (ast.type === 'return') {
        d.p("doing return of content:", AstToString(ast.value))
        let value = eval_ast(ast.value,scope)
        d.p("returned value", value.print())
        let ret = new Obj('non-local-return',scope.parent,{})
        ret._is_return = true
        ret._make_method_slot('value',value)
        ret._make_method_slot('target',scope.parent as Obj)
        return ret
    }
    if (ast.type === 'group') {
        d.p("doing group:",AstToString(ast))
        let group = ast as Group
        let objs = group.body.map(a => eval_ast(a,scope))
        return objs[objs.length-1]
    }
    if (ast.type === 'statement') {
        d.p("statement is", AstToString(ast))
        d.indent()
        let stmt = ast as Statement;
        let ret = eval_ast(stmt.value, scope)
        d.p("statement returned ", ret.print())
        d.outdent()
        return ret
    }
    if (ast.type === 'block-literal') {
        d.p("making block literal " + AstToString(ast))
        let blk = ast as BlockLiteral
        let blk2 = BlockProto.clone()
        blk2.name = 'Block'
        blk2._make_js_slot('args',blk.parameters);
        blk2._make_js_slot('body',blk.body);
        blk2.parent = scope;
        return blk2
    }
    if (ast.type === 'list-literal') {
        let vals = ast.body.map(v => eval_ast(v,scope))
        return ListObj(...vals)
    }
    if (ast.type === 'map-literal') {
        let obj:Record<string, Obj> = {}
        ast.body.forEach(pair => {
            obj[pair.name.name] = eval_ast(pair.value,scope)
        })
        return DictObj(obj)
    }
    if (ast.type === 'message-call') {
        let msg = ast as MessageCall
        // console.log('message call', msg)
        // console.log("receiver is",msg.receiver)
        let rec = eval_ast(msg.receiver,scope)
        // console.log("receiver evaluated to",rec.print())
        if (rec.name === 'SymbolReference') {
            rec = scope.lookup_slot(rec._get_js_string())
            // console.log("looked up value of the symbol")
        }

        d.indent()
        let ret = perform_call(rec,msg.call,scope)
        d.outdent()
        return ret
    }
    throw new Error(`unknown ast type '${ast.type}'`)
}


const SymRef = (value:string):Obj => new Obj("SymbolReference",ObjectProto,{'jsvalue':value})
let BLOCK_COUNT = 0
const BlockProto = new Obj("BlockProto",ObjectProto,{
    'print':(rec:Obj)=> {
        let body = rec.get_js_slot('body') as Array<Statement>
        return StrObj(body.map(st => AstToSource(st)).join('\n'))
    },
    'value':(rec:Obj,args:Array<Obj>) => {
        d.p("inside of the block")
        let params:Array<PlainId> = rec.get_slot('args') as unknown as Array<PlainId>
        let body = rec.get_js_slot('body') as Array<Statement>
        if(!Array.isArray(body)) throw new Error("block body isn't an array")
        let scope = new Obj(`block-activation-${++BLOCK_COUNT}`,rec,{})
        let old_lookup = scope.lookup_slot
        scope.lookup_slot = function(name:string):Obj {
            if(name === 'self') {
                return this.parent.parent
            }
            return old_lookup.call(scope,name)
        }
        if(params.length !== args.length) {
            console.warn("parameters and args for block are different lengths")
            console.log(rec.print())
            throw new Error(`block requires ${params.length} arguments\n ${rec.print()}`)
        }
        d.p("params", params)
        for(let i=0; i<params.length; i++) {
            d.p("param", params[i], args[i])
            scope._make_method_slot(params[i].name,args[i])
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
    d.p('=========')
    d.p(`code is '${code}'`)
    let body = parse(code,'Statement');
    d.p('ast is',body)
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
            console.log(last.print())
            console.log(expected.print())
        }
        assert(objsEqual(last, expected))
    }
}

export function sval(code:string, scope:Obj, expected?:Obj) {
    d.p('=========')
    d.p(`code is '${code}'`)
    let body = parse(code,'Statement');
    d.p('ast is',AstToString(body));
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
            console.log(last.print())
            console.log(expected.print())
        }
        assert(objsEqual(last, expected))
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