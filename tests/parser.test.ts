import test from "node:test";
import {
    Num,
    PlnId,
    Str,
    SymId,
    Grp,
    Method,
    Unary,
    Binary,
    Blk,
    Stmt,
    BlkArgs,
    Ret,
    ListLit, MapLit, MapPair, Ass, Keyword, KArg, KeyId
} from "../src/ast2.ts"
import type {Ast2} from "../src/ast2.ts"

import {parse} from "../src/parser3.ts";
import assert from "node:assert";

export function precedence(source:string, target:Ast2) {
    let ast = parse(source,'Exp');
    assert.deepStrictEqual(ast,target)
}
export function parse_statement(source:string, target:Ast2) {
    // console.log("====== " + source)
    let ast = parse(source,'Statement');
    assert.deepStrictEqual(ast,target)
}

test("parse integer",() => {
    precedence("67",Num(67))
    precedence("-67",Num(-67))
    precedence("6_7",Num(67))
})
test("parse float", () => {
    precedence("-44.44",Num(-44.44))
    precedence("0.44",Num(0.44))
    precedence("0.4_4",Num(0.44))
    precedence("0_0.44",Num(0.44))
})
test('parse alt base numbers',() => {
    precedence("2r0001",Num(1))
    precedence("2r1111",Num(15))
    precedence("16r8",Num(8))
    precedence("16rA",Num(10))
    precedence("16rFF",Num(255))
    precedence("16rFFFF",Num(0xFFFF))
})
test("parse identifier",() => {
    precedence("abc",PlnId("abc"))
    precedence("ABC",PlnId("ABC"))
    precedence("a2bc",PlnId("a2bc"))
    precedence("a_bc",PlnId("a_bc"))
})
test("parse string literal",() => {
    precedence(`'abc'`,Str("abc"))
    precedence(`"abc"`,Str("abc"))
    precedence(`''`,Str(""))
    precedence(`'a b c'`,Str("a b c"))
})
test("parse operators",() => {
    precedence("4+5",Method(Num(4),Binary(SymId('+'),Num(5))))
    precedence("4 + 5",Method(Num(4),Binary(SymId('+'),Num(5))))
    precedence("4 - 5",Method(Num(4),Binary(SymId('-'),Num(5))))
    precedence("4 * 5",Method(Num(4),Binary(SymId('*'),Num(5))))
    precedence("4 / 5",Method(Num(4),Binary(SymId('/'),Num(5))))
    precedence("4 < 5",Method(Num(4),Binary(SymId('<'),Num(5))))
    precedence("4 > 5",Method(Num(4),Binary(SymId('>'),Num(5))))
    precedence("4 <= 5",Method(Num(4),Binary(SymId('<='),Num(5))))
    precedence("4 >= 5",Method(Num(4),Binary(SymId('>='),Num(5))))
    precedence("4 == 5",Method(Num(4),Binary(SymId('=='),Num(5))))
    precedence("4 != 5",Method(Num(4),Binary(SymId('!='),Num(5))))
})
test("handle whitespace",() => {
    precedence("4",Num(4))
    precedence("4 ",Num(4))
    precedence(" 4",Num(4))
    precedence(" 4 ",Num(4))
})
test("parse group",() => {
    precedence("(4)",Grp(Num(4)))
    precedence("(id)",Grp(PlnId('id')))
    precedence("( ( id ) )",Grp(Grp(PlnId('id'))))
    precedence("( 4 add )",Grp(Method(Num(4),Unary(PlnId('add')))))
})
test("parse statement",() => {
    parse_statement("foo.",Stmt(PlnId('foo')))
    parse_statement("foo .",Stmt(PlnId('foo')))
    parse_statement("bar foo .",Stmt(Method(PlnId('bar'),Unary(PlnId('foo')))))
    parse_statement("4 + 5 .",Stmt(Method(Num(4),Binary(SymId('+'),Num(5)))))
    parse_statement("4 .",Stmt(Num(4)))
    parse_statement("foo bar .",Stmt(Method(PlnId('foo'),Unary(PlnId('bar')))))
    parse_statement("^ 67.",Stmt(Ret(Num(67))))
})
test("block",() => {
    precedence("[]",Blk())
    precedence("[foo]",Blk(Stmt(PlnId('foo'))))
    precedence("[foo.]",Blk(Stmt(PlnId('foo'))))
    precedence("[foo. bar.]",Blk(Stmt(PlnId("foo")),Stmt(PlnId("bar"))))

    precedence("[x| ]", BlkArgs([PlnId('x')],[]))
    precedence("[ x| ]", BlkArgs([PlnId('x')],[]))
    precedence("[ x y | ]", BlkArgs([PlnId('x'), PlnId('y')],[]))
    precedence("[ | ]", BlkArgs([],[]))
    precedence("[x| 4. ]", BlkArgs([PlnId('x')],[Stmt(Num(4))]))
})

