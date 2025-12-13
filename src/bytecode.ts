import {JS_VALUE, NilObj, Obj, ObjectProto} from "./obj.ts";
import type {Ast, BlockLiteral} from "./ast.ts";
import {JoshLogger} from "./util.ts";
import {NumObj} from "./number.ts";
import {StrObj} from "./string.ts";
import {BlockProto} from "./block.ts";

type OpType = 'lookup-message'
    | 'send-message'
    | 'return-value'
    | 'load-literal-number'
    | 'load-plain-id'
    | 'load-literal-string'
    | 'create-literal-block'
    | 'assign'
    | 'return'
type ByteOp = [OpType, unknown]
export type ByteCode = Array<ByteOp>;

let d = new JoshLogger()
d.disable()

function execute_op(op: ByteOp, stack: Obj[], scope: Obj): Obj {
    let name = op[0]
    if (name === 'load-literal-number') {
        stack.push(NumObj(op[1] as number))
        return NilObj()
    }
    if (name === 'load-literal-string') {
        stack.push(StrObj(op[1] as string))
        return NilObj()
    }
    if (name === 'create-literal-block') {
        let blk = op[1] as BlockLiteral
        let blk2 = BlockProto.clone()
        blk2.name = 'Block'
        blk2._make_js_slot('args', blk.parameters);
        blk2._make_js_slot('body', blk.body);
        blk2._make_js_slot('bytecode', blk.body.map(a => compile_bytecode(a)).flat())
        blk2.parent = scope;
        stack.push(blk2)
        return NilObj()
    }
    if (name === 'load-plain-id') {
        stack.push(scope.lookup_slot(op[1] as string))
        return NilObj()
    }
    if (name === 'lookup-message') {
        let message = op[1] as string
        let rec: Obj = stack.pop() as Obj
        let method = rec.lookup_slot(message)
        if(typeof method == 'function') {
            d.p(`error. method '${message}' on ${rec.print()} is unwrapped JS function`)
        }
        if (method.isNil()) {
            d.p("couldn't find the message")
            return new Obj("Exception", ObjectProto, {"message": `Message not found: '${message}'`})
        }
        stack.push(rec)
        stack.push(method)
        return NilObj()
    }
    if (name === 'send-message') {
        let arg_count = op[1] as number
        let args = []
        for (let i = 0; i < arg_count; i++) {
            args.push(stack.pop())
        }
        args.reverse()
        let method = stack.pop() as Obj
        let rec = stack.pop() as Obj
        if (method.is_kind_of("NativeMethod")) {
            let ret = (method.get_js_slot(JS_VALUE) as Function)(rec, args)
            stack.push(ret)
            return NilObj()
        }
        if (method.name === 'Block') {
            method.parent = rec
            let meth = method.get_js_slot('value') as unknown
            if (meth instanceof Obj && meth.is_kind_of("NativeMethod")) {
                let ret = (meth.get_js_slot(JS_VALUE) as Function)(method, args)
                stack.push(ret)
                return NilObj()
            }
            if (meth instanceof Function) {
                let ret = meth(method, args)
                stack.push(ret)
                return NilObj()
            }
        }
        d.error(op)
        d.error("method is", method)
        d.p("is native method?", method.is_kind_of('NativeMethod'))
        d.p("is block method?", method.is_kind_of('Block'))
        throw new Error("shouldn't be here")
    }
    if (name === 'assign') {
        let value = stack.pop() as Obj
        let name = stack.pop() as Obj
        scope._make_method_slot(name._get_js_string(), value)
        return NilObj()
    }
    if (name === 'return') {
        let value = stack.pop() as Obj
        let ret = new Obj('non-local-return',scope.parent,{})
        ret._is_return = true
        ret._make_method_slot('value',value)
        ret._make_method_slot('target',scope.parent as Obj)
        return ret
    }
    throw new Error(`unknown bytecode operation '${name}'`)
}

export function execute_bytecode(code: ByteCode, scope: Obj): Obj {
    let stack: Array<Obj> = []
    d.p("executing")
    d.indent()
    for (let op of code) {
        d.red(`Op: ${op[0]} ${op[1]}`)
        let ret = execute_op(op, stack, scope)
        d.green(`Stack (${stack.length}) : ` + stack.map(v => v.print()).join(", "))
        if (ret.is_kind_of("Exception")) {
            d.error("returning exception")
            d.outdent()
            return ret
        }
    }
    d.outdent()
    if (stack.length > 0) {
        let last = stack.pop() as Obj
        if (last && last._is_return) last = last.get_slot('value') as Obj;
        return last
    } else {
        return NilObj()
    }
}

export function compile_bytecode(ast: Ast): ByteCode {
    d.p("compiling", ast)
    if (Array.isArray(ast)) {
        return ast.map(a => compile_bytecode(a)).flat()
    }
    if (ast.type === 'statement') {
        return compile_bytecode(ast.value)
    }
    if (ast.type === 'group') {
        return ast.body.map(v => compile_bytecode(v)).flat() as ByteCode
    }
    if (ast.type === 'assignment') {
        return [
            [['load-literal-string', ast.target.name]],
            compile_bytecode(ast.value),
            [['assign', null]]
        ].flat() as ByteCode
    }
    if (ast.type === 'message-call') {
        return [
            compile_bytecode(ast.receiver),
            compile_bytecode(ast.call),
            // [['return-value',null]]
        ].flat() as ByteCode
    }
    if (ast.type === 'keyword-call') {
        let message_name = ast.args.map(arg => arg.name.name).join("")
        d.p("keyword message is " + message_name)
        let args = ast.args.map(arg => compile_bytecode(arg.value))
        return [
            [['lookup-message', message_name]],
            args.flat(),
            [['send-message', args.length]],
        ].flat() as ByteCode
    }
    if (ast.type === 'binary-call') {
        return [
            [['lookup-message', ast.operator.name]],
            compile_bytecode(ast.argument),
            [['send-message', 1]],
        ].flat() as ByteCode
    }
    if (ast.type === 'unary-call') {
        return [
            [['lookup-message', ast.message.name]],
            [['send-message', 0]],
        ].flat() as ByteCode
    }
    if (ast.type === 'number-literal') {
        return [['load-literal-number', ast.value]]
    }
    if (ast.type === 'block-literal') {
        return [['create-literal-block', ast]]
    }
    if (ast.type === 'string-literal') {
        return [['load-literal-string', ast.value]]
    }
    if (ast.type === 'plain-identifier') {
        return [['load-plain-id', ast.name]]
    }
    if (ast.type === 'return') {
        return [
            compile_bytecode(ast.value),
            [['return', null]]
        ].flat() as ByteCode
    }
    throw new Error(`unknown ast type ${ast.type}`)
}