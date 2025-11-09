export class Ast {
    toString():string {
        return "hi there"
    }
}

class StmtAst extends Ast {
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
class GroupAst extends Ast {
    value: Ast[]
    type: 'group'
    constructor(value:Ast[]) {
        super()
        this.type = 'group'
        this.value = value
    }
    toString() {
        return "" + this.value.map(s => s.toString()).join(" ") + "."
    }
}
class BlockAst extends Ast {
    value: Ast[]
    type: 'block'
    constructor(value:Ast[]) {
        super()
        this.type = 'block'
        this.value = value
    }
    toString() {
        return "" + this.value.map(s => s.toString()).join(" ") + "."
    }
}
class NumAst extends Ast {
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
class StrAst extends Ast {
    value: string
    type: 'str'
    constructor(value:string) {
        super()
        this.type = 'str'
        this.value = value
    }
    toString() {
        return "Number" + this.value
    }
}
class IdAst extends Ast {
    value: string
    type: 'id'
    constructor(value:string) {
        super()
        this.type = 'id'
        this.value = value
    }
    toString() {
        return "" + this.value
    }
}


export const Num = (value: number) => new NumAst(value)
export const Str = (value: string) => new StrAst(value)
export const Id = (value: string) => new IdAst(value)
export const Stmt = (...args: Ast[]) => new StmtAst(args)
export const Grp = (...args: Ast[]) => new GroupAst(args)
export const Blk = (...args: Ast[]) => new BlockAst(args)