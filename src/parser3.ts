import * as ohm from 'ohm-js';
import {
    Ass,
    Binary,
    BlkArgs,
    Grp,
    KArg,
    KeyId,
    Keyword,
    Method,
    Num,
    PlnId,
    Stmt,
    Str,
    SymId,
    Unary
} from "./ast2.ts";
import type {Ast2} from "./ast2.ts"


export function parse(input:string, rule:string):Ast2 {
    const mooGrammar = ohm.grammar(String.raw`
Moo {
  Exp         = Assignment | Keyword | Binary | Unary | Group | Block | String | ident | Number
  Block = "[" BlockArgs? Statement* Exp? "]"
  BlockArgs   = ident* "|"
  Statement   = (Assignment | Exp) "."
  Assignment  = ident ":=" Exp
  Unary       = Exp ident
  Binary      = Exp Operator Exp
  KArg        = kident (ident|Number|String|Block|Group)
  Keyword     = Exp KArg+
  Group       = "(" Exp ")"
  
  Operator    = ("+" | "-" | "*" | "/" | "<" | ">" | "=" | "!")+
  ident       = letter (letter|digit|"_")* 
  kident      = letter (letter|digit|"_")* ":"
  Number      = num2 | num16 | float | integer
  dig         = digit | "_"
  num2        = "2r" ("0" | "1")+
  num16       = "16r" (digit | "A" | "B" | "C" | "D" | "E" | "F")+
  float        = "-"? dig+ "." dig+
  integer      = "-"? dig+
  String      = qstr | qqstr
  q = "'"
  qq = "\""
  qstr      = q (~ q any) * q
  qqstr      = qq (~ qq any) * qq
}
`);


    const semantics = mooGrammar.createSemantics()
    semantics.addOperation<Ast2>("ast",{
        _iter: (...children) => children.map(ch => ch.ast()),
        BlockArgs:(args,_bar) => args.children.map(ch => ch.ast()),
        Block:(_a, args,body, exp,_b) => {
            // console.log("block")
            // console.log("args", args.ast())
            // console.log("exp",exp.ast())
            // console.log("body is",body.ast())
            let bod = body.children.map(ch => ch.ast())
            if(exp.ast().length > 0) {
                bod.push(Stmt(exp.ast()[0]))
            }
            // console.log("final  is",bod)
            return BlkArgs(args.ast().flat(), bod)
        },
        Statement:(value,_period) => Stmt(value.ast()),
        Unary:(receiver, method)=> Method(receiver.ast(), Unary(method.ast())),
        Binary:(receiver,op,arg)=> Method(receiver.ast(), Binary(op.ast(), arg.ast())),
        KArg:(kident, exp) => KArg(kident.ast(), exp.ast()),
        Keyword:(receiver,args)=> Method(receiver.ast(), Keyword(...args.ast())),
        Assignment:(ident,_op,arg)=> Ass(ident.ast(), arg.ast()),
        Group:(_a, exp, _b)=> Grp(exp.ast()),
        Operator:(v) => SymId(v.sourceString),
        ident:(start,rest)=> PlnId(start.sourceString+rest.sourceString),
        kident:(a,b,colon) => KeyId(a.sourceString + b.sourceString + colon.sourceString),
        float:(sign,prefix,dot,postfix) => Num(parseFloat(
                (sign.sourceString +prefix.sourceString + dot.sourceString + postfix.sourceString)
                .replace('_', '')
        )),
        integer:(sign,digits)=> Num(parseInt(sign.sourceString + digits.sourceString.replace('_', ''))),
        num2:(_p,digits) => Num(parseInt(digits.sourceString,2)),
        num16:(_p,digits) => Num(parseInt(digits.sourceString,16)),
        qstr:(_a,name,_b) => Str(name.sourceString),
        qqstr:(_a,name,_b) => Str(name.sourceString),
    })

    const m = mooGrammar.match(input,rule);
    if (m.succeeded()) {
        return semantics(m).ast()
    } else {
        throw new Error(`match failed on ${input}, ${m.message}`);
    }
}




