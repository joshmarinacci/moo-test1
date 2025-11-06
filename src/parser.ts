import test from "node:test";
import {strict as assert} from "assert";

class P {
    private inset: number;
    constructor() {
        this.inset = 0
    }
    p(...args:any[]) {
        console.log(this.tab(),"--",...args)
    }

    private tab() {
        let t = ""
        for(let i=0; i<this.inset; i++) {
            t += " "
        }
        return t
    }

    indent() {
        this.inset += 1;
    }

    outdent() {
        this.inset -= 1;
    }
}
const p = new P()

type FailedParseResult = {
    okay:false
}
type SuccessfulParseResult = {
    okay:true
    node:any,
    consumed:number
}
type ParseResult = FailedParseResult | SuccessfulParseResult

function pNumLit () {
    return (tokens:string[]):ParseResult => {
        p.p("pNum:" + tokens)
        if (tokens.length < 1) {
            return {
                okay:false
            }
        }
        let str = tokens[0]
        let val = parseInt(str);
        if (Number.isInteger(val)) {
            p.p(`pNum returning literal ${str}`)
            return {
                okay: true,
                consumed: 1,
                node: {
                    type: 'number-literal',
                    value: parseInt(str)
                }
            }
        } else {
            p.p("pNum bail")
            return {
                okay:false
            }
        }
    }
}
function pStrLit() {
    return (tokens:string[]):ParseResult => {
        p.p("pStr:" + tokens)
        let str = tokens[0]
        if (str.startsWith('"')) {
            p.p(`pStr returning literal ${str}`)
            return {
                okay:true,
                consumed:1,
                node: {
                    type: 'string-literal',
                    value: str.substring(1, str.length - 1),
                }
            }
        }
        p.p("pStr bail")
        return {
            okay:false
        }
    }
}
function pSym() {
    return (tokens:string[]):ParseResult => {
        let str = tokens[0]
        p.p("pSym: matching " + str)
        if(!str) {
            p.p("pSym no input")
            return {
                okay:false
            }
        }
        if (str.match(/^\w/)) {
            p.p(`pSym returning symbol ${str}`)
            return {
                okay:true,
                consumed: 1,
                node: {
                    type: 'symbol',
                    value: str
                }
            }
        }
        p.p("pSym bail")
        return {
            okay:false
        }
    }
}
function pGroup() {
    return (tokens:string[]):ParseResult => {
        p.p("pGroup:",tokens)
        let str = tokens[0]
        if (str.startsWith("(")) {
            let open = tokens[0]
            p.p(`pGroup: open '${open}'`,tokens)
            if (!open) {
                p.p("pGroup bail",tokens);
                return {
                    okay:false
                }
            }
            let exp = parseTokens(tokens.slice(1))
            p.p("pGroup: exp is",exp,tokens)
            let close = tokens[2]
            p.p("pGroup: close", close,tokens)
            if (exp.okay == false) {
                return {
                    okay:true,
                    consumed:2,
                    node: {
                        type: 'group',
                        value: null,
                    }
                }
            }
            return {
                okay:true,
                consumed:3,
                node: {
                    type: 'group',
                    value: exp.node
                }
            }
        }
        p.p("pGroup bail",tokens)
        return {
            okay:false
        };
    }
}
function pCall() {
    return (tokens:string[]):ParseResult => {
        p.p("pCall " + tokens);
        p.indent()
        let receiver = pSym()(tokens)
        p.p("first is", receiver)
        if (!receiver.okay) {
            p.outdent()
            p.p("pCall bail")
            return {
                okay:false
            }
        }
        let message = pSym()(tokens.slice(receiver.consumed))
        p.p("second is ", message)
        if (!message.okay) {
            p.outdent()
            p.p("pCall bail")
            return {
                okay:false
            };
        }
        let args = pGroup()(tokens.slice(receiver.consumed + message.consumed ))
        p.p("third is ", args)
        if (!args.okay) {
            p.outdent()
            p.p("pCall bail")
            return {
                okay:false
            };
        }
        p.p("found a group for the args")
        return {
            okay: true,
            consumed: receiver.consumed + message.consumed + args.consumed,
            node: {
                type: 'call',
                receiver: receiver.node,
                message: message.node,
                args: args.node
            }
        }
    }
}
type Parser1 = (tokens:string[]) => ParseResult;

function Or(...parsers:Parser1[]) {
    return (tokens:string[]):ParseResult => {
        p.p("Or",tokens)
        p.indent();
        for(let exp of Array.from(parsers)) {
            let res = exp(tokens)
            if (res.okay) {
                p.outdent()
                return res
            }
        }
        p.outdent();
        p.p("Or bail")
        return {
            okay:false
        }
    }
}
function parseTokens(tokens:string[]):ParseResult {
    return Or(pCall(),pNumLit(), pStrLit(), pSym(), pGroup())(tokens)
}
const parse = (str:string):ParseResult => {
    console.log("==========")
    return parseTokens(str.split(' '));
}
test('parse 42',() => {
    assert.deepStrictEqual(parse('42'), {
        okay: true,
        consumed: 1,
        node: {
            type: 'number-literal', value: 42
        }
    })
})
test('parse "foo"',() => {
    assert.deepStrictEqual(parse('"foo"'), {
            okay: true,
            consumed: 1,
            node: {
                type: 'string-literal', value: "foo"
            }
        }
    )
})
test('parse foo',() => {
    assert.deepStrictEqual(parse('foo'),{
        okay:true,
        consumed:1,
        node: {
            type: 'symbol', value: "foo"
        }
    })
})
test('parse ( 42 )', () => {
    assert.deepStrictEqual(parse('( 42 )'), {
            okay: true,
            consumed: 3,
            node: {
                type: 'group', value: {type: 'number-literal', value: 42}
            }
        }
    )
})
test('parse ( )', () => {
    assert.deepStrictEqual(parse('( )'), {
        okay: true,
        consumed: 2,
        node: {
            type: 'group', value: null
        }
    })
})
test('parse dog speak ()',() => {
    assert.deepStrictEqual(parse('dog speak ( )'),{
        okay:true,
        consumed: 4,
        node: {
            type: 'call',
            receiver: {
                type: 'symbol',
                value: 'dog',
            },
            message: {
                type: 'symbol',
                value: 'speak',
            },
            args: {
                type: 'group',
                value: null
            }
        }
    })
})

test('parse dog speak (42)',() => {
    assert.deepStrictEqual(parse('dog speak ( 42 )'),{
        okay:true,
        consumed: 5,
        node: {
            type: 'call',
            receiver: {
                type: 'symbol',
                value: 'dog',
            },
            message: {
                type: 'symbol',
                value: 'speak',
            },
            args: {
                type: 'group',
                value: {
                    type:'number-literal',
                    value:42,
                }
            }
        }
    })
})