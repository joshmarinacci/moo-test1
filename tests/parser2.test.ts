import {Binary, Grp, PlnId, Method, Num, Str, SymId, Unary, Keyword, KArg, KeyId, Ass} from "../src/ast2.ts";
import type {Ast2} from "../src/ast2.ts";
import {InputStream} from "../src/parser.ts";
import assert from "node:assert";
import {SoloExp} from "../src/parser2.ts";
import test from "node:test";

export function precedence(source:string, target:Ast2) {
    // console.log("====== " + source)
    let input = new InputStream(source.trim(),0);
    assert.deepStrictEqual(SoloExp(input).ast,target)
}

test('parse precedence',() => {
    precedence('foo',PlnId('foo'))
    precedence('4',Num(4))
    precedence('"4"',Str("4"))
    precedence('foo print',Method(PlnId("foo"),Unary(PlnId('print'))))
    precedence('5 print',Method(Num(5),Unary(PlnId('print'))))
    precedence('(5) print',Method(Grp(Num(5)),Unary(PlnId('print'))))
    precedence('(foo) print',Method(Grp(PlnId("foo")),Unary(PlnId('print'))))
    precedence('foo + bar ',Method(PlnId("foo"),Binary(SymId('+'),PlnId('bar'))))

    precedence('4 + bar ', Method(Num(4),Binary(SymId('+'),PlnId('bar'))))
    precedence('4 + 5 ', Method(Num(4),Binary(SymId('+'),Num(5))))
    precedence('4 + (5) ', Method(Num(4), Binary(SymId('+'), Grp(Num(5))) ))
    precedence('(4) + (5) ', Method(Grp(Num(4)), Binary(SymId('+'), Grp(Num(5))) ))

    // precedence('4 + 5 + 6 ', Method(Method(Num(4),Binary(SymId('+'),Num(5))), Binary(SymId('+'), Num(6))))
    precedence('foo do: bar ',Method(PlnId("foo"),Keyword( KArg(KeyId('do:'),PlnId('bar')) )))
    precedence('4 do: 5 ', Method(Num(4),Keyword(KArg(KeyId('do:'),Num(5)))))
    precedence('(4) do: 5 ', Method(Grp(Num(4)), Keyword( KArg(KeyId('do:'),Num(5)))))
    precedence('foo := 4 ', Ass(PlnId('foo'), Num(4)))
    precedence('foo := (4) ', Ass(PlnId('foo'), Grp(Num(4))))
    precedence('foo := 4 do: 5 ', Ass(PlnId('foo'), Method(Num(4), Keyword( KArg(KeyId('do:'),Num(5))))))
    // precedence('foo := ( 4 do: 5 ) ', Ass(PlnId('foo'),  Grp( [Method(Num(4), Keyword([ KArg(KeyId('do:'),Num(5))]))])))
})
