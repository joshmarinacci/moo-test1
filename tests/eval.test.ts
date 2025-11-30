import test from "node:test";
import {cval} from "../src/eval.ts";
import {make_standard_scope} from "../src/standard.ts";
import {NilObj, Obj, ObjectProto} from "../src/obj.ts";
import {NumObj} from "../src/number.ts";
import {StrObj} from "../src/string.ts";


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
    cval(`[ self makeSlot 'v' 5. self getSlot "v". ] value .`,scope, NumObj(5))
    cval(`[ self makeSlot "v" 5. self v. ] value .`,scope, NumObj(5))
    cval(`[ self makeSlot "v" 5. v ] value .`,scope, NumObj(5))

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
    let scope:Obj = make_standard_scope();
    cval(`nil .`,scope, NilObj())
})
test('conditions',() => {
    let scope = make_standard_scope()
    cval(` (4 < 5) ifTrue: 88.`,scope,NumObj(88))
    cval(` (4 > 5) ifTrue: 88.`,scope,NilObj())
    cval(` (4 < 5) ifFalse: 88.`,scope,NilObj())
    cval(` (4 > 5) ifFalse: 88.`,scope,NumObj(88))

    cval(` (4 < 5) cond: 88 89.`,scope,NumObj(88))
    cval(` (4 > 5) cond: 88 89.`,scope,NumObj(89))
    cval(` (4 < 5) cond: (44 + 44) 89.`,scope,NumObj(88))
    cval(` (4 < 5) cond: (44 - 44) 89.`,scope,NumObj(0))

    cval(` (4 < 5) cond: [88.] [89.].`,scope,NumObj(88))
    cval(` (4 > 5) cond: [88.] [89.].`,scope,NumObj(89))
})
test('Debug tests',() => {
    let scope = make_standard_scope()
    // cval(`Debug print 0.`,scope,NilObj())
    cval(`Debug equals: 0 0.`,scope,NilObj())
    // cval(`Debug print 0 0.`,scope,NilObj())
})
test("block arg tests",() => {
    let scope = make_standard_scope()
    cval(`
        self makeSlot "foo" [
            88.
        ]. 
        self foo.
     `,scope,NumObj(88))
    cval(`
        self makeSlot "foo" [ v |
            88.
        ].
        self foo 1.
        `,scope,NumObj(88))
    cval(`[
        self makeSlot "foo" [ v |
            88 + v.
        ].
        self foo 1.
     ] value .`,scope,NumObj(89))

    cval(`
        self makeSlot "foo" (Object clone).
        foo makeSlot "bar" 88.
        Debug equals: (foo bar) 88.
        foo makeSlot "get_bar" [
            self bar.
        ].
        Debug equals: (foo get_bar) 88.
        foo makeSlot "get_bar_better" [
            bar.
        ].
        Debug equals: (foo get_bar_better) 88.
    `,scope, NilObj())
})
test("global scope tests",() => {
    let scope = make_standard_scope()
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
    let scope = make_standard_scope()
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
    let scope = make_standard_scope()
    cval(`[
        Math ::= Object clone.
        Math makeSlot "fib" [n|
            (n == 0) ifTrue: [ ^ 0. ].
            (n == 1) ifTrue: [ ^ 1. ].
            (Math fib ( n - 2 ) ) + (Math fib (n - 1 ) ).
        ].
        Math fib 6.
     ] value . `,scope,NumObj(8))
})
test('non local return', () => {
    let scope = make_standard_scope();
    cval(`[ 
        T ::= (Object clone).
        T makeSlot "nl" [ 
          ( 4 > 5 ) cond: [ ^ 1. ] [ ^ 2. ].
        ].
        T nl. 
    ] value.`,scope,NumObj(2))
})
test('non local return 2', () => {
    let scope = make_standard_scope();
    cval(`[
        return 4 + 5.
    ] value.`,scope,NumObj(9))
})
test('non local return 3', () => {
    let scope = make_standard_scope();
    cval(`[
        ^ 4 + 5.
    ] value.`,scope,NumObj(9))
})
test('eval vector class',() => {
    let scope = make_standard_scope()
    cval(`[
        Global makeSlot "Vector" (ObjectBase clone).
        Vector setObjectName "Vector".
        Vector makeSlot "x" 0.
        Vector makeSlot "y" 0.
        Vector makeSlot "z" 0.
        Vector makeSlot "x:" [xx |
            self setSlot "x" xx.
        ].
        Vector makeSlot "make" [ xx yy zz |
            self makeSlot "v" (Vector clone).
            v setSlot "x" xx.
            v setSlot "y" yy.
            v setSlot "z" zz.
            v.
        ].
        Vector makeSlot "add" [a |
          Vector make 
                ((a x) + (self x))
                ((a y) + (self y))
                ((a z) + (self z)).
        ].
        a ::= (Vector make 1 1 1).
        
        // check the setter
        a x: 55.
        Debug equals: (a x) 55.
        
        b ::= (Vector make 6 7 8).
        c ::= (a add b).
        c z.
    ] value.`,scope,NumObj(9))
})
test('fizzbuzz',() => {
    let scope = make_standard_scope()
    cval(`
    [
    1 range: 100 [ n |
        three ::= ((n mod: 3) == 0).
        five ::= ((n mod: 5) == 0).
        (three and: five) ifTrue: [ 
            return ("FizzBuzz" print).  
        ].
        three ifTrue: [ "Fizz" print. ].
        five ifTrue: [ "Buzz" print. ].
    ].
    88. 
    ] value .`,scope,NumObj(88))
})
test('loops',() => {

})