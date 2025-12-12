import {JoshLogger} from "./util.ts";

import {JS_VALUE, NilObj, Obj} from "./obj.ts";
import {NumObj} from "./number.ts";
import {StrObj} from "./string.ts";
import {objsEqual} from "./debug.ts";
import {parse} from "./parser.ts";
import type {
    Ast,
    BinaryCall,
    BlockLiteral,
    KeywordCall,
    NumberLiteral,
    Statement,
    StringLiteral,
    UnaryCall
} from "./ast.ts";
import {AstToString} from "./ast.ts"
import assert from "node:assert";
import {DictObj, ListObj} from "./arrays.ts";
import {BlockProto} from "./block.ts";

const d = new JoshLogger()
d.disable()

export function eval_block_obj(method: Obj, args:Array<Obj>) {
    if (method.name !== 'Block') return method
    let meth = method.get_js_slot('value') as unknown
    if (meth instanceof Obj && meth.is_kind_of("NativeMethod")) {
        return (meth.get_js_slot(JS_VALUE) as Function)(method,args)
    }
    if (typeof meth === 'function') {
        return meth(method, args)
    }
    throw new Error("bad failure on evaluating block object")
}

function really_perform_call(name:string, rec:Obj, method:unknown, args:Array<Obj>):Obj {
    if (method instanceof Obj && method.isNil()) {
        throw new Error(`method is nil! could not find method '${name}' on ${rec.print()}`)
    }
    if (method instanceof Function) {
        return method(rec,args)
    }
    if (method instanceof Obj && method.is_kind_of("NativeMethod")) {
        return (method.get_js_slot(JS_VALUE) as Function)(rec,args)
    }
    if (method instanceof Obj && method.name === 'Block') {
        method.parent = rec
        return eval_block_obj(method,args)
    }
    throw new Error("method call not performed properly.")
}

function perform_call(rec: Obj, call: UnaryCall | BinaryCall | KeywordCall, scope: Obj):Obj {
    if(call.type === 'unary-call') {
        let method = rec.lookup_slot(call.message.name)
        let args:Array<Obj> = []
        return really_perform_call(call.message.name,rec,method,args)
    }
    if(call.type === 'binary-call') {
        let method = rec.lookup_slot(call.operator.name)
        let arg = eval_ast(call.argument,scope)
        return really_perform_call(call.operator.name, rec,method,[arg])
    }
    if(call.type === 'keyword-call') {
        let method_name = call.args.map(arg => arg.name.name).join("")
        let method = rec.lookup_slot(method_name)
        let args = call.args.map(arg => eval_ast(arg.value,scope))
        return really_perform_call(method_name, rec,method,args)
    }

    throw new Error("method call not performed properly.")
}

export function eval_ast(ast:Ast, scope:Obj):Obj {
    if (ast.type === 'number-literal') return NumObj((ast as NumberLiteral).value)
    if (ast.type === "string-literal") return StrObj((ast as StringLiteral).value)
    if (ast.type === 'plain-identifier') return scope.lookup_slot(ast.name)
    if (ast.type === 'group') return ast.body.map(a => eval_ast(a, scope)).at(-1)
    if (ast.type === 'statement') return eval_ast(ast.value, scope)
    if (ast.type === 'assignment') {
        let ret = eval_ast(ast.value,scope)
        scope._make_method_slot(ast.target.name,ret)
        return ret
    }
    if (ast.type === 'return') {
        let value = eval_ast(ast.value,scope)
        let ret = new Obj('non-local-return',scope.parent,{})
        ret._is_return = true
        ret._make_method_slot('value',value)
        ret._make_method_slot('target',scope.parent as Obj)
        return ret
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
    if (ast.type === 'list-literal') return ListObj(...(ast.body.map(v => eval_ast(v, scope))))
    if (ast.type === 'map-literal') {
        let obj:Record<string, Obj> = {}
        ast.body.forEach(pair => {
            obj[pair.name.name] = eval_ast(pair.value,scope)
        })
        return DictObj(obj)
    }
    if (ast.type === 'message-call') return perform_call(eval_ast(ast.receiver, scope), ast.call, scope)
    throw new Error(`unknown ast type '${ast.type}'`)
}

export function eval_statement(code:string, scope:Obj):Obj {
    let body = parse(code,'Statement');
    d.p('ast is',body)
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
    return last
}
export function eval_statements(code:string, scope:Obj):Obj {
    let body = parse(code,'BlockBody') as unknown as Array<Statement>;
    d.p('ast is',body)
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
    return last
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
        last = eval_ast(body as Ast, scope);
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
