import test from "node:test";
import assert from "node:assert";

type char = number
type Rule = (input:InputStream) => ParseResult;
const debug = true
const l = (...args:any[]) => {
    if(debug) console.log("DEBUG",...args)
}
// const Char = (ch:string):number => ch.charCodeAt(0);

function Range(start: string, end: string):Rule {
    return (input:InputStream) => {
        let value = input.currentToken()
        console.log(`rule is ${value} within ${start} ${end}`)
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
            l(`checking ${i}`,input.currentToken(), pass)
            l("current input ",input)
            if (!pass.succeeded()) return input.okay(i)
        }
    }
}

function Or(rule:Rule, rule:Rule) {

}

function Seq(...rules:Rule[]):Rule {
    return function (value:string) {
        for(const i in rules) {
            let rule = rules[i];
            if(!rule(value[i]))  {
                return false
            }
        }
        return true
    }
}

let Digit = Range("0","9");
let Letter = Range("a","z");

let AstInt = (value:number)=> ({type:'int',value:value});
let AstStr = (value:string)=> ({type:'str',value:value});

let Integer = OneOrMore(Digit)
let Identifier = OneOrMore(Letter)

let Exp = Or(Integer,Identifier)

class InputStream {
    private readonly position: number;
    private readonly input: string;
    constructor(input:string, position: number) {
        this.input = input;
        this.position = position;
    }
    currentToken():string{
        return this.input[this.position]
    }
    okay(used:number):ParseResult{
        let res = new ParseResult(this.input,this.position,used,true)
        console.log(`making parse result`,res)
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

function matches(input:string):ParseResult {
    let result:ParseResult = Integer(input)
    l(`Integer matches? ${input} => ${result}`)
    return result
}
function parse(input: string) {
    l("parsing",input)
    l("matching", Integer(input))
}

test("parse integer",() => {
    assert.ok(Digit(new InputStream("4",0)).succeeded())
    assert.ok(Integer(new InputStream("44",0)).succeeded())
    assert.ok(Integer(new InputStream("a",0)).failed())
    assert.equal(Integer(new InputStream("44",0)).source(),"44")
    assert.equal(Integer(new InputStream("44845a",0)).source(),"44845")
    assert.ok(Integer(new InputStream("a44845",0)).failed())
})

test("parse exp",() => {
    assert.ok(Exp(new InputStream("4",0)).succeeded())
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