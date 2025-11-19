import test from "node:test";
import assert from "node:assert";
import {
    Exp,
    Identifier,
    InputStream,
    Lit,
    Optional,
    type Rule,
    Seq,
    withProduction,
    ZeroOrMore
} from "./parser.ts";
import {Id, Num, Stmt} from "./ast.ts";

function ListOf (rule:Rule) {
    return withProduction(
        Seq(Optional(rule),ZeroOrMore(Seq(Lit(","),rule)))
        ,(res) => res.production.flat(2).filter(l => l !== ','));
}

let MethodArgs = ListOf(Exp);

export let MethodCall = withProduction(
    Seq(Identifier,Lit("."),Identifier,Lit("("),ListOf(Exp),Lit(")"))
    ,(res)=> {
        return Stmt(
            res.production[0],
            res.production[2],
            ...res.production[4],
        )
    })

function match(source:string, rule:Rule) {
    // console.log("=======")
    let input = new InputStream(source,0);
    return rule(input).succeeded()
}
function produces(source:string, rule:Rule) {
    let input = new InputStream(source,0);
    return rule(input).production
}

test("parse method call",() => {
    assert.deepStrictEqual(produces("4",MethodArgs),[Num(4)]);
    assert.deepStrictEqual(produces("foo.bar(5);",MethodCall),Stmt(Id('foo'),Id('bar'),Num(5)))
    assert.deepStrictEqual(produces("foo.bar(5,6);",MethodCall),Stmt(Id('foo'),Id('bar'),Num(5),Num(6)))
});
