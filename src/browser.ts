import {DictObj, ListObj, setup_arrays} from "./arrays.ts";
import {NilObj, Obj, ObjectProto, ROOT, setup_object} from "./obj.ts";
import {setup_number} from "./number.ts";
import {setup_boolean} from "./boolean.ts";
import {setup_debug} from "./debug.ts";
import {setup_dom} from "./dom.ts";
import {StrObj} from "./string.ts";

function root_fixup(scope) {
    ROOT._make_method_slot('listSlotNames',(rec:Obj, args:Array<Obj>):Obj => {
        let names = rec.list_slot_names().map(name => StrObj(name))
        return ListObj(...names)
    })
    ROOT._make_method_slot('getSlotNames',(rec:Obj, args:Array<Obj>):Obj => {
        let slots:Record<string, Obj> = {}
        rec.list_slot_names().forEach(name => {
            slots[name] = rec.get_slot(name)
        })
        return DictObj(slots)
    })

}
export function make_browser_scope():Obj {
    let scope = new Obj("Global",ROOT,{});
    setup_object(scope)
    setup_number(scope)
    setup_boolean(scope)
    setup_debug(scope)
    setup_arrays(scope)
    setup_dom(scope)
    scope._make_method_slot("Global",scope)
    ObjectProto.parent = scope;

    root_fixup(scope)
    let Debug = scope.lookup_slot("Debug")
    Debug._make_method_slot('print:',(rec:Obj, args:Array<Obj>) => {
        // d.p("debug printing".toUpperCase())
        console.log("debug printint")
        // args.forEach(arg => d.p("DEBUG", arg.to_string()))
        const cons = document.querySelector("#editor-console") as Element
        args.forEach(arg => {
            const li = document.createElement('li')
            li.innerText = arg.to_string()
            cons.append(li)
        })
        cons.scrollTop = cons.scrollHeight

        return NilObj()
    })

    return scope
}
