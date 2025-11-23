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
    Integer,
    Block, Operator, Identifier, StringLiteral, WS, parseAst, BlockBody, parseBlockBody, Exp, AnyNot, Comment
} from "./parser.ts";
import type {Rule} from "./parser.ts"
import {Num, Blk, Str, Grp, Id, Stmt} from "./ast.ts"

function match(source:string, rule:Rule) {
    // console.log("=======")
    let input = new InputStream(source,0);
    return rule(input).succeeded()
}
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
    assert.ok(match("44",Integer))
    assert.ok(!match("a",Integer))
    assert.equal(matchOutput("4",Digit),"4")
    assert.equal(matchOutput("44",Integer),"44")
    assert.equal(matchOutput("44845a",Integer),"44845")
    assert.ok(!match("a44845",Integer))
    assert.deepStrictEqual(produces("44",Integer),Num(44))
})
test("parse identifier",() => {
    assert.ok(match("abc",Identifier))
    assert.ok(match("ABC",Identifier))
    assert.ok(match("a2bc",Identifier))
    assert.ok(match("a_bc",Identifier))
    assert.ok(!match("1abc",Identifier))
    assert.ok(!match("_abc",Identifier))
    assert.deepStrictEqual(produces("abc",Identifier),Id("abc"))
})
test("parse string literal",() => {
    assert.ok(match(`"abc"`,StringLiteral))
    assert.ok(match(`""`,StringLiteral))
    assert.deepStrictEqual(produces(`"abc"`,StringLiteral),Str("abc"))
    assert.deepStrictEqual(produces(`""`,StringLiteral),Str(""))
    assert.deepStrictEqual(produces(`"a b c"`,StringLiteral),Str("a b c"))
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
    assert.deepStrictEqual(produces("==",Operator),Id("=="))
    assert.deepStrictEqual(produces(":=",Operator),Id(":="))
    assert.deepStrictEqual(produces("::=",Operator),Id("::="))
})

test("handle whitespace",() => {
    assert.ok(match("4",Integer))
    assert.ok(match("4 ",Integer))
    assert.ok(match(" ", Lit(" ")))
    assert.ok(match("     ", OneOrMore(Lit(" "))))
    assert.ok(match("     ", WS))
    assert.ok(match(" 4",Seq(WS,Integer)))
    assert.ok(match(" 4 ",Seq(WS,Integer)))
    assert.ok(match(" 4 5",Seq(WS,Integer,WS,Integer,WS)))
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
})
test("parse block body", () => {
    assert.deepStrictEqual(parseBlockBody("4 add 5 . 6 add 7 ."),
        [
            Stmt(Num(4),Id("add"),Num(5)),
            Stmt(Num(6),Id("add"),Num(7),)
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

