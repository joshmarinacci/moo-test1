

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



# next up

- [x] Lists are having a shared js list array.
- [ ] collections
  - [x] List, Dict, Set == by reference to start
  - [x] new JSset impl
  - [ ] List print. impl in ST by mapping to str then joining with add.
  - [ ] Dict print
  - [ ] Set print
- [x] Object ==  same name, same hashcode. same JS ref?
- [ ] expose Object isKindOf:
  - this uses boolean object, so we need to add it later in the init process.
- [ ] units
  - [x] 10 unit: “meters”
  - [x] Turns into UnitNumber with new arithmetic functions
  - [x] Print turns into string
  - [ ] Number withUnit: unit. returns UnitNumber
  - [ ] 10m * 2ft as: “square inches”
  - [ ] UnitNumber as: unit.  returns new number with the unit conversion, or throws error. ex: 10m * 2ft as "square inch". 
  - [ ] unit: sets the unit. turns string into proper unit object. can parse dimensions too.
  - [ ] make Unit enum. Meters, Millimeters, Feet, Inches
  - [ ] update parser to support 10.5_meters shorthand.
  - [ ] Number_unitname is sugar for UnitNumber amount: number unit: unitname.

```smalltalk
Unit makeMethod: "init" [ 
  Meter ::= Unit clone. 
  Meter name: 'meter'.
  Millimeter ::= Unit clone.
  Millimeter name: 'millimeter'.
  Meter addConversion: Millimeter 1000.
  Millimeter addConversion: Meter 0.001. 
].
Unit makeMethod: "print": [
  self name.
].  
Unit makeMethod: "hashcode": [
  ("unit_" + (self name)).
]

Unit init.
 
 
A ::= (5 unit: (Unit Meter)).
B ::= (0.5 unit: (Unit Meter)).
C ::= ((A + B) as: (Unit Millimeter)).
Debug equals (C amount) 5500.
Debug equals (C unit) (Unit Millimeter).
Debug equals (C dimension) 1.

```


* delegation
  * capture does not understand to resend a message to another target.
  * number.append doesn't exist. is caught. resends to number.print.
  * `5 append: 5` returns the *string* `55`.
  * Number.doesNotUnderstand [mess args | (self print) sendMessage mess args.


## GUI and GFX and Output

* Design simple gfx and input model for interactive code browser
  - [ ] Show list of current objects and methods
  - [ ] Manipulate the DOM directly
  - [ ] DomProxy to access the dom.
  - [ ] AsDOM to render self to an html element
  - [ ] View but not edit source code
  - [ ] Splat the entire object graph to and from JSON and local storage
  - [ ] Render. List of classes. Project to DOM LI
  - [ ] Button to trigger loading and rendering the scope
  - [ ] ObjectBrowser render: DOMProxy.  

Page loads JS source to set up the entire env.  There is a plain JS button. Clicking the button will invoke 
```
[
  dom ::= ((DOMProxy clone) init).
  ObjectBrowserDemo render: dom.
] value. 

```



## parser
Fix precedence of parsing so that we don't need so many parens
 unary > binary > keyword

```typescript
import {ZeroOrMore} from "./parser";

Colon = Lit(":")
Underscore = Lit("_")

AlphaNumUnder = Or(Alpha, Digit, Underscore);
PlainId = Seq(Alpha, OneOrMore(AlphaNumUnder))
SymbolID = OneOrMore(Sym)
KeywordID = Seq(Alpha, OneOrMore(AlphaNumUnder), Colon)
UnarySend = PlainId()
BinarySend = Seq(SymbolId, SoloExp)
KeywordSend = OneOrMore(Seq(KeywordId, SoloExp))
MessageSend = Seq(Receiver, Or(UnarySend, BinarySend, KeywordSend))
Group       = Seq(OpenParen, SoloExp, CloseParen)
SoloExp = Or(Group, MessageSend, Literal, Reference)
Statement = Seq(SoloExp, Period)
BlockBody = Seq(ZeroOrMore(Statement),Optional(SoloExp))
``` 


Debug print: 4 + 5. -> Debug.print(4.add(5));






## Ideas

* How can do worlds? be able to 'fork' the world, do crazy stuff, then diff between the world and it's parent world. should be lazy copy on write. 