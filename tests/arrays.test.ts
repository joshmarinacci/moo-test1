import test from "node:test";
import {cval} from "../src/eval.ts";
import assert from "node:assert";
import {ArrayLiteral} from "../src/parser.ts";
import {make_standard_scope} from "../src/standard.ts";
import {DictObj, ListObj} from "../src/arrays.ts";
import {NumObj} from "../src/number.ts";
import {match} from "./common.ts";


test('parse array list literals',() => {
    assert.ok(match("{}",ArrayLiteral))
    assert.ok(match("{4}",ArrayLiteral))
    assert.ok(match("{4 5}",ArrayLiteral))
    assert.ok(match("{ 'a' 'b' }",ArrayLiteral))
})

test('parse array dict literals',() => {
    assert.ok(match("{}",ArrayLiteral))
    assert.ok(match("{a:5}",ArrayLiteral))
    assert.ok(match("{ a:5 }",ArrayLiteral))
    assert.ok(match("{ a:5 b:6 }",ArrayLiteral))
    assert.ok(match("{ a:'a' b:'b' }",ArrayLiteral))
})

test('array literals',() => {
    let scope = make_standard_scope()
    cval(`[
        l ::= { 4 5 }.
        Debug equals (l at: 0) 4.
        Debug equals (l at: 1) 5.
        l size.
     ] value.`, scope, NumObj(2))
    cval(`[
     { 4 5 }.
     ] value.`, scope, ListObj(NumObj(4),NumObj(5)))
})

test('dict literals', () => {
    let scope = make_standard_scope()
    cval(`[
        p ::= { x:5 }.
        Debug equals (p get "x") 5.
        p.
    ] value.
    `,scope, DictObj({x:NumObj(5)}))

    cval(`[
        v ::= { x:5 y: 6 }.
        Debug equals (v get "x") 5.
        Debug equals (v get "y") 6.
        v.
    ] value.
    `,scope, DictObj({x:NumObj(5)}))
})

test('list api', () => {
    let scope = make_standard_scope()
    cval(`[
        l ::= (List clone).
        Debug equals (l size) 0.
        
        l add: 1.
        Debug equals (l size) 1.
        Debug equals (l at: 0) 1.
        
        l add: 3.
        Debug equals (l size) 2.
        l setAt: 1 8.
        Debug equals (l size) 2.
        Debug equals (l at: 1) 8.

        l do: [ n | n. ].         
        
        l add: 5. 

        // array contains 1 8 5
        Debug equals ((l select: [n | n > 1. ]) size) 2.
        Debug equals ((l select: [n | n > 6. ]) size) 1.
        Debug equals ((l reject: [n | n > 6. ]) size) 2.
        
        
        l2 ::= (l collect: [n | n * 2.]).
        // array contains 2 16 10
        Debug equals (l2 size) 3.
        Debug equals (l2 at: 0) 2.
        Debug equals (l2 at: 1) 16.
        88.
    ] value.`,scope)
})
test('dict api',() => {
    let scope = make_standard_scope()
    cval(`[
        dict ::= (Dict clone).
        dict set "six" 6.
        dict set "seven" 7.
        Debug equals (dict get "six") 6.
        Debug equals (dict get "seven") 7.
        dict len.
        ] value.
    `,scope,NumObj(2))
})
