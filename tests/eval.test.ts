import test from "node:test";
import {eval_ast, sval} from "../src/eval.ts";
import {make_standard_scope} from "../src/standard.ts";
import {NilObj, Obj, ObjectProto} from "../src/obj.ts";
import {NumObj} from "../src/number.ts";
import {parse} from "../src/parser.ts";
import {type Ast, type Statement} from "../src/ast.ts";
import {objsEqual} from "../src/debug.ts";
import assert from "node:assert";
import {JoshLogger} from "../src/util.ts";
import {compile, execute} from "./bytecode.test.ts";

const d = new JoshLogger()
d.disable()
export function mval(code:string, scope:Obj, expected?:Obj) {
    d.p('=========')
    d.p(`code is '${code}'`)
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
    if(typeof expected !== 'undefined') {
        if(!objsEqual(last,expected)) {
            console.log("not equal")
            console.log(last.print())
            console.log(expected.print())
        }
        assert(objsEqual(last, expected))
    }
}

function evalTreeWalk(body:Ast, scope:Obj):Obj {
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
    return last
}
export function cval(source:string, scope:Obj, expected:Obj) {
    d.p('=========')
    d.p(`code is '${source}'`)
    let body = parse(source,'BlockBody');
    d.p('ast is',body)
    let ret_twalk = evalTreeWalk(body,scope)
    d.p("tree walk returned",ret_twalk.print())
    let bytecode = compile(parse(source,'BlockBody'))
    let ret_stack  =  execute(bytecode,scope)

    d.p("stack returned",ret_stack.print())
    if(!objsEqual(ret_twalk, ret_stack)) {
        console.log("not equal")
        console.log(ret_twalk.print())
        console.log(ret_stack.print())
        throw new Error(`${ret_twalk.print()} !== ${ret_stack.print()}`)
    }
}
test("compare basic values", () => {
    let scope:Obj = make_standard_scope();
    cval('6',scope, NumObj(5))
    cval('5 + 5',scope, NumObj(10))
    cval(` self .`,scope,scope)
    cval(' 5 value .',scope,NumObj(5))
})
test('scope tests',() => {
    let scope:Obj = make_standard_scope();
    // evaluates a number literal
    cval(` 5 .`,scope,NumObj(5))
    // self is the scope itself
    cval(` self .`,scope,scope)
    // the value message on a literal returns itself
    cval(' 5 value .',scope,NumObj(5))
    // block evaluates to the last statement
    cval('[ 5 . ] value .',scope, NumObj(5))
    // scope inside block can accept makeSlot. then looks up the v slot.
    cval(`[ self makeSlot: 'v' with: 5. self getSlot: "v". ] value .`,scope, NumObj(5))
    cval(`[ self make_data_slot: "v" with: 5. self v. ] value .`,scope, NumObj(5))
    // cval(`[ self make_data_slot: "v" with: 5. v ] value .`,scope, NumObj(5))

    // group evaluates to the last expression in the group.
    cval('8 + 8.',scope,NumObj(16))
    cval('(8 + 8).',scope,NumObj(16))
    cval('8 clone.',scope,NumObj(8))
    cval('Object clone.', scope, ObjectProto.clone())
    cval('[ Object clone. ] value .', scope, ObjectProto.clone())

    cval(`[ 67. ] value.`,scope,NumObj(67))
    cval(`[ x:=67. x ] value.`,scope,NumObj(67))
    // make an object with one slot
    mval(`
        self makeSlot: "v" with: (Object clone).
        v make_data_slot: "w" with: 5.
        v w.
    `,scope,NumObj(5))
    // cval(`[
    //     self makeSlot: "v" with: (Object clone).
    //     v make_data_slot: "w" with: [ 5. ].
    //     v w.
    // ] value.`,scope,NumObj(5))

    mval(`
        self makeSlot: "v" with: 5.
        [
          v.
        ] value.
    `,scope,NumObj(5))

    // cval(`[
    //     self makeSlot: "x" with: 5.
    //     self makeSlot: "w"  with: [ self x. ].
    //     self w.
    // ] value .`,scope,NumObj(5))
})
test('nil',() => {
    let scope:Obj = make_standard_scope();
    cval(`nil .`,scope, NilObj())
})
test('conditions',() => {
    let scope = make_standard_scope()
    cval(` 4 < 5 ifTrue: 88.`,scope,NumObj(88))
    cval(` 4 > 5 ifTrue: 88.`,scope,NilObj())
    cval(` 4 < 5 ifFalse: 88.`,scope,NilObj())
    cval(` 4 > 5 ifFalse: 88.`,scope,NumObj(88))

    cval(` 4 < 5 ifTrue: 88 ifFalse: 89.`,scope,NumObj(88))
    cval(` 4 > 5 ifTrue: 88 ifFalse: 89.`,scope,NumObj(89))
    cval(` 4 < 5 ifTrue: 44 + 44 ifFalse: 89.`,scope,NumObj(88))
    cval(` 4 < 5 ifTrue: 44 - 44 ifFalse: 89.`,scope,NumObj(0))

    cval(` 4 < 5 ifTrue: [88.] ifFalse: [89.].`,scope,NumObj(88))
    cval(` 4 > 5 ifTrue: [88.] ifFalse: [89.].`,scope,NumObj(89))
})
test('Debug tests',() => {
    let scope = make_standard_scope()
    cval(`Debug equals: 0 with: 0.`,scope,NilObj())
})
test("block arg tests",() => {
    let scope = make_standard_scope()
    mval(`
        self makeSlot: "foo" with: [
            88.
        ].
        self foo.
     `,scope,NumObj(88))
    mval(`
        self makeSlot: "foo:" with: [ v |
            88.
        ].
        self foo: 1.
    `,scope,NumObj(88))
    mval(`
        self makeSlot: "foo:" with: [ v |
            88 + v.
        ].
        self foo: 1.
    `,scope,NumObj(89))
    // cval(`[
    //     self makeSlot: "foo" with: (Object clone).
    //     foo makeSlot: "bar" with: 88.
    //     Debug equals: (foo bar) with: 88.
    //     foo makeSlot: "get_bar" with: [
    //         self bar.
    //     ].
    //     Debug equals: (foo get_bar) with: 88.
    //     foo makeSlot: "get_bar_better" with: [
    //         bar.
    //     ].
    //     Debug equals: (foo get_bar_better) with: 88.
    // ] value.`,scope, NilObj())
})
test("global scope tests",() => {
    let scope = make_standard_scope()
    // cval(`[
    //     Global makeSlot: "foo" with: (Object clone).
    //     foo makeSlot: "x" with: 5.
    //     foo makeSlot: "bar" with: [
    //         self makeSlot: "blah" with: (foo clone).
    //         blah x.
    //     ].
    //     foo bar.
    // ] value .`,scope,NumObj(5))

    // cval(`[
    //     Global makeSlot: "Foo" with: (Object clone).
    //     Foo makeSlot: "make" with: [
    //         self makeSlot: "blah" with: (Foo clone).
    //         blah makeSlot: "name" with: "Foo".
    //         blah.
    //     ].
    //     Foo makeSlot: "bar" with: [
    //         self makeSlot: "blah" with: (self make).
    //         blah name.
    //     ].
    //     Foo bar.
    // ] value .`,scope,StrObj("Foo"))
})
test('assignment operator', () => {
    let scope = make_standard_scope()
    cval(`
        v := 5.
        v.
    `,scope,NumObj(5))
    cval(`
        v := 5.
        v := 6.
        v.
    `,scope,NumObj(6))
    // sval(`[
    //     T := (Object clone).
    //     T make_data_slot: "v" with: 44.
    //     T makeSlot: "gv" with: [
    //         self v.
    //     ].
    //     T makeSlot: "sv:" with: [ vv |
    //         v := vv.
    //     ].
    //     T sv: 88.
    //     T gv.
    // ] value.`,scope,NumObj(88))
})
test('fib recursion',() => {
    let scope = make_standard_scope()
    mval(`
        Global makeSlot: "Math" with: (Object clone).
        Math setObjectName: "Math".
        Math makeSlot: "fib:" with: [n|
            n == 0 ifTrue: [ ^ 0. ].
            n == 1 ifTrue: [ ^ 1. ].
            (Math fib:  n - 2  ) + (Math fib: n - 1 ).
        ].
        Math fib: 6.
     `,scope,NumObj(8))
})
test('simple return', () => {
    let scope = make_standard_scope();
    cval(`[ ^ 67.] value.`,scope,NumObj(67))
})
test('non local return', () => {
    let scope = make_standard_scope();
    cval(`[ 
        T := Object clone.
        T makeSlot: "nl" with: [ 
           4 > 5 cond: [ ^ 1. ] with: [ ^ 2. ].
        ].
        T nl. 
    ] value.`,scope,NumObj(2))
})
test('non local return 2', () => {
    let scope = make_standard_scope();
    cval(`[ ^ 4 + 5. ] value.`,scope,NumObj(9))
})
test('eval vector class',() => {
    let scope = make_standard_scope()
    cval(`[
        Global makeSlot: "Vector" with: Object clone.
        Vector setObjectName: "Vector".
        Vector make_data_slot: "x" with: 0.
        Vector make_data_slot: "y" with: 0.
        Vector make_data_slot: "z" with: 0.
        Vector makeSlot: "x:y:z:" with: [ xx yy zz |
            v := Vector clone.
            v x: xx.
            v y: yy.
            v z: zz.
            v.
        ].
        Vector makeSlot: "add:" with: [a |
            Vector x: (a x + self x)
                   y: (a y + self y)
                   z: (a z + self z).
        ].
        a := Vector x: 1 y: 1 z: 1.
        
        a x: 55.
        Debug equals: a x with: 55.
        
        b := Vector x: 6 y: 7 z: 8.
        c := a add: b.
        c z.
    ] value.`,scope,NumObj(9))
})
test('fizzbuzz',() => {
    let scope = make_standard_scope()
    // mod: isn't being looked up correctly in n inside the block.
    cval(`
    [
    1 range: 100 do: [ n |
        three := (n mod: 3) == 0.
        five := (n mod: 5) == 0.
        (three and: five) ifTrue: [ 
            ^ ("FizzBuzz" print).  
        ].
        three ifTrue: [ "Fizz" print. ].
        five ifTrue: [ "Buzz" print. ].
    ].
    88. 
    ] value .`,scope,NumObj(88))
})
test('loops',() => {
})