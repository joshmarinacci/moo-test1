import test from "node:test";
import assert from "node:assert";

type Rule = (input:InputStream) => ParseResult;
class InputStream {
    private readonly position: number;
    readonly input: string;
    constructor(input:string, position: number) {
        this.input = input;
        this.position = position;
    }
    currentToken():string{
        return this.input[this.position]
    }
    okay(used:number):ParseResult{
        let res = new ParseResult(this.input,this.position,used,true)
        return res
    }
    fail():ParseResult{
        return new ParseResult(this.input,this.position,0,false)
    }
    advance(i: number) {
        return new InputStream(this.input,this.position+i)
    }
}
class ParseResult {
    readonly input: string
    position: number;
    used:number;
    success: boolean;
    readonly slice: string;
    constructor(input:string, position:number,used:number, success:boolean) {
        this.input = input;
        this.position = position;
        this.used = used
        this.success = success;
        this.slice = this.input.slice(this.position,this.position+this.used)
    }
    succeeded():boolean {
        return this.success;
    }
    source():string {
        return this.input.slice(this.position,this.position+this.used);
    }
    failed() {
        return !this.success;
    }
}

function Lit(value:string) {
    return function (input:InputStream) {
        for(let i=0; i<value.length; i++) {
            let tok = input.advance(i).currentToken()
            let char = value[i]
            if (tok != char) {
                return input.fail()
            }
        }
        return input.okay(value.length)
    }
}
function Range(start: string, end: string):Rule {
    return (input:InputStream) => {
        let value = input.currentToken()
        // console.log(`rule is ${value} within ${start} ${end}`)
        if(value >= start && value <= end) {
            return input.okay(1)
        } else {
            return input.fail()
        }
    };
}
function ZeroOrMore(rule:Rule):Rule {
    return function(input:InputStream) {
        let i = 0;
        while(true) {
            let pass = rule(input.advance(i))
            if (!pass.succeeded()) return input.okay(i)
            i+=1
        }
    }
}
function OneOrMore(rule:Rule):Rule {
    return function(input:InputStream) {
        let pass = rule(input);
        if (!pass.succeeded()) {
            return input.fail()
        }
        let i = 0;
        while(true) {
            i+=1
            let pass = rule(input.advance(i))
            // l(`checking ${i}`,input.currentToken(), pass)
            // l("current input ",input)
            if (!pass.succeeded()) return input.okay(i)
        }
    }
}
function Optional(rule:Rule):Rule {
    return function(input:InputStream) {
        let pass = rule(input);
        if(pass.succeeded()) {
            return pass
        } else {
            return input.okay(0)
        }
    }
}
function Or(rule1:Rule, rule2:Rule) {
    return function(input:InputStream) {
        let pass = rule1(input)
        if (pass.succeeded()) {
            return pass
        }
        let pass2 = rule2(input)
        if(pass2.succeeded()) {
            return pass2
        }
        return input.fail()
    }
}
function Seq(...rules:Rule[]):Rule {
    return function (input:InputStream) {
        let count = 0
        for(const i in rules) {
            let rule = rules[i];
            let pass = rule(input.advance(count))
            if (pass.failed()) return pass
            count += pass.used
        }
        return input.okay(count)
    }
}

let Digit = Range("0","9");
let Letter = Range("a","z");
let Integer = OneOrMore(Digit)
let Identifier = OneOrMore(Letter)
let Whitespace = Optional(OneOrMore(Lit(" ")))
let Exp = Or(Integer,Identifier)
let Group = Seq(Lit("("),Whitespace,Exp,Whitespace,Lit(")"),Whitespace)
let StringLiteral = Seq(Lit('"'),ZeroOrMore(Letter),Lit('"'))

function match(source:string, rule:Rule) {
    // console.log("=======")
    let input = new InputStream(source,0);
    return rule(input).succeeded()
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
})
test("parse integer",() => {
    assert.ok(match("4",Digit))
    assert.ok(match("44",Integer))
    assert.ok(!match("a",Integer))
    assert.equal(Integer(new InputStream("44",0)).source(),"44")
    assert.equal(Integer(new InputStream("44845a",0)).source(),"44845")
    assert.equal(Integer(new InputStream("44845a",0)).used,5)
    assert.ok(!match("a44845",Integer))
})
test("parse identifier",() => {
    assert.ok(match("abc",Identifier))
    assert.ok(match("a2bc",Identifier))
    assert.ok(match("a_bc",Identifier))
    assert.ok(!match("1abc",Identifier))
    assert.ok(!match("_abc",Identifier))
})
test("parse string literal",() => {
    assert.ok(match(`"abc"`,StringLiteral))
    assert.ok(match(`""`,StringLiteral))
})

test("handle whitespace",() => {
    assert.ok(match("4",Integer))
    assert.ok(match("4 ",Integer))
    assert.ok(match(" ", Lit(" ")))
    assert.ok(match("     ", OneOrMore(Lit(" "))))
    assert.ok(match("     ", Whitespace))
    assert.ok(match(" 4",Seq(Whitespace,Integer)))
    assert.ok(match(" 4 ",Seq(Whitespace,Integer)))
    assert.ok(match(" 4 5",Seq(Whitespace,Integer,Whitespace,Integer,Whitespace)))
})
test("parse group",() => {
    assert.ok(match("(4)",Group))
    assert.ok(match("(id)",Group))
    assert.ok(match("( id )",Group))
})