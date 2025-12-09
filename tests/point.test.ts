import test from "node:test";
import {make_standard_scope} from "../src/standard.ts";
import {NumObj} from "../src/number.ts";
import {cval} from "./eval.test.ts";

test('Point class',() => {
    let scope = make_standard_scope()

    cval(`
    [
        Global makeSlot: "PointProto" with: (Object clone).
        PointProto makeSlot: "name" with: "PointProto".
        PointProto makeSlot: "magnitude" with: [
            self makeSlot: "xx" with: ((self x) * (self x)).
            self makeSlot: "yy" with: ((self y) * (self y)).
            ((self yy) + (self xx)) sqrt.
        ].
        PointProto makeSlot: "+" with: [ a |
            Point make: ((self x) + (a x)) with: ((self y) + (a y)).
        ].
        PointProto makeSlot: "print" with: [ a |
            "Point" + self x + "," + self y + ")".
        ].
        
        Global makeSlot: "Point" with: (PointProto clone).
        Point make_data_slot: "x" with: 0.
        Point make_data_slot: "y" with: 0.
        Point makeSlot: "name" with: "Point".

        Point makeSlot: "make:with:" with: [ x y |
            pp := (Point clone).
            pp x: x.
            pp y: y.
            pp.
        ].

        88.
    ] value.
    `,scope,NumObj(88))
    // cval(`
    // Global makeSlot: "pt" with: (Point make: 5 with:5).
    // Debug equals: (pt x) with: 5.
    // Debug equals: (pt y) with: 5.
    //
    //
    //
    //     // setters
    //     pt x: 6.
    //     pt y: 5.
    //     Debug equals: (pt x) 6.
    //     Debug equals: (pt y) 5.
    //
    //     // magnitude
    //     pt x: 0.
    //     pt y: 5.
    //     Debug equals: (pt magnitude) 5.
    //
    //     pt2 ::= (Point make 1 1).
    //
    //     // addition
    //     pt3 ::= (pt + pt2).
    //     Debug equals: (pt3 x) 1.
    //     Debug equals: (pt3 y) 6.
    //
    //     88.
    // `,scope,
    //     // StrObj("Point(6,6)")
    //     NumObj(88)
    // )
})