test("parse array list literals",() => {
    precedence("{}",ListLit())
    precedence("{1}",ListLit(Num(1)))
    precedence("{4 5}",ListLit(Num(4),Num(5)))
    // precedence("{ 4 , 5}",ListLit(Num(4),Num(5)))
    // precedence("{ 4 , 5, 6}",ListLit(Num(4),Num(5),Num(6)))
    // precedence("{ 4 , 5, 6} .",Stmt(ListLit(Num(4),Num(5),Num(6))))
})
test('parse array dict literals',() => {
    precedence("{}",ListLit())
    precedence("{a:5}",MapLit(MapPair(PlnId('a'),Num(5))))
    precedence("{ a:5 }",MapLit(MapPair(PlnId('a'),Num(5))))
    precedence("{ a:5 b:5 }",MapLit(MapPair(PlnId('a'),Num(5)), MapPair(PlnId('b'),Num(5))))
    precedence("{ abc:5 def:8 }",MapLit(MapPair(PlnId('abc'),Num(5)), MapPair(PlnId('def'),Num(8))))
})
// test("parse block body", () => {
//     // two statements
//     assert.deepStrictEqual(parseBlockBody("4 add 5 . 6 add 7 ."),
//         [
//             Stmt(Num(4),Id("add"),Num(5)),
//             Stmt(Num(6),Id("add"),Num(7),)
//         ])
//     // statement and solo expression
//     assert.deepStrictEqual(parseBlockBody("4 add 5 . a  "),
//         [
//             Stmt(Num(4),Id("add"),Num(5)),
//             Id('a'),
//         ])
// })
test('parse expression',() => {
    precedence("4 ",Num(4))
    precedence("(4)",Grp(Num(4)))
    precedence("(add)",Grp(PlnId("add")))
    precedence("(4 + 5)",Grp( Method(Num(4), Binary(SymId("+"),Num(5)))))
    precedence("[foo.]",Blk(Stmt(PlnId("foo"))))
})
test('parse comments',() => {
    // precedence('//foo\n',Cmnt('foo'))
//     assert.ok(!match('//foo',Comment))
//     assert.ok(!match('a//foo\n',Comment))
//     assert.ok(!match('a//foo',Comment))
    parse_statement("4 + 5 .",Stmt(Method(Num(4),Binary(SymId('+'),Num(5)))))
    parse_statement(`4 + // foo \n 5 .`,Stmt(Method(Num(4),Binary(SymId('+'),Num(5)))))

//     assert.deepStrictEqual(parseBlockBody("//\n 4 add 5."),[
//         Stmt(Num(4),Id('add'),Num(5)),
//     ])
//     assert.deepStrictEqual(parseBlockBody("4 //\n add 5."),[
//         Stmt(Num(4),Id('add'),Num(5)),
//     ])
//     assert.deepStrictEqual(parseBlockBody("4  add //\n 5."),[
//         Stmt(Num(4),Id('add'),Num(5)),
//     ])
})

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
    parse_statement("[ 4 ] value.",Stmt(Method(Blk(Stmt(Num(4))),Unary(PlnId('value')))))
    parse_statement("[ 4. 5 ] value.",Stmt(Method(BlkArgs([],[Stmt(Num(4)),Stmt(Num(5))]),Unary(PlnId('value')))))
    parse_statement("[ 4. 5. ] value.",Stmt(Method(BlkArgs([],[Stmt(Num(4)),Stmt(Num(5))]),Unary(PlnId('value')))))
})
test("block with args",() => {
    precedence("[ | ]",BlkArgs([],[]))
    precedence("[ x | ]",BlkArgs([PlnId('x')],[]))
    precedence("[ x | 4 ]",BlkArgs([PlnId('x')],[Stmt(Num(4))]))
    precedence("[ x y | 4. 5 ]",BlkArgs([PlnId('x'), PlnId('y')],[Stmt(Num(4)), Stmt(Num(5))]))
})
test('assignment',() => {
    precedence('v := 5',Ass(PlnId('v'),Num(5)))
    parse_statement('v := 5 .',Stmt(Ass(PlnId('v'),Num(5))))
    parse_statement(`[
        v := 5.
        v.
    ] value.`,Stmt(Method(BlkArgs([],[
        Stmt(Ass(PlnId('v'),Num(5))),
        Stmt(PlnId('v')),
    ]), Unary(PlnId('value')))))

})
test('return statement',() => {
    precedence('67',Num(67))
    precedence('^67',Ret(Num(67)))
    precedence('^(6+7)',Ret(Grp(Method(Num(6),Binary(SymId('+'),Num(7))))))
})
test('array literals',() => {
    precedence("{}",ListLit())
    precedence("{4 5}",ListLit(Num(4),Num(5)))
    precedence("{ 'a' 'b' }",ListLit(Str('a'),Str('b')))
    precedence("{ a:5 b:6 }",MapLit(MapPair(PlnId('a'),Num(5)), MapPair(PlnId('b'),Num(6))))
})
