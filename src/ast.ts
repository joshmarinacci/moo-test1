export class Ast {
    type!: string
    toString():string {
        return "hi there"
    }
}

export class StmtAst extends Ast {
    value: Ast[]
    type: 'stmt'
    constructor(value:Ast[]) {
        super()
        this.type = 'stmt'
        this.value = value
    }
    toString():string {
        return "" + this.value.map(s => s.toString()).join(" ") + "."
    }
}
export class GroupAst extends Ast {
    value: Ast[]
    type: 'group'
    constructor(value:Ast[]) {
        super()
        this.type = 'group'
        this.value = value
    }
    toString() {
        return "(" + this.value.map(s => s.toString()).join(" ") + ")"
    }
}
export class BlockAst extends Ast {
    args: Ast[]
    body: Ast[]
    type: 'block'
    constructor(args: Ast[], body: Ast[]) {
        super()
        this.type = 'block'
        this.args = args
        this.body = body
    }
    toString() {
        return "[ " + this.args.map(s => s.toString()).join(" ") + " | " + this.body.map(s => s.toString()).join(" ") + " ]"
    }
}
export class FunCallAst extends Ast {
    args: Ast[]
    selector:Ast[]

    constructor(selector:Ast[], args:Ast[]) {
        super();
        this.type = 'function-call'
        this.selector = selector
        this.args = args
    }

}
export class NumAst extends Ast {
    value: number
    type: 'num'
    constructor(value:number) {
        super()
        this.type = 'num'
        this.value = value
    }
    toString() {
        return "" + this.value
    }
}
export class StrAst extends Ast {
    value: string
    type: 'str'
    constructor(value:string) {
        super()
        this.type = 'str'
        this.value = value
    }
    toString() {
        return `"${this.value}"`
    }
}
export class IdAst extends Ast {
    value: string
    type: 'id'
    constructor(value:string) {
        super()
        this.type = 'id'
        this.value = value
    }
    toString() {
        return "@" + this.value
    }
}


export const Num = (value: number) => new NumAst(value)
export const Str = (value: string) => new StrAst(value)
export const Id = (value: string) => new IdAst(value)
export const Stmt = (...args: Ast[]) => new StmtAst(args)
export const Grp = (...args: Ast[]) => new GroupAst(args)
export const Blk = (args:Ast[], body: Ast[]) => new BlockAst(args,body)
export const FunCall = (sel:Ast[],args:Ast[]) => {
    return new FunCallAst(sel,args)
}