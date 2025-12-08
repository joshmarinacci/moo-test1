import {NilObj, Obj, ObjectProto} from "./obj.ts";
import {eval_block_obj} from "./eval.ts";

const $ = (sel:string):Element => document.querySelector(sel)
const on = (el:Element,type:string,cb:unknown) => el.addEventListener(type,cb)

export function setup_dom(scope: Obj, document: Document) {
    const ElementProto = new Obj("DomElement",ObjectProto,{
        'onClick:':(rec:Obj,args:Array<Obj>)=>{
            let element = rec._get_js_unknown() as Element
            let block = args[0]
            element.addEventListener('click',() => {
                let ret = eval_block_obj(block,[]) as Obj
            })
            return NilObj()
        },
        'append:':(rec:Obj, args:Array<Obj>):Obj => {
            let element = rec._get_js_unknown() as Element
            let child = args[0]._get_js_unknown() as Element
            element.append(child)
            return NilObj()
        },
    })

    const DomProxyProto = new Obj("DomProxyProto",ObjectProto,{
        'init':(rec:Obj, args:Array<Obj>):Obj => {
            console.log("setting up the dom proxy")
            const editorRoot = document.createElement('div')
            editorRoot.id = "editor-root";
            document.body.appendChild(editorRoot);

            const editorContent = document.createElement('div')
            editorContent.id = "editor-content";
            editorRoot.appendChild(editorContent);

            const editorConsole = document.createElement('li')
            editorConsole.id = "editor-console";
            editorConsole.innerHTML = "";
            editorRoot.appendChild(editorConsole);
            return NilObj()
        },
        'document':(rec:Obj) => {
            return rec._get_js_record()
        },
        'makeButton:': (rec:Obj, args:Array<Obj>):Obj => {
            let element = document.createElement("button")
            element.innerText = args[0]._get_js_string()
            let object = new Obj("DomElement",ElementProto,{})
            object._make_js_slot('jsvalue',element)
            return object
        },
        'make:':(rec:Obj, args:Array<Obj>):Obj => {
            let tag = args[0]._get_js_string();
            let element = document.createElement(tag)
            let object = new Obj("DomElement",ElementProto,{})
            object._make_js_slot('jsvalue',element)
            return object
        },
        'make:class':(rec:Obj, args:Array<Obj>):Obj => {
            let tag = args[0]._get_js_string();
            let element = document.createElement(tag)
            element.className = args[1]._get_js_string()
            let object = new Obj("DomElement",ElementProto,{})
            object._make_js_slot('jsvalue',element)
            return object
        },
        'makeDiv:': (rec:Obj, args:Array<Obj>):Obj => {
            let element = document.createElement("div")
            element.className = args[0]._get_js_string()
            let object = new Obj("DomElement",ElementProto,{})
            object._make_js_slot('jsvalue',element)
            return object
        },
        'makeSpan:': (rec:Obj, args:Array<Obj>):Obj => {
            let element = document.createElement("span")
            element.innerText = args[0]._get_js_string()
            let object = new Obj("DomElement",ElementProto,{})
            object._make_js_slot('jsvalue',element)
            return object
        },
        'append:':(rec:Obj, args:Array<Obj>):Obj => {
            $("#editor-content").append(args[0]._get_js_unknown() as Element)
            return NilObj()
        },
        "clear":(rec:Obj) => {
            $("#editor-content").innerHTML = ""
            $("#editor-console").innerHTML = ""
            return NilObj()
        }
    });
    if(typeof document != "undefined") {
        DomProxyProto._make_js_slot("jsvalue",document)
    }

    scope._make_method_slot("DomProxy",DomProxyProto)

}