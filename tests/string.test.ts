import test from "node:test";
import {make_standard_scope} from "../src/standard.ts";
import {cval} from "../src/eval.ts";
import {StrObj} from "../src/string.ts";
import {BoolObj} from "../src/boolean.ts";
import {Obj} from "../src/obj.ts";

test('strings',() => {
    let scope = make_standard_scope()
    cval('"foo" .', scope,StrObj("foo"))
    cval('"foo" + "bar" .', scope,StrObj("foobar"))
})

test('common protocol',() => {
    let scope = make_standard_scope()
    cval(`'foo' print.`,scope,StrObj('foo'))
    cval(`'foo' == 'foo'.`,scope,BoolObj(true))
    cval(`'foo' == 'bar'.`,scope,BoolObj(false))
    cval(`('foo' == foo).`,scope,BoolObj(false))
})
