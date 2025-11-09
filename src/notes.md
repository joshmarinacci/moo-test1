

```typescript

let Digit = Range("0","9");
let Letter = Or(Range("A","Z"),Range("a","z"))
let AlphaNum = Or(Digit, Letter)
let Integer = OneOrMore(Digit)
let Float = Seq(OneOrMore(Digit),Lit("."),OneOrMore(Digit))
let Identifier = Seq(One(Letter),ZeroOrMore(Or(AlphaNum)))
let QQ = Seq('"')
let Period = Seq('.')
let StringLit = Seq(QQ,AnyNot(QQ),QQ)
let Group = Seq(LeftParen,Exp,RightParen)
let Statement = Seq(ZeroOrMore(Exp),Period)
let Block = Seq(LeftBracket,ZeroOrMore(Statement), RightBracket)
let Space = Or(Lit(" "),Lit("\n"))

let Literal = Or(StringLit, Integer, Float) 
let SExp = Or(Literal, Identifier, Group, Block)
let Exp = Seq(ZeroOrMore(Space),SExp)


test("foo",() => {
    assert.equals(parse("42"),LitInt(42))
    assert.equals(parse("8_8"),LitInt(88))
    assert.equals(parse("0"),LitInt(0))
    
    assert.equals(parse("0.0"),LitFloat(0.0))
    assert.equals(parse("12.345"),LitFloat(12.345))
    assert.equals(parse("a.0"),Error())
    
    assert.equals(parse("abc123"),Ident("abc123"))
    assert.equals(parse("abc_def"),Ident("abc_def"))
    assert.equals(parse("12abc"),Error())

    assert.equals(parse('"this is a string"'),LitString("this is a string"))

    assert.equals(parse("(4)"),Group(LitInt(4)))
    assert.equals(parse("(4 add 5)"),Group(LitInt(4),Ident("add"),LitInt(5)))
    assert.equals(parse("4 add 5."),Statement(LitInt(4),Ident("add"),LitInt(5)))
    assert.equals(parse("[4 add 5.]"),Block(Statement(LitInt(4),Ident("add"),LitInt(5))))
})

```





