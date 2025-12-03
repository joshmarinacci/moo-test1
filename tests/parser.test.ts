import test from "node:test";
import assert from "node:assert";
import {
    InputStream,
    Lit,
    OneOrMore,
    Or,
    Seq,
    ZeroOrMore,
    Range,
    Digit,
    Statement,
    RealExp,
    Group,
    Block, Operator,
    Identifier,
    StringLiteral,
    WS, parseAst, BlockBody, parseBlockBody, Exp, AnyNot,
    Comment,
    NumberLiteral, ArrayLiteral,
    SoloExp3
} from "../src/parser.ts";
import type {Rule} from "../src/parser.ts"
import {Num, Blk, Str, Grp, Id, Stmt, ListLit, Ret, Ast} from "../src/ast.ts"
import {match} from "./common.ts";

function matchOutput(source:string, rule:Rule) {
    let input = new InputStream(source,0);
    return rule(input).slice
}
function produces(source:string, rule:Rule) {
    let input = new InputStream(source,0);
    return rule(input).production
}

test ("test parser itself", () => {
    assert.ok(match("a",Lit("a")))
    assert.ok(match("a",Or(Lit("a"),Lit("b"))))
    assert.ok(match("b",Or(Lit("a"),Lit("b"))))
    assert.ok(!match("c",Or(Lit("a"),Lit("b"))))
    assert.ok(match("ab",Seq(Lit("a"),Lit("b"))))
    assert.ok(!match("ac",Seq(Lit("a"),Lit("b"))))
    assert.ok(match("abc",Seq(Lit("a"),Lit("b"),Lit("c"))))
    assert.ok(match("abc",Lit("abc")))
    assert.ok(match("abc",Seq(Lit("abc"))))
    assert.ok(match("1",Range("0","9")))
    assert.ok(!match("a",Range("0","9")))
    assert.ok(match("123",OneOrMore(Range("0","9"))))
    assert.ok(!match("abc",OneOrMore(Range("0","9"))))
    assert.ok(match("1",OneOrMore(Range("0","9"))))
    assert.ok(!match("z",OneOrMore(Range("0","9"))))
    assert.ok(match("8z",OneOrMore(Range("0","9"))))
    assert.ok(match("ab",Seq(ZeroOrMore(Lit("a")),Lit("b"))))
    assert.ok(match("b",Seq(ZeroOrMore(Lit("a")),Lit("b"))))
    assert.ok(!match("a",Seq(ZeroOrMore(Lit("a")),Lit("b"))))
    assert.ok(match("baaac", Seq(Lit('b'),ZeroOrMore(AnyNot(Lit('c'))),Lit('c'))))
})
test("parse integer",() => {
    assert.ok(match("4",Digit))
    assert.ok(match("44",NumberLiteral))
    assert.ok(!match("a",NumberLiteral))
    assert.equal(matchOutput("4",Digit),"4")
    assert.equal(matchOutput("44",NumberLiteral),"44")
    assert.equal(matchOutput("44845a",NumberLiteral),"44845")
    assert.ok(!match("a44845",NumberLiteral))
    assert.deepStrictEqual(produces("44",NumberLiteral),Num(44))
    assert.ok(match("-44",NumberLiteral))
    assert.deepStrictEqual(produces("-44",NumberLiteral),Num(-44))
    assert.deepStrictEqual(produces("67",NumberLiteral),Num(67))
    assert.deepStrictEqual(produces("6_7",NumberLiteral),Num(67))
})
test("parse float", () => {
    assert.deepStrictEqual(produces("-44.44",NumberLiteral),Num(-44.44))
    assert.deepStrictEqual(produces("0.44",NumberLiteral),Num(0.44))
    assert.deepStrictEqual(produces("0.4_4",NumberLiteral),Num(0.44))
    assert.deepStrictEqual(produces("0_0.44",NumberLiteral),Num(0.44))
})
test('parse alt base numbers',() => {
    assert.deepStrictEqual(produces("2r0001",NumberLiteral),Num(1))
    assert.deepStrictEqual(produces("2r1111",NumberLiteral),Num(15))
    assert.deepStrictEqual(produces("16r8",NumberLiteral),Num(8))
    assert.deepStrictEqual(produces("16rA",NumberLiteral),Num(10))
    assert.deepStrictEqual(produces("16rFF",NumberLiteral),Num(255))
    // assert.deepStrictEqual(produces("16rFFFF",Hexidecimal),Num(0xFFFF))
})
test("parse identifier",() => {
    assert.ok(match("abc",Identifier))
    assert.ok(match("ABC",Identifier))
    assert.ok(match("a2bc",Identifier))
    assert.ok(match("a_bc",Identifier))
    assert.ok(!match("1abc",Identifier))
    assert.ok(!match("_abc",Identifier))
    assert.deepStrictEqual(produces("abc",Identifier),Id("abc"))
    assert.deepStrictEqual(produces("abc:",Identifier),Id("abc:"))
})
test("parse string literal",() => {
    assert.ok(match(`'abc'`,StringLiteral))
    assert.ok(match(`"abc"`,StringLiteral))
    assert.ok(match(`''`,StringLiteral))
    assert.deepStrictEqual(produces(`'abc'`,StringLiteral),Str("abc"))
    assert.deepStrictEqual(produces(`''`,StringLiteral),Str(""))
    assert.deepStrictEqual(produces(`'a b c'`,StringLiteral),Str("a b c"))
})
test("parse operators",() => {
    assert.ok(match("+",Operator))
    assert.ok(match("-",Operator))
    assert.ok(match("*",Operator))
    assert.ok(match("/",Operator))
    assert.ok(!match("%",Operator))
    assert.ok(!match("[",Operator))
    assert.ok(!match(".",Operator))
    assert.deepStrictEqual(produces("+",Operator),Id("+"))
    assert.deepStrictEqual(produces("<",Operator),Id("<"))
    assert.deepStrictEqual(produces(">",Operator),Id(">"))
    assert.deepStrictEqual(produces("<=",Operator),Id("<="))
    assert.deepStrictEqual(produces(">=",Operator),Id(">="))
    assert.deepStrictEqual(produces("!=",Operator),Id("!="))
    assert.deepStrictEqual(produces("==",Operator),Id("=="))
    assert.deepStrictEqual(produces("+=",Operator),Id("+="))
    assert.deepStrictEqual(produces("-=",Operator),Id("-="))
    assert.deepStrictEqual(produces(":=",Operator),Id(":="))
    assert.deepStrictEqual(produces("::=",Operator),Id("::="))
})
test("parse array list literals",() => {
    assert.ok(match("{}",ArrayLiteral))
    assert.deepStrictEqual(produces("{}",ArrayLiteral),ListLit())
    assert.ok(match("{1}",ArrayLiteral))
    assert.deepStrictEqual(produces("{1}",ArrayLiteral),ListLit(Num(1)))
    assert.ok(match("{ 1 }",ArrayLiteral))
    assert.ok(match("{ }",ArrayLiteral))
    assert.ok(match("{ 4 }",ArrayLiteral))
    assert.ok(match("{ 4 5 }",ArrayLiteral))
    assert.deepStrictEqual(produces("{4 5}",ArrayLiteral),ListLit(Num(4),Num(5)))
    assert.ok(match("{ 4, 5 }",ArrayLiteral))
    assert.deepStrictEqual(produces("{ 4 , 5}",ArrayLiteral),ListLit(Num(4),Num(5)))
    assert.ok(match("{ 4, 5, 6 }",ArrayLiteral))
    assert.deepStrictEqual(produces("{ 4 , 5, 6}",ArrayLiteral),ListLit(Num(4),Num(5),Num(6)))
    assert.deepStrictEqual(produces("{ 4 , 5, 6} .",Statement),Stmt(ListLit(Num(4),Num(5),Num(6))))
})

