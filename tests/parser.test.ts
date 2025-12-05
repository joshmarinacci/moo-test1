import test from "node:test";
import assert from "node:assert";
import {Num, PlnId, Str, SymId, Grp, Method, Unary, Binary, Blk, Stmt, BlkArgs, Ret, Cmnt} from "../src/ast2.ts"
import {match} from "./common.ts";
import {parse_statement, precedence} from "./parser3.test.ts";

// test ("test parser itself", () => {
//     assert.ok(match("a",Lit("a")))
//     assert.ok(match("a",Or(Lit("a"),Lit("b"))))
//     assert.ok(match("b",Or(Lit("a"),Lit("b"))))
//     assert.ok(!match("c",Or(Lit("a"),Lit("b"))))
//     assert.ok(match("ab",Seq(Lit("a"),Lit("b"))))
//     assert.ok(!match("ac",Seq(Lit("a"),Lit("b"))))
//     assert.ok(match("abc",Seq(Lit("a"),Lit("b"),Lit("c"))))
//     assert.ok(match("abc",Lit("abc")))
//     assert.ok(match("abc",Seq(Lit("abc"))))
//     assert.ok(match("1",Range("0","9")))
//     assert.ok(!match("a",Range("0","9")))
//     assert.ok(match("123",OneOrMore(Range("0","9"))))
//     assert.ok(!match("abc",OneOrMore(Range("0","9"))))
//     assert.ok(match("1",OneOrMore(Range("0","9"))))
//     assert.ok(!match("z",OneOrMore(Range("0","9"))))
//     assert.ok(match("8z",OneOrMore(Range("0","9"))))
//     assert.ok(match("ab",Seq(ZeroOrMore(Lit("a")),Lit("b"))))
//     assert.ok(match("b",Seq(ZeroOrMore(Lit("a")),Lit("b"))))
//     assert.ok(!match("a",Seq(ZeroOrMore(Lit("a")),Lit("b"))))
//     assert.ok(match("baaac", Seq(Lit('b'),ZeroOrMore(AnyNot(Lit('c'))),Lit('c'))))
// })
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

// test("parse array list literals",() => {
//     assert.ok(match("{}",ArrayLiteral))
//     assert.deepStrictEqual(produces("{}",ArrayLiteral),ListLit())
//     assert.ok(match("{1}",ArrayLiteral))
//     assert.deepStrictEqual(produces("{1}",ArrayLiteral),ListLit(Num(1)))
//     assert.ok(match("{ 1 }",ArrayLiteral))
//     assert.ok(match("{ }",ArrayLiteral))
//     assert.ok(match("{ 4 }",ArrayLiteral))
//     assert.ok(match("{ 4 5 }",ArrayLiteral))
//     assert.deepStrictEqual(produces("{4 5}",ArrayLiteral),ListLit(Num(4),Num(5)))
//     assert.ok(match("{ 4, 5 }",ArrayLiteral))
//     assert.deepStrictEqual(produces("{ 4 , 5}",ArrayLiteral),ListLit(Num(4),Num(5)))
//     assert.ok(match("{ 4, 5, 6 }",ArrayLiteral))
//     assert.deepStrictEqual(produces("{ 4 , 5, 6}",ArrayLiteral),ListLit(Num(4),Num(5),Num(6)))
//     assert.deepStrictEqual(produces("{ 4 , 5, 6} .",Statement),Stmt(ListLit(Num(4),Num(5),Num(6))))
// })
// test('parse array dict literals',() => {
//     assert.ok(match("{}",ArrayLiteral))
//     assert.ok(match("{a:5}",ArrayLiteral))
//     assert.ok(match("{ a:5 }",ArrayLiteral))
//     assert.ok(match("{ a:5 b:5 }",ArrayLiteral))
//     assert.ok(match("{ abc:5 def:8 }",ArrayLiteral))
// })
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
// test('parse JS method call syntax', () => {
//     // assert.ok(match("a",Identifier))
//     // assert.deepStrictEqual(produces("a",Exp),Id('a'))
//     assert.deepStrictEqual(produces("a()",FunctionCall),FunCall([Id('a')],[]))
//     assert.deepStrictEqual(produces("a(5)",FunctionCall),FunCall([Id('a')],[Num(5)]))
//     assert.deepStrictEqual(produces("a(5,6)",FunctionCall),FunCall([Id('a')],[Num(5),Num(6)]))
//     assert.deepStrictEqual(produces("a.b(5)",FunctionCall),FunCall([Id('a'),Id('b')],[Num(5)]))
//     assert.deepStrictEqual(produces("a.b(5,6)",FunctionCall),FunCall([Id('a'),Id('b')],[Num(5),Num(6)]))
//     assert.deepStrictEqual(produces("b(5).c()",Exp),FunCall([FunCall([Id('b')],[Num(5)]),Id('c')],[]));
//     // assert.deepStrictEqual(produces("b(5).c(6)",Exp),FunCall(FunCall(Id('nil'),'b',[]),'c',[Num(6)]));
// })
