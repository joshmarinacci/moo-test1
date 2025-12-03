import {Ast2} from "../src/ast2.ts";
import {InputStream} from "../src/parser.ts";
import assert from "node:assert";
import {SoloExp3} from "../src/parser2.ts";
import test from "node:test";

export function precedence(source:string, target:Ast2) {
    console.log("====== " + source)
    let input = new InputStream(source.trim(),0);
    assert.deepStrictEqual(SoloExp3(input).production,target)
}

test('parse precedence',() => {
    console.log("precedence")
    precedence('foo',Id('foo'))
    precedence('4',Num(4))
    precedence('foo print',[Id("foo"),Id('print')])
    precedence('5 print',[Num(5),Id('print')])
    precedence('(5) print',[Grp(Num(5)),Id('print')])
    precedence('(foo) print',[Grp(Id("foo")),Id('print')])
    precedence('foo + bar ',[Id("foo"),[Id('+'),Id('bar')]])
    precedence('4 + bar ',[Num(4),[Id('+'),Id('bar')]])
    precedence('4 + 5 ',[Num(4),[Id('+'),Num(5)]])
    precedence('4 + (5) ',[Num(4),[Id('+'),Grp(Num(5))]])
    // precedence('4 + 5 + 6 ',[Num(4),[Id('+'),[Num(5), [Id('+'), Num(6)]]]])
    precedence('foo do: bar ',[Id("foo"),[[Id('do:'),Id('bar')]]])
    precedence('4 do: 5 ',[Num(4),[[Id('do:'),Num(5)]]])
    precedence('(4) do: 5 ',[Grp(Num(4)),[[Id('do:'),Num(5)]]])
    precedence('foo := 4 do: 5 ',[ Id('foo'),  [Num(4),[[Id('do:'),Num(5)]]]     ]  )
    // precedence('foo := ( 4 do: 5 ) ',[ Id('foo'),  Grp(Num(4),[[Id('do:'),Num(5)]]     )  ])
})
