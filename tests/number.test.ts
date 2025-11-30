import test from "node:test";
import {make_standard_scope} from "../src/standard.ts";
import {cval} from "../src/eval.ts";
import {NumObj} from "../src/number.ts";
import {Obj} from "../src/obj.ts";
import {StrObj} from "../src/string.ts";
import {BoolObj} from "../src/boolean.ts";

test('arithmetic',() => {
    let scope:Obj = make_standard_scope()
    cval('4 .',scope,NumObj(4))
    cval('4 value .',scope,NumObj(4))
    cval('4 + 5.',scope,NumObj(9))
    cval('4 - 5.',scope,NumObj(-1))
    cval('4 * 2.',scope,NumObj(8))
    cval('4 / 2.',scope,NumObj(2))
    cval('(4 * 5) * 6.',scope,NumObj(120))
    cval('(4 + 5) * 6.',scope,NumObj(54))
    cval('4 + (5 * 6).',scope,NumObj(34))
    cval(`-5.`,scope,NumObj(-5))
    cval(`5 negate.`,scope,NumObj(-5))
})

test('floating point math',() => {
    let scope = make_standard_scope()
    cval(`(4.0 + 5.0)`,scope,NumObj(9.0))
})

test('common protocol',() => {
    let scope = make_standard_scope()
    cval(`6 print.`,scope,StrObj('6'))
    cval(`6 == 7.`,scope,BoolObj(false))
    cval(`8 == 8.`,scope,BoolObj(true))
    cval(`8 == '8'.`,scope,BoolObj(false))
})

test('units',() => {
/*

10 unit: 'meters'.
(10 unit: 'feet') * (10 unit: 'feet') == 100 dimUnit: 2 'feet'.
(100 dimUnit: 2 'feet') print == '100 feet^2'.
((100 unit: 'feet') as: 'meter') == (8.9 unit: 'meter').
(UnitNumber from: 10 'meter') == (10 unit: 'meter').


(10 negate) == -10.

(true not) == false.


10 print == '10'.
10.8 print == '10.8'.
10 unit: 'meter' == '10 meter'.
*/
})

/*
'foo' print == 'foo'.
(4 > 5) print == 'false'.

'foo' == 'foo' // true
'foo' == 'bar' // false
4 + 5 == 9 // true

Object makeSlot: '==' [ a | (self classname) == (a classname) ].
Number makeSlot: '==' [ a | ^ self nativeCall: 'equals' a.].
Number.add_js_method('equals', (rec, args) => {
  if (rec.name !== 'Number') return BoolValue(false);
  if (rec._getJSNumber() == args[0]._getJSNumber()) return BoolValue(true);
  if return BoolValue(false);
});


Object makeSlot: 'isKindOf' [ name |
  ^ (self classname) == name
].

*/
