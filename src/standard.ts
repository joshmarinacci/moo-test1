import {DictObj, ListObj, setup_arrays} from "./arrays.ts";
import {Obj, ObjectProto, ROOT, setup_object} from "./obj.ts";
import {setup_number} from "./number.ts";
import {setup_boolean} from "./boolean.ts";
import {setup_image} from "./image.ts";
import {setup_debug} from "./debug.ts";
import {StrObj} from "./string.ts";

export function make_standard_scope():Obj {
    let scope = new Obj("Global",ROOT,{});
    setup_object(scope)
    setup_number(scope)
    setup_boolean(scope)
    setup_debug(scope)
    // setup_image(scope)
    // setup_arrays(scope)

    scope._make_method_slot("Global",scope)
    ObjectProto.parent = scope;

    // ROOT._make_method_slot('listSlotNames',(rec:Obj, args:Array<Obj>):Obj => {
    //     let names = rec.list_slot_names().map(name => StrObj(name))
    //     return ListObj(...names)
    // })
    // ROOT._make_method_slot('getSlotNames',(rec:Obj, args:Array<Obj>):Obj => {
    //     console.log("rec is",rec)
    //     let slots:Record<string, Obj> = {}
    //     rec.list_slot_names().forEach(name => {
    //         console.log('name is',name)
    //         let obj = StrObj(name)
    //         slots[name] = obj
    //     })
    //     return DictObj(slots)
    // })

    return scope
}
