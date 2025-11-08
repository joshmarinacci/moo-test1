import test from "node:test";
import assert from "node:assert";

type char = number
type Rule = (input:InputStream) => ParseResult;
const debug = true
const l = (...args:any[]) => {
    if(debug) console.log("DEBUG",...args)
}
// const Char = (ch:string):number => ch.charCodeAt(0);

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

let AstInt = (value:number)=> ({type:'int',value:value});
let AstStr = (value:string)=> ({type:'str',value:value});

let Integer = OneOrMore(Digit)
let Identifier = OneOrMore(Letter)

let Exp = Or(Integer,Identifier)
let Group = Seq(Lit("("),Exp,Lit(")"))

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
    constructor(input:string, position:number,used:number, success:boolean) {
        this.input = input;
        this.position = position;
        this.used = used
        this.success = success;
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

// function matches(input:string):ParseResult {
//     let result:ParseResult = Integer(input)
//     l(`Integer matches? ${input} => ${result}`)
//     return result
// }
// function parse(input: string) {
//     l("parsing",input)
//     l("matching", Integer(input))
// }
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

test("parse exp",() => {
    assert.ok(match("4",Exp))
    assert.equal(Exp(new InputStream("4",0)).source(),'4')
    assert.equal(Exp(new InputStream("4",0)).used,1)
    assert.ok(match("(4)",Group))
    assert.ok(match("(id)",Group))
    // assert.equal(Group(new InputStream("(4)",0)).used,3)
    // assert.ok(Integer(new InputStream("44",0)).succeeded())
    // assert.ok(Integer(new InputStream("a",0)).failed())
    // assert.equal(Integer(new InputStream("44",0)).source(),"44")
    // assert.equal(Integer(new InputStream("44845a",0)).source(),"44845")
    // assert.ok(Integer(new InputStream("a44845",0)).failed())
    // assert.ok(matches("44"))
    // assert.ok(!matches("4a"))
    // assert.deepEqual(parse("4"),AstInt(4),'4 not parsed');
    // assert.deepEqual(parse("44"),AstInt(44),'44 not parsed');
    // assert.deepEqual(parse("a"),AstStr("a"));
})