test('parse array dict literals',() => {
    assert.ok(match("{}",ArrayLiteral))
    assert.ok(match("{a:5}",ArrayLiteral))
    assert.ok(match("{ a:5 }",ArrayLiteral))
    assert.ok(match("{ a:5 b:5 }",ArrayLiteral))
    assert.ok(match("{ abc:5 def:8 }",ArrayLiteral))
})

test("handle whitespace",() => {
    assert.ok(match("4",NumberLiteral))
    assert.ok(match("4 ",NumberLiteral))
    assert.ok(match(" ", Lit(" ")))
    assert.ok(match("     ", OneOrMore(Lit(" "))))
    assert.ok(match("     ", WS))
    assert.ok(match(" 4",Seq(WS,NumberLiteral)))
    assert.ok(match(" 4 ",Seq(WS,NumberLiteral)))
    assert.ok(match(" 4 5",Seq(WS,NumberLiteral,WS,NumberLiteral,WS)))
})
test("parse group",() => {
    assert.ok(match("(4)",Group))
    assert.deepStrictEqual(produces("(4)",Group),Grp(Num(4)))
    assert.ok(match("(id)",Group))
    assert.ok(match("( id )",Group))
    assert.ok(match("( ( id ) )",Group))
    assert.deepStrictEqual(produces("( ( 4 ) )",Group),Grp(Grp(Num(4))))
    assert.ok(!match("( ( id ) ",Group))
    assert.ok(!match("( ( 4 add 5 ) ",Group))
    assert.deepStrictEqual(produces("( 4 add )",Group),Grp(Num(4),Id('add')))
})

