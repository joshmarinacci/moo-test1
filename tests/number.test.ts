import test from "node:test";
import {make_standard_scope} from "../src/standard.ts";
import {NumObj} from "../src/number.ts";
import {Obj} from "../src/obj.ts";
import {StrObj} from "../src/string.ts";
import {BoolObj} from "../src/boolean.ts";
import {cval, mval} from "./eval.test.ts";
import {sval} from "../src/eval.ts";

test('arithmetic',() => {
    let scope:Obj = make_standard_scope()
    cval('4 .',scope,NumObj(4))
    cval('4 value .',scope,NumObj(4))
    cval('4 + 5.',scope,NumObj(9))
    cval('4 - 5.',scope,NumObj(-1))
    cval('4 * 2.',scope,NumObj(8))
    cval('4 / 2.',scope,NumObj(2))
    // cval('(4 * 5) * 6.',scope,NumObj(120))
    // cval('(4 + 5) * 6.',scope,NumObj(54))
    // cval('4 + (5 * 6).',scope,NumObj(34))
    cval(`-5.`,scope,NumObj(-5))
    cval(`5 negate.`,scope,NumObj(-5))
    cval('5 double.',scope,NumObj(10))
    cval('5 square.',scope,NumObj(25))
})

test('floating point math',() => {
    let scope = make_standard_scope()
    sval(`4.0 + 5.0 .`,scope,NumObj(9.0))
})

test('common protocol',() => {
    let scope = make_standard_scope()
    cval(`6 print.`,scope,StrObj('6'))
    cval(`6 == 7.`,scope,BoolObj(false))
    cval(`8 == 8.`,scope,BoolObj(true))
    cval(`8 == '8'.`,scope,BoolObj(false))
    cval(`8 isNil.`,scope,BoolObj(false))
})

test('units',() => {
    let scope = make_standard_scope()
    mval(`
        Global makeSlot: "UnitNumberProto" with: (Object clone).
        UnitNumberProto makeSlot: "name" with: "UnitNumber".
        UnitNumberProto makeSlot: "+" with: [b |
            UnitNumber make: ((self amount) + (b amount))
                unit: ((self unit))
                dimension: (self dimension).            
        ].
        UnitNumberProto makeSlot: "-" with: [b |
            UnitNumber make: ((self amount) - (b amount))
                unit: ((self unit))
                dimension: (self dimension).            
        ].
        UnitNumberProto makeSlot: "*" with: [b |
            UnitNumber make: ((self amount) * (b amount))
                unit: ((self unit))
                dimension: ((self dimension) + 1).            
        ].
        
        UnitNumberProto makeSlot: "print" with: [
            (((self amount) print) + " ") + ((self unit)) .
        ].

        Global makeSlot: "UnitNumber" with: (UnitNumberProto clone).

        UnitNumber make_data_slot: "amount" with: 0.
        UnitNumber make_data_slot: "unit" with: "meter".
        UnitNumber make_data_slot: "dimension" with: 1.
        UnitNumber makeSlot: "name" with: "UnitNumber".

        UnitNumber makeSlot: "make:unit:dimension:" with: [a u d |
            un := (UnitNumber clone).
            un amount: a.
            un unit: u.
            un dimension: d.
            un.
        ].
        
        UnitNumber make: 10 unit: 'foo' dimension: 1.
    `,scope)
    mval(`
        A := (UnitNumber make: 10 unit: 'meter' dimension: 1).
        A dump.
        Debug equals: (A amount) with: 10.
    `,scope)
    // cval(`[
    //     Debug equals: (A unit) 'meter'.
    //     Debug equals: (A dimension) 1.
    //     Debug equals: (A print) "10 meter".
    //
    //
    //     B ::= (UnitNumber make: 15 'meter' 1).
    //
    //     V ::= (A + B).
    //     Debug equals: (V amount) 25.
    //     Debug equals: (V unit) 'meter'.
    //     Debug equals: (V dimension) 1.
    //
    //     V ::= (A - B).
    //     Debug equals: (V amount) -5.
    //     Debug equals: (V unit) 'meter'.
    //     Debug equals: (V dimension) 1.
    //
    //     V ::= (A * B).
    //     Debug equals: (V amount) 150.
    //     Debug equals: (V unit) 'meter'.
    //     Debug equals: (V dimension) 2.
    //
    //     67.
    //     ] value.`,scope,NumObj(67) )
/*
(100 dimUnit: 2 'feet') print == '100 feet^2'.
((100 unit: 'feet') as: 'meter') == (8.9 unit: 'meter').
(UnitNumber from: 10 'meter') == (10 unit: 'meter').
*/
})
