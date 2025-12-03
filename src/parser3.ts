import * as ohm from 'ohm-js';
import {Num, PlnId, Str} from "./ast2.ts";
import type {Ast2} from "./ast2.ts"


export function parse(input:string):Ast2 {
    const mooGrammar = ohm.grammar(String.raw`
Moo {
  Exp         = Binary | Keyword | Unary | Group | Assignment | string | ident | number
  Assignment  = ident ":=" Exp
  Unary       = Exp ident
  Binary      = Exp "+" Exp
  Keyword     = Exp kident Exp
  Group       = "(" Exp ")"
  
  
  ident       = letter+ 
  kident      = letter+ ":"
  number      = digit+
  string      = "'" (~ "'" any) * "'"
}
`);


    const semantics = mooGrammar.createSemantics()
    semantics.addOperation<Ast2>("ast",{
        Binary(a,b,c) {
            return "hi there"
        },
        ident(name) {
            return PlnId(this.sourceString)
        },
        number(_) {
            return Num(parseInt(this.sourceString))
        },
        string(_a,name,_b) {
            return Str(name.sourceString)
        }
    })


    // const userInput = 'Hello';
    const m = mooGrammar.match(input);
    if (m.succeeded()) {
        return semantics(m).ast()
    } else {
        console.log("That's not a greeting!");
        throw new Error('Not a greeting!');
    }
}




