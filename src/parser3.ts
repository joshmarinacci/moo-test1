import * as ohm from 'ohm-js';
import {Ass, Binary, Grp, KArg, KeyId, Keyword, Method, Num, PlnId, Str, SymId, Unary} from "./ast2.ts";
import type {Ast2, PlainId} from "./ast2.ts"


export function parse(input:string):Ast2 {
    const mooGrammar = ohm.grammar(String.raw`
Moo {
  Exp         = Assignment | Keyword | Binary | Unary | Group | string | ident | Number
  Assignment  = ident ":=" Exp
  Unary       = Exp ident
  Binary      = Exp Operator Exp
  Keyword     = Exp kident Exp
  Group       = "(" Exp ")"
  
  Operator    = "+" | "*"
  ident       = letter (letter|digit|"_")+ 
  kident      = letter+ ":"
  Number      = num2 | num16 | float | integer
  dig         = digit | "_"
  num2        = "2r" ("0" | "1")+
  num16       = "16r" (digit | "A" | "B" | "C" | "D" | "E" | "F")+
  float        = "-"? dig+ "." dig+
  integer      = "-"? dig+
  string      = "'" (~ "'" any) * "'"
}
`);


    const semantics = mooGrammar.createSemantics()
    semantics.addOperation<Ast2>("ast",{
        Unary:(receiver, method)=> Method(receiver.ast(), Unary(method.ast())),
        Binary:(receiver,op,arg)=> Method(receiver.ast(), Binary(op.ast(), arg.ast())),
        Keyword:(receiver,keyid,arg)=> Method(receiver.ast(), Keyword(KArg(keyid.ast(), arg.ast()))),
        Assignment:(ident,_op,arg)=> Ass(ident.ast(), arg.ast()),
        Group:(_a, exp, _b)=> Grp(exp.ast()),
        Operator:(v) => SymId(v.sourceString),
        ident:(start,rest)=> PlnId(start.sourceString+rest.sourceString),
        kident:(a,b) => KeyId(a.sourceString + b.sourceString),
        float:(sign,prefix,dot,postfix) => Num(parseFloat(
                (sign.sourceString +prefix.sourceString + dot.sourceString + postfix.sourceString)
                .replace('_', '')
        )),
        integer:(sign,digits)=> Num(parseInt(sign.sourceString + digits.sourceString.replace('_', ''))),
        num2:(prefx,digits) => Num(parseInt(digits.sourceString,2)),
        num16:(prefx,digits) => Num(parseInt(digits.sourceString,16)),
        string:(_a,name,_b) => Str(name.sourceString)
    })


    // const userInput = 'Hello';
    const m = mooGrammar.match(input);
    if (m.succeeded()) {
        return semantics(m).ast()
    } else {
        throw new Error(`match failed on ${input}, ${m.message}`);
    }
}




