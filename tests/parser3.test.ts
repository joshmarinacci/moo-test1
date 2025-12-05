import {parse} from "../src/parser3.ts"
import test from "node:test";
import {
    Ass,
    type Ast2,
    Binary, Blk, BlkArgs,
    Grp,
    KArg,
    KeyId,
    Keyword,
    Method,
    Num,
    PlnId,
    Stmt,
    Str,
    SymId,
    Unary
} from "../src/ast2.ts";
import assert from "node:assert";
import {cval} from "../src/eval.ts";
import {NumObj} from "../src/number.ts";

export function precedence(source:string, target:Ast2) {
    console.log("====== " + source)
    let ast = parse(source,'Exp');
    assert.deepStrictEqual(ast,target)
}
export function eval_statement(source:string, target:Ast2) {
    console.log("====== " + source)
    let ast = parse(source,'Statement');
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
    precedence('foo do: bar ',Method(PlnId("foo"),Keyword(  KArg(KeyId('do:'),PlnId('bar')) )))
    precedence('foo do: bar with: baz ',Method(PlnId("foo"),Keyword(  KArg(KeyId('do:'),PlnId('bar')), KArg(KeyId('with:'),PlnId('baz')) )))
    precedence('4 do: 5 ', Method(Num(4),Keyword(KArg(KeyId('do:'),Num(5)))))
    precedence('(4) do: 5 ', Method(Grp(Num(4)), Keyword( KArg(KeyId('do:'),Num(5)))))
    precedence('foo := 4 ', Ass(PlnId('foo'), Num(4)))
    precedence('foo := (4) ', Ass(PlnId('foo'), Grp(Num(4))))
    precedence('foo := 4 do: 5 ', Ass(PlnId('foo'), Method(Num(4), Keyword( KArg(KeyId('do:'),Num(5))))))
    precedence('foo := 4 do: 5 with: 6 ', Ass(PlnId('foo'), Method(Num(4), Keyword(
        KArg(KeyId('do:'),Num(5)),
        KArg(KeyId('with:'),Num(6))
    ))))
})
test("parse integer",() => {
    precedence("4",Num(4))
    precedence("44",Num(44))
    precedence("-44",Num(-44))
    precedence("67",Num(67))
    precedence("6_7",Num(67))
})
test("block statement",() => {
    precedence("[ ]",Blk())
    precedence("[ 4 ]",Blk(Stmt(Num(4))))
    eval_statement("[ 4 ] value.",Stmt(Method(Blk(Stmt(Num(4))),Unary(PlnId('value')))))
    eval_statement("[ 4. 5 ] value.",Stmt(Method(BlkArgs([],[Stmt(Num(4)),Stmt(Num(5))]),Unary(PlnId('value')))))
    eval_statement("[ 4. 5. ] value.",Stmt(Method(BlkArgs([],[Stmt(Num(4)),Stmt(Num(5))]),Unary(PlnId('value')))))
})
test("block with args",() => {
    precedence("[ | ]",BlkArgs([],[]))
    precedence("[ x | ]",BlkArgs([PlnId('x')],[]))
    precedence("[ x | 4 ]",BlkArgs([PlnId('x')],[Stmt(Num(4))]))
    precedence("[ x y | 4. 5 ]",BlkArgs([PlnId('x'), PlnId('y')],[Stmt(Num(4)), Stmt(Num(5))]))
})
test('assignment',() => {
    // precedence('v := 5',Ass(PlnId('v'),Num(5)))
    eval_statement('v := 5 .',Stmt(Ass(PlnId('v'),Num(5))))
    eval_statement(`[
        v := 5.
        v.
    ] value.`,Stmt(Method(BlkArgs([],[
        Stmt(Ass(PlnId('v'),Num(5))),
        Stmt(PlnId('v')),
    ]), Unary(PlnId('value')))))

})


