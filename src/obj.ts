import {JoshLogger} from "./util.ts";


const d = new JoshLogger()
d.disable()

export const JS_VALUE = "_jsvalue"

export class Obj {
    name: string;
    parent: Obj|null;
    _data_slots: Map<string, Obj>;
    _method_slots: Map<string, Obj>;
    _is_return: boolean;
    private _hash_value: string;
    constructor(name: string, parent: Obj|null, props:Record<string,unknown>) {
        this._hash_value = "obj_"+(Math.random()*1_000_000)
        this.name = name;
        this.parent = parent
        this._data_slots = new Map<string,Obj>
        this._method_slots = new Map<string,Obj>
        this._is_return = false;
        for(let key in props) {
            this._method_slots.set(key,props[key])
        }
    }

    _make_data_slot(name:string, obj:Obj) {
        if(!obj) {
            throw new Error(`cannot make data slot ${name}. value is null`)
        }
        this._data_slots.set(name,obj)
        this._make_method_slot(name,NatMeth((rec:Obj,args:Array<Obj>):Obj =>{
            return rec._get_data_slot(name)
        }))
        this._make_method_slot(name+":",NatMeth((rec:Obj,args:Array<Obj>):Obj =>{
            return rec._set_data_slot(name,args[0])
        }))
    }
    _get_data_slot(name:string):Obj {
        // console.log(`getting data slot ${name}`)
        if (!this._data_slots.has(name)) {
            if(this.parent) {
                return this.parent._get_data_slot(name)
            } else {
                console.error(`no such data slot ${name}`)
                return NilObj()
            }
        } else {
            return this._data_slots.get(name)
        }
    }
    _set_data_slot(name:string, value:Obj):Obj {
        if(this._data_slots.has(name)) {
            this._data_slots.set(name,value)
            return NilObj()
        } else {
            if (this.parent) {
                return this.parent._set_data_slot(name,value)
            } else {
                return NilObj()
            }
        }
    }
    _make_method_slot(name: string, obj: Obj) {
        if(!obj) {
            throw new Error(`cannot make method slot ${name}. value is null`)
        }
        this._method_slots.set(name,obj)
    }
    _make_js_slot(name: string, value:unknown) {
        this._method_slots.set(name,value)
    }
    print():string {
        return this._safe_print(5)
    }
    _safe_print(depth:number):string {
        if (depth < 1) {
            return this.name
        }
        if (this.name === 'Global') return `Global Scope`
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
        if (this.name === 'NativeMethod') {
            return `NativeMethod`
            // return `NativeMethod (${this._get_js_unknown()})`
        }
        if (this.name === 'Exception') {
            return `Exception: ${this.get_slot('message')}`
        }
        if (this.name === 'Block') {
            return `Block (${this.get_slot('args')}) ${this.get_slot('body')}`
        }
        let slots = Array.from(this._method_slots.keys()).map(key => {
            let val:unknown = this._method_slots.get(key)
            if (val instanceof Obj) {
                if (val.name === 'Block') {
                    val = 'Block'
                } else {
                    val = val._safe_print(depth - 1)
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
        let parent = this.parent?this.parent._safe_print(1):'nil'
        return `${this.name} {${slots.join('\n')}}\n ${parent} `
    }
    has_slot(name: string) {
        return this._method_slots.has(name)
    }
    get_slot(name: string):Obj {
        return this._method_slots.get(name)
    }
    _list_slot_names():string[] {
        return Array.from(this._method_slots.keys())
    }

    lookup_slot(name: string):Obj {
        d.p(`looking up name '${name}' on`, this.name)//,this.print(2))
        if (name === 'self') {
            return this
        }
        return this._safe_lookup_slot(name, 20);
    }
    _safe_lookup_slot(name: string, depth: number): Obj {
        d.p("safe lookup slot",depth ,name,'on',this.name)
        if(depth < 1) {
            throw new Error("recursed too deep!")
        }
        if(this._method_slots.has(name)) {
            d.p(`has slot '${name}' on ${this.name}`);
            return this._method_slots.get(name)
        }
        if(this.parent) {
            // d.p("calling the get parent lookup on", this.parent.name);
            if (this.parent.isNil()) {
                // d.p("parent is nil")
            } else {
                return this.parent._safe_lookup_slot(name, depth - 1)
            }
        }
        d.warn(`slot not found!: '${name}'`)
        return NilObj()
    }

    get_js_slot(name: string):unknown {
        // d.p("getting js slot",name)
        // d.p("this is",this)
        return this._method_slots.get(name)
    }
    _get_js_number():number {
        return this.get_js_slot(JS_VALUE) as number
    }
    _get_js_string():string {
        return this.get_js_slot(JS_VALUE) as string
    }
    _get_js_boolean():boolean {
        return this.get_js_slot(JS_VALUE) as boolean
    }
    _get_js_array():Array<Obj> {
        return this.get_js_slot(JS_VALUE) as Array<Obj>
    }
    _get_js_record():Record<string,Obj> {
        return this.get_js_slot(JS_VALUE) as Record<string,Obj>
    }
    _get_js_unknown():unknown {
        return this.get_js_slot(JS_VALUE) as unknown
    }

    clone() {
        let obj = new Obj(this.name, this.parent, this.getSlots())
        obj._data_slots = new Map<string, Obj>()
        for(let key of this._data_slots.keys()) {
            obj._data_slots.set(key,this._data_slots.get(key))
        }
        return obj
    }

    private getSlots():Record<string, unknown> {
        let slots:Record<string,unknown> = {}
        for(let key of this._method_slots.keys()) {
            slots[key] = this._method_slots.get(key)
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
        for(let key of this._method_slots.keys()) {
            let value = this._method_slots.get(key)
            if (value instanceof Obj) {
                if (value.has_slot(JS_VALUE)) {
                    d.p("slot " + key, value.name, value.get_js_slot(JS_VALUE) + "")
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

    to_string():string {
        if (this._get_js_string()) {
            return this._get_js_string()
        }
        return this.print()
    }

    is_kind_of(name: string):boolean {
        if(this.name == name) return true
        if(this.parent) return this.parent.is_kind_of(name)
        return false;
    }

    hash_value() {
        if(this.is_kind_of('NumberProto')) {
            return this._get_js_number()
        }
        if(this.is_kind_of('StringProto')) {
            return this._get_js_string()
        }
        return this._hash_value
    }

    isNil() {
        if(this.name === 'NilLiteral') return true;
        return false;
    }
}

export const FakeNatMeth = (fun:NativeMethodSigature):Obj => {
    return new Obj("NativeMethod", null, {
        '_jsvalue': fun,
    })
}
export const ROOT = new Obj("ROOT", null,{
    'make_data_slot:with:':FakeNatMeth((rec:Obj, args:Array<Obj>):Obj => {
        rec._make_data_slot(args[0]._get_js_string(), args[1])
        return NilObj()
    }),
    'makeSlot:with:':FakeNatMeth((rec:Obj, args:Array<Obj>):Obj => {
        let slot_name = args[0]._get_js_string()
        let slot_value = args[1]
        rec._make_method_slot(slot_name,slot_value)
        if (slot_value.name === 'Block') {
            slot_value.parent = rec
        }
        return NilObj();
    }),
    'understands:with:':(rec:Obj, args:Array<Obj>):Obj => {
        let slot_name = args[0]._get_js_string()
        let slot_value = args[1]
        rec._make_method_slot(slot_name,slot_value)
        if (slot_value.name === 'Block') {
            slot_value.parent = rec
        }
        return NilObj();
    },
    'getSlot:':FakeNatMeth((rec:Obj, args:Array<Obj>):Obj => {
        let slot_name = args[0]._get_js_string()
        return rec.get_slot(slot_name)
    }),
    'getJsSlot:':(rec:Obj, args:Array<Obj>):Obj => {
        let slot_name = args[0]._get_js_string()
        return rec.get_js_slot(slot_name) as Obj
    },
    'setObjectName:':FakeNatMeth((rec:Obj, args:Array<Obj>):Obj => {
        rec.name = args[0]._get_js_string()
        return NilObj()
    }),
    'clone':FakeNatMeth((rec:Obj):Obj => rec.clone()),
    'dump':(rec:Obj):Obj => {
        console.log("DUMPOING")
        d.p("DUMPING: ", rec.name)
        d.indent()
        rec.dump();
        d.outdent()
        return NilObj()
    },
});
export const ObjectProto = new Obj("ObjectProto", ROOT, {})
 const NilProto = new Obj("NilProto",ObjectProto,{});
export const NilObj = () => new Obj("NilLiteral", NilProto, {})

export const NativeMethodProto = new Obj("NativeMethodProto", ObjectProto, {})
export type NativeMethodSigature = (rec:Obj, args:Array<Obj>) => Obj;
export const NatMeth = (fun:NativeMethodSigature):Obj => {
    return new Obj("NativeMethod", NativeMethodProto, {
        '_jsvalue': fun,
    })
}
export function setup_object(scope: Obj) {
    scope._make_method_slot("Object", ObjectProto)
    scope._make_method_slot("Nil", NilProto)
    scope._make_method_slot('nil', NilObj())
}

export function make_native_obj(name: string, proto: Obj, methods: Record<string, NativeMethodSigature>) {
    let wrapped_methods: Record<string, Obj> = {}
    Object.keys(methods).forEach(method => {
        wrapped_methods[method] = NatMeth(methods[method])
    })
    return new Obj(name, proto, wrapped_methods);
}