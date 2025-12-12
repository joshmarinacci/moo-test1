import test from "node:test";
import {JS_VALUE, NilObj, Obj, ObjectProto} from "../src/obj.ts";
import {NumObj} from "../src/number.ts";
import {objsEqual} from "../src/debug.ts";
import {JoshLogger} from "../src/util.ts";
import {make_standard_scope} from "../src/standard.ts";
import {parse} from "../src/parser.ts";
import {type Ast, type BlockLiteral} from "../src/ast.ts";
import {StrObj} from "../src/string.ts";
import {BlockProto} from "../src/block.ts";

type OpType = 'lookup-message'
            | 'send-message'
            | 'return-value'
            | 'load-literal-number'
            | 'load-plain-id'
            | 'load-literal-string'
            | 'create-literal-block'
            | 'assign'
type ByteOp = [OpType,unknown]
type ByteCode = Array<ByteOp>;

function execute_op(op: ByteOp, stack: Obj[], scope: Obj):Obj {
    let name = op[0]
    if(name === 'load-literal-number') {
        stack.push(NumObj(op[1] as number))
        return NilObj()
    }
    if(name === 'load-literal-string') {
        stack.push(StrObj(op[1] as string))
        return NilObj()
    }
    if(name === 'create-literal-block') {
        let blk = op[1] as BlockLiteral
        let blk2 = BlockProto.clone()
        blk2.name = 'Block'
        blk2._make_js_slot('args',blk.parameters);
        blk2._make_js_slot('body',blk.body);
        blk2.parent = scope;
        stack.push(blk2)
        return NilObj()
    }
    if(name === 'load-plain-id') {
        stack.push(scope.lookup_slot(op[1] as string))
        return NilObj()
    }
    if(name === 'lookup-message') {
        let message = op[1] as string
        let rec:Obj = stack.pop() as Obj
        let method = rec.lookup_slot(message)
        // console.log("method is",method.print())
        if(method.isNil()) {
            console.log("couldn't find the message")
            return new Obj("Exception",ObjectProto,{"message":`Message not found: '${message}'`})
        }
        stack.push(rec)
        stack.push(method)
        return NilObj()
    }
    if(name === 'send-message') {
        let arg_count = op[1] as number
        let args = []
        for(let i=0; i<arg_count; i++) {
            args.push(stack.pop())
        }
        args.reverse()
        let method = stack.pop() as Obj
        let rec = stack.pop() as Obj
        // console.log("method is", method.print())
        // console.log("receiver is", rec.print())
        // console.log("args are", args.map(a => a.print()))
        if (method.is_kind_of("NativeMethod")) {
            let ret = (method.get_js_slot(JS_VALUE) as Function)(rec,args)
            stack.push(ret)
            return NilObj()
        }
        if (method.name === 'Block') {
            method.parent = rec
            let meth = method.get_js_slot('value') as Function
            if (meth instanceof Function) {
                let ret = meth(method,args)
                stack.push(ret)
                return NilObj()
            }
        }
    }
    if(name === 'assign') {
        let value = stack.pop() as Obj
        let name = stack.pop() as Obj
        scope._make_method_slot(name._get_js_string(),value)
        return NilObj()
    }
    throw new Error(`unknown bytecode operation '${name}'`)
}

let d = new JoshLogger()
export function execute(code: ByteCode, scope: Obj):Obj {
    let stack:Array<Obj> = []
    d.p("executing")
    d.indent()
    for(let op of code) {
        d.red(`Op: ${op[0]} ${op[1]}`)
        let ret = execute_op(op,stack,scope)
        d.green(`Stack (${stack.length}) : ` + stack.map(v => v.print()).join(", "))
        if (ret.is_kind_of("Exception")) {
            console.log("returning exception")
            d.outdent()
            return ret
        }
    }
    d.outdent()
    if(stack.length > 0) {
        return stack.pop() as Obj
    } else {
        return NilObj()
    }
}