test("parse statement",() => {
    // assert.ok(match(".",Statement))
    // assert.deepStrictEqual(produces(".",Statement),Stmt())
    assert.ok(match("foo.",Statement))
    assert.deepStrictEqual(produces("foo",RealExp),Id("foo"))
    assert.deepStrictEqual(produces("abcdef.",Statement),Stmt(Id("abcdef")))
    assert.ok(match("foo .",Statement))
    assert.ok(match("bar foo .",Statement))
    assert.ok(match("4 add 5 .",Statement))
    assert.deepStrictEqual(produces("4 .",Statement),Stmt(Num(4)))
    assert.deepStrictEqual(produces("4 add 5 .",Statement),Stmt(Num(4),Id("add"),Num(5)))
    assert.ok(match("foo bar .",Statement))
    assert.ok(match("foo bar . foo bar.",BlockBody))
    assert.deepStrictEqual(produces("4 add 5 . 6 add 7 .",BlockBody),
        [
            Stmt(Num(4),Id("add"),Num(5)),
            Stmt(Num(6),Id("add"),Num(7),)
        ])

    assert.ok(match("return foo .",Statement))
    assert.ok(match("^ 67 .",Statement))
    assert.deepStrictEqual(produces("^ 67.",Statement),Stmt(Ret(),Num(67)))
})
test("parse block body", () => {
    // two statements
    assert.deepStrictEqual(parseBlockBody("4 add 5 . 6 add 7 ."),
        [
            Stmt(Num(4),Id("add"),Num(5)),
            Stmt(Num(6),Id("add"),Num(7),)
        ])
    // statement and solo expression
    assert.deepStrictEqual(parseBlockBody("4 add 5 . a  "),
        [
            Stmt(Num(4),Id("add"),Num(5)),
            Id('a'),
        ])
})
test("block",() => {
    assert.ok(match("[]",Block))
    assert.ok(match("[foo]",Block))
    assert.ok(match("[foo.]",Block))
    assert.ok(match("[ foo . ]",Block))
    assert.deepStrictEqual(produces("[foo.]",Block),Blk([],[Stmt(Id("foo"))]))
    assert.deepStrictEqual(produces("[foo. bar.]",Block),Blk([],[Stmt(Id("foo")),Stmt(Id("bar"))]))

    assert.ok(match("[x| ]", Block))
    assert.ok(match("[ x| ]", Block))
    assert.ok(match("[x | ]", Block))
    assert.ok(match("[x y | ]", Block))
    assert.ok(match("[ | ]", Block))
    assert.deepStrictEqual(produces("[x| 4.]",Block),Blk([Id('x')],[Stmt(Num(4))]))
})
test('parse expression',() => {
    assert.deepStrictEqual(parseAst("4 ."),Stmt(Num(4)))
    assert.deepStrictEqual(parseAst("(4)."),Stmt(Grp(Num(4))))
    assert.deepStrictEqual(parseAst("(add)."),Stmt(Grp(Id("add"))))
    assert.deepStrictEqual(parseAst("(4 + 5)."),Stmt(Grp(Num(4),Id("+"),Num(5))))
    assert.deepStrictEqual(parseAst("[foo.]."),Stmt(Blk([],[Stmt(Id("foo"))])))
})
test('parse comments',() => {
    assert.ok(match('//foo\n',Comment))
    // assert.ok(!match('//foo',Comment))
    assert.ok(!match('a//foo\n',Comment))
    assert.ok(!match('a//foo',Comment))

    assert.deepStrictEqual(parseBlockBody("4 add 5."),[
        Stmt(Num(4),Id('add'),Num(5)),
    ])
    assert.deepStrictEqual(parseBlockBody("//\n 4 add 5."),[
        Stmt(Num(4),Id('add'),Num(5)),
    ])
    assert.deepStrictEqual(parseBlockBody("4 //\n add 5."),[
        Stmt(Num(4),Id('add'),Num(5)),
    ])
    assert.deepStrictEqual(parseBlockBody("4  add //\n 5."),[
        Stmt(Num(4),Id('add'),Num(5)),
    ])
})

export function precedence(source:string, target:Ast|Array<Ast>) {
    console.log("====== " + source)
    let input = new InputStream(source.trim(),0);
    assert.deepStrictEqual(SoloExp3(input).production,target)
}

test('parse precedence',() => {
    console.log("precedence")
    precedence('foo',Id('foo'))
    precedence('4',Num(4))
    precedence('foo print',[Id("foo"),Id('print')])
    precedence('5 print',[Num(5),Id('print')])
    precedence('(5) print',[Grp(Num(5)),Id('print')])
    precedence('(foo) print',[Grp(Id("foo")),Id('print')])
    precedence('foo + bar ',[Id("foo"),[Id('+'),Id('bar')]])
    precedence('4 + bar ',[Num(4),[Id('+'),Id('bar')]])
    precedence('4 + 5 ',[Num(4),[Id('+'),Num(5)]])
    precedence('4 + (5) ',[Num(4),[Id('+'),Grp(Num(5))]])
    // precedence('4 + 5 + 6 ',[Num(4),[Id('+'),[Num(5), [Id('+'), Num(6)]]]])
    precedence('foo do: bar ',[Id("foo"),[[Id('do:'),Id('bar')]]])
    precedence('4 do: 5 ',[Num(4),[[Id('do:'),Num(5)]]])
    precedence('(4) do: 5 ',[Grp(Num(4)),[[Id('do:'),Num(5)]]])
    precedence('foo := 4 do: 5 ',[ Id('foo'),  [Num(4),[[Id('do:'),Num(5)]]]     ]  )
    // precedence('foo := ( 4 do: 5 ) ',[ Id('foo'),  Grp(Num(4),[[Id('do:'),Num(5)]]     )  ])
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
