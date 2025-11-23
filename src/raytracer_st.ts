import test from "node:test";
import {cval, make_default_scope, NumObj} from "./eval2.ts";

test('eval vector class',() => {
    let scope = make_default_scope()
    cval(`[
        Global makeSlot "Vector" (ObjectBase clone).
        Vector setObjectName "Vector".
        Vector makeSlot "x" 0.
        Vector makeSlot "y" 0.
        Vector makeSlot "z" 0.
        Vector makeSlot "x:" [xx |
            self setSlot "x" xx.
        ].
        Vector makeSlot "y:" [yy |
            self setSlot "y" yy.
        ].
        Vector makeSlot "z:" [zz |
            self setSlot "z" zz.
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
        
        // check the setters
        a x: 55.
        Debug equals (a x) 55.
        a y: 66.
        Debug equals (a y) 66.
        a z: 5.
        Debug equals (a z) 5.
        
        a ::= (Vector make 1 1 1).
        b ::= (Vector make 6 7 8).
        c ::= (a add b).
        Debug equals (c x) 7.
        Debug equals (c y) 8.
        Debug equals (c z) 9.
        
        99.
    ] value.`,scope,NumObj(99))

    cval(`[
        a ::= (Vector make 1 1 1).
        b ::= (Vector make 6 7 8).
        c ::= (a add b).
        99 dump.
    ] value.`,scope,NumObj(99))
})
