import test from "node:test";
import {cval} from "../src/eval2.ts";
import {NumObj} from "../src/number.ts";
import {make_standard_scope} from "../src/standard.ts";

test('set pixels color',() => {
    const scope = make_standard_scope();
    cval(`[
        Color makeSlot "teal" (Color from: { 0 255 255 }).
        Color makeSlot "yellow" (Color from: { 255 255 0 }).
        Color makeSlot "magenta" (Color from: { 255 0 255 }).
    
        image ::= (Image make: 10 10).
        Debug print image.
        Debug equals (image width) 10.
        Debug equals (image height) 10.
        blue ::= (Color from: { 0 0 255 }).
        image setPixelAt: 0 0 (Color red).
        image setPixelAt: 1 0 (Color green).
        image setPixelAt: 2 0 (Color blue).
        image setPixelAt: 3 0 (Color white).
        image setPixelAt: 4 0 (Color black).
        image setPixelAt: 5 0 (Color teal).
        image setPixelAt: 6 0 (Color yellow).
        image setPixelAt: 7 0 (Color magenta).
        image save: "foo.png".
        88.
     ] value.`, scope, NumObj(88))
})
test('fill image',() => {
    const scope = make_standard_scope()
    cval(`[
        image ::= (Image make: 10 10).
        image fill: [x y |
            ((x mod 2) == 0) if_true [ return (Color red). ].
            ((y mod 2) == 0) if_true [ return (Color green). ].
            Color black.
          ].
        image save: "bar.png".
     ] value.`, scope)
})
