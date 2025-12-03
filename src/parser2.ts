import {
    AnyNot,
    Binary,
    Float,
    Hex, InputStream,
    Integer,
    Lit,
    OneOrMore,
    Optional,
    Or,
    produce,
    Range,
    Seq,
    ws,
    ZeroOrMore
} from "./parser.ts";
import {Num, Str} from "./ast.ts";



const rawColon = Lit(":")
const rawOpenParen = Lit("(")
const OpenParen = ws(rawOpenParen)
const rawCloseParen = Lit(")")
const CloseParen = ws(rawCloseParen)
const Underscore = Lit("_")
const Digit = Range("0","9");
const Alpha = Or(Range("a","z"),Range("A","Z"));
const AlphaNumUnder = Or(Alpha, Digit, Underscore);
const rawAssignOperator = Lit(":=")
const AssignOperator = ws(rawAssignOperator)
const QQ = Lit('"')
const Q = Lit("'")

const rawPlainId = produce(Seq(Alpha, OneOrMore(AlphaNumUnder)),(res) => Id(res.slice))
const PlainId = ws(rawPlainId)
const SymbolLiteral = Or(
    Lit("+"),Lit("-"),Lit("*"),Lit("/"),
    Lit("<"),Lit(">"),Lit(":"),Lit("="),Lit("!"))

const rawSymbolId = produce(OneOrMore(SymbolLiteral),(res) => Id(res.slice))
const SymbolID = ws(rawSymbolId)
const rawKeywordID = produce(Seq(Alpha, OneOrMore(AlphaNumUnder), rawColon), (res) => Id(res.slice))
const KeywordID = ws(rawKeywordID)

const NumberLiteral =produce( Seq(Digit,ZeroOrMore(Or(Digit,Underscore))),(res) => Num(parseInt(res.slice.replace('_', ''))))
const QStringLiteral = produce(Seq(Q,ZeroOrMore(AnyNot(Q)),Q),(res) => Str(res.slice.substring(1, res.slice.length - 1)))
const QQStringLiteral = produce(Seq(QQ,ZeroOrMore(AnyNot(QQ)),QQ),(res) => Str(res.slice.substring(1, res.slice.length - 1)))
export const StringLiteral = Or(QStringLiteral, QQStringLiteral)



let SoloExp1 = Lit("dummy")

const Simple = Or(SoloExp1, NumberLiteral, StringLiteral,PlainId)
const Group2       = produce(Seq(OpenParen, Simple, CloseParen),(res) => res.production[1])
const UnarySend = produce(Or(Group2,Simple),(res) => res.production)
const BinarySend = produce(Seq(SymbolID, Or(Group2,Simple)),(res) => res.production)
const KeywordSend = produce(OneOrMore(Seq(KeywordID, Simple)), (res) => res.production)
export const MessageSend = Seq(Or(Group2,Simple), Or(KeywordSend, BinarySend, UnarySend))
const Assignment = produce(Seq(PlainId, AssignOperator, Or(Group2,MessageSend)),(res) => [res.production[0], res.production[2]])
SoloExp1 = Or(Assignment, MessageSend, NumberLiteral, StringLiteral, PlainId)

export const SoloExp3 =(input:InputStream) => SoloExp1(input)


export const