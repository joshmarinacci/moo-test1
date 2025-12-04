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
    // cval('(4 * 5) * 6.',scope,NumObj(120))
    // cval('(4 + 5) * 6.',scope,NumObj(54))
    // cval('4 + (5 * 6).',scope,NumObj(34))
    cval(`-5.`,scope,NumObj(-5))
    cval(`5 negate.`,scope,NumObj(-5))
})

test('floating point math',() => {
    let scope = make_standard_scope()
    cval(`4.0 + 5.0`,scope,NumObj(9.0))
})

test('common protocol',() => {
    let scope = make_standard_scope()
    cval(`6 print.`,scope,StrObj('6'))
    cval(`6 == 7.`,scope,BoolObj(false))
    cval(`8 == 8.`,scope,BoolObj(true))
    cval(`8 == '8'.`,scope,BoolObj(false))
})

test('units',() => {
    let scope = make_standard_scope()
    cval(`[
        Global makeSlot "UnitNumberProto" (Object clone).
        UnitNumberProto makeSlot "name" "UnitNumber".
        UnitNumberProto makeSlot "+" [b |
            UnitNumber make: ((self amount) + (b amount))
                ((self unit))
                (self dimension).            
        ].
        UnitNumberProto makeSlot "-" [b |
            UnitNumber make: ((self amount) - (b amount))
                ((self unit))
                (self dimension).            
        ].
        UnitNumberProto makeSlot "*" [b |
            UnitNumber make: ((self amount) * (b amount))
                ((self unit))
                ((self dimension) + 1).            
        ].
        
        UnitNumberProto makeSlot "print" [
            (((self amount) print) + " ") + ((self unit)) .
        ].
        
        Global makeSlot "UnitNumber" (UnitNumberProto clone).
        UnitNumber make_data_slot: "amount" 0.
        UnitNumber make_data_slot: "unit" "meter".
        UnitNumber make_data_slot: "dimension" 1.
        UnitNumber makeSlot "name" "UnitNumber".
        UnitNumber makeSlot "make:" [a u d |
            un ::= (UnitNumber clone).
            un amount: a.
            un unit: u.
            un dimension: d.
            un.
        ].
    ] value.`,scope)
    cval(`[
        A ::= (UnitNumber make: 10 'meter' 1).
        Debug equals: (A amount) 10.
        Debug equals: (A unit) 'meter'.
        Debug equals: (A dimension) 1.
        Debug equals: (A print) "10 meter". 


        B ::= (UnitNumber make: 15 'meter' 1).

        V ::= (A + B).
        Debug equals: (V amount) 25.
        Debug equals: (V unit) 'meter'.
        Debug equals: (V dimension) 1.

        V ::= (A - B).
        Debug equals: (V amount) -5.
        Debug equals: (V unit) 'meter'.
        Debug equals: (V dimension) 1.

        V ::= (A * B).
        Debug equals: (V amount) 150.
        Debug equals: (V unit) 'meter'.
        Debug equals: (V dimension) 2.

        67.
        ] value.`,scope,NumObj(67) )
/*
(100 dimUnit: 2 'feet') print == '100 feet^2'.
((100 unit: 'feet') as: 'meter') == (8.9 unit: 'meter').
(UnitNumber from: 10 'meter') == (10 unit: 'meter').
*/
})
