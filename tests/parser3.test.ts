import {parse} from "../src/parser3.ts"
import test from "node:test";
import {Ass, type Ast2, Binary, Grp, KArg, KeyId, Keyword, Method, Num, PlnId, Str, SymId, Unary} from "../src/ast2.ts";
import assert from "node:assert";


export function precedence(source:string, target:Ast2) {
    console.log("====== " + source)

    // let input = new InputStream(source.trim(),0);
    let ast = parse(source);
    assert.deepStrictEqual(ast,target)
}

test('parse precedence',() => {
    precedence('foo',PlnId('foo'))
    precedence('4',Num(4))
    precedence("'4'",Str("4"))
    precedence('foo print',Method(PlnId("foo"),Unary(PlnId('print'))))
    precedence('5 print',Method(Num(5),Unary(PlnId('print'))))
    precedence('(5) print',Method(Grp(Num(5)),Unary(PlnId('print'))))
    precedence('(foo) print',Method(Grp(PlnId("foo")),Unary(PlnId('print'))))

    precedence('4 + 5',Method(Num(4),Binary(SymId('+'),Num(5))))
    precedence('4 * 5',Method(Num(4),Binary(SymId('*'),Num(5))))
    precedence('foo + bar',Method(PlnId("foo"),Binary(SymId('+'),PlnId('bar'))))

    precedence('4 + bar ', Method(Num(4),Binary(SymId('+'),PlnId('bar'))))
    precedence('4 + (5) ', Method(Num(4), Binary(SymId('+'), Grp(Num(5))) ))
    precedence('(4) + (5) ', Method(Grp(Num(4)), Binary(SymId('+'), Grp(Num(5))) ))

    // precedence('4 + 5 + 6 ', Method(Method(Num(4),Binary(SymId('+'),Num(5))), Binary(SymId('+'), Num(6))))
    precedence('foo do: bar ',Method(PlnId("foo"),Keyword( KArg(KeyId('do:'),PlnId('bar')) )))
    precedence('4 do: 5 ', Method(Num(4),Keyword(KArg(KeyId('do:'),Num(5)))))
    precedence('(4) do: 5 ', Method(Grp(Num(4)), Keyword( KArg(KeyId('do:'),Num(5)))))
    precedence('foo := 4 ', Ass(PlnId('foo'), Num(4)))
    precedence('foo := (4) ', Ass(PlnId('foo'), Grp(Num(4))))
    precedence('foo := 4 do: 5 ', Ass(PlnId('foo'), Method(Num(4), Keyword( KArg(KeyId('do:'),Num(5))))))
})

test("parse integer",() => {
    precedence("4",Num(4))
    precedence("44",Num(44))
    precedence("-44",Num(-44))
    precedence("67",Num(67))
    precedence("6_7",Num(67))
})
