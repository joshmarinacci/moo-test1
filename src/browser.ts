import {DictObj, ListObj, setup_arrays} from "./arrays.ts";
import {NilObj, Obj, ObjectProto, ROOT, setup_object} from "./obj.ts";
import {setup_dom} from "./dom.ts";
import {StrObj} from "./string.ts";
import {make_common_scope} from "./scope.ts";

function root_fixup(scope:Obj) {
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
export function make_browser_scope(document: Document):Obj {
    let scope = make_common_scope()
    root_fixup(scope)
    setup_dom(scope,document)
    scope._make_method_slot("Global",scope)
    ObjectProto.parent = scope;

    let Debug = scope.lookup_slot("Debug")
    // modify Debug to use the browser console
    Debug._make_method_slot('print:',(rec:Obj, args:Array<Obj>) => {
        // d.p("debug printing".toUpperCase())
        console.log("debug printing")
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
