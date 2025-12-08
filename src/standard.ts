import {Obj, ObjectProto} from "./obj.ts";
import {setup_image} from "./image.ts";
import {make_common_scope} from "./scope.ts";

export function make_standard_scope():Obj {
    let scope = make_common_scope()
    setup_image(scope)

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
