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
    production: unknown
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
    return function lit(input:InputStream) {
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
        let prods = []
        while(true) {
            i+=1
            let pass = rule(input.advance(i))
            if (!pass.succeeded()) {
                let res = input.okay(i)
                res.production = prods
                return res
            } else {
                if (pass.production) {
                    prods.push(pass.production)
                }
            }
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
function Or(...rules:Rule[]) {
    return function(input:InputStream) {
        let count = 0
        for (const i in rules) {
            let rule = rules[i]
            let pass = rule(input)
            if(pass.succeeded()) {
                return pass
            }
        }
        return input.fail()
    }
}
function Seq(...rules:Rule[]):Rule {
    return function seq(input:InputStream) {
        let count = 0
        let prods = []
        for(const i in rules) {
            let rule = rules[i];
            let pass = rule(input.advance(count))
            if (pass.failed()) return pass
            count += pass.used
            if(pass.production) {
                prods.push(pass.production)
            }
        }
        let pass = input.okay(count)
        pass.production = prods
        return pass
    }
}

function withProduction(rule:Rule, cb:(pass:ParseResult)=>unknown) {
    return function (input:InputStream) {
        let pass = rule(input)
        if (pass.succeeded()) {
            let prod = cb(pass)
            if(prod) {
                pass.production = prod
            }
        }
        return pass
    }
}
let Whitespace = Optional(OneOrMore(Lit(" ")))
let Digit = Range("0","9");
let Letter = Range("a","z");
let QQ = Lit('"')
let Underscore = Lit("_")
let Integer = withProduction(OneOrMore(Or(Digit,Underscore)),(res) => {
    return ({type:'num',value:parseInt(res.slice)})
})
let Identifier = withProduction(Seq(Letter,ZeroOrMore(Or(Letter,Digit,Underscore))),(res)=>{
    return res.slice
})
let StringLiteral = withProduction(Seq(QQ,ZeroOrMore(Letter),QQ),(res) => {
    return ({type:'str', value:res.slice.substring(1,res.slice.length-1)})
})
let Operator = withProduction(Or(Lit("+"),Lit("-"),Lit("*"),Lit("/")),(res)=>{
    return res.slice
})
let RealExp = Lit("dummy")
let Exp = (input:InputStream) => RealExp(input)
let Group = withProduction(Seq(Lit("("),Whitespace,Exp,Whitespace,Lit(")"),Whitespace),(res)=>{
    return ({type:'group',value:res.production})
})
let Statement = Seq(ZeroOrMore(Seq(Whitespace,Exp)),Whitespace,Lit("."))
let Block = Seq(ZeroOrMore(Statement))
// fix the recursion
RealExp = Seq(Or(Integer,Identifier,Operator,StringLiteral,Group))

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

type LitNumNode = {
    type:'num',
    value:number
}
type LitStrNode = {
    type:'str',
    value:string
}
type ASTNode = LitNumNode | LitStrNode
const ASTLitNum = (value:number) => ({type:'num', value})
const ASTStrNum = (value:string) => ({type:'str',value})

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
    assert.equal(matchOutput("4",Digit),"4")
    assert.equal(matchOutput("44",Integer),"44")
    assert.equal(matchOutput("44845a",Integer),"44845")
    assert.ok(!match("a44845",Integer))
    assert.deepStrictEqual(produces("44",Integer),ASTLitNum(44))
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
    assert.deepStrictEqual(produces(`"abc"`,StringLiteral),ASTStrNum("abc"))
    assert.deepStrictEqual(produces(`""`,StringLiteral),ASTStrNum(""))
})
test("parse operators",() => {
    assert.ok(match("+",Operator))
    assert.ok(match("-",Operator))
    assert.ok(match("*",Operator))
    assert.ok(match("/",Operator))
    assert.ok(!match("%",Operator))
    assert.ok(!match("[",Operator))
    assert.ok(!match(".",Operator))
    assert.equal(produces("+",Operator),"+")
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
    assert.ok(match("( ( id ) )",Group))
    assert.ok(!match("( ( id ) ",Group))
    assert.ok(!match("( ( 4 add 5 ) ",Group))
})
test("parse statement",() => {
    assert.ok(match(".",Statement))
    assert.ok(match("foo.",Statement))
    assert.ok(match("foo .",Statement))
    assert.ok(match("foo bar .",Statement))
    assert.ok(match("4 add 5 .",Statement))
    assert.ok(match("foo bar .",Statement))
})
test("block",() => {
    assert.ok(match("[]",Block))
    assert.ok(match("[foo]",Block))
    assert.ok(match("[foo .]",Block))
})

