import {JoshLogger} from "./util.ts";

export type JSMethod = (rec:Obj, args:Array<Obj>) => Obj;

export function isNil(method: Obj) {
    if(method.name === 'NilLiteral') return true;
    return false;
}

const d = new JoshLogger()


export class Obj {
    name: string;
    parent: Obj|null;
    slots: Map<string, Obj>;
    _is_return: boolean;
    constructor(name: string, parent: Obj|null, props:Record<string,unknown>) {
        this.name = name;
        this.parent = parent
        this.slots = new Map<string,Obj>
        this._is_return = false;
        for(let key in props) {
            this.slots.set(key,props[key])
        }
    }

    make_slot(name: string, obj: Obj) {
        if(!obj) {
            throw new Error(`cannot make slot ${name}. value is null`)
        }
        // console.log(`make slot ${this.name}.${name} = ${obj.name}'`)
        this.slots.set(name,obj)
    }
    _make_js_slot(name: string, value:unknown) {
        this.slots.set(name,value)
    }
    set_slot(slot_name: string, slot_value: Obj):void {
        // console.log(`set slot ${this.name}.${slot_name} = ${slot_value.name}`)
        if(!this.slots.has(slot_name)) {
            d.p(`${this.name} doesn't have the slot ${slot_name}`)
            if(this.parent) {
                return this.parent.set_slot(slot_name,slot_value)
            }
        } else {
            this.slots.set(slot_name, slot_value)
        }
    }
    print():string {
        return this.safe_print(5)
    }
    safe_print(depth:number):string {
        if (depth < 1) {
            return this.name
        }
        if (this.name === 'NumberLiteral') {
            return `NumberLiteral (${this._get_js_number()})`;
        }
        if (this.name === 'StringLiteral') {
            return `StringLiteral (${this._get_js_string()})`;
        }
        if (this.name === 'SymbolReference') {
            return `SymbolReference (${this._get_js_string()})`;
        }
        if (this.name === 'BooleanLiteral') {
            return `BooleanLiteral (${this._get_js_boolean()})`;
        }
        if (this.name === 'NilLiteral') {
            return `Nil`
        }
        if (this.name === 'Block') {
            return `Block (${this.get_slot('args')}) ${this.get_slot('body')}`
        }
        let slots = Array.from(this.slots.keys()).map(key => {
            let val:unknown = this.slots.get(key)
            if (val instanceof Obj) {
                if (val.name === 'Block') {
                    val = 'Block'
                } else {
                    val = val.safe_print(depth - 1)
                }
            } else {
                if (val instanceof Function) {
                    val = "<function>"
                } else {
                    val = val.toString()
                }
            }
            return key + ":" + val
        })
        let parent = this.parent?this.parent.safe_print(1):'nil'
        return `${this.name} {${slots.join('\n')}}\n ${parent} `
    }
    has_slot(name: string) {
        return this.slots.has(name)
    }
    get_slot(name: string):Obj {
        return this.slots.get(name)
    }

    lookup_slot(name: string):Obj {
        // d.p(`looking up name '${name}' on`, this.name)//,this.print(2))
        if (name === 'self') {
            return this
        }
        return this.safe_lookup_slot(name, 7);
    }
    safe_lookup_slot(name: string, depth: number): Obj {
        // d.p("safe lookup slot",depth ,name,'on',this.name)
        if(depth < 1) {
            throw new Error("recursed too deep!")
        }
        if(this.slots.has(name)) {
            // d.p(`has slot '${name}'`);
            return this.slots.get(name)
        }
        if(this.parent) {
            // d.p("calling the get parent lookup on", this.parent.name);
            if (isNil(this.parent)) {
                // d.p("parent is nil")
            } else {
                return this.parent.safe_lookup_slot(name, depth - 1)
            }
        }
        // d.warn(`slot not found!: '${name}'`)
        return NilObj()
    }

    get_js_slot(name: string):unknown {
        // d.p("getting js slot",name)
        // d.p("this is",this)
        return this.slots.get(name)
    }
    _get_js_number():number {
        return this.get_js_slot('jsvalue') as number
    }
    _get_js_string():string {
        return this.get_js_slot('jsvalue') as string
    }
    _get_js_boolean():boolean {
        return this.get_js_slot('jsvalue') as boolean
    }
    _get_js_array():Array<Obj> {
        return this.get_js_slot('jsvalue') as Array<Obj>
    }
    _get_js_record():Record<string,Obj> {
        return this.get_js_slot('jsvalue') as Record<string,Obj>
    }

    clone() {
        return new Obj(this.name, this.parent, this.getSlots())
    }

    private getSlots():Record<string, unknown> {
        let slots:Record<string,unknown> = {}
        for(let key of this.slots.keys()) {
            slots[key] = this.slots.get(key)
        }
        return slots
    }

    dump() {
        if (this.name === 'NumberLiteral') {
            d.p("numberLiteral: " + this._get_js_number())
            return;
        }
        d.p(this.name)
        d.indent()
        for(let key of this.slots.keys()) {
            let value = this.slots.get(key)
            if (value instanceof Obj) {
                if (value.has_slot('jsvalue')) {
                    d.p("slot " + key, value.name, value.get_js_slot('jsvalue') + "")
                } else {
                    d.p("slot " + key, value.name + "")
                }
            }
            if (value instanceof Function) {
                d.p("slot " + key + " native function")
            }
        }
        if (this.name === 'ObjectProto') {
            d.p("ending")
        } else {
            if(this.parent) {
                d.p("parent")
                d.indent()
                this.parent.dump()
                d.outdent()
            }
        }
        d.outdent()
    }

    parent_chain() {
        return this.name + ', ' + this.parent?.name + "," + this.parent?.parent?.name
    }
    to_string():string {
        if (this._get_js_string()) {
            return this._get_js_string()
        }
        return this.print()
    }
}

export const ROOT = new Obj("ROOT", null,{
    'makeSlot':(rec:Obj, args:Array<Obj>):Obj => {
        let slot_name = args[0]._get_js_string()
        let slot_value = args[1]
        rec.make_slot(slot_name,slot_value)
        if (slot_value.name === 'Block') {
            slot_value.parent = rec
        }
        return NilObj();
    },
    'getSlot':(rec:Obj, args:Array<Obj>):Obj => {
        let slot_name = args[0]._get_js_string()
        return rec.get_slot(slot_name)
    },
    'setSlot':(rec:Obj, args:Array<Obj>):Obj=> {
        let slot_name = args[0]._get_js_string()
        let slot_value = args[1]
        rec.set_slot(slot_name,slot_value)
        return NilObj()
    },
    'setObjectName':(rec:Obj, args:Array<Obj>):Obj => {
        rec.name = args[0]._get_js_string()
        return NilObj()
    },
    'clone':(rec:Obj):Obj => rec.clone(),
    'dump':(rec:Obj):Obj => {
        d.p("DUMPING: ", rec.name)
        d.indent()
        rec.dump();
        d.outdent()
        return NilObj()
    }
});
export const ObjectProto = new Obj("ObjectProto", ROOT, {})
 const NilProto = new Obj("NilProto",ObjectProto,{});
export const NilObj = () => new Obj("NilLiteral", NilProto, {})

export function setup_object(scope: Obj) {
    scope.make_slot("Object", ObjectProto)
    scope.make_slot("Nil", NilProto)
    scope.make_slot('nil', NilObj())
}