import test from "node:test";
import {make_standard_scope} from "../src/standard.ts";
import {DictObj, ListObj} from "../src/arrays.ts";
import {NumObj} from "../src/number.ts";
import {cval} from "./eval.test.ts";

// test('parse array list literals',() => {
//     assert.ok(match("{}",ArrayLiteral))
//     assert.ok(match("{4}",ArrayLiteral))
//     assert.ok(match("{4 5}",ArrayLiteral))
//     assert.ok(match("{ 'a' 'b' }",ArrayLiteral))
// })

// test('parse array dict literals',() => {
//     assert.ok(match("{}",ArrayLiteral))
//     assert.ok(match("{a:5}",ArrayLiteral))
//     assert.ok(match("{ a:5 }",ArrayLiteral))
//     assert.ok(match("{ a:5 b:6 }",ArrayLiteral))
//     assert.ok(match("{ a:'a' b:'b' }",ArrayLiteral))
// })

test('array literals',() => {
    let scope = make_standard_scope()
    cval(`[
        l := { 4 5 }.
        Debug equals: (l at: 0) with: 4.
        Debug equals: (l at: 1) with: 5.
        l size.
     ] value.`, scope, NumObj(2))
    cval(`[
     { 4 5 }.
     ] value.`, scope, ListObj(NumObj(4),NumObj(5)))
})

test('dict literals', () => {
    let scope = make_standard_scope()
    cval(`[
        p := { x:5 }.
        Debug equals: (p get: "x") with: 5.
        p.
    ] value.
    `,scope, DictObj({x:NumObj(5)}))

    cval(`[
        v := { x:5 y: 6 }.
        Debug equals: (v get: "x") with: 5.
        Debug equals: (v get: "y") with: 6.
        v.
    ] value.
    `,scope, DictObj({x:NumObj(5)}))
})

test('list api', () => {
    let scope = make_standard_scope()
    cval(`[
        l := (List clone).
        Debug equals: (l size) with: 0.

        l add: 1.
        Debug equals: (l size) with: 1.
        Debug equals: (l at: 0) with: 1.

        l add: 3.
        Debug equals: (l size) with: 2.
        
        l at: 1 set: 8.
        Debug equals: (l size) with: 2.
        Debug equals: (l at: 1) with: 8.

        l do: [ n | n. ].

        l add: 5.
        
        // array contains 1 8 5
        Debug equals: ((l select: [n | n > 1. ]) size) with: 2.
        Debug equals: ((l select: [n | n > 6. ]) size) with: 1.
        Debug equals: ((l reject: [n | n > 6. ]) size) with: 2.

        l2 := (l collect: [n | n * 2.]).
        
        // array contains 2 16 10
        Debug equals: (l2 size) with: 3.
        Debug equals: (l2 at: 0) with: 2.
        Debug equals: (l2 at: 1) with: 16.
        
        ] value.`,scope)
})

test('dict api',() => {
    let scope = make_standard_scope()
    cval(`[
        dict := (Dict clone).
        dict at: "six" set: 6.
        dict at: "seven" set: 7.
        Debug equals: (dict get: "six") with: 6.
        Debug equals: (dict get: "seven") with: 7.
        dict size.

        keys := (dict keys).
        Debug equals: (keys size) with: 2.
        Debug equals: (keys at: 0) with: "six".
        Debug equals: (keys at: 1) with: "seven".
        
        values := (dict values).
        Debug equals: (values size) with: 2.
        Debug equals: (values at: 0) with: 6.
        Debug equals: (values at: 1) with: 7.

        
        values2 := ((dict values) collect: [n | n + 2.]).
        Debug equals: (values2 at: 0) with: 8.
        Debug equals: (values2 at: 1) with: 9.
        
    ] value.`,scope)
})

test('set api',() => {
    let scope = make_standard_scope()
    cval(`[
        set := (Set clone).
        
        // size
        set add: 1.
        Debug equals: (set size) with: 1.

        set add: 88.
        Debug equals: (set size) with: 2.

        // duplicates don't increase the size
        set add: 88.
        Debug equals: (set size) with: 2.

        A := (Set withAll: ({ 1 2 3 })).
        B := (Set withAll: ({ 3 4 5 })).
        Debug equals: (A size) with: 3.
        Debug equals: (B size) with: 3.
        C := (A - B).
        Debug equals: (C size) with: 2.

        D := (A + B).
        Debug equals: (D size) with: 5.
        
        E := (A intersect: B).
        Debug equals: (E size) with: 1.

        67.
        ] value.
    `,scope, NumObj(67))
})


test('array common protocol',() => {
    let scope = make_standard_scope()
    // cval(`[
    //     l ::= List clone.
    //     l add: 5.
    //     // Debug print: (l print).
    // ] value .`,scope)
    // cval(`({ 4 5 }) print.`,scope,StrObj('6'))
    // cval(`6 == 7.`,scope,BoolObj(false))
    // cval(`8 == 8.`,scope,BoolObj(true))
    // cval(`8 == '8'.`,scope,BoolObj(false))
})

