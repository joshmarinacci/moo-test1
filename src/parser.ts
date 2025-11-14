import type {Ast} from "./ast.ts";
import {Blk, Grp, Id, Num, Stmt, Str} from "./ast.ts"

export type Rule = (input:InputStream) => ParseResult;
export class InputStream {
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
export class ParseResult {
    readonly input: string
    position: number;
    used:number;
    success: boolean;
    readonly slice: string;
    production: Ast
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

export function Lit(value:string) {
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
export function Range(start: string, end: string):Rule {
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
export function ZeroOrMore(rule:Rule):Rule {
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
export function AnyNot(rule:Rule):Rule {
    return function any_not(input:InputStream) {
        let res = rule(input)
        if(res.succeeded()) {
            return input.fail()
        } else {
            return input.okay(1)
        }
    }
}
export function OneOrMore(rule:Rule):Rule {
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
export function Optional(rule:Rule):Rule {
    return function opt(input:InputStream) {
        let res = rule(input);
        if(res.succeeded()) {
            return res
        } else {
            return input.okay(0)
        }
    }
}
export function Or(...rules:Rule[]) {
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
export function Seq(...rules:Rule[]):Rule {
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
export let WS = withProduction(
    Optional(OneOrMore(Or(Lit(" "),Lit("\n"))))
    ,(res) => undefined) // remove all whitespace from the tree
export let Digit = Range("0","9");
let Letter = Or(Range("a","z"),Range("A","Z"));
let QQ = Lit('"')
let Underscore = Lit("_")
export let Integer = withProduction(
    OneOrMore(Or(Digit,Underscore))
    ,(res) => Num(parseInt(res.slice)))
export let Identifier = withProduction(
    Seq(Letter,ZeroOrMore(Or(Letter,Digit,Underscore)))
    ,(res)=> Id(res.slice))
export let StringLiteral = withProduction(
    Seq(QQ,ZeroOrMore(AnyNot(QQ)),QQ)
    ,(res) => Str(res.slice.substring(1, res.slice.length - 1)))
export let Operator = withProduction(
    Or(Lit("+"),Lit("-"),Lit("*"),Lit("/"),Lit("<"),Lit(">"),Lit(":="),Lit("=="))
    ,(res)=> Id(res.slice)) // operators are identifiers too
export let RealExp = Lit("dummy")
let Exp = (input:InputStream) => RealExp(input)
export let Group = withProduction(
    Seq(Lit('('),WS,ZeroOrMore(Seq(WS,Exp)),WS,Lit(')'),WS)
    ,(res)=>{
        let value = res.production as Array<Ast>
        value = value.flat(2)
        value = value.filter(v => v!== undefined)
        value = value.slice(1, value.length -1)
        return Grp(...value)
    })
export let Statement = withProduction(
    Seq(OneOrMore(Seq(WS,Exp,WS)),Lit("."))
    ,(res)=>{
        // flatten and filter out the undefineds
        let vals = res.production as Array<Ast>
        vals = vals.flat(10)
        vals = vals.filter(v => v !== undefined)
        // remove the period
        vals.pop()
        return Stmt(...vals)
    })

export let BlockArgs = withProduction(
    Seq(ZeroOrMore(Seq(WS,Identifier,WS)),WS,Lit("|")),
    (res)=>{
        return res.production[0].flat().filter(v => v !== undefined)
    }
)
export let Block = withProduction(
    Seq(Lit('['), Optional(BlockArgs), ZeroOrMore(Statement),WS,Optional(Exp),Lit("]"),WS)
    ,(res) =>{
        if (!res.production[1] && res.production[2]) {
            return Blk([],res.production[2])
        }
        return Blk(res.production[1], res.production[2])
    })
// fix the recursion
RealExp = withProduction(
    Or(Integer,Identifier,Operator,StringLiteral,Group,Block)
    ,(res)=>{
    return res.production
})


export function parseAst(source:string):Ast {
    let input = new InputStream(source.trim(),0);
    return Statement(input).production
}

