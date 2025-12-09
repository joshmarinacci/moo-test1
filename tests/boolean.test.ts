import test from "node:test";
import {make_standard_scope} from "../src/standard.ts";
import {StrObj} from "../src/string.ts";
import {BoolObj} from "../src/boolean.ts";
import {Obj} from "../src/obj.ts";
import {cval} from "./eval.test.ts";

test('booleans',() => {
    let scope:Obj = make_standard_scope();
    cval('true .',scope,BoolObj(true));
    cval('false .',scope,BoolObj(false));
    cval('4 < 5 .',scope,BoolObj(true));
    cval('4 > 5 .',scope,BoolObj(false));
    cval('4 == 4 .',scope,BoolObj(true));
    cval('4 == 5 .',scope,BoolObj(false));
})

test('boolean logic',() => {
    let scope:Obj = make_standard_scope();
    cval('true and: true.',scope,BoolObj(true))
    cval('true and: false.',scope,BoolObj(false))
    cval('true or: false.',scope,BoolObj(true))
    cval('false or: true.',scope,BoolObj(true))
    cval('true not.',scope,BoolObj(false))
    cval('false not.',scope,BoolObj(true))
})

test('common protocol',() => {
    let scope = make_standard_scope()
    cval(`true print.`,scope,StrObj('true'))
    cval(`false print.`,scope,StrObj('false'))
    cval(`true == true.`,scope,BoolObj(true))
    cval(`true == false.`,scope,BoolObj(false))
    cval(`(true == 'true').`,scope,BoolObj(false))
})
