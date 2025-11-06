import test from "node:test";
import {strict as assert} from "assert";

type GroupNode = {
    type:'group',
    value: ExpNode[]
}
type StmtNode = {
    type: 'stmt',
    value: ExpNode[],
}
type SymNode = {
    type:'sym',
    value:string,
}
type NumNode = {
    type: 'num',
    value: number,
}
type StrNode = {
    type:'str',
    value: string,
}
type BlockNode = {
    type:'block',
    value: ExpNode[],
}
type ExpNode = GroupNode | BlockNode | StmtNode | NumNode | StrNode | SymNode

function p(...args: any[]) {
    console.log(':',...args)
}

function parse(str: string):ExpNode {
    p(`======= parsing ${str}`)
    let toks = str.split(' ')
    p('tokens',toks)
    let stack:ExpNode[] = []
    for (let tok of toks) {
        p("== token: ", tok)
        if (tok.match(/^[0-9]+$/)) {
            stack.push(Num(parseInt(tok)))
        }
        if (tok.match(/^[a-z]+$/)) {
            stack.push(Sym(tok))
        }
        if (tok == "<") {
            stack.push(Sym(tok))
        }
        if (tok == "(") {
            stack.push(Group())
        }
        if (tok == "[") {
            stack.push(Block())
        }
        if (tok == ")") {
            let temp:ExpNode[] = []
            while(true) {
                let node = stack.pop()
                if (!node) {
                    break;
                }
                if (node.type == 'group') {
                    p("found the group start")
                    temp.reverse()
                    node.value = temp;
                    stack.push(node)
                    break;
                } else {
                    temp.push(node)
                }
            }
        }
        if (tok == "]") {
            let temp:ExpNode[] = []
            while(true) {
                let node = stack.pop()
                if (!node) {
                    break;
                }
                if (node.type == 'block') {
                    p("found the block start")
                    temp.reverse()
                    node.value = temp;
                    stack.push(node)
                    break;
                } else {
                    temp.push(node)
                }
            }
        }
        if (tok == ".") {
            let temp:ExpNode[] = []
            while(true) {
                let node = stack.pop()
                if (!node) {
                    break;
                }
                if (node.type == 'block') {
                    p("found a start")
                    stack.push(node)
                    break;
                } else {
                    temp.push(node)
                }
            }
            temp.reverse()
            stack.push(Stmt(...temp))
            p("done with statement assembly")
            p(stack[stack.length-1])
        }
        p("stack",stack)
    }
    return stack.pop() as ExpNode
}

function Num(value:number):NumNode {
    return {
        type:'num',
        value,
    }
}
function Sym(value:string):SymNode {
    return {
        type:'sym',
        value,
    }
}
function Stmt(...args:ExpNode[]):StmtNode {
    return {
        type:'stmt',
        value:Array.from(args),
    }
}
function Group(...args:ExpNode[]):GroupNode {
    return {
        type:'group',
        value:Array.from(args),
    }
}
function Block(...args:ExpNode[]):BlockNode {
    return {
        type:'block',
        value:Array.from(args),
    }
}

test("parse expressions", () => {
    assert.deepStrictEqual(parse(" 4  "), Num(4));
    assert.deepStrictEqual(parse(" foo  "), Sym("foo"));
    assert.deepStrictEqual(parse(" <  "), Sym("<"));
    assert.deepStrictEqual(
        parse(" 4 < 5 . "),
        Stmt(Num(4),Sym('<'),Num(5))
    );
    assert.deepStrictEqual(
        parse(" ( 4 < 5 ) "),
        Group(Num(4),Sym('<'),Num(5))
    );
    assert.deepStrictEqual(
        parse(" ( 4 < 5 ) . "),
        Stmt(Group(Num(4),Sym('<'),Num(5)))
    );
    assert.deepStrictEqual(
        parse("[ 99 . ] "),
        Block(Stmt(Num(99))),
    )
    assert.deepStrictEqual(
        parse(` ( 4 < 5 ) ifTrue [ 99 . ] `),
        Stmt(
            Group(Num(4),Sym('<'),Num(5)),
            Sym('ifTrue'),
            Block(Stmt(Num(99)))
        )
    );
    // assert.deepStrictEqual(
    //     parse(' dog := Object clone .`'),
    //     Stat(Sym('dog'),Sym(':='),Sym('Object'),Sym('clone'))
    // )
})

// test('eval expressions', () => {
//     assert.deepStrictEqual(
//         eval(Stat(Num(4),Sym('<'),Num(5))),
//         Num(9),
//     )
//     assert.deepStrictEqual(
//         eval(Stat(Group(Num(4),Sym('<'),Num(5)))),
//         Num(9),
//     )
//     assert.deepStrictEqual(
//         eval(Stat(
//             Group(Num(4),Sym('<'),Num(5)),
//             Sym('ifTrue'),
//             Block(Stat(Num(99)))
//             )),
//         Num(99),
//     )
// })