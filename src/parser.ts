import {ListLit, Ast, FunCallAst, MapLit, Ret} from "./ast.ts";
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

export function produce(rule:Rule, cb:(pass:ParseResult)=>unknown):Rule {
    return function (input:InputStream) {
        let pass = rule(input)
        if (pass.succeeded()) {
            pass.production = cb(pass)
        }
        return pass
    }
}

export let Comment = Seq(Lit('//'),ZeroOrMore(AnyNot(Lit('\n'))),Lit('\n'))
export let WS = produce(
    Optional(OneOrMore(Or(Comment,Lit(" "),Lit("\n"))))
    ,(res) => undefined) // remove all whitespace from the tree

function ws(rule:Rule) {
    return produce(Seq(WS,rule,WS),(res) => {
        return res.production[1]
    })
}

const is_odd = (a:unknown,n:number) => (n%2 !==0)
const is_not_undefined = (a:unknown) => typeof a !== 'undefined'

export function ListOf (rule:Rule, separator:Rule) {
    return produce(
        Seq(Optional(rule),ZeroOrMore(Seq(separator,rule)))
        ,(res) => {
            return res.production.flat(2)
                .filter(is_odd)
                .filter(is_not_undefined)
        });
}

export const Digit = Range("0","9");
const Letter = Or(Range("a","z"),Range("A","Z"));
const QQ = Lit('"')
const Q = Lit("'")
const Under = Lit("_")
const Colon = Lit(':')
const Plus = Lit("+")
const Minus = Lit("-")
const Sign = Or(Plus,Minus)
const Period = Lit(".")

const Whole = Seq(Digit,ZeroOrMore(Or(Digit,Under)))
export let Integer = produce(
    Seq(Optional(Sign),Whole)
    ,(res) => Num(parseInt(res.slice.replace('_', ''))))
export const Float = produce(
    Seq(Optional(Sign),Whole,Period,Whole)
,(res)=> Num(parseFloat(res.slice.replace('_', ''))))

const Digit2 = Range("0","1")
export const Binary = produce(
    Seq(Lit("2r"),OneOrMore(Digit2)),
    (res) => {
        let digits = res.slice.substring(2)
        return Num(parseInt(digits,2))
    }
)
const Digit16 = Or(Range("0","9"),Range("a","f"),Range("A","F"))
export const Hex = produce(
    Seq(Lit("16r"),OneOrMore(Digit16)),
    (res) => {
        let digits = res.slice.substring(3)
        return Num(parseInt(digits,16))
    }
)

export const NumberLiteral = Or(Binary, Hex, Float, Integer)

const QStringLiteral = produce(Seq(Q,ZeroOrMore(AnyNot(Q)),Q),(res) => Str(res.slice.substring(1, res.slice.length - 1)))
const QQStringLiteral = produce(Seq(QQ,ZeroOrMore(AnyNot(QQ)),QQ),(res) => Str(res.slice.substring(1, res.slice.length - 1)))
export const StringLiteral = Or(QStringLiteral, QQStringLiteral)

export let Identifier = produce(
    Seq(Letter,ZeroOrMore(Or(Letter,Digit,Under,Colon))),
    (res)=> Id(res.slice))

const SoloExp = Or(NumberLiteral, Identifier, StringLiteral)

const ArrayLiteralValue = produce(
    Seq(ws(SoloExp),Optional(ws(Lit(",")))),
    (res)=> res.production[0])
const ArrayListBody = produce(
    Seq(Lit("{"),ws(ZeroOrMore(ArrayLiteralValue)),Lit("}")),
    (res) => ListLit(...res.production[1]))

const PlainIdentifier = produce(
    OneOrMore(Letter),
    (res) => Id(res.slice)
)

const ArrayLiteralPair = produce(
    Seq(ws(PlainIdentifier), Lit(":"), ws(SoloExp)),
    (res) => [res.production[0], res.production[2]]
)
const ArrayMapBody = produce(
    Seq(Lit("{"),OneOrMore(ArrayLiteralPair),Lit("}")),
    (res) => MapLit(...res.production[1]))

