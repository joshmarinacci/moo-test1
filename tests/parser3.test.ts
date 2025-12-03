import {parse} from "../src/parser3.ts"
import test from "node:test";
import {type Ast2, Num, PlnId, Str} from "../src/ast2.ts";
import assert from "node:assert";


 function precedence(source:string, target:Ast2) {
    console.log("====== " + source)

    // let input = new InputStream(source.trim(),0);
    let ast = parse(source);
    assert.deepStrictEqual(ast,target)
}

test('parse precedence',() => {
    precedence('foo',PlnId('foo'))
    precedence('4',Num(4))
    precedence("'4'",Str("4"))
})