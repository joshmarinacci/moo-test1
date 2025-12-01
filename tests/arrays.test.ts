import test from "node:test";
import {cval} from "../src/eval.ts";
import assert from "node:assert";
import {ArrayLiteral} from "../src/parser.ts";
import {make_standard_scope} from "../src/standard.ts";
import {DictObj, ListObj} from "../src/arrays.ts";
import {NumObj} from "../src/number.ts";
import {match} from "./common.ts";
import {StrObj} from "../src/string.ts";
import {BoolObj} from "../src/boolean.ts";


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
        Debug equals: (l at: 0) 4.
        Debug equals: (l at: 1) 5.
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
        Debug equals: (p get: "x") 5.
        p.
    ] value.
    `,scope, DictObj({x:NumObj(5)}))

    cval(`[
        v ::= { x:5 y: 6 }.
        Debug equals: (v get: "x") 5.
        Debug equals: (v get: "y") 6.
        v.
    ] value.
    `,scope, DictObj({x:NumObj(5)}))
})

test('list api', () => {
    let scope = make_standard_scope()
    cval(`[
        l ::= (List clone).
        Debug equals: (l size) 0.

        l add: 1.
        Debug equals: (l size) 1.
        Debug equals: (l at: 0) 1.

        l add: 3.
        Debug equals: (l size) 2.
        l setAt: 1 8.
        Debug equals: (l size) 2.
        Debug equals: (l at: 1) 8.

        l do: [ n | n. ].         

        l add: 5. 

        // array contains 1 8 5
        Debug equals: ((l select: [n | n > 1. ]) size) 2.
        Debug equals: ((l select: [n | n > 6. ]) size) 1.
        Debug equals: ((l reject: [n | n > 6. ]) size) 2.


        l2 ::= (l collect: [n | n * 2.]).
        // array contains 2 16 10
        Debug equals: (l2 size) 3.
        Debug equals: (l2 at: 0) 2.
        Debug equals: (l2 at: 1) 16.

        67.
    ] value.`,scope, NumObj(67))
})

test('dict api',() => {
    let scope = make_standard_scope()
    cval(`[
        dict ::= (Dict clone).
        dict set: "six" 6.
        dict set: "seven" 7.
        Debug equals: (dict get: "six") 6.
        Debug equals: (dict get: "seven") 7.
        dict size.


        keys ::= (dict keys).
        Debug equals: (keys size) 2.
        Debug equals: (keys at: 0) "six".
        Debug equals: (keys at: 1) "seven".

        values ::= (dict values).
        Debug equals: (values size) 2.
        Debug equals: (values at: 0) 6.
        Debug equals: (values at: 1) 7.

        values2 ::= ((dict values) collect: [n | n + 2.]).
        Debug equals: (values2 at: 0) 8.
        Debug equals: (values2 at: 1) 9.

        67.
        ] value.
    `,scope, NumObj(67))
})

test('set api',() => {
    let scope = make_standard_scope()
    cval(`[
        set ::= (Set clone).
        set add: 1.
        Debug equals: (set size) 1.

        set add: 88.
        Debug equals: (set size) 2.

        // duplicates don't increase the size
        set add: 88.
        // Debug equals: (set size) 2.

        A ::= (Set withAll: ({ 1 2 3 })).
        B ::= (Set withAll: { 3 4 5 }).
        C ::= (A - B).
        // Debug equals: (A size) 3.
        // Debug equals: (B size) 3.
        // Debug equals: (C size) 2.

        D ::= (A + B).
        // Debug equals: (D size) 5.

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

/*
class JSSet {
  data: Map<string,Obj>
  constructor() {
      this.data = new Map()
  }
  put(obj:Obj) {
      if(!this.data.has(obj.hashvalue()) {
          this.data.set(obj.hashvalue(),obj)
      }
  }
  has(obj:Obj) {
      this.data.has(obj.hashvalue())
  }
  union(set:JSSet) {
  }
  intersect(set:JSSet) {
  }
  difference(set:JSSet) {
  }
  //union:
      set ::= Set clone.
      self do: [v | set put: v].
      A do: [v | set put: v].
      ^ set.

  //intersect:
      set ::= Set clone.
      self do [v |
          (A has: v) ifTrue: [ set put: v]
      ].
      ^ set.

  // difference:
      set ::= Set clone.
      self do: [v |
          (A has: v) ifFalse: [ set put: v]
      ].
      A do:[v |
          (self has: v) ifFalse: [ set put: v]
      ].
      ^ set.

  //select :: filter
      set ::= Set clone.
      self do: [v |
          (A value: {v}) ifTrue: [ set put: v]
      ].
      ^ set.

  //detect :: find
  //collect :: map
  //reject :: !filter
  //inject :: fold / reduce
  //inject value collection


}

 */