export const ArrayLiteral = Or(ArrayMapBody, ArrayListBody)


const SymbolLiteral = Or(
    Plus,Minus,Lit("*"),Lit("/"),
    Lit("<"),Lit(">"),Lit(":"),Lit("="),Lit("!"))
// operators are identifiers too
export const Operator = produce(ws(OneOrMore(SymbolLiteral)) ,(res)=> Id(res.production.join("")))

export let RealExp = Lit("dummy")
export let Exp = (input:InputStream) => RealExp(input)
export let Group = produce(
    Seq(ws(Lit('(')),ZeroOrMore(Seq(ws(Exp))),ws(Lit(')')))
    ,(res)=> Grp(...(res.production[1].flat())))

export let Statement = produce(
    Seq(OneOrMore(ws(Exp)),Lit("."))
    ,(res)=> Stmt(...(res.production[0])))

export let BlockArgs = produce(
    Seq(ZeroOrMore(Seq(ws(Identifier))),ws(Lit("|"))),
    (res)=> res.production[0].flat()
)

export let BlockBody = produce(
    Seq(ZeroOrMore(Statement), ws(Optional(Exp))),
    (res)=> {
        if (typeof res.production[1] !== "undefined") {
            return res.production.flat()
        } else {
            return res.production[0].flat()
        }
    }
);

export let Block = produce(
    Seq(Lit('['), Optional(BlockArgs), BlockBody, Lit("]")),
    (res) => {
        if (!res.production[1] && res.production[2]) {
            return Blk([],res.production[2])
        }
        return Blk(res.production[1], res.production[2])
    })

const Return = produce(Lit("^"),()=>Ret())

// this fixes up the recursion
RealExp = produce(
    Or(Return,ArrayLiteral, NumberLiteral,Identifier,Operator,StringLiteral,Group,Block)
    ,(res)=> res.production)

const rawOpenParen = Lit("(")
const OpenParen = ws(rawOpenParen)
const rawCloseParen = Lit(")")
const CloseParen = ws(rawCloseParen)
const Underscore = Lit("_")
const Alpha = Or(Range("a","z"),Range("A","Z"));
const AlphaNumUnder = Or(Alpha, Digit, Underscore);
const rawAssignOperator = Lit(":=")
const AssignOperator = ws(rawAssignOperator)

const rawPlainId = produce(Seq(Alpha, OneOrMore(AlphaNumUnder)),(res) => Id(res.slice))
const PlainId = ws(rawPlainId)
const rawSymbolId = produce(OneOrMore(SymbolLiteral),(res) => Id(res.slice))
const SymbolID = ws(rawSymbolId)
const rawKeywordID = produce(Seq(Alpha, OneOrMore(AlphaNumUnder), Colon), (res) => Id(res.slice))
const KeywordID = ws(rawKeywordID)

let SoloExp1 = Lit("dummy")

const Simple = Or(SoloExp1, NumberLiteral, StringLiteral,PlainId)
const Group2       = produce(Seq(OpenParen, Simple, CloseParen),(res) => Grp(res.production[1]))
const UnarySend = produce(Or(Group2,Simple),(res) => res.production)
const BinarySend = produce(Seq(SymbolID, Or(Group2,Simple)),(res) => res.production)
const KeywordSend = produce(OneOrMore(Seq(KeywordID, Simple)), (res) => res.production)
export const MessageSend = Seq(Or(Group2,Simple), Or(KeywordSend, BinarySend, UnarySend))
const Assignment = produce(Seq(PlainId, AssignOperator, Or(Group2,MessageSend)),(res) => [res.production[0], res.production[2]])
SoloExp1 = Or(Assignment, MessageSend, NumberLiteral, StringLiteral, PlainId)

export const SoloExp3 =(input:InputStream) => SoloExp1(input)


export function parseAst(source:string):Ast {
    let input = new InputStream(source.trim(),0);
    return Statement(input).production
}

export function parseBlockBody(source:string):Ast {
    let input = new InputStream(source.trim(),0);
    return BlockBody(input).production
}
