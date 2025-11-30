import test from "node:test";
import {make_standard_scope} from "../src/standard.ts";
import {cval} from "../src/eval.ts";
import {StrObj} from "../src/string.ts";
import {BoolObj} from "../src/boolean.ts";
import {Obj} from "../src/obj.ts";

test('booleans',() => {
    let scope:Obj = make_standard_scope();
    cval('true .',scope,BoolObj(true));
    cval('false .',scope,BoolObj(false));
    cval('4 < 5 .',scope,BoolObj(true));
    cval('4 > 5 .',scope,BoolObj(false));
    cval('4 == 4 .',scope,BoolObj(true));
    cval('4 == 5 .',scope,BoolObj(false));
})

test('common protocol',() => {
    let scope = make_standard_scope()
    cval(`true print.`,scope,StrObj('true'))
    cval(`false print.`,scope,StrObj('false'))
    cval(`true == true.`,scope,BoolObj(true))
    cval(`true == false.`,scope,BoolObj(false))
    cval(`(true == 'true').`,scope,BoolObj(true))
})