function compare_execute(code:ByteCode, expected: Obj) {
    d.p("executing",code)
    let scope:Obj = make_standard_scope();
    let ret = execute(code,scope)
    if(ret.is_kind_of("Exception")) {
        d.red(ret.print())
    }
    if(!objsEqual(ret, expected)) {
        console.log("not equal")
        console.log(ret.print())
        console.log(expected.print())
        throw new Error(`${ret.print()} !== ${expected.print()}`)
    } else {
        console.log('same',ret.print())
    }
}

export function compile(ast: Ast):ByteCode {
    // d.p("compiling",ast)
    if(Array.isArray(ast)) {
        return ast.map(a => compile(a)).flat()
    }
    if(ast.type === 'statement') {
        return compile(ast.value)
    }
    if(ast.type === 'assignment') {
        return [
            [['load-literal-string',ast.target.name]],
            compile(ast.value),
            [['assign',null]]
        ].flat() as ByteCode
    }
    if(ast.type === 'message-call') {
        return [
            compile(ast.receiver),
            compile(ast.call),
            // [['return-value',null]]
        ].flat() as ByteCode
    }
    if(ast.type === 'keyword-call') {
        let message_name = ast.args.map(arg => arg.name.name).join("")
        d.p("keyword message is " + message_name)
        let args = ast.args.map(arg => compile(arg.value))
        return [
            [['lookup-message',message_name]],
            args.flat(),
            [['send-message',args.length]],
        ].flat() as ByteCode
    }
    if(ast.type === 'binary-call') {
        return [
            [['lookup-message',ast.operator.name]],
            compile(ast.argument),
            [['send-message',1]],
        ].flat() as ByteCode
    }
    if(ast.type === 'unary-call') {
        return [
            [['lookup-message',ast.message.name]],
            [['send-message',0]],
        ].flat() as ByteCode
    }
    if(ast.type === 'number-literal') {
        return [['load-literal-number',ast.value]]
    }
    if(ast.type === 'block-literal') {
        return [['create-literal-block',ast]]
    }
    if(ast.type === 'string-literal') {
        return [['load-literal-string',ast.value]]
    }
    if(ast.type === 'plain-identifier') {
        return [['load-plain-id',ast.name]]
    }
    throw new Error(`unknown ast type ${ast.type}`)
}

function cce(source:string,ans:Obj) {
    d.red(source)
    compare_execute(compile(parse(source,'Exp')),ans)
}
function ccem(source:string,ans:Obj) {
    d.red(source)
    compare_execute(compile(parse(source,'BlockBody')),ans)
}
test("1 + 2 = 3",() => {
    // 1 + 2 returns 3
    compare_execute([
        // put a literal on the stack
        //LoadLiteralNumber(2),
        ['load-literal-number',2],
        // put a literal on the stack
        //LoadLiteralNumber(1),
        ['load-literal-number',1],
        // lookup message from target on the stack
        //LookupMessage('+'),
        ['lookup-message','+'],
        // invoke message on the stack with target and one argument from the stack
        // puts result on the stack
        //SendMessage(1),
        ['send-message',1],
        // return whatever is left on the stack
        //ReturnValue(),
        ['return-value',null]
    ],NumObj(3))
})
test('5 square',() => {
    compare_execute([
        ['load-literal-number',5],
        ['lookup-message','square'],
        ['send-message',0],
        // ['return-value',null]
    ], NumObj(25))
})
test('compile & execute: 1 + 2 = 3',() =>{
    cce('1 + 2', NumObj(3))
    cce('5 square', NumObj(25))
})
test('conditional',() => {
    cce(` 4 < 5 ifTrue: 88`,NumObj(88))
    cce(` 4 > 5 ifTrue: 88`,NilObj())
})
test('assignment operator', () => {
    ccem(`
        v := 5.
        v.
    `, NumObj(5))
})
test("block arg tests",() => {
    ccem(`
        self makeSlot: "foo" with: [
            88.
        ].
        self foo.
     `, NumObj(88))
})
