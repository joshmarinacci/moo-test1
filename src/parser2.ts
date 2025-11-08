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
        let res = input.okay(value.length)
        res.production = value
        return res
    }
}
function Range(start: string, end: string):Rule {
    return function range(input:InputStream) {
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
    return function zero_or_more(input:InputStream) {
        let count = 0;
        let prods = []
        while(true) {
            let pass = rule(input.advance(count))
            if (pass.succeeded()) {
                count += pass.used
                prods.push(pass.production)
            }
            if (!pass.succeeded()) {
                let res =  input.okay(count)
                res.production = prods
                return res
            }
        }
    }
}
function OneOrMore(rule:Rule):Rule {
    return function(input:InputStream) {
        let pass = rule(input);
        if (!pass.succeeded()) {
            return input.fail()
        }
        let count = 0;
        let prods = []
        while(true) {
            let pass = rule(input.advance(count))
            if (pass.succeeded()) {
                count += pass.used
                prods.push(pass.production)
            }
            if (!pass.succeeded()) {
                let res = input.okay(count)
                res.production = prods
                return res
            }
        }
    }
}
function Optional(rule:Rule):Rule {
    return function opt(input:InputStream) {
        let res = rule(input);
        if(res.succeeded()) {
            return res
        } else {
            return input.okay(0)
        }
    }
}
function Or(...rules:Rule[]) {
    return function or(input:InputStream) {
        for (const i in rules) {
            let rule = rules[i]
            let res = rule(input)
            if(res.succeeded()) {
                return res
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
            prods.push(pass.production)
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
            pass.production = cb(pass)
        }
        return pass
    }
}
let Whitespace = withProduction(
    Optional(OneOrMore(Lit(" ")))
    ,(res) => undefined) // remove all whitespace from the tree
let Digit = Range("0","9");
let Letter = Range("a","z");
let QQ = Lit('"')
let Underscore = Lit("_")
let Integer = withProduction(OneOrMore(Or(Digit,Underscore)),(res) => {
    return ({type:'num',value:parseInt(res.slice)})
})
let Identifier = withProduction(
    Seq(Letter,ZeroOrMore(Or(Letter,Digit,Underscore)))
    ,(res)=> Id(res.slice))
let StringLiteral = withProduction(
    Seq(QQ,ZeroOrMore(Letter),QQ)
    ,(res) => Str(res.slice.substring(1, res.slice.length - 1)))
let Operator = withProduction(
    Or(Lit("+"),Lit("-"),Lit("*"),Lit("/"))
    ,(res)=> Id(res.slice)) // operators are identifiers too
let RealExp = Lit("dummy")
let Exp = (input:InputStream) => RealExp(input)
let Group = withProduction(
    Seq(Lit("("),Whitespace,Exp,Whitespace,Lit(")"),Whitespace)
    ,(res)=>{
        let value = res.production as Array<Ast>
        return Grp(value[2])
    })
let Statement = withProduction(
    Seq(ZeroOrMore(Seq(Whitespace,Exp)),Whitespace,Lit("."))
    ,(res)=>{
        // flatten and filter out the undefineds
        let vals = res.production as Ast[]
        // console.log("statement before",vals)
        vals = vals.flat(10)
        vals = vals.filter(v => v !== undefined)
        // remove the period
        vals.pop()
        // console.log("statement after",vals)
        return Stmt(...vals)
    })
let Block = withProduction(
    Seq(Lit("["),ZeroOrMore(Statement),Lit("]"),Whitespace)
    ,(res) =>{
        // console.log("block producting",res.production[1])
        return Blk(... res.production[1])
    })
// fix the recursion
RealExp = withProduction(
    Or(Integer,Identifier,Operator,StringLiteral,Group)
    ,(res)=>{
    return res.production
})

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

type NumAst = {
    type:'num',
    value:number
}
type StrAst = {
    type:'str',
    value:string
}
type StmtAst = {
    type:'stmt',
    value:Ast[]
}
type IdAst = {
    type:'id',
    value:string
}
type GroupAst = {
    type:'group',
    value:Ast[]
}
type BlockAst = {
    type:'block',
    value:Ast[]
}
type Ast = NumAst | StrAst | StmtAst | IdAst | GroupAst | BlockAst
const Num = (value:number) => ({type:'num', value} as NumAst)
const Str = (value:string) => ({type:'str',value} as StrAst)
const Stmt = (...args:Ast[]) => ({type:'stmt', value:Array.from(args)} as StmtAst)
const Blk = (...args:Ast[]) => ({type:'block', value:Array.from(args)} as BlockAst)
const Id =(value:string) => ({type:'id',value:value} as IdAst)
const Grp = (...args:Ast[]) => ({type:'group',value: Array.from(args)}as GroupAst)

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
    assert.deepStrictEqual(produces("44",Integer),Num(44))
})
test("parse identifier",() => {
    assert.ok(match("abc",Identifier))
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
    assert.deepStrictEqual(produces("(4)",Group),{
        type:'group',
        value:[Num(4)]
    })
    assert.ok(match("(id)",Group))
    assert.ok(match("( id )",Group))
    assert.ok(match("( ( id ) )",Group))
    assert.deepStrictEqual(produces("( ( 4 ) )",Group),{
        type:'group',
        value:[{
            type: 'group',
            value: [Num(4)]
        }]
    })
    assert.ok(!match("( ( id ) ",Group))
    assert.ok(!match("( ( 4 add 5 ) ",Group))
})

test("parse statement",() => {
    assert.ok(match(".",Statement))
    assert.deepStrictEqual(produces(".",Statement),Stmt())
    assert.ok(match("foo.",Statement))
    assert.deepStrictEqual(produces("foo",RealExp),Id("foo"))
    assert.deepStrictEqual(produces("abcdef.",Statement),Stmt(Id("abcdef")))
    assert.ok(match("foo .",Statement))
    assert.ok(match("bar foo .",Statement))
    assert.ok(match("4 add 5 .",Statement))
    assert.deepStrictEqual(produces("4 .",Statement),Stmt(Num(4)))
    assert.deepStrictEqual(produces("4 add 5 .",Statement),Stmt(Num(4),Id("add"),Num(5)))
    assert.ok(match("foo bar .",Statement))
})
test("block",() => {
    assert.ok(match("[]",Block))
    // assert.ok(match("[foo]",Block))
    assert.ok(match("[foo.]",Block))
    assert.deepStrictEqual(produces("[foo.]",Block),Blk(Stmt(Id("foo"))))
    assert.deepStrictEqual(produces("[foo. bar.]",Block),Blk(Stmt(Id("foo")),Stmt(Id("bar"))))
})

