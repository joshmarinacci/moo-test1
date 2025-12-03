import * as ohm from 'ohm-js';
import {Ass, Binary, Grp, KArg, KeyId, Keyword, Method, Num, PlnId, Str, SymId, Unary} from "./ast2.ts";
import type {Ast2, PlainId} from "./ast2.ts"


export function parse(input:string):Ast2 {
    const mooGrammar = ohm.grammar(String.raw`
Moo {
  Exp         = Assignment | Keyword | Binary | Unary | Group | string | ident | number
  Assignment  = ident ":=" Exp
  Unary       = Exp ident
  Binary      = Exp Operator Exp
  Keyword     = Exp kident Exp
  Group       = "(" Exp ")"
  
  Operator    = "+" | "*"
  ident       = letter+ 
  kident      = letter+ ":"
  number      = "-"? (digit | "_")+
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
        ident:(name)=> PlnId(name.sourceString),
        kident:(a,b) => KeyId(a.sourceString + b.sourceString),
        number:(sign,digits)=> Num(parseInt(sign.sourceString + digits.sourceString.replace('_', ''))),
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




